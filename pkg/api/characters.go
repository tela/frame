package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/tela/frame/pkg/character"
	"github.com/tela/frame/pkg/fig"
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
		status = character.StatusProspect
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
	c.FolderName = c.Slug()

	if err := a.Characters.Create(c); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Auto-create Standard era (age 20 baseline)
	standardEra := &character.Era{
		ID:               id.New(),
		CharacterID:      c.ID,
		Label:            "Standard",
		AgeRange:         "20",
		TimePeriod:       "Present day",
		Description:      "Baseline visual identity",
		PipelineSettings: "{}",
		SortOrder:        0,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if err := a.Characters.CreateEra(standardEra); err != nil {
		log.Printf("auto-create standard era for %s: %v", c.ID, err)
	}

	if a.Audit != nil {
		a.Audit.Log("character", c.ID, "created", nil, nil, nil, map[string]string{"name": c.Name, "status": string(c.Status)})
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
	Name            *string `json:"name,omitempty"`
	DisplayName     *string `json:"display_name,omitempty"`
	Status          *string `json:"status,omitempty"`
	FigPublished    *bool   `json:"fig_published,omitempty"`
	FigCharacterURL *string `json:"fig_character_url,omitempty"`
}

func (a *API) updateCharacter(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var req updateCharacterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	if req.Status != nil {
		newStatus := character.Status(*req.Status)
		// Enforce forward-only transitions: prospect → development → cast
		c, err := a.Characters.Get(id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if c == nil {
			writeError(w, http.StatusNotFound, "character not found")
			return
		}
		if !validStatusTransition(c.Status, newStatus) {
			writeError(w, http.StatusBadRequest, fmt.Sprintf("cannot transition from %s to %s (forward-only: prospect → development → cast)", c.Status, newStatus))
			return
		}
		if err := a.Characters.UpdateStatus(id, newStatus); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if c.FigPublished {
			a.figSyncStatus(id, *req.Status)
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

	if req.FigPublished != nil || req.FigCharacterURL != nil {
		c, err := a.Characters.Get(id)
		if err != nil || c == nil {
			writeError(w, http.StatusNotFound, "character not found")
			return
		}
		published := c.FigPublished
		url := c.FigCharacterURL
		if req.FigPublished != nil {
			published = *req.FigPublished
		}
		if req.FigCharacterURL != nil {
			url = *req.FigCharacterURL
		}
		a.Characters.UpdateFigStatus(id, published, url)
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
	ID                     string `json:"id"`
	Label                  string `json:"label"`
	AgeRange               string `json:"age_range"`
	TimePeriod             string `json:"time_period"`
	Description            string `json:"description"`
	PreliminaryDescription string `json:"preliminary_description"`
	SortOrder              int    `json:"sort_order"`
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

	if req.Label == "" {
		writeError(w, http.StatusBadRequest, "label is required")
		return
	}
	if req.ID == "" {
		req.ID = id.New()
	}

	now := time.Now().UTC()
	era := &character.Era{
		ID:                req.ID,
		CharacterID:       charID,
		Label:             req.Label,
		AgeRange:          req.AgeRange,
		TimePeriod:        req.TimePeriod,
		Description:       req.Description,
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

	// Sync to Fig if character is published
	if c.FigPublished {
		a.figSyncEra(charID, fig.Era{
			ID:         era.ID,
			Label:      era.Label,
			AgeRange:   era.AgeRange,
			TimePeriod: era.TimePeriod,
			SortOrder:  era.SortOrder,
		})
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

// statusRank maps lifecycle stages to ordinal values for forward-only enforcement.
var statusRank = map[character.Status]int{
	character.StatusProspect:    0,
	character.StatusDevelopment: 1,
	character.StatusCast:        2,
}

// validStatusTransition returns true if moving from current to next is forward-only.
// Same-status is allowed (idempotent). Backward is rejected.
func validStatusTransition(current, next character.Status) bool {
	cr, cOK := statusRank[current]
	nr, nOK := statusRank[next]
	if !cOK || !nOK {
		return false // unknown status
	}
	return nr >= cr
}
