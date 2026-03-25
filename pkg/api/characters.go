package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/tela/frame/pkg/character"
	"github.com/tela/frame/pkg/id"
)

type createCharacterRequest struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	Status      string `json:"status"`
}

func (a *API) createCharacter(w http.ResponseWriter, r *http.Request) {
	var req createCharacterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if req.ID == "" {
		req.ID = id.New()
	}

	status := character.Status(req.Status)
	if status == "" {
		status = character.StatusScouted
	}

	now := time.Now().UTC()
	c := &character.Character{
		ID:          req.ID,
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Status:      status,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := a.Characters.Create(c); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, c)
}

func (a *API) listCharacters(w http.ResponseWriter, r *http.Request) {
	chars, err := a.Characters.List()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if chars == nil {
		chars = []character.Character{}
	}
	writeJSON(w, http.StatusOK, chars)
}

func (a *API) getCharacter(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	c, err := a.Characters.Get(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if c == nil {
		writeError(w, http.StatusNotFound, "character not found")
		return
	}

	eras, err := a.Characters.ListErasWithStats(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if eras == nil {
		eras = []character.EraWithStats{}
	}

	resp := character.CharacterWithEras{
		Character: *c,
		Eras:      eras,
	}
	writeJSON(w, http.StatusOK, resp)
}

type updateCharacterRequest struct {
	Name        *string `json:"name,omitempty"`
	DisplayName *string `json:"display_name,omitempty"`
	Status      *string `json:"status,omitempty"`
}

func (a *API) updateCharacter(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var req updateCharacterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	if req.Status != nil {
		if err := a.Characters.UpdateStatus(id, character.Status(*req.Status)); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	if req.Name != nil || req.DisplayName != nil {
		c, err := a.Characters.Get(id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if c == nil {
			writeError(w, http.StatusNotFound, "character not found")
			return
		}
		name := c.Name
		displayName := c.DisplayName
		if req.Name != nil {
			name = *req.Name
		}
		if req.DisplayName != nil {
			displayName = *req.DisplayName
		}
		if err := a.Characters.Update(id, name, displayName); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	// Return updated character
	c, err := a.Characters.Get(id)
	if err != nil || c == nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch updated character")
		return
	}
	writeJSON(w, http.StatusOK, c)
}

type createEraRequest struct {
	ID                    string `json:"id"`
	Label                 string `json:"label"`
	PreliminaryDescription string `json:"preliminary_description"`
	SortOrder             int    `json:"sort_order"`
}

func (a *API) createEra(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")

	c, err := a.Characters.Get(charID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if c == nil {
		writeError(w, http.StatusNotFound, "character not found")
		return
	}

	var req createEraRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	if req.ID == "" || req.Label == "" {
		writeError(w, http.StatusBadRequest, "id and label are required")
		return
	}

	now := time.Now().UTC()
	era := &character.Era{
		ID:                req.ID,
		CharacterID:       charID,
		Label:             req.Label,
		VisualDescription: req.PreliminaryDescription,
		PipelineSettings:  "{}",
		SortOrder:         req.SortOrder,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	if err := a.Characters.CreateEra(era); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, era)
}

func (a *API) listEras(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	eras, err := a.Characters.ListEras(charID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if eras == nil {
		eras = []character.Era{}
	}
	writeJSON(w, http.StatusOK, eras)
}
