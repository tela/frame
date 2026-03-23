package api

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/tela/frame/pkg/character"
	"github.com/tela/frame/pkg/image"
	"github.com/tela/frame/pkg/media"
)

// API holds all the dependencies for the REST API handlers.
type API struct {
	Characters *character.Store
	Images     *image.Store
	Ingester   *image.Ingester
	Media      *media.Store
	RootPath   string // drive root for file serving
}

// Register mounts all API routes on the given mux.
func (a *API) Register(mux *http.ServeMux) {
	// Characters
	mux.HandleFunc("POST /api/v1/characters", a.createCharacter)
	mux.HandleFunc("GET /api/v1/characters", a.listCharacters)
	mux.HandleFunc("GET /api/v1/characters/{id}", a.getCharacter)
	mux.HandleFunc("PATCH /api/v1/characters/{id}", a.updateCharacter)

	// Eras
	mux.HandleFunc("POST /api/v1/characters/{id}/eras", a.createEra)
	mux.HandleFunc("GET /api/v1/characters/{id}/eras", a.listEras)

	// Character images
	mux.HandleFunc("POST /api/v1/characters/{id}/images", a.ingestCharacterImage)
	mux.HandleFunc("GET /api/v1/characters/{id}/avatar", a.getCharacterAvatar)

	// Post-cast era ingest
	mux.HandleFunc("POST /api/v1/characters/{id}/eras/{era}/ingest", a.ingestEraImage)

	// Image serving
	mux.HandleFunc("GET /api/v1/images/{id}", a.getImage)
	mux.HandleFunc("GET /api/v1/images/{id}/thumb", a.getImageThumb)

	// Media items
	mux.HandleFunc("POST /api/v1/media/{type}", a.createMediaItem)
	mux.HandleFunc("GET /api/v1/media/{type}", a.listMediaItems)
	mux.HandleFunc("GET /api/v1/media/{type}/{id}", a.getMediaItem)
	mux.HandleFunc("POST /api/v1/media/{type}/{id}/images", a.addMediaImage)

	// Reference packages
	mux.HandleFunc("GET /api/v1/characters/{id}/eras/{era}/reference-package", a.getReferencePackage)
}

// JSON response helpers

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("json encode: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
