package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// FlowNode mirrors a React Flow node as stored in Workflow.Nodes
type FlowNode struct {
	ID   string   `json:"id"`
	Type string   `json:"type"` // trigger | condition | action
	Data NodeData `json:"data"`
}

type NodeData struct {
	Label string `json:"label"`

	// trigger config
	TriggerKind string `json:"triggerKind,omitempty"` // webhook | schedule | manual

	// condition config
	Field    string `json:"field,omitempty"`
	Operator string `json:"operator,omitempty"` // equals | not_equals | greater_than | less_than | contains
	Value    string `json:"value,omitempty"`

	// action config
	ActionKind string `json:"actionKind,omitempty"` // http_request | log | delay
	URL        string `json:"url,omitempty"`
	Method     string `json:"method,omitempty"`
	Body       string `json:"body,omitempty"`
	Message    string `json:"message,omitempty"`
	DelayMs    int    `json:"delayMs,omitempty"`
}

// FlowEdge mirrors a React Flow edge
type FlowEdge struct {
	ID     string `json:"id"`
	Source string `json:"source"`
	Target string `json:"target"`
}

// ExecResult is the outcome of running a single node
type ExecResult struct {
	Success bool
	Message string
	Output  map[string]interface{}
}

// runNode dispatches execution to the correct handler based on node type
func runNode(node FlowNode, input map[string]interface{}) ExecResult {
	switch node.Type {
	case "trigger":
		return ExecResult{Success: true, Message: fmt.Sprintf("Trigger '%s' fired (%s)", node.Data.Label, node.Data.TriggerKind), Output: input}
	case "condition":
		return runCondition(node, input)
	case "action":
		return runAction(node, input)
	default:
		return ExecResult{Success: false, Message: "unknown node type: " + node.Type}
	}
}

func runCondition(node FlowNode, input map[string]interface{}) ExecResult {
	fieldVal, ok := input[node.Data.Field]
	if !ok {
		return ExecResult{Success: false, Message: fmt.Sprintf("condition field '%s' not found in input", node.Data.Field)}
	}
	fieldStr := fmt.Sprintf("%v", fieldVal)
	pass := false
	switch node.Data.Operator {
	case "equals":
		pass = fieldStr == node.Data.Value
	case "not_equals":
		pass = fieldStr != node.Data.Value
	case "contains":
		pass = bytes.Contains([]byte(fieldStr), []byte(node.Data.Value))
	default:
		pass = fieldStr == node.Data.Value
	}
	if pass {
		return ExecResult{Success: true, Message: fmt.Sprintf("Condition passed: %s %s %s", node.Data.Field, node.Data.Operator, node.Data.Value), Output: input}
	}
	return ExecResult{Success: false, Message: fmt.Sprintf("Condition failed: %s %s %s", node.Data.Field, node.Data.Operator, node.Data.Value)}
}

func runAction(node FlowNode, input map[string]interface{}) ExecResult {
	switch node.Data.ActionKind {
	case "http_request":
		return runHTTPAction(node, input)
	case "delay":
		ms := node.Data.DelayMs
		if ms <= 0 {
			ms = 500
		}
		time.Sleep(time.Duration(ms) * time.Millisecond)
		return ExecResult{Success: true, Message: fmt.Sprintf("Delayed %dms", ms), Output: input}
	case "log":
		return ExecResult{Success: true, Message: "Log: " + node.Data.Message, Output: input}
	default:
		return ExecResult{Success: true, Message: "No-op action executed", Output: input}
	}
}

func runHTTPAction(node FlowNode, input map[string]interface{}) ExecResult {
	method := node.Data.Method
	if method == "" {
		method = "GET"
	}
	var bodyReader io.Reader
	if node.Data.Body != "" {
		bodyReader = bytes.NewBufferString(node.Data.Body)
	}
	req, err := http.NewRequest(method, node.Data.URL, bodyReader)
	if err != nil {
		return ExecResult{Success: false, Message: "failed to build request: " + err.Error()}
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return ExecResult{Success: false, Message: "http request failed: " + err.Error()}
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	var parsed map[string]interface{}
	_ = json.Unmarshal(respBody, &parsed)

	return ExecResult{
		Success: resp.StatusCode < 400,
		Message: fmt.Sprintf("HTTP %s %s -> %d", method, node.Data.URL, resp.StatusCode),
		Output:  parsed,
	}
}
