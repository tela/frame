package media

import "time"

// ContentType categorizes media items.
type ContentType string

const (
	ContentWardrobe ContentType = "wardrobe"
	ContentProp     ContentType = "prop"
	ContentLocation ContentType = "location"
)

// Item is a media item (wardrobe garment, prop, or location).
// Frame stores the images; Fig retains the rich catalog metadata.
type Item struct {
	ID             string      `json:"id"`
	ContentType    ContentType `json:"content_type"`
	Name           string      `json:"name"`
	PrimaryImageID *string     `json:"primary_image_id,omitempty"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
}

// ItemImage links an image to a media item.
type ItemImage struct {
	MediaItemID string    `json:"media_item_id"`
	ImageID     string    `json:"image_id"`
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
}
