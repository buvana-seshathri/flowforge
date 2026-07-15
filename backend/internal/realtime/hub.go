package realtime

import (
	"context"
	"encoding/json"
	"log"
	"sync"

	"github.com/go-redis/redis/v8"
	"github.com/gorilla/websocket"
)

// Hub fans out execution log events to connected WebSocket clients,
// scoped by execution ID. Redis pub/sub allows this to work across
// multiple backend replicas / distributed workers.
type Hub struct {
	rdb     *redis.Client
	mu      sync.RWMutex
	clients map[string]map[*websocket.Conn]bool // executionID -> set of conns
}

func NewHub(rdb *redis.Client) *Hub {
	return &Hub{
		rdb:     rdb,
		clients: make(map[string]map[*websocket.Conn]bool),
	}
}

func channelName(executionID string) string {
	return "flowforge:execution:" + executionID
}

// Publish sends a log event to all subscribers of an execution (via Redis).
func (h *Hub) Publish(ctx context.Context, executionID string, event interface{}) {
	payload, err := json.Marshal(event)
	if err != nil {
		log.Println("hub marshal error:", err)
		return
	}
	if err := h.rdb.Publish(ctx, channelName(executionID), payload).Err(); err != nil {
		log.Println("hub publish error:", err)
	}
}

// Register adds a websocket connection as a listener for an execution and
// blocks, streaming Redis pub/sub messages to it until it disconnects.
func (h *Hub) Register(ctx context.Context, executionID string, conn *websocket.Conn) {
	h.mu.Lock()
	if h.clients[executionID] == nil {
		h.clients[executionID] = make(map[*websocket.Conn]bool)
	}
	h.clients[executionID][conn] = true
	h.mu.Unlock()

	defer func() {
		h.mu.Lock()
		delete(h.clients[executionID], conn)
		h.mu.Unlock()
		conn.Close()
	}()

	sub := h.rdb.Subscribe(ctx, channelName(executionID))
	defer sub.Close()
	ch := sub.Channel()

	// Also watch for client-initiated close in a separate goroutine
	closeCh := make(chan struct{})
	go func() {
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				close(closeCh)
				return
			}
		}
	}()

	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				return
			}
			if err := conn.WriteMessage(websocket.TextMessage, []byte(msg.Payload)); err != nil {
				return
			}
		case <-closeCh:
			return
		case <-ctx.Done():
			return
		}
	}
}
