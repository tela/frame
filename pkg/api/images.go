package api

import (
	"fmt"
	"io"
	"net/http"

	"github.com/tela/frame/pkg/image"
)

func (a *API) listCharacterImages(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	eraID := r.URL.Query().Get("era_id")

	var eraPtr *string
	if eraID != "" {
		eraPtr = &eraID
	}

	images, err := a.Images.ListByCharacter(charID, eraPtr)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if images == nil {
		images = []image.CharacterImage{}
	}
	writeJSON(w, http.StatusOK, images)
}

func (a *API) ingestCharacterImage(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	a.handleIngest(w, r, charID, nil)
}

func (a *API) ingestStandaloneImage(w http.ResponseWriter, r *http.Request) {
	a.handleIngest(w, r, "", nil)
}

func (a *API) ingestEraImage(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	eraID := r.PathValue("era")
	a.handleIngest(w, r, charID, &eraID)
}

func (a *API) handleIngest(w http.ResponseWriter, r *http.Request, charID string, eraID *string) {
	if err := r.ParseMultipartForm(64 << 20); err != nil { // 64MB max
		writeError(w, http.StatusBadRequest, "invalid multipart form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file field required")
		return
	}
	defer file.Close()

	// Check file size (50MB limit per file)
	if header.Size > 50<<20 {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("file too large: %dMB (max 50MB)", header.Size>>20))
		return
	}

	data, err := io.ReadAll(file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read file")
		return
	}

	source := image.Source(r.FormValue("source"))
	if source == "" {
		source = image.SourceManual
	}

	// Resolve character folder name
	var charSlug string
	char, lookupErr := a.Characters.Get(charID)
	if lookupErr == nil && char != nil {
		charSlug = char.FolderName
	}

	req := &image.IngestRequest{
		Filename:      header.Filename,
		Data:          data,
		Source:        source,
		CharacterID:   charID,
		CharacterSlug: charSlug,
		EraID:         eraID,
	}

	result, err := a.Ingester.Ingest(req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	status := http.StatusCreated
	if result.IsDuplicate {
		status = http.StatusOK
	}
	writeJSON(w, status, result)
}

func (a *API) getImageStats(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	stats, err := a.Images.GetImageStats(charID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func (a *API) getImageMeta(w http.ResponseWriter, r *http.Request) {
	imageID := r.PathValue("id")
	img, err := a.Images.Get(imageID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if img == nil {
		writeError(w, http.StatusNotFound, "image not found")
		return
	}
	writeJSON(w, http.StatusOK, img)
}

func (a *API) getImage(w http.ResponseWriter, r *http.Request) {
	imageID := r.PathValue("id")
	a.serveImageFile(w, r, imageID, false)
}

func (a *API) getImageThumb(w http.ResponseWriter, r *http.Request) {
	imageID := r.PathValue("id")
	a.serveImageFile(w, r, imageID, true)
}

func (a *API) serveImageFile(w http.ResponseWriter, r *http.Request, imageID string, thumb bool) {
	img, err := a.Images.Get(imageID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if img == nil {
		writeError(w, http.StatusNotFound, "image not found")
		return
	}

	// Try character image first
	ci, _ := a.Images.GetCharacterImage(imageID)

	var filePath string
	if ci != nil {
		// Character image — resolve folder name
		folderName := ci.CharacterID
		char, err := a.Characters.Get(ci.CharacterID)
		if err == nil && char != nil && char.FolderName != "" {
			folderName = char.FolderName
		}
		if thumb {
			filePath = a.Ingester.ThumbnailPath(imageID, folderName)
		} else {
			filePath = a.Ingester.OriginalPath(imageID, folderName, img.Format)
		}
	} else {
		// Standalone/reference image
		if thumb {
			filePath = a.Ingester.ReferenceThumbnailPath(imageID)
		} else {
			filePath = a.Ingester.ReferenceOriginalPath(imageID, img.Format)
		}
	}

	http.ServeFile(w, r, filePath)
}

func (a *API) getCharacterAvatar(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")

	char, err := a.Characters.Get(charID)
	if err != nil || char == nil {
		writeError(w, http.StatusNotFound, "character not found")
		return
	}

	// Priority: explicit avatar > most recent favorite > most recent image
	avatarImageID := char.AvatarImageID
	if avatarImageID == "" {
		favorites, err := a.Images.ListFavorites(charID)
		if err == nil && len(favorites) > 0 {
			avatarImageID = favorites[0].ImageID
		}
	}
	if avatarImageID == "" {
		images, err := a.Images.ListByCharacter(charID, nil)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if len(images) == 0 {
			writeError(w, http.StatusNotFound, "no images for character")
			return
		}
		avatarImageID = images[0].ImageID
	}

	folderName := charID
	if char.FolderName != "" {
		folderName = char.FolderName
	}
	thumbPath := a.Ingester.ThumbnailPath(avatarImageID, folderName)
	w.Header().Set("Cache-Control", "no-store")
	http.ServeFile(w, r, thumbPath)
}
