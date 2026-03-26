package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/lora"
)

func (a *API) listLoras(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	contentRating := r.URL.Query().Get("content_rating")
	loras, err := a.Loras.List(category, contentRating)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if loras == nil {
		loras = []lora.LoRA{}
	}
	writeJSON(w, http.StatusOK, loras)
}

func (a *API) createLora(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name                string  `json:"name"`
		Filename            string  `json:"filename"`
		SourceURL           string  `json:"source_url"`
		Description         string  `json:"description"`
		Category            string  `json:"category"`
		Tags                string  `json:"tags"`
		RecommendedStrength float64 `json:"recommended_strength"`
		ContentRating       string  `json:"content_rating"`
		CompatibleModels    string  `json:"compatible_models"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.Name == "" || req.Filename == "" {
		writeError(w, http.StatusBadRequest, "name and filename are required")
		return
	}
	if req.Category == "" {
		req.Category = "style"
	}
	if req.ContentRating == "" {
		req.ContentRating = "sfw"
	}
	if req.RecommendedStrength == 0 {
		req.RecommendedStrength = 0.7
	}
	if req.Tags == "" {
		req.Tags = "[]"
	}
	if req.CompatibleModels == "" {
		req.CompatibleModels = "[]"
	}

	ts := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	l := &lora.LoRA{
		ID:                  id.New(),
		Name:                req.Name,
		Filename:            req.Filename,
		SourceURL:           req.SourceURL,
		Description:         req.Description,
		Category:            req.Category,
		Tags:                req.Tags,
		RecommendedStrength: req.RecommendedStrength,
		ContentRating:       req.ContentRating,
		CompatibleModels:    req.CompatibleModels,
		CreatedAt:           ts,
		UpdatedAt:           ts,
	}
	if err := a.Loras.Create(l); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, l)
}

func (a *API) updateLora(w http.ResponseWriter, r *http.Request) {
	loraID := r.PathValue("id")
	existing, err := a.Loras.Get(loraID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if existing == nil {
		writeError(w, http.StatusNotFound, "lora not found")
		return
	}

	var req struct {
		Name                *string  `json:"name"`
		Filename            *string  `json:"filename"`
		SourceURL           *string  `json:"source_url"`
		Description         *string  `json:"description"`
		Category            *string  `json:"category"`
		Tags                *string  `json:"tags"`
		RecommendedStrength *float64 `json:"recommended_strength"`
		ContentRating       *string  `json:"content_rating"`
		CompatibleModels    *string  `json:"compatible_models"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	name := existing.Name
	filename := existing.Filename
	sourceURL := existing.SourceURL
	description := existing.Description
	category := existing.Category
	tags := existing.Tags
	strength := existing.RecommendedStrength
	contentRating := existing.ContentRating
	compatibleModels := existing.CompatibleModels

	if req.Name != nil {
		name = *req.Name
	}
	if req.Filename != nil {
		filename = *req.Filename
	}
	if req.SourceURL != nil {
		sourceURL = *req.SourceURL
	}
	if req.Description != nil {
		description = *req.Description
	}
	if req.Category != nil {
		category = *req.Category
	}
	if req.Tags != nil {
		tags = *req.Tags
	}
	if req.RecommendedStrength != nil {
		strength = *req.RecommendedStrength
	}
	if req.ContentRating != nil {
		contentRating = *req.ContentRating
	}
	if req.CompatibleModels != nil {
		compatibleModels = *req.CompatibleModels
	}

	if err := a.Loras.Update(loraID, name, filename, sourceURL, description, category, tags, strength, contentRating, compatibleModels); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (a *API) deleteLora(w http.ResponseWriter, r *http.Request) {
	loraID := r.PathValue("id")
	if err := a.Loras.Delete(loraID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
