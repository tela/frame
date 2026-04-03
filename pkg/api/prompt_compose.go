package api

import (
	"encoding/json"
	"net/http"

	"github.com/tela/frame/pkg/character"
	"github.com/tela/prompts"
)

// composeRequest is the frontend's request to compose a prompt for a job.
type composeRequest struct {
	CharacterID   string `json:"character_id"`
	EraID         string `json:"era_id"`
	JobName       string `json:"job_name"`
	ContentRating string `json:"content_rating,omitempty"`

	// Optional overrides for scene/style/motion blocks
	Setting       string `json:"setting,omitempty"`
	Lighting      string `json:"lighting,omitempty"`
	Props         string `json:"props,omitempty"`
	LoraTrigger   string `json:"lora_trigger,omitempty"`
	LoraStyle     string `json:"lora_style,omitempty"`
	Movement      string `json:"movement,omitempty"`
	CameraMotion  string `json:"camera_motion,omitempty"`
	Tempo         string `json:"tempo,omitempty"`
	Duration      string `json:"duration,omitempty"`
	ExpressionArc string `json:"expression_arc,omitempty"`
}

type composeResponse struct {
	Prompt   string            `json:"prompt"`
	Negative string            `json:"negative"`
	Blocks   map[string]string `json:"blocks"`
	Job      composeJobInfo    `json:"job"`
}

type composeJobInfo struct {
	Name          string `json:"name"`
	DisplayName   string `json:"display_name"`
	Category      string `json:"category"`
	ContentRating string `json:"content_rating"`
	Workflow      string `json:"workflow"`
}

type listJobsResponse struct {
	Jobs []composeJobInfo `json:"jobs"`
}

// handleComposePrompt composes a prompt using the shared prompts package.
// It loads the character and era from the database, maps them to the
// shared package's input types, and returns the composed prompt.
func (a *API) handleComposePrompt(w http.ResponseWriter, r *http.Request) {
	var req composeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	if req.CharacterID == "" {
		writeError(w, http.StatusBadRequest, "character_id is required")
		return
	}
	if req.JobName == "" {
		writeError(w, http.StatusBadRequest, "job_name is required")
		return
	}

	// Load character
	char, err := a.Characters.Get(req.CharacterID)
	if err != nil {
		writeError(w, http.StatusNotFound, "character not found")
		return
	}

	// Map character to shared package type
	charData := prompts.CharacterData{
		Gender:                char.Gender,
		Ethnicity:             char.Ethnicity,
		SkinTone:              char.SkinTone,
		EyeColor:              char.EyeColor,
		EyeShape:              char.EyeShape,
		NaturalHairColor:      char.NaturalHairColor,
		NaturalHairTexture:    char.NaturalHairTexture,
		DistinguishingFeatures: char.DistinguishingFeatures,
	}

	// Map era if provided
	var eraData prompts.EraData
	var styleData prompts.StyleData
	if req.EraID != "" {
		era, err := a.Characters.GetEra(req.EraID)
		if err == nil && era != nil {
			eraData = mapEraToPrompts(era)
			styleData.EraPromptPrefix = era.PromptPrefix
		}
	}

	// Apply overrides from request
	styleData.LoraTrigger = req.LoraTrigger
	styleData.LoraStyle = req.LoraStyle

	sceneData := prompts.SceneData{
		Setting:  req.Setting,
		Lighting: req.Lighting,
		Props:    req.Props,
	}

	motionData := prompts.MotionData{
		Movement:      req.Movement,
		CameraMotion:  req.CameraMotion,
		Tempo:         req.Tempo,
		Duration:      req.Duration,
		ExpressionArc: req.ExpressionArc,
	}

	// Determine content rating
	rating := prompts.SFW
	if req.ContentRating == "nsfw" {
		rating = prompts.NSFW
	}

	input := prompts.ComposeInput{
		Character:     charData,
		Era:           eraData,
		Style:         styleData,
		Scene:         sceneData,
		Motion:        motionData,
		ContentRating: rating,
	}

	result, ok := prompts.ComposeForJob(input, req.JobName)
	if !ok {
		writeError(w, http.StatusBadRequest, "unknown job: "+req.JobName)
		return
	}

	// Get job info for the response
	job := prompts.Jobs[req.JobName]

	writeJSON(w, http.StatusOK, composeResponse{
		Prompt:   result.Prompt,
		Negative: result.Negative,
		Blocks:   result.Blocks,
		Job: composeJobInfo{
			Name:          job.Name,
			DisplayName:   job.DisplayName,
			Category:      job.Category,
			ContentRating: string(job.ContentRating),
			Workflow:      job.Workflow,
		},
	})
}

// handleListJobs returns all available prompt jobs from the shared catalog.
func (a *API) handleListJobs(w http.ResponseWriter, r *http.Request) {
	var jobs []composeJobInfo
	for _, job := range prompts.Jobs {
		jobs = append(jobs, composeJobInfo{
			Name:          job.Name,
			DisplayName:   job.DisplayName,
			Category:      job.Category,
			ContentRating: string(job.ContentRating),
			Workflow:      job.Workflow,
		})
	}
	writeJSON(w, http.StatusOK, listJobsResponse{Jobs: jobs})
}

// mapEraToPrompts converts Frame's Era type to the shared package's EraData.
func mapEraToPrompts(era *character.Era) prompts.EraData {
	return prompts.EraData{
		AgeRange:  era.AgeRange,
		Label:     era.Label,

		HairColor:  era.HairColor,
		HairLength: era.HairLength,

		HeightCM:         era.HeightCM,
		WeightKG:         era.WeightKG,
		Build:            era.Build,
		HipShape:         era.HipShape,
		WaistHipRatio:    era.WaistHipRatio,
		ShoulderHipRatio: era.ShoulderHipRatio,
		HeadBodyRatio:    era.HeadBodyRatio,
		LegTorsoRatio:    era.LegTorsoRatio,

		FaceShape:       era.FaceShape,
		BuccalFat:       era.BuccalFat,
		JawDefinition:   era.JawDefinition,
		BrowRidge:       era.BrowRidge,
		NasolabialDepth: era.NasolabialDepth,

		SkinTexture:        era.SkinTexture,
		SkinPoreVisibility: era.SkinPoreVisibility,
		UnderEye:           era.UnderEye,

		BreastSize:      era.BreastSize,
		BreastTanner:    era.BreastTanner,
		AreolaSize:      era.AreolaSize,
		AreolaColor:     era.AreolaColor,
		AreolaShape:     era.AreolaShape,
		PubicHairStyle:  era.PubicHairStyle,
		PubicHairTanner: era.PubicHairTanner,
		LabiaMajora:     era.LabiaMajora,
		LabiaMinora:     era.LabiaMinora,
		LabiaColor:      era.LabiaColor,
		GynecoidStage:   era.GynecoidStage,
	}
}
