package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/tela/frame/pkg/dataset"
	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/image"
)

type createDatasetFromSearchRequest struct {
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Type        string            `json:"type"`
	Search      image.SearchParams `json:"search"`
}

func (a *API) createDatasetFromSearch(w http.ResponseWriter, r *http.Request) {
	var req createDatasetFromSearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	// Execute the search to get matching image IDs
	results, err := a.Images.Search(&req.Search)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Serialize search query as source_query
	queryJSON, _ := json.Marshal(req.Search)

	dsType := dataset.Type(req.Type)
	if dsType == "" {
		dsType = dataset.TypeGeneral
	}

	now := time.Now().UTC()
	ds := &dataset.Dataset{
		ID:          id.New(),
		Name:        req.Name,
		Description: req.Description,
		Type:        dsType,
		SourceQuery: string(queryJSON),
		ExportConfig: "{}",
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := a.Datasets.Create(ds); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Add all matching images to the dataset
	var imageIDs []string
	for _, r := range results.Images {
		imageIDs = append(imageIDs, r.ID)
	}
	if len(imageIDs) > 0 {
		a.Datasets.AddImages(ds.ID, imageIDs)
	}

	if a.Audit != nil {
		a.Audit.Log("dataset", ds.ID, "created_from_search", nil, nil, nil,
			map[string]string{"name": ds.Name, "image_count": string(rune(len(imageIDs) + '0'))})
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"dataset":     ds,
		"image_count": len(imageIDs),
	})
}
