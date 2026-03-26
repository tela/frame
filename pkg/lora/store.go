package lora

import (
	"database/sql"
	"time"
)

func now() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05Z")
}

// Store provides CRUD operations for the LoRA registry.
type Store struct {
	db *sql.DB
}

// NewStore creates a new LoRA store.
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// Create inserts a new LoRA record.
func (s *Store) Create(l *LoRA) error {
	_, err := s.db.Exec(`
		INSERT INTO loras (id, name, filename, source_url, description, category, tags, recommended_strength, content_rating, compatible_models, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		l.ID, l.Name, l.Filename, l.SourceURL, l.Description, l.Category,
		l.Tags, l.RecommendedStrength, l.ContentRating, l.CompatibleModels,
		l.CreatedAt, l.UpdatedAt,
	)
	return err
}

// Get retrieves a LoRA by ID.
func (s *Store) Get(id string) (*LoRA, error) {
	l := &LoRA{}
	err := s.db.QueryRow(`SELECT id, name, filename, source_url, description, category, tags, recommended_strength, content_rating, compatible_models, created_at, updated_at FROM loras WHERE id = ?`, id).
		Scan(&l.ID, &l.Name, &l.Filename, &l.SourceURL, &l.Description, &l.Category, &l.Tags, &l.RecommendedStrength, &l.ContentRating, &l.CompatibleModels, &l.CreatedAt, &l.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return l, err
}

// List returns all LoRAs, optionally filtered by category and/or content rating.
func (s *Store) List(category, contentRating string) ([]LoRA, error) {
	query := `SELECT id, name, filename, source_url, description, category, tags, recommended_strength, content_rating, compatible_models, created_at, updated_at FROM loras WHERE 1=1`
	args := []any{}

	if category != "" {
		query += ` AND category = ?`
		args = append(args, category)
	}
	if contentRating != "" {
		query += ` AND content_rating = ?`
		args = append(args, contentRating)
	}
	query += ` ORDER BY category, name`

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var loras []LoRA
	for rows.Next() {
		var l LoRA
		if err := rows.Scan(&l.ID, &l.Name, &l.Filename, &l.SourceURL, &l.Description, &l.Category, &l.Tags, &l.RecommendedStrength, &l.ContentRating, &l.CompatibleModels, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, err
		}
		loras = append(loras, l)
	}
	return loras, rows.Err()
}

// Update modifies an existing LoRA record.
func (s *Store) Update(id, name, filename, sourceURL, description, category, tags string, strength float64, contentRating, compatibleModels string) error {
	_, err := s.db.Exec(`
		UPDATE loras SET name = ?, filename = ?, source_url = ?, description = ?, category = ?, tags = ?, recommended_strength = ?, content_rating = ?, compatible_models = ?, updated_at = ?
		WHERE id = ?`,
		name, filename, sourceURL, description, category, tags, strength, contentRating, compatibleModels, now(), id,
	)
	return err
}

// Delete removes a LoRA by ID.
func (s *Store) Delete(id string) error {
	_, err := s.db.Exec(`DELETE FROM loras WHERE id = ?`, id)
	return err
}
