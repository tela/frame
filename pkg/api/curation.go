package api

import (
	"encoding/json"
	"fmt"
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

	// Get old state for audit logging
	oldCI, _ := a.Images.GetCharacterImage(imageID)

	if err := a.Images.UpdateCharacterImage(imageID, charID, &update); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Audit log key changes
	ctx := map[string]string{"character_id": charID}
	if update.Rating != nil && a.Audit != nil {
		oldVal := "—"
		if oldCI != nil && oldCI.Rating != nil {
			oldVal = fmt.Sprintf("%d", *oldCI.Rating)
		}
		a.Audit.LogFieldChange("image", imageID, "rating_changed", "rating", oldVal, fmt.Sprintf("%d", *update.Rating), ctx)
	}
	if update.TriageStatus != nil && a.Audit != nil {
		oldVal := "—"
		if oldCI != nil {
			oldVal = string(oldCI.TriageStatus)
		}
		a.Audit.LogFieldChange("image", imageID, "triage_"+string(*update.TriageStatus), "triage_status", oldVal, string(*update.TriageStatus), ctx)
	}
	if update.SetType != nil && a.Audit != nil {
		oldVal := "—"
		if oldCI != nil {
			oldVal = string(oldCI.SetType)
		}
		a.Audit.LogFieldChange("image", imageID, "set_type_changed", "set_type", oldVal, string(*update.SetType), ctx)
	}
	if update.RefType != nil && *update.RefType != "" && a.Audit != nil {
		a.Audit.LogSimple("image", imageID, *update.RefType+"_ref_promoted")
	}
	if update.Caption != nil && a.Audit != nil {
		a.Audit.LogSimple("image", imageID, "caption_changed")
	}

	// Return the updated record
	ci, err := a.Images.GetCharacterImage(imageID)
	if err != nil || ci == nil {
		writeError(w, http.StatusNotFound, "image not found")
		return
	}
	writeJSON(w, http.StatusOK, ci)
}

func (a *API) deleteCharacterImage(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	imageID := r.PathValue("imageId")

	if err := a.Images.DeleteCharacterImage(imageID, charID); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	if a.Audit != nil {
		a.Audit.Log("image", imageID, "deleted", nil, nil, nil, map[string]string{"character_id": charID})
	}

	w.WriteHeader(http.StatusNoContent)
}

func (a *API) bulkUpdateCharacterImages(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	var req struct {
		ImageIDs []string                  `json:"image_ids"`
		Update   image.CharacterImageUpdate `json:"update"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if len(req.ImageIDs) == 0 {
		writeError(w, http.StatusBadRequest, "image_ids is required")
		return
	}

	affected, err := a.Images.BulkUpdateCharacterImages(charID, req.ImageIDs, &req.Update)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if a.Audit != nil {
		action := "bulk_updated"
		if req.Update.RefType != nil && *req.Update.RefType != "" {
			action = "bulk_" + *req.Update.RefType + "_ref"
		} else if req.Update.SetType != nil {
			action = "bulk_set_type_" + string(*req.Update.SetType)
		} else if req.Update.TriageStatus != nil {
			action = "bulk_triage_" + string(*req.Update.TriageStatus)
		}
		a.Audit.Log("character", charID, action, nil, nil, nil,
			map[string]string{"count": fmt.Sprintf("%d", affected)})
	}

	writeJSON(w, http.StatusOK, map[string]any{"affected": affected})
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

func (a *API) toggleFavorite(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	imageID := r.PathValue("imageId")
	var req struct {
		Favorited bool `json:"favorited"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if err := a.Images.ToggleFavorite(imageID, charID, req.Favorited); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"favorited": req.Favorited})
}

func (a *API) listFavorites(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	images, err := a.Images.ListFavorites(charID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if images == nil {
		images = []image.CharacterImage{}
	}
	writeJSON(w, http.StatusOK, images)
}
