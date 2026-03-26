package look

import (
	"database/sql"
	"encoding/json"
	"time"
)

func nowStr() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05Z")
}

// Store provides CRUD for character looks (go-see outfits).
type Store struct {
	db *sql.DB
}

// NewStore creates a new look store.
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// Create inserts a new look.
func (s *Store) Create(l *Look) error {
	_, err := s.db.Exec(`
		INSERT INTO character_looks (id, character_id, era_id, name, wardrobe_item_ids, is_default, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		l.ID, l.CharacterID, l.EraID, l.Name, l.WardrobeItemIDs, l.IsDefault, l.CreatedAt,
	)
	return err
}

// Get retrieves a look by ID.
func (s *Store) Get(id string) (*Look, error) {
	l := &Look{}
	var isDefault int
	err := s.db.QueryRow(`SELECT id, character_id, era_id, name, wardrobe_item_ids, is_default, created_at FROM character_looks WHERE id = ?`, id).
		Scan(&l.ID, &l.CharacterID, &l.EraID, &l.Name, &l.WardrobeItemIDs, &isDefault, &l.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	l.IsDefault = isDefault != 0
	return l, err
}

// ListByCharacter returns all looks for a character with garment count and try-on progress.
func (s *Store) ListByCharacter(characterID string) ([]LookWithDetails, error) {
	rows, err := s.db.Query(`
		SELECT l.id, l.character_id, l.era_id, l.name, l.wardrobe_item_ids, l.is_default, l.created_at,
		       (SELECT COUNT(*) FROM look_images li WHERE li.look_id = l.id) as try_on_count
		FROM character_looks l
		WHERE l.character_id = ?
		ORDER BY l.is_default DESC, l.created_at`, characterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var looks []LookWithDetails
	for rows.Next() {
		var l LookWithDetails
		var isDefault int
		var tryOnCount int
		if err := rows.Scan(&l.ID, &l.CharacterID, &l.EraID, &l.Name, &l.WardrobeItemIDs, &isDefault, &l.CreatedAt, &tryOnCount); err != nil {
			return nil, err
		}
		l.IsDefault = isDefault != 0
		// Count garments from JSON array
		var ids []string
		json.Unmarshal([]byte(l.WardrobeItemIDs), &ids)
		l.GarmentCount = len(ids)
		l.TryOnTotal = 6 // 6 SFW standard poses
		l.TryOnComplete = tryOnCount
		looks = append(looks, l)
	}
	return looks, rows.Err()
}

// Update modifies a look's name, garments, or default status.
func (s *Store) Update(id, name, wardrobeItemIDs string, isDefault *bool) error {
	if name != "" {
		if _, err := s.db.Exec(`UPDATE character_looks SET name = ? WHERE id = ?`, name, id); err != nil {
			return err
		}
	}
	if wardrobeItemIDs != "" {
		if _, err := s.db.Exec(`UPDATE character_looks SET wardrobe_item_ids = ? WHERE id = ?`, wardrobeItemIDs, id); err != nil {
			return err
		}
	}
	if isDefault != nil && *isDefault {
		// Clear other defaults for this character, then set this one
		l, err := s.Get(id)
		if err != nil || l == nil {
			return err
		}
		if _, err := s.db.Exec(`UPDATE character_looks SET is_default = 0 WHERE character_id = ?`, l.CharacterID); err != nil {
			return err
		}
		if _, err := s.db.Exec(`UPDATE character_looks SET is_default = 1 WHERE id = ?`, id); err != nil {
			return err
		}
	}
	return nil
}

// Delete removes a look and its try-on images.
func (s *Store) Delete(id string) error {
	_, err := s.db.Exec(`DELETE FROM character_looks WHERE id = ?`, id)
	return err
}

// AddTryOnImage links a generated try-on image to a look.
func (s *Store) AddTryOnImage(lookID, imageID string) error {
	_, err := s.db.Exec(`
		INSERT OR IGNORE INTO look_images (look_id, image_id, sort_order)
		VALUES (?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM look_images WHERE look_id = ?))`,
		lookID, imageID, lookID,
	)
	return err
}

// ListTryOnImages returns all try-on images for a look.
func (s *Store) ListTryOnImages(lookID string) ([]string, error) {
	rows, err := s.db.Query(`SELECT image_id FROM look_images WHERE look_id = ? ORDER BY sort_order`, lookID)
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

func now() time.Time {
	return time.Now().UTC()
}
