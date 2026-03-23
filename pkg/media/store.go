package media

import (
	"database/sql"
	"fmt"
	"time"
)

func parseTime(s string) time.Time {
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t
	}
	if t, err := time.Parse("2006-01-02 15:04:05", s); err == nil {
		return t
	}
	return time.Time{}
}

// Store provides media item persistence operations.
type Store struct {
	db *sql.DB
}

// NewStore creates a new media Store.
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// Create inserts a new media item.
func (s *Store) Create(item *Item) error {
	_, err := s.db.Exec(
		`INSERT INTO media_items (id, content_type, name, primary_image_id, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		item.ID, item.ContentType, item.Name, item.PrimaryImageID,
		item.CreatedAt.UTC().Format(time.RFC3339), item.UpdatedAt.UTC().Format(time.RFC3339),
	)
	if err != nil {
		return fmt.Errorf("insert media item: %w", err)
	}
	return nil
}

// Get retrieves a media item by ID.
func (s *Store) Get(id string) (*Item, error) {
	item := &Item{}
	var createdAt, updatedAt string
	err := s.db.QueryRow(
		`SELECT id, content_type, name, primary_image_id, created_at, updated_at
		 FROM media_items WHERE id = ?`, id,
	).Scan(&item.ID, &item.ContentType, &item.Name, &item.PrimaryImageID, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get media item: %w", err)
	}
	item.CreatedAt = parseTime(createdAt)
	item.UpdatedAt = parseTime(updatedAt)
	return item, nil
}

// ListByType returns all media items of a given content type.
func (s *Store) ListByType(ct ContentType) ([]Item, error) {
	rows, err := s.db.Query(
		`SELECT id, content_type, name, primary_image_id, created_at, updated_at
		 FROM media_items WHERE content_type = ? ORDER BY name`, ct,
	)
	if err != nil {
		return nil, fmt.Errorf("list media items: %w", err)
	}
	defer rows.Close()

	var items []Item
	for rows.Next() {
		var item Item
		var createdAt, updatedAt string
		if err := rows.Scan(&item.ID, &item.ContentType, &item.Name, &item.PrimaryImageID, &createdAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("scan media item: %w", err)
		}
		item.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		item.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
		items = append(items, item)
	}
	return items, rows.Err()
}

// AddImage links an image to a media item.
func (s *Store) AddImage(mediaItemID, imageID string, sortOrder int) error {
	_, err := s.db.Exec(
		`INSERT INTO media_images (media_item_id, image_id, sort_order, created_at)
		 VALUES (?, ?, ?, datetime('now'))`,
		mediaItemID, imageID, sortOrder,
	)
	if err != nil {
		return fmt.Errorf("add media image: %w", err)
	}
	return nil
}

// ListImages returns all image IDs for a media item, ordered by sort_order.
func (s *Store) ListImages(mediaItemID string) ([]ItemImage, error) {
	rows, err := s.db.Query(
		`SELECT media_item_id, image_id, sort_order, created_at
		 FROM media_images WHERE media_item_id = ? ORDER BY sort_order`, mediaItemID,
	)
	if err != nil {
		return nil, fmt.Errorf("list media images: %w", err)
	}
	defer rows.Close()

	var images []ItemImage
	for rows.Next() {
		var mi ItemImage
		var createdAt string
		if err := rows.Scan(&mi.MediaItemID, &mi.ImageID, &mi.SortOrder, &createdAt); err != nil {
			return nil, fmt.Errorf("scan media image: %w", err)
		}
		mi.CreatedAt = parseTime(createdAt)
		images = append(images, mi)
	}
	return images, rows.Err()
}

// SetPrimaryImage sets the primary image for a media item.
func (s *Store) SetPrimaryImage(mediaItemID, imageID string) error {
	_, err := s.db.Exec(
		`UPDATE media_items SET primary_image_id = ?, updated_at = datetime('now') WHERE id = ?`,
		imageID, mediaItemID,
	)
	if err != nil {
		return fmt.Errorf("set primary image: %w", err)
	}
	return nil
}
