package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/tela/frame/pkg/image"
)

type importDirectoryRequest struct {
	Path        string   `json:"path"`
	CharacterID string   `json:"character_id,omitempty"`
	EraID       string   `json:"era_id,omitempty"`
	ShootID     string   `json:"shoot_id,omitempty"` // assign imported images to this shoot
	Source      string   `json:"source,omitempty"`
	Tags        []string `json:"tags,omitempty"`
}

type importResult struct {
	Imported int      `json:"imported"`
	Skipped  int      `json:"skipped"`
	Failed   int      `json:"failed"`
	Total    int      `json:"total"`
	Errors   []string `json:"errors,omitempty"`
}

func (a *API) handleImportDirectory(w http.ResponseWriter, r *http.Request) {
	var req importDirectoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	if req.Path == "" {
		writeError(w, http.StatusBadRequest, "path is required")
		return
	}

	absPath, err := filepath.Abs(req.Path)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid path")
		return
	}
	if !a.isAllowedBrowsePath(absPath) {
		writeError(w, http.StatusForbidden, "path is outside allowed roots")
		return
	}

	info, err := os.Stat(absPath)
	if err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("path not accessible: %s", err))
		return
	}
	if !info.IsDir() {
		writeError(w, http.StatusBadRequest, "path is not a directory")
		return
	}
	req.Path = absPath

	source := image.Source(req.Source)
	if source == "" {
		source = image.SourceManual
	}

	// Resolve character slug for storage paths
	var charSlug string
	if req.CharacterID != "" {
		if c, err := a.Characters.Get(req.CharacterID); err == nil && c != nil && c.FolderName != "" {
			charSlug = c.FolderName
		}
	}

	result := importResult{}
	var errors []string
	var importedIDs []string

	err = filepath.Walk(req.Path, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			return nil
		}

		ext := strings.ToLower(filepath.Ext(path))
		if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".webp" && ext != ".tiff" && ext != ".tif" {
			return nil
		}

		result.Total++

		data, err := os.ReadFile(path)
		if err != nil {
			result.Failed++
			errors = append(errors, fmt.Sprintf("%s: read failed", filepath.Base(path)))
			return nil
		}

		var eraID *string
		if req.EraID != "" {
			eraID = &req.EraID
		}

		ingestReq := &image.IngestRequest{
			Filename:      filepath.Base(path),
			Data:          data,
			Source:        source,
			CharacterID:   req.CharacterID,
			CharacterSlug: charSlug,
			EraID:         eraID,
		}

		ingestResult, err := a.Ingester.Ingest(ingestReq)
		if err != nil {
			result.Failed++
			errors = append(errors, fmt.Sprintf("%s: %s", filepath.Base(path), err))
			return nil
		}

		if ingestResult.IsDuplicate {
			result.Skipped++
		} else {
			result.Imported++
			importedIDs = append(importedIDs, ingestResult.ImageID)
		}

		// Apply tags if specified
		for _, tagStr := range req.Tags {
			parts := strings.SplitN(tagStr, ":", 2)
			if len(parts) == 2 {
				a.Tags.AddTag(ingestResult.ImageID, parts[0], parts[1], "manual", nil)
			}
		}

		return nil
	})

	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Assign to shoot if specified
	if req.ShootID != "" && len(importedIDs) > 0 {
		if err := a.Shoots.AddImages(req.ShootID, importedIDs); err != nil {
			errors = append(errors, fmt.Sprintf("shoot assignment: %s", err))
		}
	}

	result.Errors = errors
	writeJSON(w, http.StatusOK, result)
}
