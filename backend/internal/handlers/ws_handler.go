package handlers

import (
	"flowforge/internal/realtime"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type WSHandler struct {
	Hub *realtime.Hub
}

func NewWSHandler(hub *realtime.Hub) *WSHandler {
	return &WSHandler{Hub: hub}
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true }, // dev only; restrict in production
}

// StreamExecution upgrades to a WebSocket and streams live logs for one execution.
// GET /ws/executions/:executionId
func (h *WSHandler) StreamExecution(c *gin.Context) {
	executionID := c.Param("executionId")

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	h.Hub.Register(c.Request.Context(), executionID, conn)
}
