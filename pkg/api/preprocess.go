package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/image"
	"github.com/tela/frame/pkg/preprocess"
)

type applyPreprocessRequest struct {
	ImageID    string                `json:"image_id"`
	Operations []preprocess.Operation `json:"operations"`
	PresetID   string                `json:"preset_id,omitempty"` // use preset instead of inline ops
}

type applyPreprocessResponse struct {
	DerivativeID string `json:"derivative_id"`
	ImageID      string `json:"image_id"` // new image ingested from result
	Width        int    `json:"width"`
	Height       int    `json:"height"`
	Format       string `json:"format"`
}

func (a *API) applyPreprocess(w http.ResponseWriter, r *http.Request) {
	var req applyPreprocessRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.ImageID == "" {
		writeError(w, http.StatusBadRequest, "image_id is required")
		return
	}

	// Resolve operations from preset if specified
	ops := req.Operations
	if req.PresetID != "" && len(ops) == 0 {
		preset, err := a.Preprocess.GetPreset(req.PresetID)
		if err != nil || preset == nil {
			writeError(w, http.StatusNotFound, "preset not found")
			return
		}
		ops = preset.Operations
	}
	if len(ops) == 0 {
		writeError(w, http.StatusBadRequest, "operations or preset_id required")
		return
	}

	// Read source image data
	srcImg, err := a.Images.Get(req.ImageID)
	if err != nil || srcImg == nil {
		writeError(w, http.StatusNotFound, "source image not found")
		return
	}

	srcPath := a.resolveImagePath(req.ImageID, srcImg.Format)
	srcData, err := os.ReadFile(srcPath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("read source image: %v", err))
		return
	}

	// Apply operations
	resultData, format, err := preprocess.Apply(srcData, ops)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("preprocess: %v", err))
		return
	}

	// Ingest the result as a new image
	ci, _ := a.Images.GetCharacterImage(req.ImageID)
	charID := ""
	charSlug := ""
	var eraID *string
	if ci != nil {
		charID = ci.CharacterID
		char, _ := a.Characters.Get(ci.CharacterID)
		if char != nil && char.FolderName != "" {
			charSlug = char.FolderName
		}
		if ci.EraID != nil {
			eraID = ci.EraID
		}
	}

	ingestReq := &image.IngestRequest{
		Filename:      fmt.Sprintf("derivative_%s.%s", id.New()[:8], format),
		Data:          resultData,
		Source:        image.SourceManual,
		CharacterID:   charID,
		CharacterSlug: charSlug,
		EraID:         eraID,
	}

	result, err := a.Ingester.Ingest(ingestReq)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("ingest result: %v", err))
		return
	}

	// Record derivative with operation history
	now := time.Now().UTC()
	for i := range ops {
		if ops[i].Timestamp.IsZero() {
			ops[i].Timestamp = now
		}
	}

	deriv := &preprocess.Derivative{
		ID:            id.New(),
		SourceImageID: req.ImageID,
		Operations:    ops,
		CreatedAt:     now,
	}
	if err := a.Preprocess.CreateDerivative(deriv); err != nil {
		// Non-fatal — image was created, derivative record failed
	}

	if a.Audit != nil {
		a.Audit.Log("image", result.ImageID, "preprocessed", nil, nil, nil,
			map[string]string{"source_image": req.ImageID, "derivative_id": deriv.ID})
	}

	writeJSON(w, http.StatusCreated, applyPreprocessResponse{
		DerivativeID: deriv.ID,
		ImageID:      result.ImageID,
		Width:        result.Width,
		Height:       result.Height,
		Format:       result.Format,
	})
}
