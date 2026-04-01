package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/tela/frame/pkg/bifrost"
	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/image"
)

const (
	providerFlux     = "runpod-serverless-flux"
	providerLocalSDXL = "local-sdxl"
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
	Tier           string   `json:"tier,omitempty"`          // cheap, complex, frontier (default: complex)
	Workflow       string   `json:"workflow,omitempty"`       // txt2img, img2img, multi_ref, pose_transfer, upscale
	ProviderName   string   `json:"provider_name,omitempty"`
	IncludeRefs    bool     `json:"include_refs"`
	RefImageIDs    []string `json:"ref_image_ids,omitempty"`
	SourceImageID  string   `json:"source_image_id,omitempty"` // for img2img/refinement
	DenoiseStrength float64 `json:"denoise_strength,omitempty"` // for img2img (0.0-1.0)
	PoseID         string   `json:"pose_id,omitempty"`         // standard pose tracking
	OutfitID       string   `json:"outfit_id,omitempty"`       // standard outfit tracking
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
		refTypeMap := map[image.RefType]string{
			image.RefFace:    bifrost.RefTypeFace,
			image.RefBody:    bifrost.RefTypeBody,
			image.RefBreasts: bifrost.RefTypeBreasts,
			image.RefVagina:  bifrost.RefTypeVagina,
		}
		for _, rt := range image.ValidRefTypes {
			rtRefs, _ := a.Images.ListRefsByType(req.CharacterID, req.EraID, rt)
			bifrostType := refTypeMap[rt]
			for _, ref := range rtRefs {
				if img, _ := a.Images.Get(ref.ImageID); img == nil {
					continue
				}
				refs = append(refs, bifrost.ReferenceImage{
					URL:   fmt.Sprintf("http://localhost:%d/api/v1/images/%s", a.Port, ref.ImageID),
					Type:  bifrostType,
					Label: fmt.Sprintf("%s ref rank %d", rt, ref.RefRank),
				})
			}
		}
	}

	// Add any explicitly requested ref images
	for _, refID := range req.RefImageIDs {
		refs = append(refs, bifrost.ReferenceImage{
			URL:  fmt.Sprintf("http://localhost:%d/api/v1/images/%s", a.Port, refID),
			Type: bifrost.RefTypeFace,
		})
	}

	// Source image for img2img/refinement workflows
	if req.SourceImageID != "" {
		refs = append(refs, bifrost.ReferenceImage{
			URL:   fmt.Sprintf("http://localhost:%d/api/v1/images/%s", a.Port, req.SourceImageID),
			Type:  "input_image",
			Label: "source image for refinement",
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
		contentRating = bifrost.ContentSFW
	}
	tier := req.Tier
	if tier == "" {
		tier = bifrost.TierCheap
	}

	// Route to the right provider based on workflow and content rating.
	providerName := req.ProviderName
	if providerName == "" {
		providerName = inferProvider(req.Workflow, contentRating)
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
				Tier:          tier,
				ContentRating: contentRating,
				ProviderName:  providerName,
			},
		}

		if req.DenoiseStrength > 0 {
			genReq.DenoiseStrength = req.DenoiseStrength
		}
		if req.Workflow != "" {
			genReq.WorkflowTemplate = req.Workflow
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

		// Resolve character slug for disk path consistency
		charSlug := req.CharacterID
		if char, _ := a.Characters.Get(req.CharacterID); char != nil && char.FolderName != "" {
			charSlug = char.FolderName
		}

		ingestReq := &image.IngestRequest{
			Filename:      fmt.Sprintf("generated_%s_%d.%s", jobID, i, format),
			Data:          imgData,
			Source:        image.SourceComfyUI,
			CharacterID:   req.CharacterID,
			CharacterSlug: charSlug,
			EraID:         eraID,
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

// inferProvider selects the bifrost provider based on workflow and content rating.
// SDXL workflows always route to local-sdxl. Plain SFW prompts use fast Flux on RunPod.
// Everything else falls back to local-sdxl.
func inferProvider(workflow, contentRating string) string {
	if strings.HasPrefix(workflow, "sdxl_") {
		return providerLocalSDXL
	}
	if workflow == "" && contentRating == bifrost.ContentSFW {
		return providerFlux
	}
	return providerLocalSDXL
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
