package character

import "time"

// Status represents the lifecycle stage of a character.
type Status string

const (
	StatusScouted     Status = "scouted"
	StatusDevelopment Status = "development"
	StatusCast        Status = "cast"
)

// Character is a character record in Frame.
// Frame stores a thin record — narrative identity and production metadata live in Fig.
type Character struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	DisplayName string    `json:"display_name"`
	Status      Status    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Era represents a phase of a character's visual development.
// Fig defines the era; Frame owns its visual content.
type Era struct {
	ID                string    `json:"id"`
	CharacterID       string    `json:"character_id"`
	Label             string    `json:"label"`
	VisualDescription string    `json:"visual_description"`
	PromptPrefix      string    `json:"prompt_prefix"`
	PipelineSettings  string    `json:"pipeline_settings"` // JSON blob
	SortOrder         int       `json:"sort_order"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// EraWithStats extends Era with computed fields for API responses.
type EraWithStats struct {
	Era
	ImageCount            int  `json:"image_count"`
	ReferencePackageReady bool `json:"reference_package_ready"`
}

// CharacterWithEras is the full character response including era summaries.
type CharacterWithEras struct {
	Character
	Eras []EraWithStats `json:"eras"`
}
