package lora

// LoRA represents a registered LoRA adapter for image generation.
type LoRA struct {
	ID                  string  `json:"id"`
	Name                string  `json:"name"`
	Filename            string  `json:"filename"`
	SourceURL           string  `json:"source_url"`
	Description         string  `json:"description"`
	Category            string  `json:"category"` // style, character, pose, detail, nsfw, quality
	Tags                string  `json:"tags"`      // JSON array
	RecommendedStrength float64 `json:"recommended_strength"`
	ContentRating       string  `json:"content_rating"` // sfw, nsfw
	CompatibleModels    string  `json:"compatible_models"` // JSON array
	CreatedAt           string  `json:"created_at"`
	UpdatedAt           string  `json:"updated_at"`
}
