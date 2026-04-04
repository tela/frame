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
	StatusArchived    Status = "archived"
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

	Gender               string `json:"gender"`

	// Physical attributes (immutable across eras)
	Ethnicity            string `json:"ethnicity"`
	SkinTone             string `json:"skin_tone"`
	EyeColor             string `json:"eye_color"`
	EyeShape             string `json:"eye_shape"`
	NaturalHairColor     string `json:"natural_hair_color"`
	NaturalHairTexture   string `json:"natural_hair_texture"`
	DistinguishingFeatures string `json:"distinguishing_features"`

	AvatarImageID string `json:"avatar_image_id,omitempty"`

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

	// Physical attributes (vary per era)
	HeightCM        *int   `json:"height_cm"`
	WeightKG        *int   `json:"weight_kg"`
	Build           string `json:"build"`
	BreastSize      string `json:"breast_size"`
	BreastTanner    string `json:"breast_tanner"`
	HipShape        string `json:"hip_shape"`
	PubicHairStyle  string `json:"pubic_hair_style"`
	PubicHairTanner string `json:"pubic_hair_tanner"`
	HairColor       string   `json:"hair_color"`
	HairLength      string   `json:"hair_length"`
	GynecoidStage   string   `json:"gynecoid_stage"`
	WaistHipRatio   *float64 `json:"waist_hip_ratio"`

	// Face shape
	FaceShape       string `json:"face_shape"`        // round, oval, heart, square, oblong
	BuccalFat       string `json:"buccal_fat"`        // full, moderate, slim, hollow
	JawDefinition   string `json:"jaw_definition"`    // soft, moderate, defined, angular
	BrowRidge       string `json:"brow_ridge"`        // subtle, moderate, prominent
	NasolabialDepth string `json:"nasolabial_depth"`  // absent, faint, moderate, defined

	// Skin texture
	SkinTexture        string `json:"skin_texture"`          // smooth, clear, fine_lines, textured
	SkinPoreVisibility string `json:"skin_pore_visibility"`  // absent, fine, visible
	UnderEye           string `json:"under_eye"`             // smooth, faint_hollow, defined_hollow

	// Body proportions
	HeadBodyRatio    *float64 `json:"head_body_ratio"`
	LegTorsoRatio    *float64 `json:"leg_torso_ratio"`
	ShoulderHipRatio *float64 `json:"shoulder_hip_ratio"`

	// Areola development
	AreolaSize  string `json:"areola_size"`  // small, medium, large
	AreolaColor string `json:"areola_color"` // light, medium, dark
	AreolaShape string `json:"areola_shape"` // flat, puffy, raised, pronounced

	// Labia development
	LabiaMajora string `json:"labia_majora"` // flat, moderate, full
	LabiaMinora string `json:"labia_minora"` // minimal, visible, protruding
	LabiaColor  string `json:"labia_color"`  // light, medium, dark

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
