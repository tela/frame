package character

import (
	"database/sql"
	"fmt"
	"time"
)

// parseTime handles both RFC3339 and SQLite datetime formats.
func parseTime(s string) time.Time {
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t
	}
	if t, err := time.Parse("2006-01-02 15:04:05", s); err == nil {
		return t
	}
	return time.Time{}
}

// Store provides character and era persistence operations.
type Store struct {
	db *sql.DB
}

func boolToInt(b bool) int {
	if b { return 1 }
	return 0
}

// NewStore creates a new character Store.
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// Create inserts a new character. Sets FolderName automatically if empty.
func (s *Store) Create(c *Character) error {
	if c.FolderName == "" {
		c.FolderName = c.Slug()
	}
	if c.Source == "" {
		c.Source = "frame"
	}
	_, err := s.db.Exec(
		`INSERT INTO characters (id, name, display_name, folder_name, status, fig_published, fig_character_url, source, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		c.ID, c.Name, c.DisplayName, c.FolderName, c.Status, boolToInt(c.FigPublished), c.FigCharacterURL, c.Source,
		c.CreatedAt.UTC().Format(time.RFC3339), c.UpdatedAt.UTC().Format(time.RFC3339),
	)
	if err != nil {
		return fmt.Errorf("insert character: %w", err)
	}
	return nil
}

// Get retrieves a character by ID.
func (s *Store) Get(id string) (*Character, error) {
	c := &Character{}
	var createdAt, updatedAt string
	var figPub int
	err := s.db.QueryRow(
		`SELECT id, name, display_name, folder_name, status, fig_published, fig_character_url, source, created_at, updated_at
		 FROM characters WHERE id = ?`, id,
	).Scan(&c.ID, &c.Name, &c.DisplayName, &c.FolderName, &c.Status, &figPub, &c.FigCharacterURL, &c.Source, &createdAt, &updatedAt)
	c.FigPublished = figPub != 0
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get character: %w", err)
	}
	c.CreatedAt = parseTime(createdAt)
	c.UpdatedAt = parseTime(updatedAt)
	return c, nil
}

// List returns all characters, ordered by creation time.
func (s *Store) List() ([]Character, error) {
	rows, err := s.db.Query(
		`SELECT id, name, display_name, folder_name, status, fig_published, fig_character_url, source, created_at, updated_at
		 FROM characters ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("list characters: %w", err)
	}
	defer rows.Close()

	var chars []Character
	for rows.Next() {
		var c Character
		var createdAt, updatedAt string
		var figPub int
		if err := rows.Scan(&c.ID, &c.Name, &c.DisplayName, &c.FolderName, &c.Status, &figPub, &c.FigCharacterURL, &c.Source, &createdAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("scan character: %w", err)
		}
		c.FigPublished = figPub != 0
		c.CreatedAt = parseTime(createdAt)
		c.UpdatedAt = parseTime(updatedAt)
		chars = append(chars, c)
	}
	return chars, rows.Err()
}

// UpdateStatus changes a character's status.
func (s *Store) UpdateStatus(id string, status Status) error {
	res, err := s.db.Exec(
		`UPDATE characters SET status = ?, updated_at = datetime('now') WHERE id = ?`,
		status, id,
	)
	if err != nil {
		return fmt.Errorf("update character status: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("character %s not found", id)
	}
	return nil
}

// UpdateFigStatus sets the fig_published and fig_character_url fields.
func (s *Store) UpdateFigStatus(id string, published bool, url string) error {
	_, err := s.db.Exec(
		`UPDATE characters SET fig_published = ?, fig_character_url = ?, updated_at = datetime('now') WHERE id = ?`,
		boolToInt(published), url, id,
	)
	return err
}

// Update modifies a character's name and display name.
func (s *Store) Update(id string, name, displayName string) error {
	res, err := s.db.Exec(
		`UPDATE characters SET name = ?, display_name = ?, updated_at = datetime('now') WHERE id = ?`,
		name, displayName, id,
	)
	if err != nil {
		return fmt.Errorf("update character: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("character %s not found", id)
	}
	return nil
}

// CreateEra inserts a new era for a character.
func (s *Store) CreateEra(e *Era) error {
	_, err := s.db.Exec(
		`INSERT INTO eras (id, character_id, label, age_range, time_period, description, visual_description, prompt_prefix, pipeline_settings, sort_order, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		e.ID, e.CharacterID, e.Label, e.AgeRange, e.TimePeriod, e.Description, e.VisualDescription, e.PromptPrefix, e.PipelineSettings, e.SortOrder,
		e.CreatedAt.UTC().Format(time.RFC3339), e.UpdatedAt.UTC().Format(time.RFC3339),
	)
	if err != nil {
		return fmt.Errorf("insert era: %w", err)
	}
	return nil
}

// GetEra retrieves an era by ID.
func (s *Store) GetEra(id string) (*Era, error) {
	e := &Era{}
	var createdAt, updatedAt string
	err := s.db.QueryRow(
		`SELECT id, character_id, label, age_range, time_period, description, visual_description, prompt_prefix, pipeline_settings, sort_order, created_at, updated_at
		 FROM eras WHERE id = ?`, id,
	).Scan(&e.ID, &e.CharacterID, &e.Label, &e.AgeRange, &e.TimePeriod, &e.Description, &e.VisualDescription, &e.PromptPrefix, &e.PipelineSettings, &e.SortOrder, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get era: %w", err)
	}
	e.CreatedAt = parseTime(createdAt)
	e.UpdatedAt = parseTime(updatedAt)
	return e, nil
}

// ListEras returns all eras for a character, ordered by sort_order.
func (s *Store) ListEras(characterID string) ([]Era, error) {
	rows, err := s.db.Query(
		`SELECT id, character_id, label, age_range, time_period, description, visual_description, prompt_prefix, pipeline_settings, sort_order, created_at, updated_at
		 FROM eras WHERE character_id = ? ORDER BY sort_order`, characterID,
	)
	if err != nil {
		return nil, fmt.Errorf("list eras: %w", err)
	}
	defer rows.Close()

	var eras []Era
	for rows.Next() {
		var e Era
		var createdAt, updatedAt string
		if err := rows.Scan(&e.ID, &e.CharacterID, &e.Label, &e.AgeRange, &e.TimePeriod, &e.Description, &e.VisualDescription, &e.PromptPrefix, &e.PipelineSettings, &e.SortOrder, &createdAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("scan era: %w", err)
		}
		e.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		e.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
		eras = append(eras, e)
	}
	return eras, rows.Err()
}

// ListErasWithStats returns eras with image counts and reference package readiness.
func (s *Store) ListErasWithStats(characterID string) ([]EraWithStats, error) {
	rows, err := s.db.Query(
		`SELECT e.id, e.character_id, e.label, e.age_range, e.time_period, e.description,
		        e.visual_description, e.prompt_prefix, e.pipeline_settings, e.sort_order, e.created_at, e.updated_at,
		        COALESCE(ci.image_count, 0),
		        COALESCE(ci.has_face_ref, 0)
		 FROM eras e
		 LEFT JOIN (
		     SELECT era_id, COUNT(*) as image_count, MAX(is_face_ref) as has_face_ref
		     FROM character_images
		     WHERE era_id IS NOT NULL
		     GROUP BY era_id
		 ) ci ON ci.era_id = e.id
		 WHERE e.character_id = ?
		 ORDER BY e.sort_order`, characterID,
	)
	if err != nil {
		return nil, fmt.Errorf("list eras with stats: %w", err)
	}
	defer rows.Close()

	var eras []EraWithStats
	for rows.Next() {
		var es EraWithStats
		var createdAt, updatedAt string
		var hasFaceRef int
		if err := rows.Scan(
			&es.ID, &es.CharacterID, &es.Label, &es.AgeRange, &es.TimePeriod, &es.Description,
			&es.VisualDescription, &es.PromptPrefix, &es.PipelineSettings, &es.SortOrder, &createdAt, &updatedAt,
			&es.ImageCount, &hasFaceRef,
		); err != nil {
			return nil, fmt.Errorf("scan era with stats: %w", err)
		}
		es.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		es.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
		es.ReferencePackageReady = hasFaceRef > 0
		eras = append(eras, es)
	}
	return eras, rows.Err()
}
