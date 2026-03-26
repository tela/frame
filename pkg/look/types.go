package look

import "time"

// Look is a named outfit composition for a character's go-see.
type Look struct {
	ID             string    `json:"id"`
	CharacterID    string    `json:"character_id"`
	EraID          string    `json:"era_id,omitempty"`
	Name           string    `json:"name"`
	WardrobeItemIDs string   `json:"wardrobe_item_ids"` // JSON array of media item IDs
	IsDefault      bool      `json:"is_default"`
	CreatedAt      time.Time `json:"created_at"`
}

// LookWithDetails extends Look with resolved garment info and try-on counts.
type LookWithDetails struct {
	Look
	GarmentCount  int `json:"garment_count"`
	TryOnTotal    int `json:"try_on_total"`
	TryOnComplete int `json:"try_on_complete"`
}

// TryOnImage tracks a generated try-on image for a look + pose.
type TryOnImage struct {
	LookID  string  `json:"look_id"`
	PoseID  string  `json:"pose_id"`
	ImageID *string `json:"image_id"`
	Status  string  `json:"status"` // missing, generated, accepted, rejected
}
