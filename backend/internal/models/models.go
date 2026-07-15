package models

import (
	"time"

	"gorm.io/datatypes"
)

// Workflow represents a user-defined automation flow (nodes + edges from React Flow)
type Workflow struct {
	ID          string         `gorm:"primaryKey" json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Status      string         `json:"status" gorm:"default:draft"` // draft | active | paused
	Nodes       datatypes.JSON `json:"nodes"`                       // React Flow nodes
	Edges       datatypes.JSON `json:"edges"`                       // React Flow edges
	WebhookSlug string         `json:"webhook_slug" gorm:"uniqueIndex"`
	CronExpr    string         `json:"cron_expr"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

// Execution represents a single run of a workflow
type Execution struct {
	ID         string         `gorm:"primaryKey" json:"id"`
	WorkflowID string         `json:"workflow_id" gorm:"index"`
	Status     string         `json:"status"` // pending | running | success | failed
	TriggerBy  string         `json:"trigger_by"`
	InputData  datatypes.JSON `json:"input_data"`
	StartedAt  time.Time      `json:"started_at"`
	FinishedAt *time.Time     `json:"finished_at"`
	Error      string         `json:"error"`
}

// ExecutionLog is a single step log entry within an execution
type ExecutionLog struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	ExecutionID string    `json:"execution_id" gorm:"index"`
	NodeID      string    `json:"node_id"`
	NodeType    string    `json:"node_type"`
	Level       string    `json:"level"` // info | success | error
	Message     string    `json:"message"`
	CreatedAt   time.Time `json:"created_at"`
}
