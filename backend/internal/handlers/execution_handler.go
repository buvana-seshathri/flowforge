package handlers

import (
	"flowforge/internal/engine"
	"flowforge/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ExecutionHandler struct {
	DB     *gorm.DB
	Engine *engine.Engine
}

func NewExecutionHandler(db *gorm.DB, eng *engine.Engine) *ExecutionHandler {
	return &ExecutionHandler{DB: db, Engine: eng}
}

// Trigger manually runs a workflow (e.g. "Test Workflow" button in the editor)
func (h *ExecutionHandler) Trigger(c *gin.Context) {
	workflowID := c.Param("id")

	var wf models.Workflow
	if err := h.DB.First(&wf, "id = ?", workflowID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "workflow not found"})
		return
	}

	var input map[string]interface{}
	_ = c.ShouldBindJSON(&input)

	exec, err := h.Engine.Enqueue(c.Request.Context(), workflowID, "manual", input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusAccepted, exec)
}

func (h *ExecutionHandler) ListForWorkflow(c *gin.Context) {
	var executions []models.Execution
	h.DB.Where("workflow_id = ?", c.Param("id")).Order("started_at desc").Limit(100).Find(&executions)
	c.JSON(http.StatusOK, executions)
}

func (h *ExecutionHandler) Get(c *gin.Context) {
	var exec models.Execution
	if err := h.DB.First(&exec, "id = ?", c.Param("executionId")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "execution not found"})
		return
	}
	c.JSON(http.StatusOK, exec)
}

func (h *ExecutionHandler) Logs(c *gin.Context) {
	var logs []models.ExecutionLog
	h.DB.Where("execution_id = ?", c.Param("executionId")).Order("created_at asc").Find(&logs)
	c.JSON(http.StatusOK, logs)
}
