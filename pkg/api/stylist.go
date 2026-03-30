package api

import (
	"encoding/json"
	"net/http"

	"github.com/tela/frame/pkg/stylist"
)

func (a *API) listStylistSessions(w http.ResponseWriter, r *http.Request) {
	sessions := a.Stylist.List()
	writeJSON(w, http.StatusOK, sessions)
}

func (a *API) getStylistSession(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	sess := a.Stylist.Get(id)
	if sess == nil {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}
	writeJSON(w, http.StatusOK, sess)
}

func (a *API) getActiveStylistSession(w http.ResponseWriter, r *http.Request) {
	sess := a.Stylist.Active()
	if sess == nil {
		writeJSON(w, http.StatusOK, nil)
		return
	}
	writeJSON(w, http.StatusOK, sess)
}

func (a *API) startStylistSession(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Context stylist.SessionContext `json:"context"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	sess := a.Stylist.Start(req.Context)
	writeJSON(w, http.StatusCreated, sess)
}

func (a *API) endStylistSession(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := a.Stylist.End(id); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) sendStylistMessage(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.Content == "" {
		writeError(w, http.StatusBadRequest, "content is required")
		return
	}

	msg, err := a.Stylist.SendMessage(id, req.Content)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// TODO: When the agent loop is wired in (Phase 2.5/3), this endpoint will
	// also trigger the LLM call via Bifrost and append the stylist's response.
	// For now, the user message is stored and can be polled.

	writeJSON(w, http.StatusCreated, msg)
}
