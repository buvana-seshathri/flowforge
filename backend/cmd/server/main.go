package main

import (
	"context"
	"flowforge/internal/config"
	"flowforge/internal/db"
	"flowforge/internal/engine"
	"flowforge/internal/handlers"
	"flowforge/internal/realtime"
	"flowforge/internal/scheduler"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

func main() {
	cfg := config.Load()

	database := db.Connect(cfg.DatabaseURL)

	rdb := redis.NewClient(&redis.Options{Addr: cfg.RedisAddr})
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("failed to connect to redis: %v", err)
	}

	hub := realtime.NewHub(rdb)
	eng := engine.New(database, rdb, hub)

	// Start distributed worker pool (in production, run this in separate
	// worker processes/pods that share the same Postgres + Redis).
	eng.StartWorkers(ctx, 4)

	sched := scheduler.New(database, eng)
	sched.Start(ctx)

	wfHandler := handlers.NewWorkflowHandler(database)
	execHandler := handlers.NewExecutionHandler(database, eng)
	webhookHandler := handlers.NewWebhookHandler(database, eng)
	wsHandler := handlers.NewWSHandler(hub)

	router := gin.Default()
	router.Use(cors.New(cors.Config{
		AllowAllOrigins: true,
		AllowMethods:    []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:    []string{"Origin", "Content-Type", "Authorization"},
	}))

	router.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })

	api := router.Group("/api")
	{
		wf := api.Group("/workflows")
		{
			wf.GET("", wfHandler.List)
			wf.POST("", wfHandler.Create)
			wf.GET("/:id", wfHandler.Get)
			wf.PUT("/:id", wfHandler.Update)
			wf.DELETE("/:id", wfHandler.Delete)
			wf.PATCH("/:id/status", wfHandler.SetStatus)
			wf.POST("/:id/trigger", execHandler.Trigger)
			wf.GET("/:id/executions", execHandler.ListForWorkflow)
		}

		exec := api.Group("/executions")
		{
			exec.GET("/:executionId", execHandler.Get)
			exec.GET("/:executionId/logs", execHandler.Logs)
		}
	}

	// Public webhook trigger endpoint (external systems call this)
	router.POST("/webhooks/:slug", webhookHandler.Receive)

	// Real-time execution log streaming
	router.GET("/ws/executions/:executionId", wsHandler.StreamExecution)

	log.Printf("FlowForge API listening on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
