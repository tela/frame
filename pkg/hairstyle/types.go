package hairstyle

import "time"

// Hairstyle represents a hair catalog entry with classification taxonomy.
type Hairstyle struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Description    string    `json:"description,omitempty"`
	Length         string    `json:"length,omitempty"`
	Texture        string    `json:"texture,omitempty"`
	Style          string    `json:"style,omitempty"`
	Color          string    `json:"color,omitempty"`
	Tags           []string  `json:"tags,omitempty"`
	PrimaryImageID *string   `json:"primary_image_id,omitempty"`
	Source         string    `json:"source,omitempty"`
	Provenance     string    `json:"provenance,omitempty"`
	SourceURL      string    `json:"source_url,omitempty"`
	SourceSite     string    `json:"source_site,omitempty"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	AffinityCount  int       `json:"affinity_count,omitempty"`
}

// ListQuery defines filters for listing hairstyles.
type ListQuery struct {
	Q           string
	Length      string
	Texture     string
	Style       string
	Status      string // Default "available"; "all" for no filter
	CharacterID string
	Sort        string // created_at (default), name
	Order       string // desc (default), asc
	Limit       int
	Offset      int
}

// FacetCounts holds counts per value for a single facet field.
type FacetCounts map[string]int

// Facets holds faceted counts across taxonomy fields.
type Facets struct {
	Length  FacetCounts `json:"length"`
	Texture FacetCounts `json:"texture"`
	Style   FacetCounts `json:"style"`
	Status  FacetCounts `json:"status"`
}

// HairstyleImage links an image to a hairstyle.
type HairstyleImage struct {
	HairstyleID string    `json:"hairstyle_id"`
	ImageID     string    `json:"image_id"`
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
}
