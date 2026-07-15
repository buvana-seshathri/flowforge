package scheduler

import (
	"context"
	"flowforge/internal/engine"
	"flowforge/internal/models"
	"log"
	"time"

	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
)

// Scheduler periodically re-syncs active workflows that have a cron
// expression and registers/refreshes their cron jobs so scheduled triggers
// fire on time even if workflows are edited while the server is running.
type Scheduler struct {
	DB     *gorm.DB
	Engine *engine.Engine
	cron   *cron.Cron
	jobIDs map[string]cron.EntryID
}

func New(db *gorm.DB, eng *engine.Engine) *Scheduler {
	return &Scheduler{
		DB:     db,
		Engine: eng,
		cron:   cron.New(),
		jobIDs: map[string]cron.EntryID{},
	}
}

func (s *Scheduler) Start(ctx context.Context) {
	s.cron.Start()
	go s.syncLoop(ctx)
}

func (s *Scheduler) syncLoop(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	s.sync(ctx)
	for {
		select {
		case <-ctx.Done():
			s.cron.Stop()
			return
		case <-ticker.C:
			s.sync(ctx)
		}
	}
}

func (s *Scheduler) sync(ctx context.Context) {
	var workflows []models.Workflow
	s.DB.Where("status = ? AND cron_expr <> ''", "active").Find(&workflows)

	seen := map[string]bool{}
	for _, wf := range workflows {
		seen[wf.ID] = true
		if _, exists := s.jobIDs[wf.ID]; exists {
			continue
		}
		workflowID := wf.ID
		entryID, err := s.cron.AddFunc(wf.CronExpr, func() {
			if _, err := s.Engine.Enqueue(ctx, workflowID, "schedule", map[string]interface{}{}); err != nil {
				log.Println("scheduler enqueue error:", err)
			}
		})
		if err != nil {
			log.Printf("invalid cron expr for workflow %s: %v", wf.ID, err)
			continue
		}
		s.jobIDs[wf.ID] = entryID
	}

	// remove jobs for workflows no longer active/scheduled
	for id, entryID := range s.jobIDs {
		if !seen[id] {
			s.cron.Remove(entryID)
			delete(s.jobIDs, id)
		}
	}
}
