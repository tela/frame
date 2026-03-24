package dataset

import "time"

// Type categorizes the dataset's purpose.
type Type string

const (
	TypeLoRA      Type = "lora"
	TypeIPAdapter Type = "ipadapter"
	TypeReference Type = "reference"
	TypeStyle     Type = "style"
	TypeGeneral   Type = "general"
)

// Dataset is a curated image collection for training or reference.
type Dataset struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	Type         Type      `json:"type"`
	CharacterID  *string   `json:"character_id,omitempty"`
	EraID        *string   `json:"era_id,omitempty"`
	SourceQuery  string    `json:"source_query"`  // JSON filter criteria
	ExportConfig string    `json:"export_config"` // JSON export settings
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// DatasetWithStats extends Dataset with computed fields.
type DatasetWithStats struct {
	Dataset
	ImageCount    int `json:"image_count"`
	IncludedCount int `json:"included_count"`
}

// DatasetImage links an image to a dataset with per-image metadata.
type DatasetImage struct {
	DatasetID string    `json:"dataset_id"`
	ImageID   string    `json:"image_id"`
	SortOrder int       `json:"sort_order"`
	Caption   *string   `json:"caption,omitempty"`
	Included  bool      `json:"included"`
	CreatedAt time.Time `json:"created_at"`
}
