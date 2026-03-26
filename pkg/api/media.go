package api

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/tela/frame/pkg/image"
	"github.com/tela/frame/pkg/media"
)

type createMediaItemRequest struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func (a *API) createMediaItem(w http.ResponseWriter, r *http.Request) {
	contentType := media.ContentType(r.PathValue("type"))
	if !validContentType(contentType) {
		writeError(w, http.StatusBadRequest, "invalid content type: must be wardrobe, prop, or location")
		return
	}

	var req createMediaItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	if req.ID == "" || req.Name == "" {
		writeError(w, http.StatusBadRequest, "id and name are required")
		return
	}

	now := time.Now().UTC()
	item := &media.Item{
		ID:          req.ID,
		ContentType: contentType,
		Name:        req.Name,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := a.Media.Create(item); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Sync to Fig (fire-and-forget)
	a.figSyncMedia(string(contentType), req.ID, req.Name)

	writeJSON(w, http.StatusCreated, item)
}

func (a *API) listMediaItems(w http.ResponseWriter, r *http.Request) {
	contentType := media.ContentType(r.PathValue("type"))
	if !validContentType(contentType) {
		writeError(w, http.StatusBadRequest, "invalid content type")
		return
	}

	items, err := a.Media.ListByType(contentType)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if items == nil {
		items = []media.Item{}
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *API) getMediaItem(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	item, err := a.Media.Get(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if item == nil {
		writeError(w, http.StatusNotFound, "media item not found")
		return
	}

	images, err := a.Media.ListImages(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"item":   item,
		"images": images,
	})
}

func (a *API) addMediaImage(w http.ResponseWriter, r *http.Request) {
	mediaID := r.PathValue("id")

	item, err := a.Media.Get(mediaID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if item == nil {
		writeError(w, http.StatusNotFound, "media item not found")
		return
	}

	if err := r.ParseMultipartForm(64 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "invalid multipart form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file field required")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read file")
		return
	}

	source := image.Source(r.FormValue("source"))
	if source == "" {
		source = image.SourceManual
	}

	// Ingest with a synthetic character ID based on content type
	// Media images don't belong to characters, but we reuse the ingestion pipeline
	// by using the media item ID as a pseudo-character for file storage
	req := &image.IngestRequest{
		Filename:    header.Filename,
		Data:        data,
		Source:      source,
		CharacterID: "media-" + string(item.ContentType),
	}

	result, err := a.Ingester.Ingest(req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if err := a.Media.AddImage(mediaID, result.ImageID, 0); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Set as primary if it's the first image
	if item.PrimaryImageID == nil {
		a.Media.SetPrimaryImage(mediaID, result.ImageID)
	}

	writeJSON(w, http.StatusCreated, result)
}

func validContentType(ct media.ContentType) bool {
	return ct == media.ContentWardrobe || ct == media.ContentProp || ct == media.ContentLocation
}
