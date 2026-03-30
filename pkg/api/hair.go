package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/tela/frame/pkg/hairstyle"
	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/image"
)

func (a *API) listHairstyles(w http.ResponseWriter, r *http.Request) {
	q := hairstyle.ListQuery{
		Q:           r.URL.Query().Get("q"),
		Length:      r.URL.Query().Get("length"),
		Texture:     r.URL.Query().Get("texture"),
		Style:       r.URL.Query().Get("style"),
		Status:      r.URL.Query().Get("status"),
		CharacterID: r.URL.Query().Get("character"),
		Sort:        r.URL.Query().Get("sort"),
		Order:       r.URL.Query().Get("order"),
	}
	if v := r.URL.Query().Get("limit"); v != "" {
		q.Limit, _ = strconv.Atoi(v)
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		q.Offset, _ = strconv.Atoi(v)
	}

	items, err := a.Hairstyles.List(q)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if items == nil {
		items = []hairstyle.Hairstyle{}
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *API) getHairstyleFacets(w http.ResponseWriter, r *http.Request) {
	q := hairstyle.ListQuery{
		Q:           r.URL.Query().Get("q"),
		Length:      r.URL.Query().Get("length"),
		Texture:     r.URL.Query().Get("texture"),
		Style:       r.URL.Query().Get("style"),
		Status:      r.URL.Query().Get("status"),
		CharacterID: r.URL.Query().Get("character"),
	}
	facets, err := a.Hairstyles.Facets(q)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, facets)
}

func (a *API) createHairstyle(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name        string   `json:"name"`
		Description string   `json:"description"`
		Length      string   `json:"length"`
		Texture     string   `json:"texture"`
		Style       string   `json:"style"`
		Color       string   `json:"color"`
		Tags        []string `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	h := &hairstyle.Hairstyle{
		ID:          id.New(),
		Name:        req.Name,
		Description: req.Description,
		Length:      req.Length,
		Texture:     req.Texture,
		Style:       req.Style,
		Color:       req.Color,
		Tags:        req.Tags,
		Source:      "manual",
		Status:      "ingested",
	}
	if err := a.Hairstyles.Create(h); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	a.Audit.LogSimple("hairstyle", h.ID, "created")
	writeJSON(w, http.StatusCreated, h)
}

func (a *API) getHairstyle(w http.ResponseWriter, r *http.Request) {
	hid := r.PathValue("id")
	h, err := a.Hairstyles.Get(hid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if h == nil {
		writeError(w, http.StatusNotFound, "hairstyle not found")
		return
	}
	images, _ := a.Hairstyles.ListImages(hid)
	affinity, _ := a.Hairstyles.ListAffinity(hid)
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"hairstyle": h,
		"images":    images,
		"affinity":  affinity,
	})
}

func (a *API) updateHairstyle(w http.ResponseWriter, r *http.Request) {
	hid := r.PathValue("id")
	h, err := a.Hairstyles.Get(hid)
	if err != nil || h == nil {
		writeError(w, http.StatusNotFound, "hairstyle not found")
		return
	}

	var patch map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	if v, ok := patch["name"].(string); ok { h.Name = v }
	if v, ok := patch["description"].(string); ok { h.Description = v }
	if v, ok := patch["length"].(string); ok { h.Length = v }
	if v, ok := patch["texture"].(string); ok { h.Texture = v }
	if v, ok := patch["style"].(string); ok { h.Style = v }
	if v, ok := patch["color"].(string); ok { h.Color = v }
	if v, ok := patch["status"].(string); ok { h.Status = v }
	if v, ok := patch["tags"].([]interface{}); ok {
		tags := make([]string, 0, len(v))
		for _, t := range v {
			if s, ok := t.(string); ok {
				tags = append(tags, s)
			}
		}
		h.Tags = tags
	}

	if err := a.Hairstyles.Update(h); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	a.Audit.LogSimple("hairstyle", h.ID, "updated")
	writeJSON(w, http.StatusOK, h)
}

func (a *API) deleteHairstyle(w http.ResponseWriter, r *http.Request) {
	hid := r.PathValue("id")
	a.Hairstyles.Delete(hid)
	a.Audit.LogSimple("hairstyle", hid, "deleted")
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) addHairstyleImage(w http.ResponseWriter, r *http.Request) {
	hid := r.PathValue("id")
	h, err := a.Hairstyles.Get(hid)
	if err != nil || h == nil {
		writeError(w, http.StatusNotFound, "hairstyle not found")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file required")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "read file")
		return
	}

	img, err := a.Ingester.Ingest(&image.IngestRequest{
		Filename:      header.Filename,
		Data:          data,
		Source:        image.SourceManual,
		FeatureFolder: "hair-" + hid,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("ingest: %v", err))
		return
	}

	existing, _ := a.Hairstyles.ListImages(hid)
	a.Hairstyles.AddImage(hid, img.ImageID, len(existing))
	if h.PrimaryImageID == nil {
		a.Hairstyles.SetPrimaryImage(hid, img.ImageID)
	}

	writeJSON(w, http.StatusCreated, map[string]string{"image_id": img.ImageID})
}

func (a *API) setHairstylePrimaryImage(w http.ResponseWriter, r *http.Request) {
	hid := r.PathValue("id")
	var req struct {
		ImageID string `json:"image_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ImageID == "" {
		writeError(w, http.StatusBadRequest, "image_id required")
		return
	}
	a.Hairstyles.SetPrimaryImage(hid, req.ImageID)
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) bulkUpdateHairstyleStatus(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs    []string `json:"ids"`
		Status string   `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.IDs) == 0 || req.Status == "" {
		writeError(w, http.StatusBadRequest, "ids and status required")
		return
	}
	a.Hairstyles.BulkUpdateStatus(req.IDs, req.Status)
	a.Audit.LogSimple("hairstyle", "", "bulk_status_update")
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) addHairstyleAffinity(w http.ResponseWriter, r *http.Request) {
	hid := r.PathValue("id")
	var req struct {
		CharacterID string `json:"character_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CharacterID == "" {
		writeError(w, http.StatusBadRequest, "character_id required")
		return
	}
	a.Hairstyles.AddAffinity(hid, req.CharacterID)
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) removeHairstyleAffinity(w http.ResponseWriter, r *http.Request) {
	a.Hairstyles.RemoveAffinity(r.PathValue("id"), r.PathValue("charId"))
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) listHairstyleAffinity(w http.ResponseWriter, r *http.Request) {
	ids, _ := a.Hairstyles.ListAffinity(r.PathValue("id"))
	if ids == nil {
		ids = []string{}
	}
	writeJSON(w, http.StatusOK, ids)
}
