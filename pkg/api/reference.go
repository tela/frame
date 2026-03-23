package api

import (
	"fmt"
	"net/http"
)

type referencePackageResponse struct {
	CharacterID      string         `json:"character_id"`
	EraID            string         `json:"era_id"`
	CharacterName    string         `json:"character_name"`
	EraLabel         string         `json:"era_label"`
	VisualDescription string        `json:"visual_description"`
	PromptPrefix     string         `json:"prompt_prefix"`
	FaceRefs         []refImage     `json:"face_refs"`
	BodyRefs         []refImage     `json:"body_refs"`
	PipelineSettings string         `json:"pipeline_settings"`
}

type refImage struct {
	ImageID  string   `json:"image_id"`
	ImageURL string   `json:"image_url"`
	Score    *float64 `json:"score,omitempty"`
	Rank     *int     `json:"rank,omitempty"`
}

func (a *API) getReferencePackage(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	eraID := r.PathValue("era")

	char, err := a.Characters.Get(charID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if char == nil {
		writeError(w, http.StatusNotFound, "character not found")
		return
	}

	era, err := a.Characters.GetEra(eraID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if era == nil || era.CharacterID != charID {
		writeError(w, http.StatusNotFound, "era not found")
		return
	}

	faceRefs, err := a.Images.ListFaceRefs(charID, eraID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	bodyRefs, err := a.Images.ListBodyRefs(charID, eraID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	resp := referencePackageResponse{
		CharacterID:       charID,
		EraID:             eraID,
		CharacterName:     char.Name,
		EraLabel:          era.Label,
		VisualDescription: era.VisualDescription,
		PromptPrefix:      era.PromptPrefix,
		PipelineSettings:  era.PipelineSettings,
	}

	for _, ref := range faceRefs {
		resp.FaceRefs = append(resp.FaceRefs, refImage{
			ImageID:  ref.ImageID,
			ImageURL: fmt.Sprintf("/api/v1/images/%s", ref.ImageID),
			Score:    ref.RefScore,
			Rank:     ref.RefRank,
		})
	}
	if resp.FaceRefs == nil {
		resp.FaceRefs = []refImage{}
	}

	for _, ref := range bodyRefs {
		resp.BodyRefs = append(resp.BodyRefs, refImage{
			ImageID:  ref.ImageID,
			ImageURL: fmt.Sprintf("/api/v1/images/%s", ref.ImageID),
			Score:    ref.RefScore,
			Rank:     ref.RefRank,
		})
	}
	if resp.BodyRefs == nil {
		resp.BodyRefs = []refImage{}
	}

	writeJSON(w, http.StatusOK, resp)
}
