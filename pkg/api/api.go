package api

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/tela/frame/pkg/audit"
	"github.com/tela/frame/pkg/bifrost"
	"github.com/tela/frame/pkg/character"
	"github.com/tela/frame/pkg/fig"
	"github.com/tela/frame/pkg/dataset"
	"github.com/tela/frame/pkg/image"
	"github.com/tela/frame/pkg/lora"
	"github.com/tela/frame/pkg/media"
	"github.com/tela/frame/pkg/preprocess"
	"github.com/tela/frame/pkg/shoot"
	"github.com/tela/frame/pkg/tag"
	"github.com/tela/frame/pkg/template"
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
	Templates   *template.Store
	Shoots      *shoot.Store
	Audit       *audit.Store
	Loras       *lora.Store
	Bifrost     *bifrost.Client // nil if Bifrost not configured
	Fig         *fig.Client    // nil if Fig not configured
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
	mux.HandleFunc("PATCH /api/v1/characters/{id}/images/{imageId}", a.updateCharacterImage)
	mux.HandleFunc("GET /api/v1/characters/{id}/images/pending", a.listPendingImages)
	mux.HandleFunc("GET /api/v1/characters/{id}/avatar", a.getCharacterAvatar)

	// Favorites
	mux.HandleFunc("POST /api/v1/characters/{id}/images/{imageId}/favorite", a.toggleFavorite)
	mux.HandleFunc("GET /api/v1/characters/{id}/favorites", a.listFavorites)

	// Shoots
	mux.HandleFunc("GET /api/v1/characters/{id}/shoots", a.listShoots)
	mux.HandleFunc("POST /api/v1/characters/{id}/shoots", a.createShoot)
	mux.HandleFunc("DELETE /api/v1/shoots/{shootId}", a.deleteShoot)
	mux.HandleFunc("GET /api/v1/shoots/{shootId}/images", a.listShootImages)
	mux.HandleFunc("POST /api/v1/shoots/{shootId}/images", a.addShootImage)

	// Post-cast era ingest
	mux.HandleFunc("POST /api/v1/characters/{id}/eras/{era}/ingest", a.ingestEraImage)

	// Standalone image ingest (no character)
	mux.HandleFunc("POST /api/v1/images/ingest", a.ingestStandaloneImage)

	// Image search
	mux.HandleFunc("GET /api/v1/images/search", a.searchImages)

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
	mux.HandleFunc("GET /api/v1/tags/validate", a.validateTag)

	// Taxonomy
	mux.HandleFunc("GET /api/v1/tag-families/{id}/taxonomy", a.getFamilyTaxonomy)
	mux.HandleFunc("GET /api/v1/tag-families/{id}/namespaces", a.listNamespaces)
	mux.HandleFunc("POST /api/v1/tag-families/{id}/namespaces", a.createNamespace)
	mux.HandleFunc("DELETE /api/v1/namespaces/{nsId}", a.deleteNamespace)
	mux.HandleFunc("GET /api/v1/namespaces/{nsId}/values", a.listAllowedValues)
	mux.HandleFunc("POST /api/v1/namespaces/{nsId}/values", a.createAllowedValue)
	mux.HandleFunc("DELETE /api/v1/values/{valId}", a.deleteAllowedValue)

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

	// Prompt templates
	mux.HandleFunc("GET /api/v1/templates", a.listTemplates)
	mux.HandleFunc("POST /api/v1/templates", a.createTemplate)
	mux.HandleFunc("GET /api/v1/templates/{id}", a.getTemplate)
	mux.HandleFunc("PATCH /api/v1/templates/{id}", a.updateTemplate)
	mux.HandleFunc("DELETE /api/v1/templates/{id}", a.deleteTemplate)
	mux.HandleFunc("POST /api/v1/templates/{id}/duplicate", a.duplicateTemplate)

	// Import
	mux.HandleFunc("POST /api/v1/import/directory", a.handleImportDirectory)

	// Audit log
	mux.HandleFunc("GET /api/v1/audit", a.queryAuditLog)

	// Generation (Bifrost)
	mux.HandleFunc("POST /api/v1/generate", a.handleGenerate)
	mux.HandleFunc("GET /api/v1/bifrost/status", a.handleBifrostStatus)

	// LoRA registry
	mux.HandleFunc("GET /api/v1/loras", a.listLoras)
	mux.HandleFunc("POST /api/v1/loras", a.createLora)
	mux.HandleFunc("PATCH /api/v1/loras/{id}", a.updateLora)
	mux.HandleFunc("DELETE /api/v1/loras/{id}", a.deleteLora)

	// Fig integration
	mux.HandleFunc("POST /api/v1/characters/{id}/publish", a.publishToFig)
	mux.HandleFunc("GET /api/v1/fig/status", a.handleFigStatus)
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
