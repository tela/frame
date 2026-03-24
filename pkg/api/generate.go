package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/tela/frame/pkg/bifrost"
	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/image"
)

type generateRequest struct {
	CharacterID    string   `json:"character_id"`
	EraID          string   `json:"era_id"`
	Prompt         string   `json:"prompt"`
	NegativePrompt string   `json:"negative_prompt,omitempty"`
	StylePrompt    string   `json:"style_prompt,omitempty"`
	Width          int      `json:"width,omitempty"`
	Height         int      `json:"height,omitempty"`
	Steps          int      `json:"steps,omitempty"`
	BatchSize      int      `json:"batch_size,omitempty"`
	Seed           int      `json:"seed,omitempty"`
	LoraAdapter    string   `json:"lora_adapter,omitempty"`
	LoraStrength   float64  `json:"lora_strength,omitempty"`
	ContentRating  string   `json:"content_rating,omitempty"`
	ProviderName   string   `json:"provider_name,omitempty"`
	IncludeRefs    bool     `json:"include_refs"`
	RefImageIDs    []string `json:"ref_image_ids,omitempty"` // additional ref images by ID
}

type generateResponse struct {
	JobID  string              `json:"job_id"`
	Images []generateImageResult `json:"images"`
}

type generateImageResult struct {
	ImageID string `json:"image_id"`
	Width   int    `json:"width"`
	Height  int    `json:"height"`
	Format  string `json:"format"`
}

func (a *API) handleGenerate(w http.ResponseWriter, r *http.Request) {
	if a.Bifrost == nil {
		writeError(w, http.StatusServiceUnavailable, "Bifrost not configured")
		return
	}

	var req generateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	if req.Prompt == "" {
		writeError(w, http.StatusBadRequest, "prompt is required")
		return
	}
	if req.CharacterID == "" {
		writeError(w, http.StatusBadRequest, "character_id is required")
		return
	}

	// Build reference images from the era's reference package
	var refs []bifrost.ReferenceImage
	if req.IncludeRefs && req.EraID != "" {
		faceRefs, _ := a.Images.ListFaceRefs(req.CharacterID, req.EraID)
		for _, fr := range faceRefs {
			img, err := a.Images.Get(fr.ImageID)
			if err != nil || img == nil {
				continue
			}
			refs = append(refs, bifrost.ReferenceImage{
				URL:   fmt.Sprintf("http://localhost:%d/api/v1/images/%s", a.Port, fr.ImageID),
				Type:  bifrost.RefTypeFace,
				Label: fmt.Sprintf("face ref rank %d", fr.RefRank),
			})
		}
		bodyRefs, _ := a.Images.ListBodyRefs(req.CharacterID, req.EraID)
		for _, br := range bodyRefs {
			img, err := a.Images.Get(br.ImageID)
			if err != nil || img == nil {
				continue
			}
			refs = append(refs, bifrost.ReferenceImage{
				URL:   fmt.Sprintf("http://localhost:%d/api/v1/images/%s", a.Port, br.ImageID),
				Type:  bifrost.RefTypeBody,
				Label: fmt.Sprintf("body ref rank %d", br.RefRank),
			})
		}
	}

	// Add any explicitly requested ref images
	for _, refID := range req.RefImageIDs {
		refs = append(refs, bifrost.ReferenceImage{
			URL:  fmt.Sprintf("http://localhost:%d/api/v1/images/%s", a.Port, refID),
			Type: bifrost.RefTypeFace,
		})
	}

	// Defaults
	width := req.Width
	if width == 0 {
		width = 1024
	}
	height := req.Height
	if height == 0 {
		height = 1024
	}
	steps := req.Steps
	if steps == 0 {
		steps = 30
	}
	batchSize := req.BatchSize
	if batchSize == 0 {
		batchSize = 1
	}
	contentRating := req.ContentRating
	if contentRating == "" {
		contentRating = bifrost.ContentNSFW
	}

	// Generate images (one at a time since Bifrost returns one per request)
	jobID := id.New()
	var results []generateImageResult

	for i := 0; i < batchSize; i++ {
		genReq := &bifrost.ImageGenRequest{
			Prompt:          req.Prompt,
			NegativePrompt:  req.NegativePrompt,
			StylePrompt:     req.StylePrompt,
			Width:           width,
			Height:          height,
			Steps:           steps,
			ReferenceImages: refs,
			LoraAdapter:     req.LoraAdapter,
			LoraStrength:    req.LoraStrength,
			Meta: bifrost.RequestMeta{
				Tier:          bifrost.TierComplex,
				ContentRating: contentRating,
				ProviderName:  req.ProviderName,
			},
		}

		imgData, contentType, err := a.Bifrost.GenerateImageBytes(genReq)
		if err != nil {
			writeError(w, http.StatusInternalServerError, fmt.Sprintf("generation failed (image %d): %s", i+1, err))
			return
		}

		// Determine format from content type
		format := "png"
		if contentType == "image/jpeg" {
			format = "jpg"
		}

		// Ingest the generated image
		var eraID *string
		if req.EraID != "" {
			eraID = &req.EraID
		}

		ingestReq := &image.IngestRequest{
			Filename:    fmt.Sprintf("generated_%s_%d.%s", jobID, i, format),
			Data:        imgData,
			Source:      image.SourceComfyUI,
			CharacterID: req.CharacterID,
			EraID:       eraID,
		}

		result, err := a.Ingester.Ingest(ingestReq)
		if err != nil {
			writeError(w, http.StatusInternalServerError, fmt.Sprintf("ingest failed (image %d): %s", i+1, err))
			return
		}

		results = append(results, generateImageResult{
			ImageID: result.ImageID,
			Width:   result.Width,
			Height:  result.Height,
			Format:  result.Format,
		})
	}

	writeJSON(w, http.StatusOK, generateResponse{
		JobID:  jobID,
		Images: results,
	})
}

// handleBifrostStatus returns Bifrost's availability and provider info.
func (a *API) handleBifrostStatus(w http.ResponseWriter, r *http.Request) {
	if a.Bifrost == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"available": false,
			"reason":    "not configured",
		})
		return
	}

	available := a.Bifrost.Available()
	resp := map[string]any{
		"available": available,
	}

	if available {
		providers, err := a.Bifrost.ListProviders()
		if err == nil {
			resp["providers"] = providers
		}
	}

	writeJSON(w, http.StatusOK, resp)
}
