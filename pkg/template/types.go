package template

import "time"

// Template is a reusable prompt generation recipe.
type Template struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	PromptBody     string    `json:"prompt_body"`
	NegativePrompt string    `json:"negative_prompt"`
	StylePrompt    string    `json:"style_prompt"`
	Parameters     string    `json:"parameters"`  // JSON: steps, cfg, sampler, etc.
	FacetTags      string    `json:"facet_tags"`   // JSON array of facet tags
	UsageCount     int       `json:"usage_count"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
