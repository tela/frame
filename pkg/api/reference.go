package api

import (
	"fmt"
	"net/http"

	"github.com/tela/frame/pkg/image"
)

type referencePackageResponse struct {
	CharacterID       string     `json:"character_id"`
	EraID             string     `json:"era_id"`
	CharacterName     string     `json:"character_name"`
	EraLabel          string     `json:"era_label"`
	VisualDescription string     `json:"visual_description"`
	PromptPrefix      string     `json:"prompt_prefix"`
	FaceRefs          []refImage `json:"face_refs"`
	BodyRefs          []refImage `json:"body_refs"`
	BreastsRefs       []refImage `json:"breasts_refs"`
	VaginaRefs        []refImage `json:"vagina_refs"`
	PipelineSettings  string     `json:"pipeline_settings"`
}

type refImage struct {
	ImageID  string   `json:"image_id"`
	ImageURL string   `json:"image_url"`
	Score    *float64 `json:"score,omitempty"`
	Rank     *int     `json:"rank,omitempty"`
}

func toRefImages(cis []image.CharacterImage) []refImage {
	out := make([]refImage, 0, len(cis))
	for _, ci := range cis {
		out = append(out, refImage{
			ImageID:  ci.ImageID,
			ImageURL: fmt.Sprintf("/api/v1/images/%s", ci.ImageID),
			Score:    ci.RefScore,
			Rank:     ci.RefRank,
		})
	}
	return out
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

	resp := referencePackageResponse{
		CharacterID:       charID,
		EraID:             eraID,
		CharacterName:     char.Name,
		EraLabel:          era.Label,
		VisualDescription: era.VisualDescription,
		PromptPrefix:      era.PromptPrefix,
		PipelineSettings:  era.PipelineSettings,
	}

	for _, rt := range image.ValidRefTypes {
		refs, err := a.Images.ListRefsByType(charID, eraID, rt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		images := toRefImages(refs)
		switch rt {
		case image.RefFace:
			resp.FaceRefs = images
		case image.RefBody:
			resp.BodyRefs = images
		case image.RefBreasts:
			resp.BreastsRefs = images
		case image.RefVagina:
			resp.VaginaRefs = images
		}
	}

	writeJSON(w, http.StatusOK, resp)
}
