package api

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/tela/frame/pkg/bifrost"
	"github.com/tela/frame/pkg/character"
	"github.com/tela/frame/pkg/dataset"
	"github.com/tela/frame/pkg/image"
	"github.com/tela/frame/pkg/media"
	"github.com/tela/frame/pkg/preprocess"
	"github.com/tela/frame/pkg/tag"
)

// API holds all the dependencies for the REST API handlers.
type API struct {
	Characters  *character.Store
	Images      *image.Store
	Ingester    *image.Ingester
	Media       *media.Store
	Tags        *tag.Store
	Datasets    *dataset.Store
	Preprocess  *preprocess.Store
	Bifrost     *bifrost.Client // nil if Bifrost not configured
	RootPath    string          // drive root for file serving
	Port        int             // server port (for self-referencing URLs)
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
	mux.HandleFunc("GET /api/v1/characters/{id}/images", a.listCharacterImages)
	mux.HandleFunc("POST /api/v1/characters/{id}/images", a.ingestCharacterImage)
	mux.HandleFunc("GET /api/v1/characters/{id}/avatar", a.getCharacterAvatar)

	// Post-cast era ingest
	mux.HandleFunc("POST /api/v1/characters/{id}/eras/{era}/ingest", a.ingestEraImage)

	// Image serving
	mux.HandleFunc("GET /api/v1/images/{id}", a.getImage)
	mux.HandleFunc("GET /api/v1/images/{id}/thumb", a.getImageThumb)

	// Image tags
	mux.HandleFunc("GET /api/v1/images/{id}/tags", a.getImageTags)
	mux.HandleFunc("POST /api/v1/images/{id}/tags", a.addImageTag)
	mux.HandleFunc("DELETE /api/v1/images/{id}/tags", a.removeImageTag)
	mux.HandleFunc("POST /api/v1/images/bulk-tag", a.bulkTag)

	// Tag families
	mux.HandleFunc("GET /api/v1/tag-families", a.listTagFamilies)
	mux.HandleFunc("POST /api/v1/tag-families", a.createTagFamily)
	mux.HandleFunc("PATCH /api/v1/tag-families/{id}", a.updateTagFamily)
	mux.HandleFunc("DELETE /api/v1/tag-families/{id}", a.deleteTagFamily)

	// Tags
	mux.HandleFunc("GET /api/v1/tags", a.listTags)
	mux.HandleFunc("POST /api/v1/tags/rename", a.renameTag)
	mux.HandleFunc("POST /api/v1/tags/merge", a.mergeTag)
	mux.HandleFunc("POST /api/v1/tags/delete", a.deleteTag)

	// Media items
	mux.HandleFunc("POST /api/v1/media/{type}", a.createMediaItem)
	mux.HandleFunc("GET /api/v1/media/{type}", a.listMediaItems)
	mux.HandleFunc("GET /api/v1/media/{type}/{id}", a.getMediaItem)
	mux.HandleFunc("POST /api/v1/media/{type}/{id}/images", a.addMediaImage)

	// Reference packages
	mux.HandleFunc("GET /api/v1/characters/{id}/eras/{era}/reference-package", a.getReferencePackage)

	// Datasets
	mux.HandleFunc("GET /api/v1/datasets", a.listDatasets)
	mux.HandleFunc("POST /api/v1/datasets", a.createDataset)
	mux.HandleFunc("GET /api/v1/datasets/{id}", a.getDataset)
	mux.HandleFunc("PATCH /api/v1/datasets/{id}", a.updateDataset)
	mux.HandleFunc("DELETE /api/v1/datasets/{id}", a.deleteDataset)
	mux.HandleFunc("POST /api/v1/datasets/{id}/fork", a.forkDataset)
	mux.HandleFunc("POST /api/v1/datasets/{id}/images", a.addDatasetImages)
	mux.HandleFunc("DELETE /api/v1/datasets/{id}/images/{imgId}", a.removeDatasetImage)
	mux.HandleFunc("PATCH /api/v1/datasets/{id}/images/{imgId}", a.updateDatasetImage)

	// Import
	mux.HandleFunc("POST /api/v1/import/directory", a.handleImportDirectory)

	// Generation (Bifrost)
	mux.HandleFunc("POST /api/v1/generate", a.handleGenerate)
	mux.HandleFunc("GET /api/v1/bifrost/status", a.handleBifrostStatus)
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
