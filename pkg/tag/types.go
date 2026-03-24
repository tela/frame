package tag

import "time"

// Family is a domain-separated group of tags.
type Family struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Color       string    `json:"color"`
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
}

// Tag is a namespaced tag value belonging to a family.
type Tag struct {
	ID           int64     `json:"id"`
	ImageID      string    `json:"image_id"`
	FamilyID     *string   `json:"family_id,omitempty"`
	TagNamespace string    `json:"tag_namespace"`
	TagValue     string    `json:"tag_value"`
	Source       string    `json:"source"`
	CreatedAt    time.Time `json:"created_at"`
}

// TagSummary is a unique tag with its usage count.
type TagSummary struct {
	FamilyID     *string `json:"family_id,omitempty"`
	TagNamespace string  `json:"tag_namespace"`
	TagValue     string  `json:"tag_value"`
	Count        int     `json:"count"`
}

// BulkTagRequest applies or removes tags from multiple images.
type BulkTagRequest struct {
	ImageIDs     []string `json:"image_ids"`
	TagNamespace string   `json:"tag_namespace"`
	TagValue     string   `json:"tag_value"`
	FamilyID     *string  `json:"family_id,omitempty"`
	Action       string   `json:"action"` // "add" or "remove"
}
