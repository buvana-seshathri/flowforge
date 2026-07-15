package handlers

import (
	"flowforge/internal/engine"
	"flowforge/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type WebhookHandler struct {
	DB     *gorm.DB
	Engine *engine.Engine
}

func NewWebhookHandler(db *gorm.DB, eng *engine.Engine) *WebhookHandler {
	return &WebhookHandler{DB: db, Engine: eng}
}

// Receive handles inbound webhook calls: POST /webhooks/:slug
// This is the "webhook trigger" event source for FlowForge workflows.
func (h *WebhookHandler) Receive(c *gin.Context) {
	slug := c.Param("slug")

	var wf models.Workflow
	if err := h.DB.First(&wf, "webhook_slug = ? AND status = ?", slug, "active").Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no active workflow for this webhook"})
		return
	}

	var payload map[string]interface{}
	_ = c.ShouldBindJSON(&payload)
	if payload == nil {
		payload = map[string]interface{}{}
	}

	exec, err := h.Engine.Enqueue(c.Request.Context(), wf.ID, "webhook", payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{"execution_id": exec.ID, "status": "queued"})
}
