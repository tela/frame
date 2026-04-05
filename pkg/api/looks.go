package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/tela/frame/pkg/bifrost"
	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/image"
	"github.com/tela/frame/pkg/look"
	"time"
)

func (a *API) listLooks(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	looks, err := a.Looks.ListByCharacter(charID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if looks == nil {
		looks = []look.LookWithDetails{}
	}
	writeJSON(w, http.StatusOK, looks)
}

func (a *API) createLook(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	var req struct {
		Name            string   `json:"name"`
		EraID           string   `json:"era_id"`
		WardrobeItemIDs []string `json:"wardrobe_item_ids"`
		IsDefault       bool     `json:"is_default"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	idsJSON := []byte("[]")
	if req.WardrobeItemIDs != nil {
		b, err := json.Marshal(req.WardrobeItemIDs)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid wardrobe_item_ids")
			return
		}
		idsJSON = b
	}

	l := &look.Look{
		ID:              id.New(),
		CharacterID:     charID,
		EraID:           req.EraID,
		Name:            req.Name,
		WardrobeItemIDs: string(idsJSON),
		IsDefault:       req.IsDefault,
		CreatedAt:       time.Now().UTC().Format("2006-01-02T15:04:05Z"),
	}

	if l.IsDefault {
		// Clear other defaults first
		a.Looks.Update(l.ID, "", "", boolPtr(false)) // no-op on new, but clears via charID
	}

	if err := a.Looks.Create(l); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if l.IsDefault {
		a.Looks.Update(l.ID, "", "", boolPtr(true))
	}

	if a.Audit != nil {
		a.Audit.Log("look", l.ID, "created", nil, nil, nil, map[string]string{"name": l.Name, "character_id": charID})
	}

	writeJSON(w, http.StatusCreated, l)
}

func (a *API) updateLook(w http.ResponseWriter, r *http.Request) {
	lookID := r.PathValue("lookId")
	var req struct {
		Name            *string  `json:"name,omitempty"`
		WardrobeItemIDs []string `json:"wardrobe_item_ids,omitempty"`
		IsDefault       *bool    `json:"is_default,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	name := ""
	if req.Name != nil {
		name = *req.Name
	}
	idsJSON := ""
	if req.WardrobeItemIDs != nil {
		b, err := json.Marshal(req.WardrobeItemIDs)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid wardrobe_item_ids")
			return
		}
		idsJSON = string(b)
	}

	if err := a.Looks.Update(lookID, name, idsJSON, req.IsDefault); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if a.Audit != nil {
		a.Audit.Log("look", lookID, "updated", nil, nil, nil, nil)
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (a *API) deleteLook(w http.ResponseWriter, r *http.Request) {
	lookID := r.PathValue("lookId")
	if err := a.Looks.Delete(lookID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if a.Audit != nil {
		a.Audit.Log("look", lookID, "deleted", nil, nil, nil, nil)
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (a *API) getLookTryOn(w http.ResponseWriter, r *http.Request) {
	lookID := r.PathValue("lookId")
	imageIDs, err := a.Looks.ListTryOnImages(lookID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if imageIDs == nil {
		imageIDs = []string{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"look_id": lookID, "images": imageIDs})
}

// generateLookTryOn generates try-on images for a look using standard SFW poses.
func (a *API) generateLookTryOn(w http.ResponseWriter, r *http.Request) {
	lookID := r.PathValue("lookId")

	if a.Bifrost == nil {
		writeError(w, http.StatusServiceUnavailable, "Bifrost not configured")
		return
	}

	l, err := a.Looks.Get(lookID)
	if err != nil || l == nil {
		writeError(w, http.StatusNotFound, "look not found")
		return
	}

	// Parse request for prompt override
	var req struct {
		Prompt string `json:"prompt,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	if req.Prompt == "" {
		writeError(w, http.StatusBadRequest, "prompt is required")
		return
	}

	// Resolve garment images as references
	var garmentIDs []string
	if err := json.Unmarshal([]byte(l.WardrobeItemIDs), &garmentIDs); err != nil {
		writeError(w, http.StatusInternalServerError, "corrupt wardrobe_item_ids in look")
		return
	}

	var refs []bifrost.ReferenceImage

	// Add character face/body refs if era is set
	if l.EraID != "" {
		faceRefs, _ := a.Images.ListFaceRefs(l.CharacterID, l.EraID)
		for _, fr := range faceRefs {
			refs = append(refs, bifrost.ReferenceImage{
				URL:   fmt.Sprintf("http://localhost:%d/api/v1/images/%s", a.Port, fr.ImageID),
				Type:  bifrost.RefTypeFace,
				Label: fmt.Sprintf("face ref rank %d", fr.RefRank),
			})
		}
		bodyRefs, _ := a.Images.ListBodyRefs(l.CharacterID, l.EraID)
		for _, br := range bodyRefs {
			refs = append(refs, bifrost.ReferenceImage{
				URL:   fmt.Sprintf("http://localhost:%d/api/v1/images/%s", a.Port, br.ImageID),
				Type:  bifrost.RefTypeBody,
				Label: fmt.Sprintf("body ref rank %d", br.RefRank),
			})
		}
	}

	// Add garment images as garment_ref
	for _, gID := range garmentIDs {
		item, err := a.Media.Get(gID)
		if err != nil || item == nil {
			continue
		}
		if item.PrimaryImageID != nil {
			refs = append(refs, bifrost.ReferenceImage{
				URL:   fmt.Sprintf("http://localhost:%d/api/v1/images/%s", a.Port, *item.PrimaryImageID),
				Type:  bifrost.RefTypeGarment,
				Label: item.Name,
			})
		}
	}

	// Generate one image
	genReq := &bifrost.ImageGenRequest{
		Prompt:          req.Prompt,
		Width:           768,
		Height:          1024,
		Steps:           30,
		ReferenceImages: refs,
		Meta: bifrost.RequestMeta{
			Tier:          bifrost.TierComplex,
			ContentRating: bifrost.ContentSFW,
		},
	}

	imgData, contentType, err := a.Bifrost.GenerateImageBytes(genReq)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("generation failed: %v", err))
		return
	}

	format := "png"
	if contentType == "image/jpeg" {
		format = "jpg"
	}

	// Resolve character slug for storage
	charSlug := l.CharacterID
	if char, _ := a.Characters.Get(l.CharacterID); char != nil && char.FolderName != "" {
		charSlug = char.FolderName
	}

	var eraID *string
	if l.EraID != "" {
		eraID = &l.EraID
	}

	ingestReq := &image.IngestRequest{
		Filename:      fmt.Sprintf("tryon_%s_%s.%s", lookID, id.New()[:8], format),
		Data:          imgData,
		Source:        image.SourceComfyUI,
		CharacterID:   l.CharacterID,
		CharacterSlug: charSlug,
		EraID:         eraID,
	}

	result, err := a.Ingester.Ingest(ingestReq)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("ingest failed: %v", err))
		return
	}

	// Link to look
	a.Looks.AddTryOnImage(lookID, result.ImageID)

	if a.Audit != nil {
		a.Audit.Log("look", lookID, "try_on_generated", nil, nil, nil,
			map[string]string{"image_id": result.ImageID})
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"image_id": result.ImageID,
		"width":    result.Width,
		"height":   result.Height,
		"format":   result.Format,
	})
}

func boolPtr(b bool) *bool { return &b }
