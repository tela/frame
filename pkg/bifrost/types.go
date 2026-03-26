package bifrost

// ImageGenRequest is the request body for POST /v1/images/generate.
type ImageGenRequest struct {
	Prompt          string           `json:"prompt"`
	NegativePrompt  string           `json:"negative_prompt,omitempty"`
	Model           string           `json:"model,omitempty"`
	Width           int              `json:"width,omitempty"`
	Height          int              `json:"height,omitempty"`
	Steps           int              `json:"steps,omitempty"`
	StylePrompt     string           `json:"style_prompt,omitempty"`
	ReferenceImages []ReferenceImage `json:"reference_images,omitempty"`
	LoraAdapter     string           `json:"lora_adapter,omitempty"`
	LoraStrength    float64          `json:"lora_strength,omitempty"`
	Meta            RequestMeta      `json:"meta"`
}

// ReferenceImage is a reference image for guided generation.
type ReferenceImage struct {
	Path  string `json:"path,omitempty"`  // absolute local file path (on Bifrost's host)
	URL   string `json:"url,omitempty"`   // remote URL (Bifrost downloads it)
	Type  string `json:"type,omitempty"`  // face_ref, body_ref, garment_ref, pose_ref, location_ref
	Label string `json:"label,omitempty"` // e.g., "front face", "3/4 angle"
}

// RequestMeta controls routing and caching behavior.
type RequestMeta struct {
	Tier          string            `json:"tier,omitempty"`           // free, cheap, budget, complex, frontier, strong, fast
	ProviderName  string            `json:"provider_name,omitempty"`  // target specific provider
	Private       bool              `json:"private,omitempty"`        // skip caching
	ContentRating string            `json:"content_rating,omitempty"` // sfw, nsfw
	Metadata      map[string]string `json:"metadata,omitempty"`
}

// ImageGenResponse is the response from POST /v1/images/generate.
type ImageGenResponse struct {
	Images []GeneratedImage `json:"images"`
	Model  string           `json:"model"`
}

// GeneratedImage is a single generated image.
type GeneratedImage struct {
	Base64      string `json:"base64,omitempty"`
	ContentType string `json:"content_type,omitempty"` // e.g., "image/png"
	URL         string `json:"url,omitempty"`
}

// ErrorResponse is the error format from Bifrost.
type ErrorResponse struct {
	Error struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error"`
}

// ProviderInfo is a provider entry from GET /v1/providers.
type ProviderInfo struct {
	Name       string   `json:"name"`
	Tiers      []string `json:"tiers"`
	Modalities []string `json:"modalities"`
	Tasks      []string `json:"tasks"`
	Models     []string `json:"models"`
	NsfwSafe   bool     `json:"nsfw_safe"`
	State      string   `json:"state"` // cold, warming, hot, cooling
	Healthy    bool     `json:"healthy"`
}

// Reference image type constants.
const (
	RefTypeFace     = "face_ref"
	RefTypeBody     = "body_ref"
	RefTypeGarment  = "garment_ref"
	RefTypePose     = "pose_ref"
	RefTypeLocation = "location_ref"
)

// Tier constants.
const (
	TierCheap    = "cheap"
	TierComplex  = "complex"
	TierFrontier = "frontier"
	TierFast     = "fast"
)

// Content rating constants.
const (
	ContentSFW  = "sfw"
	ContentNSFW = "nsfw"
)
