package main

import (
	"log"
	"path/filepath"

	"github.com/tela/frame/internal/frontend"
	"github.com/tela/frame/pkg/config"
	"github.com/tela/frame/pkg/database"
	"github.com/tela/frame/pkg/server"
)

var version = "dev"

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	dbPath := filepath.Join(cfg.Root, "frame.db")
	db, err := database.Open(dbPath)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer db.Close()

	srv := server.New(db, version)
	srv.Mux().Handle("GET /", frontend.Handler())

	if err := srv.ListenAndServe(cfg.Port); err != nil {
		log.Fatalf("server: %v", err)
	}
}
