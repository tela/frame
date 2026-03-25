package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/shoot"
)

func (a *API) listShoots(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	shoots, err := a.Shoots.List(charID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if shoots == nil {
		shoots = []shoot.Shoot{}
	}
	writeJSON(w, http.StatusOK, shoots)
}

func (a *API) createShoot(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.Name == "" {
		req.Name = time.Now().Format("2006-01-02 Shoot")
	}
	sh := &shoot.Shoot{
		ID:          id.New(),
		CharacterID: charID,
		Name:        req.Name,
		CreatedAt:   time.Now().UTC(),
	}
	if err := a.Shoots.Create(sh); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, sh)
}

func (a *API) deleteShoot(w http.ResponseWriter, r *http.Request) {
	shootID := r.PathValue("shootId")
	if err := a.Shoots.Delete(shootID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (a *API) addShootImage(w http.ResponseWriter, r *http.Request) {
	shootID := r.PathValue("shootId")
	var req struct {
		ImageID string `json:"image_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if err := a.Shoots.AddImage(shootID, req.ImageID, 0); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"status": "added"})
}

func (a *API) listShootImages(w http.ResponseWriter, r *http.Request) {
	shootID := r.PathValue("shootId")
	ids, err := a.Shoots.ListImages(shootID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if ids == nil {
		ids = []string{}
	}
	writeJSON(w, http.StatusOK, ids)
}
