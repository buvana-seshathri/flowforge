package handlers

import (
	"flowforge/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WorkflowHandler struct {
	DB *gorm.DB
}

func NewWorkflowHandler(db *gorm.DB) *WorkflowHandler {
	return &WorkflowHandler{DB: db}
}

type workflowInput struct {
	Name        string                   `json:"name" binding:"required"`
	Description string                   `json:"description"`
	Nodes       []map[string]interface{} `json:"nodes"`
	Edges       []map[string]interface{} `json:"edges"`
	CronExpr    string                   `json:"cron_expr"`
}

func (h *WorkflowHandler) List(c *gin.Context) {
	var workflows []models.Workflow
	h.DB.Order("updated_at desc").Find(&workflows)
	c.JSON(http.StatusOK, workflows)
}

func (h *WorkflowHandler) Get(c *gin.Context) {
	var wf models.Workflow
	if err := h.DB.First(&wf, "id = ?", c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "workflow not found"})
		return
	}
	c.JSON(http.StatusOK, wf)
}

func (h *WorkflowHandler) Create(c *gin.Context) {
	var in workflowInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	nodesJSON, _ := marshalJSON(in.Nodes)
	edgesJSON, _ := marshalJSON(in.Edges)

	wf := models.Workflow{
		ID:          uuid.NewString(),
		Name:        in.Name,
		Description: in.Description,
		Status:      "draft",
		Nodes:       nodesJSON,
		Edges:       edgesJSON,
		WebhookSlug: uuid.NewString()[:8],
		CronExpr:    in.CronExpr,
	}
	if err := h.DB.Create(&wf).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, wf)
}

func (h *WorkflowHandler) Update(c *gin.Context) {
	var wf models.Workflow
	if err := h.DB.First(&wf, "id = ?", c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "workflow not found"})
		return
	}

	var in workflowInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	nodesJSON, _ := marshalJSON(in.Nodes)
	edgesJSON, _ := marshalJSON(in.Edges)

	wf.Name = in.Name
	wf.Description = in.Description
	wf.Nodes = nodesJSON
	wf.Edges = edgesJSON
	wf.CronExpr = in.CronExpr

	h.DB.Save(&wf)
	c.JSON(http.StatusOK, wf)
}

func (h *WorkflowHandler) Delete(c *gin.Context) {
	h.DB.Delete(&models.Workflow{}, "id = ?", c.Param("id"))
	c.Status(http.StatusNoContent)
}

func (h *WorkflowHandler) SetStatus(c *gin.Context) {
	var body struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.DB.Model(&models.Workflow{}).Where("id = ?", c.Param("id")).Update("status", body.Status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": body.Status})
}
