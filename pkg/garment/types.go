package garment

import "time"

// Garment represents a wardrobe item with full classification taxonomy.
type Garment struct {
	ID               string    `json:"id"`
	Name             string    `json:"name"`
	Description      string    `json:"description,omitempty"`
	Category         string    `json:"category,omitempty"`
	OccasionEnergy   string    `json:"occasion_energy,omitempty"`
	Era              string    `json:"era,omitempty"`
	AestheticCluster string    `json:"aesthetic_cluster,omitempty"`
	DominantSignal   string    `json:"dominant_signal,omitempty"`
	RecessiveSignal  string    `json:"recessive_signal,omitempty"`
	Material         string    `json:"material,omitempty"`
	Color            string    `json:"color,omitempty"`
	Tags             []string  `json:"tags,omitempty"`
	PrimaryImageID   *string   `json:"primary_image_id,omitempty"`
	Source           string    `json:"source,omitempty"`
	Provenance       string    `json:"provenance,omitempty"`
	SourceURL        string    `json:"source_url,omitempty"`
	SourceSite       string    `json:"source_site,omitempty"`
	Status           string    `json:"status"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`

	// Populated by List queries when requested.
	AffinityCount int `json:"affinity_count,omitempty"`
}

// ListQuery defines filters for listing garments.
type ListQuery struct {
	Q               string // Full-text search query
	Category        string
	OccasionEnergy  string
	Era             string
	AestheticCluster string
	DominantSignal  string
	Material        string
	Provenance      string
	SourceSite      string
	Status          string // Default "available" if empty; use "all" for no filter
	CharacterID     string // Filter by character affinity
	Sort            string // created_at (default), name, category
	Order           string // desc (default), asc
	Limit           int    // Default 50, max 250
	Offset          int
}

// FacetCounts holds counts per value for a single facet field.
type FacetCounts map[string]int

// Facets holds faceted counts across all taxonomy fields.
type Facets struct {
	Category       FacetCounts `json:"category"`
	OccasionEnergy FacetCounts `json:"occasion_energy"`
	Era            FacetCounts `json:"era"`
	AestheticCluster FacetCounts `json:"aesthetic_cluster"`
	DominantSignal FacetCounts `json:"dominant_signal"`
	Material       FacetCounts `json:"material"`
	Provenance     FacetCounts `json:"provenance"`
	SourceSite     FacetCounts `json:"source_site"`
	Status         FacetCounts `json:"status"`
}

// GarmentImage links an image to a garment with ordering.
type GarmentImage struct {
	GarmentID string    `json:"garment_id"`
	ImageID   string    `json:"image_id"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}
