package shoot

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

// Shoot is an organized set of images from a generation session or import.
type Shoot struct {
	ID          string    `json:"id"`
	CharacterID string    `json:"character_id"`
	Name        string    `json:"name"`
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
	ImageCount  int       `json:"image_count"`
}

// Store provides shoot persistence.
type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

func (s *Store) Create(sh *Shoot) error {
	_, err := s.db.Exec(
		`INSERT INTO shoots (id, character_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)`,
		sh.ID, sh.CharacterID, sh.Name, sh.SortOrder, sh.CreatedAt.UTC().Format(time.RFC3339),
	)
	return err
}

func (s *Store) List(characterID string) ([]Shoot, error) {
	rows, err := s.db.Query(
		`SELECT s.id, s.character_id, s.name, s.sort_order, s.created_at, COALESCE(si.cnt, 0)
		 FROM shoots s
		 LEFT JOIN (SELECT shoot_id, COUNT(*) as cnt FROM shoot_images GROUP BY shoot_id) si ON si.shoot_id = s.id
		 WHERE s.character_id = ? ORDER BY s.sort_order`, characterID)
	if err != nil {
		return nil, fmt.Errorf("list shoots: %w", err)
	}
	defer rows.Close()

	var shoots []Shoot
	for rows.Next() {
		var sh Shoot
		var createdAt string
		if err := rows.Scan(&sh.ID, &sh.CharacterID, &sh.Name, &sh.SortOrder, &createdAt, &sh.ImageCount); err != nil {
			return nil, fmt.Errorf("scan shoot: %w", err)
		}
		sh.CreatedAt = parseTime(createdAt)
		shoots = append(shoots, sh)
	}
	return shoots, rows.Err()
}

func (s *Store) Delete(id string) error {
	_, err := s.db.Exec(`DELETE FROM shoots WHERE id = ?`, id)
	return err
}

func (s *Store) AddImage(shootID, imageID string, sortOrder int) error {
	_, err := s.db.Exec(
		`INSERT OR IGNORE INTO shoot_images (shoot_id, image_id, sort_order) VALUES (?, ?, ?)`,
		shootID, imageID, sortOrder,
	)
	return err
}

func (s *Store) AddImages(shootID string, imageIDs []string) error {
	for i, imgID := range imageIDs {
		if err := s.AddImage(shootID, imgID, i); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) RemoveImage(shootID, imageID string) error {
	_, err := s.db.Exec(`DELETE FROM shoot_images WHERE shoot_id = ? AND image_id = ?`, shootID, imageID)
	return err
}

func (s *Store) ListImages(shootID string) ([]string, error) {
	rows, err := s.db.Query(
		`SELECT image_id FROM shoot_images WHERE shoot_id = ? ORDER BY sort_order`, shootID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}
