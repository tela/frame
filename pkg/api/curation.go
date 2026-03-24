package api

import (
	"encoding/json"
	"net/http"

	"github.com/tela/frame/pkg/image"
)

func (a *API) updateCharacterImage(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	imageID := r.PathValue("imageId")

	var update image.CharacterImageUpdate
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	if err := a.Images.UpdateCharacterImage(imageID, charID, &update); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Return the updated record
	ci, err := a.Images.GetCharacterImage(imageID)
	if err != nil || ci == nil {
		writeError(w, http.StatusNotFound, "image not found")
		return
	}
	writeJSON(w, http.StatusOK, ci)
}

func (a *API) listPendingImages(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	eraID := r.URL.Query().Get("era_id")

	var eraPtr *string
	if eraID != "" {
		eraPtr = &eraID
	}

	images, err := a.Images.ListPendingByCharacter(charID, eraPtr)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if images == nil {
		images = []image.CharacterImage{}
	}
	writeJSON(w, http.StatusOK, images)
}
