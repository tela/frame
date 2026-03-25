package main

import (
	"log"
	"path/filepath"

	"github.com/tela/frame/internal/frontend"
	"github.com/tela/frame/pkg/api"
	"github.com/tela/frame/pkg/audit"
	"github.com/tela/frame/pkg/bifrost"
	"github.com/tela/frame/pkg/character"
	"github.com/tela/frame/pkg/config"
	"github.com/tela/frame/pkg/database"
	"github.com/tela/frame/pkg/dataset"
	"github.com/tela/frame/pkg/image"
	"github.com/tela/frame/pkg/media"
	"github.com/tela/frame/pkg/preprocess"
	"github.com/tela/frame/pkg/shoot"
	"github.com/tela/frame/pkg/server"
	"github.com/tela/frame/pkg/tag"
	"github.com/tela/frame/pkg/template"
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
	tagStore := tag.NewStore(db.DB)
	datasetStore := dataset.NewStore(db.DB)
	preprocessStore := preprocess.NewStore(db.DB)
	templateStore := template.NewStore(db.DB)
	shootStore := shoot.NewStore(db.DB)
	auditStore := audit.NewStore(db.DB)
	ingester := image.NewIngester(imgStore, cfg.Root)

	// Bifrost client (optional — generation features disabled without it)
	var bifrostClient *bifrost.Client
	if cfg.BifrostURL != "" {
		bifrostClient = bifrost.NewClient(cfg.BifrostURL)
		if bifrostClient.Available() {
			log.Printf("bifrost connected at %s", cfg.BifrostURL)
		} else {
			log.Printf("bifrost configured at %s but not reachable (generation disabled until available)", cfg.BifrostURL)
		}
	}

	// HTTP server
	srv := server.New(db, version)

	// REST API
	a := &api.API{
		Characters: charStore,
		Images:     imgStore,
		Ingester:   ingester,
		Media:      mediaStore,
		Tags:       tagStore,
		Datasets:   datasetStore,
		Preprocess: preprocessStore,
		Templates:  templateStore,
		Shoots:     shootStore,
		Audit:      auditStore,
		Bifrost:    bifrostClient,
		RootPath:   cfg.Root,
		Port:       cfg.Port,
	}
	a.Register(srv.Mux())

	// Embedded frontend (SPA fallback, must be registered last)
	srv.Mux().Handle("GET /", frontend.Handler())

	if err := srv.ListenAndServe(cfg.Port); err != nil {
		log.Fatalf("server: %v", err)
	}
}
