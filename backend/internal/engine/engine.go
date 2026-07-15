package engine

import (
	"context"
	"encoding/json"
	"flowforge/internal/models"
	"flowforge/internal/realtime"
	"fmt"
	"log"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

const queueKey = "flowforge:execution:queue"

// Engine orchestrates asynchronous workflow execution using a Redis list as
// a distributed work queue -- multiple worker processes/replicas can call
// StartWorkers to pull executions off the same queue, giving horizontal
// scalability similar to Temporal task queues (Temporal can be swapped in
// here by replacing Enqueue/StartWorkers with a Temporal client + Worker).
type Engine struct {
	DB  *gorm.DB
	RDB *redis.Client
	Hub *realtime.Hub
}

func New(db *gorm.DB, rdb *redis.Client, hub *realtime.Hub) *Engine {
	return &Engine{DB: db, RDB: rdb, Hub: hub}
}

// Enqueue creates an Execution record and pushes its ID onto the distributed queue.
func (e *Engine) Enqueue(ctx context.Context, workflowID, triggerBy string, input map[string]interface{}) (*models.Execution, error) {
	inputBytes, _ := json.Marshal(input)
	exec := &models.Execution{
		ID:         uuid.NewString(),
		WorkflowID: workflowID,
		Status:     "pending",
		TriggerBy:  triggerBy,
		InputData:  datatypes.JSON(inputBytes),
		StartedAt:  time.Now(),
	}
	if err := e.DB.Create(exec).Error; err != nil {
		return nil, err
	}
	if err := e.RDB.LPush(ctx, queueKey, exec.ID).Err(); err != nil {
		return nil, err
	}
	return exec, nil
}

// StartWorkers launches n concurrent worker goroutines that pull execution
// IDs off the Redis queue and run them. Run this in multiple process
// replicas for true horizontal/distributed scaling.
func (e *Engine) StartWorkers(ctx context.Context, n int) {
	for i := 0; i < n; i++ {
		go e.workerLoop(ctx, i)
	}
}

func (e *Engine) workerLoop(ctx context.Context, workerID int) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		res, err := e.RDB.BRPop(ctx, 5*time.Second, queueKey).Result()
		if err == redis.Nil {
			continue
		}
		if err != nil {
			log.Printf("worker %d: queue error: %v", workerID, err)
			time.Sleep(time.Second)
			continue
		}
		executionID := res[1]
		e.run(ctx, executionID)
	}
}

func (e *Engine) run(ctx context.Context, executionID string) {
	var exec models.Execution
	if err := e.DB.First(&exec, "id = ?", executionID).Error; err != nil {
		log.Println("execution not found:", executionID)
		return
	}

	var workflow models.Workflow
	if err := e.DB.First(&workflow, "id = ?", exec.WorkflowID).Error; err != nil {
		e.fail(ctx, &exec, "workflow not found")
		return
	}

	e.DB.Model(&exec).Updates(map[string]interface{}{"status": "running"})
	e.emit(ctx, exec.ID, "info", "", "system", "Execution started")

	var nodes []FlowNode
	var edges []FlowEdge
	_ = json.Unmarshal(workflow.Nodes, &nodes)
	_ = json.Unmarshal(workflow.Edges, &edges)

	order, err := topoSort(nodes, edges)
	if err != nil {
		e.fail(ctx, &exec, err.Error())
		return
	}

	var input map[string]interface{}
	_ = json.Unmarshal(exec.InputData, &input)
	if input == nil {
		input = map[string]interface{}{}
	}

	nodeByID := map[string]FlowNode{}
	for _, n := range nodes {
		nodeByID[n.ID] = n
	}

	current := input
	for _, nodeID := range order {
		node := nodeByID[nodeID]
		result := runNode(node, current)

		level := "success"
		if !result.Success {
			level = "error"
		}
		e.emit(ctx, exec.ID, level, node.ID, node.Type, result.Message)

		if !result.Success {
			if node.Type == "condition" {
				// condition not met: stop this branch gracefully, not a failure
				e.DB.Model(&exec).Updates(map[string]interface{}{"status": "success"})
				e.emit(ctx, exec.ID, "info", "", "system", "Execution stopped: condition not met")
				now := time.Now()
				e.DB.Model(&exec).Update("finished_at", &now)
				return
			}
			e.fail(ctx, &exec, result.Message)
			return
		}
		if result.Output != nil {
			current = result.Output
		}
	}

	now := time.Now()
	e.DB.Model(&exec).Updates(map[string]interface{}{"status": "success", "finished_at": &now})
	e.emit(ctx, exec.ID, "success", "", "system", "Execution completed successfully")
}

func (e *Engine) fail(ctx context.Context, exec *models.Execution, msg string) {
	now := time.Now()
	e.DB.Model(exec).Updates(map[string]interface{}{"status": "failed", "error": msg, "finished_at": &now})
	e.emit(ctx, exec.ID, "error", "", "system", "Execution failed: "+msg)
}

func (e *Engine) emit(ctx context.Context, executionID, level, nodeID, nodeType, message string) {
	logEntry := models.ExecutionLog{
		ExecutionID: executionID,
		NodeID:      nodeID,
		NodeType:    nodeType,
		Level:       level,
		Message:     message,
		CreatedAt:   time.Now(),
	}
	e.DB.Create(&logEntry)
	e.Hub.Publish(ctx, executionID, logEntry)
}

// topoSort orders nodes for execution using Kahn's algorithm over the React Flow edges.
func topoSort(nodes []FlowNode, edges []FlowEdge) ([]string, error) {
	indegree := map[string]int{}
	adj := map[string][]string{}
	for _, n := range nodes {
		indegree[n.ID] = 0
	}
	for _, edge := range edges {
		adj[edge.Source] = append(adj[edge.Source], edge.Target)
		indegree[edge.Target]++
	}

	var queue []string
	for _, n := range nodes {
		if indegree[n.ID] == 0 {
			queue = append(queue, n.ID)
		}
	}

	var order []string
	for len(queue) > 0 {
		id := queue[0]
		queue = queue[1:]
		order = append(order, id)
		for _, next := range adj[id] {
			indegree[next]--
			if indegree[next] == 0 {
				queue = append(queue, next)
			}
		}
	}

	if len(order) != len(nodes) {
		return nil, fmt.Errorf("workflow graph contains a cycle")
	}
	return order, nil
}
