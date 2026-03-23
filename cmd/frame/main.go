package main

import (
	"log"
	"path/filepath"

	"github.com/tela/frame/internal/frontend"
	"github.com/tela/frame/pkg/api"
	"github.com/tela/frame/pkg/character"
	"github.com/tela/frame/pkg/config"
	"github.com/tela/frame/pkg/database"
	"github.com/tela/frame/pkg/image"
	"github.com/tela/frame/pkg/media"
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

	// Domain stores
	charStore := character.NewStore(db.DB)
	imgStore := image.NewStore(db.DB)
	mediaStore := media.NewStore(db.DB)
	ingester := image.NewIngester(imgStore, cfg.Root)

	// HTTP server
	srv := server.New(db, version)

	// REST API
	a := &api.API{
		Characters: charStore,
		Images:     imgStore,
		Ingester:   ingester,
		Media:      mediaStore,
		RootPath:   cfg.Root,
	}
	a.Register(srv.Mux())

	// Embedded frontend (SPA fallback, must be registered last)
	srv.Mux().Handle("GET /", frontend.Handler())

	if err := srv.ListenAndServe(cfg.Port); err != nil {
		log.Fatalf("server: %v", err)
	}
}
