package character

import (
	"regexp"
	"strings"
	"time"
)

var nonAlphaNum = regexp.MustCompile(`[^a-z0-9]+`)

// Status represents the lifecycle stage of a character.
type Status string

const (
	StatusProspect    Status = "prospect"
	StatusDevelopment Status = "development"
	StatusCast        Status = "cast"
)

// Character is a character record in Frame.
// Frame stores a thin record — narrative identity and production metadata live in Fig.
type Character struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	DisplayName     string    `json:"display_name"`
	FolderName      string    `json:"folder_name"`
	Status          Status    `json:"status"`
	FigPublished    bool      `json:"fig_published"`
	FigCharacterURL string    `json:"fig_character_url,omitempty"`
	Source          string    `json:"source"` // "frame" or "fig"
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Slug returns a filesystem-safe folder name for the character: {name}-{short-id}.
// Example: "Esme Thornton" with ID "a7f3b2c1d9e04f6a" → "esme-thornton-a7f3b2c"
func (c *Character) Slug() string {
	name := c.DisplayName
	if name == "" {
		name = c.Name
	}
	slug := strings.ToLower(name)
	slug = nonAlphaNum.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		slug = "unnamed"
	}
	shortID := c.ID
	if len(shortID) > 7 {
		shortID = shortID[:7]
	}
	return slug + "-" + shortID
}

// Era represents a phase of a character's visual development.
// Fig defines the era; Frame owns its visual content.
type Era struct {
	ID                string    `json:"id"`
	CharacterID       string    `json:"character_id"`
	Label             string    `json:"label"`
	AgeRange          string    `json:"age_range"`          // e.g., "18-24", "Late 30s"
	TimePeriod        string    `json:"time_period"`        // e.g., "1950s", "Present day"
	Description       string    `json:"description"`        // narrative context for the era
	VisualDescription string    `json:"visual_description"` // appearance description for generation
	PromptPrefix      string    `json:"prompt_prefix"`
	PipelineSettings  string    `json:"pipeline_settings"`  // JSON blob
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
