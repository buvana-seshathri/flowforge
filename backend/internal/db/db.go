package db

import (
	"flowforge/internal/models"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Connect(dsn string) *gorm.DB {
	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	if err := database.AutoMigrate(&models.Workflow{}, &models.Execution{}, &models.ExecutionLog{}); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	return database
}
