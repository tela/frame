package api

import (
	"fmt"
	"log"
	"net/http"

	"github.com/tela/frame/pkg/fig"
)

// publishToFig registers a character in Fig for producer review.
func (a *API) publishToFig(w http.ResponseWriter, r *http.Request) {
	if a.Fig == nil || !a.Fig.IsAvailable() {
		writeError(w, http.StatusServiceUnavailable, "Fig is not available")
		return
	}

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

	if c.FigPublished {
		writeError(w, http.StatusConflict, "character already published to Fig")
		return
	}

	// Build registration payload
	frameURL := fmt.Sprintf("http://localhost:%d", a.Port)
	avatarURL := fmt.Sprintf("%s/api/v1/characters/%s/avatar", frameURL, charID)

	reg := fig.CharacterRegistration{
		ID:          c.ID,
		Name:        c.Name,
		DisplayName: c.DisplayName,
		Status:      string(c.Status),
		Source:      "frame",
		FrameURL:    frameURL,
		AvatarURL:   avatarURL,
	}

	// Include eras if any exist
	eras, err := a.Characters.ListEras(charID)
	if err == nil && len(eras) > 0 {
		for _, e := range eras {
			reg.Eras = append(reg.Eras, fig.Era{
				ID:                e.ID,
				Label:             e.Label,
				AgeRange:          e.AgeRange,
				TimePeriod:        e.TimePeriod,
				VisualDescription: e.VisualDescription,
				SortOrder:         e.SortOrder,
			})
		}
	}

	if err := a.Fig.RegisterCharacter(reg); err != nil {
		writeError(w, http.StatusBadGateway, fmt.Sprintf("Fig registration failed: %v", err))
		return
	}

	// Mark as published
	a.Characters.UpdateFigStatus(charID, true, "")

	if a.Audit != nil {
		a.Audit.Log("character", charID, "published_to_fig", nil, nil, nil, nil)
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "published"})
}

// handleFigStatus returns the Fig connection state.
func (a *API) handleFigStatus(w http.ResponseWriter, r *http.Request) {
	if a.Fig == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"available": false,
			"reason":    "not configured",
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"available": a.Fig.IsAvailable(),
		"state":     a.Fig.GetState().String(),
	})
}

// figSyncStatus notifies Fig of a character status change (fire-and-forget).
func (a *API) figSyncStatus(characterID, status string) {
	if a.Fig == nil || !a.Fig.IsAvailable() {
		return
	}
	a.bgWg.Add(1)
	go func() {
		defer a.bgWg.Done()
		if err := a.Fig.UpdateCharacterStatus(characterID, status); err != nil {
			log.Printf("fig: sync status %s → %s: %v", characterID, status, err)
		}
	}()
}

// figSyncEra pushes a thin era record to Fig (fire-and-forget).
func (a *API) figSyncEra(characterID string, era fig.Era) {
	if a.Fig == nil || !a.Fig.IsAvailable() {
		return
	}
	a.bgWg.Add(1)
	go func() {
		defer a.bgWg.Done()
		if err := a.Fig.PushEra(characterID, era); err != nil {
			log.Printf("fig: sync era %s/%s: %v", characterID, era.ID, err)
		}
	}()
}

// figSyncMedia registers a media item in Fig (fire-and-forget).
func (a *API) figSyncMedia(contentType, id, name string) {
	if a.Fig == nil || !a.Fig.IsAvailable() {
		return
	}
	a.bgWg.Add(1)
	go func() {
		defer a.bgWg.Done()
		if err := a.Fig.RegisterMedia(contentType, id, name); err != nil {
			log.Printf("fig: sync media %s/%s: %v", contentType, id, err)
		}
	}()
}
