package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/tela/frame/pkg/dataset"
	"github.com/tela/frame/pkg/id"
)

func (a *API) listDatasets(w http.ResponseWriter, r *http.Request) {
	datasets, err := a.Datasets.List()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if datasets == nil {
		datasets = []dataset.DatasetWithStats{}
	}
	writeJSON(w, http.StatusOK, datasets)
}

func (a *API) createDataset(w http.ResponseWriter, r *http.Request) {
	var d dataset.Dataset
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if d.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if d.ID == "" {
		d.ID = id.New()
	}
	if d.Type == "" {
		d.Type = dataset.TypeGeneral
	}
	if d.SourceQuery == "" {
		d.SourceQuery = "{}"
	}
	if d.ExportConfig == "" {
		d.ExportConfig = "{}"
	}
	now := time.Now().UTC()
	d.CreatedAt = now
	d.UpdatedAt = now
	if err := a.Datasets.Create(&d); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if a.Audit != nil {
		a.Audit.Log("dataset", d.ID, "created", nil, nil, nil, map[string]string{"name": d.Name, "type": string(d.Type)})
	}
	writeJSON(w, http.StatusCreated, d)
}

func (a *API) getDataset(w http.ResponseWriter, r *http.Request) {
	dsID := r.PathValue("id")
	d, err := a.Datasets.Get(dsID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if d == nil {
		writeError(w, http.StatusNotFound, "dataset not found")
		return
	}
	images, err := a.Datasets.ListImages(dsID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"dataset": d,
		"images":  images,
	})
}

func (a *API) updateDataset(w http.ResponseWriter, r *http.Request) {
	dsID := r.PathValue("id")
	var req struct {
		Name         string `json:"name"`
		Description  string `json:"description"`
		ExportConfig string `json:"export_config"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if err := a.Datasets.Update(dsID, req.Name, req.Description, req.ExportConfig); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (a *API) deleteDataset(w http.ResponseWriter, r *http.Request) {
	dsID := r.PathValue("id")
	if err := a.Datasets.Delete(dsID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if a.Audit != nil {
		a.Audit.Log("dataset", dsID, "deleted", nil, nil, nil, nil)
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (a *API) forkDataset(w http.ResponseWriter, r *http.Request) {
	dsID := r.PathValue("id")
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.Name == "" {
		req.Name = "Fork"
	}
	forked, err := a.Datasets.Fork(dsID, req.Name)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if a.Audit != nil {
		a.Audit.Log("dataset", forked.ID, "forked", nil, nil, nil, map[string]string{"source_id": dsID, "name": req.Name})
	}
	writeJSON(w, http.StatusCreated, forked)
}

func (a *API) addDatasetImages(w http.ResponseWriter, r *http.Request) {
	dsID := r.PathValue("id")
	var req struct {
		ImageIDs []string `json:"image_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if err := a.Datasets.AddImages(dsID, req.ImageIDs); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"added": len(req.ImageIDs)})
}

func (a *API) removeDatasetImage(w http.ResponseWriter, r *http.Request) {
	dsID := r.PathValue("id")
	imgID := r.PathValue("imgId")
	if err := a.Datasets.RemoveImage(dsID, imgID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "removed"})
}

func (a *API) updateDatasetImage(w http.ResponseWriter, r *http.Request) {
	dsID := r.PathValue("id")
	imgID := r.PathValue("imgId")
	var req struct {
		Caption   *string `json:"caption,omitempty"`
		SortOrder *int    `json:"sort_order,omitempty"`
		Included  *bool   `json:"included,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if err := a.Datasets.UpdateImage(dsID, imgID, req.Caption, req.SortOrder, req.Included); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}
