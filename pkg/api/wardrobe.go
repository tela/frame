package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/tela/frame/pkg/garment"
	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/image"
)

func (a *API) listGarments(w http.ResponseWriter, r *http.Request) {
	q := garment.ListQuery{
		Q:                r.URL.Query().Get("q"),
		Category:         r.URL.Query().Get("category"),
		OccasionEnergy:   r.URL.Query().Get("occasion_energy"),
		Era:              r.URL.Query().Get("era"),
		AestheticCluster: r.URL.Query().Get("aesthetic_cluster"),
		DominantSignal:   r.URL.Query().Get("dominant_signal"),
		Material:         r.URL.Query().Get("material"),
		Provenance:       r.URL.Query().Get("provenance"),
		SourceSite:       r.URL.Query().Get("source_site"),
		Status:           r.URL.Query().Get("status"),
		CharacterID:      r.URL.Query().Get("character"),
		Sort:             r.URL.Query().Get("sort"),
		Order:            r.URL.Query().Get("order"),
	}
	if v := r.URL.Query().Get("limit"); v != "" {
		q.Limit, _ = strconv.Atoi(v)
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		q.Offset, _ = strconv.Atoi(v)
	}

	garments, err := a.Garments.List(q)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if garments == nil {
		garments = []garment.Garment{}
	}
	writeJSON(w, http.StatusOK, garments)
}

func (a *API) getGarmentFacets(w http.ResponseWriter, r *http.Request) {
	q := garment.ListQuery{
		Q:                r.URL.Query().Get("q"),
		Category:         r.URL.Query().Get("category"),
		OccasionEnergy:   r.URL.Query().Get("occasion_energy"),
		Era:              r.URL.Query().Get("era"),
		AestheticCluster: r.URL.Query().Get("aesthetic_cluster"),
		DominantSignal:   r.URL.Query().Get("dominant_signal"),
		Material:         r.URL.Query().Get("material"),
		Provenance:       r.URL.Query().Get("provenance"),
		SourceSite:       r.URL.Query().Get("source_site"),
		Status:           r.URL.Query().Get("status"),
		CharacterID:      r.URL.Query().Get("character"),
	}

	facets, err := a.Garments.Facets(q)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, facets)
}

func (a *API) createGarment(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name           string   `json:"name"`
		Description    string   `json:"description"`
		Category       string   `json:"category"`
		OccasionEnergy string   `json:"occasion_energy"`
		Era            string   `json:"era"`
		AestheticCluster string `json:"aesthetic_cluster"`
		DominantSignal string   `json:"dominant_signal"`
		RecessiveSignal string  `json:"recessive_signal"`
		Material       string   `json:"material"`
		Color          string   `json:"color"`
		Tags           []string `json:"tags"`
		Source         string   `json:"source"`
		Provenance     string   `json:"provenance"`
		SourceURL      string   `json:"source_url"`
		SourceSite     string   `json:"source_site"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	g := &garment.Garment{
		ID:               id.New(),
		Name:             req.Name,
		Description:      req.Description,
		Category:         req.Category,
		OccasionEnergy:   req.OccasionEnergy,
		Era:              req.Era,
		AestheticCluster: req.AestheticCluster,
		DominantSignal:   req.DominantSignal,
		RecessiveSignal:  req.RecessiveSignal,
		Material:         req.Material,
		Color:            req.Color,
		Tags:             req.Tags,
		Source:           req.Source,
		Provenance:       req.Provenance,
		SourceURL:        req.SourceURL,
		SourceSite:       req.SourceSite,
		Status:           "ingested",
	}
	if g.Source == "" {
		g.Source = "manual"
	}

	if err := a.Garments.Create(g); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	a.Audit.LogSimple("garment", g.ID, "created")
	writeJSON(w, http.StatusCreated, g)
}

func (a *API) getGarment(w http.ResponseWriter, r *http.Request) {
	gid := r.PathValue("id")
	g, err := a.Garments.Get(gid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if g == nil {
		writeError(w, http.StatusNotFound, "garment not found")
		return
	}

	// Include images and affinity in the response.
	images, _ := a.Garments.ListImages(gid)
	affinity, _ := a.Garments.ListAffinity(gid)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"garment":  g,
		"images":   images,
		"affinity": affinity,
	})
}

func (a *API) updateGarment(w http.ResponseWriter, r *http.Request) {
	gid := r.PathValue("id")
	g, err := a.Garments.Get(gid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if g == nil {
		writeError(w, http.StatusNotFound, "garment not found")
		return
	}

	var patch map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	if v, ok := patch["name"].(string); ok { g.Name = v }
	if v, ok := patch["description"].(string); ok { g.Description = v }
	if v, ok := patch["category"].(string); ok { g.Category = v }
	if v, ok := patch["occasion_energy"].(string); ok { g.OccasionEnergy = v }
	if v, ok := patch["era"].(string); ok { g.Era = v }
	if v, ok := patch["aesthetic_cluster"].(string); ok { g.AestheticCluster = v }
	if v, ok := patch["dominant_signal"].(string); ok { g.DominantSignal = v }
	if v, ok := patch["recessive_signal"].(string); ok { g.RecessiveSignal = v }
	if v, ok := patch["material"].(string); ok { g.Material = v }
	if v, ok := patch["color"].(string); ok { g.Color = v }
	if v, ok := patch["status"].(string); ok { g.Status = v }
	if v, ok := patch["tags"].([]interface{}); ok {
		tags := make([]string, 0, len(v))
		for _, t := range v {
			if s, ok := t.(string); ok {
				tags = append(tags, s)
			}
		}
		g.Tags = tags
	}

	if err := a.Garments.Update(g); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	a.Audit.LogSimple("garment", g.ID, "updated")
	writeJSON(w, http.StatusOK, g)
}

func (a *API) deleteGarment(w http.ResponseWriter, r *http.Request) {
	gid := r.PathValue("id")
	if err := a.Garments.Delete(gid); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	a.Audit.LogSimple("garment", gid, "deleted")
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) addGarmentImage(w http.ResponseWriter, r *http.Request) {
	gid := r.PathValue("id")
	g, err := a.Garments.Get(gid)
	if err != nil || g == nil {
		writeError(w, http.StatusNotFound, "garment not found")
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
		FeatureFolder: "wardrobe-" + gid,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("ingest: %v", err))
		return
	}

	// Get current image count for sort_order.
	existing, _ := a.Garments.ListImages(gid)
	sortOrder := len(existing)

	if err := a.Garments.AddImage(gid, img.ImageID, sortOrder); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Set as primary if this is the first image.
	if g.PrimaryImageID == nil {
		a.Garments.SetPrimaryImage(gid, img.ImageID)
	}

	writeJSON(w, http.StatusCreated, map[string]string{"image_id": img.ImageID})
}

func (a *API) setGarmentPrimaryImage(w http.ResponseWriter, r *http.Request) {
	gid := r.PathValue("id")
	var req struct {
		ImageID string `json:"image_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ImageID == "" {
		writeError(w, http.StatusBadRequest, "image_id required")
		return
	}

	if err := a.Garments.SetPrimaryImage(gid, req.ImageID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) bulkUpdateGarmentStatus(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs    []string `json:"ids"`
		Status string   `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if len(req.IDs) == 0 || req.Status == "" {
		writeError(w, http.StatusBadRequest, "ids and status required")
		return
	}

	if err := a.Garments.BulkUpdateStatus(req.IDs, req.Status); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	a.Audit.LogSimple("garment", "", "bulk_status_update")
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) addGarmentAffinity(w http.ResponseWriter, r *http.Request) {
	gid := r.PathValue("id")
	var req struct {
		CharacterID string `json:"character_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.CharacterID == "" {
		writeError(w, http.StatusBadRequest, "character_id required")
		return
	}

	if err := a.Garments.AddAffinity(gid, req.CharacterID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) removeGarmentAffinity(w http.ResponseWriter, r *http.Request) {
	gid := r.PathValue("id")
	charID := r.PathValue("charId")

	if err := a.Garments.RemoveAffinity(gid, charID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) listGarmentAffinity(w http.ResponseWriter, r *http.Request) {
	gid := r.PathValue("id")
	ids, err := a.Garments.ListAffinity(gid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if ids == nil {
		ids = []string{}
	}
	writeJSON(w, http.StatusOK, ids)
}
