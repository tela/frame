package image

import "time"

// Source indicates where an image originated.
type Source string

const (
	SourceFig     Source = "fig"
	SourceComfyUI Source = "comfyui"
	SourceManual  Source = "manual"
)

// SetType categorizes an image within a character's collection.
type SetType string

const (
	SetStaging   SetType = "staging"
	SetReference SetType = "reference"
	SetCurated   SetType = "curated"
	SetTraining  SetType = "training"
	SetArchive   SetType = "archive"
)

// TriageStatus tracks the triage state of a character image.
type TriageStatus string

const (
	TriagePending  TriageStatus = "pending"
	TriageApproved TriageStatus = "approved"
	TriageRejected TriageStatus = "rejected"
	TriageArchived TriageStatus = "archived"
)

// Image is the core image record.
type Image struct {
	ID               string    `json:"id"`
	Hash             string    `json:"hash"`
	OriginalFilename string    `json:"original_filename"`
	Format           string    `json:"format"`
	Width            int       `json:"width"`
	Height           int       `json:"height"`
	FileSize         int64     `json:"file_size"`
	Source           Source    `json:"source"`
	IngestedAt       time.Time `json:"ingested_at"`
}

// CharacterImage links an image to a character with metadata.
type CharacterImage struct {
	ImageID      string       `json:"image_id"`
	CharacterID  string       `json:"character_id"`
	EraID        *string      `json:"era_id,omitempty"`
	SetType      SetType      `json:"set_type"`
	TriageStatus TriageStatus `json:"triage_status"`
	Rating       *int         `json:"rating,omitempty"`
	IsFaceRef    bool         `json:"is_face_ref"`
	IsBodyRef    bool         `json:"is_body_ref"`
	RefScore     *float64     `json:"ref_score,omitempty"`
	RefRank      *int         `json:"ref_rank,omitempty"`
	Caption      *string      `json:"caption,omitempty"`
	CreatedAt    time.Time    `json:"created_at"`
}

// Tag is an image tag.
type Tag struct {
	ID           int64     `json:"id"`
	ImageID      string    `json:"image_id"`
	TagNamespace string    `json:"tag_namespace"`
	TagValue     string    `json:"tag_value"`
	Source       string    `json:"source"`
	CreatedAt    time.Time `json:"created_at"`
}

// IngestRequest contains the parameters for ingesting an image.
type IngestRequest struct {
	Filename      string
	Data          []byte
	Source        Source
	CharacterID   string  // empty for standalone/feature images
	CharacterSlug string  // filesystem folder name, e.g. "esme-a7f3b2c"
	EraID         *string
	FeatureFolder string  // for non-character images, e.g. "faces-a7f3b2c"
}

// IngestResult is returned after successful ingestion.
type IngestResult struct {
	ImageID      string `json:"image_id"`
	Hash         string `json:"hash"`
	Width        int    `json:"width"`
	Height       int    `json:"height"`
	Format       string `json:"format"`
	FileSize     int64  `json:"file_size"`
	IsDuplicate  bool   `json:"is_duplicate"`
}
