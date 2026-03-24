package api

import (
	"io"
	"net/http"

	"github.com/tela/frame/pkg/image"
)

func (a *API) ingestCharacterImage(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	a.handleIngest(w, r, charID, nil)
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

	ci, err := a.Images.GetCharacterImage(imageID)
	if err != nil || ci == nil {
		writeError(w, http.StatusNotFound, "image not linked to any character")
		return
	}

	// Resolve character folder name for disk path
	folderName := ci.CharacterID
	char, err := a.Characters.Get(ci.CharacterID)
	if err == nil && char != nil && char.FolderName != "" {
		folderName = char.FolderName
	}

	var filePath string
	if thumb {
		filePath = a.Ingester.ThumbnailPath(imageID, folderName, ci.EraID)
	} else {
		filePath = a.Ingester.OriginalPath(imageID, folderName, ci.EraID, img.Format)
	}

	http.ServeFile(w, r, filePath)
}

func (a *API) getCharacterAvatar(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")

	images, err := a.Images.ListByCharacter(charID, nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if len(images) == 0 {
		writeError(w, http.StatusNotFound, "no images for character")
		return
	}

	first := images[0]
	folderName := charID
	char, err := a.Characters.Get(charID)
	if err == nil && char != nil && char.FolderName != "" {
		folderName = char.FolderName
	}
	thumbPath := a.Ingester.ThumbnailPath(first.ImageID, folderName, first.EraID)
	http.ServeFile(w, r, thumbPath)
}
