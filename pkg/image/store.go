package image

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

// columns shared by all character_images queries.
const ciColumns = `ci.image_id, ci.character_id, ci.era_id, ci.set_type, ci.triage_status, ci.rating, ci.ref_type, ci.ref_score, ci.ref_rank, ci.caption, COALESCE(i.source, 'manual'), ci.created_at`
const ciFrom = `character_images ci LEFT JOIN images i ON i.id = ci.image_id`

func scanCI(sc interface{ Scan(...any) error }) (CharacterImage, error) {
	var ci CharacterImage
	var createdAt string
	err := sc.Scan(
		&ci.ImageID, &ci.CharacterID, &ci.EraID, &ci.SetType, &ci.TriageStatus,
		&ci.Rating, &ci.RefType, &ci.RefScore, &ci.RefRank, &ci.Caption, &ci.Source, &createdAt,
	)
	ci.CreatedAt = parseTime(createdAt)
	return ci, err
}

func scanCIRows(rows *sql.Rows) ([]CharacterImage, error) {
	defer rows.Close()
	var images []CharacterImage
	for rows.Next() {
		ci, err := scanCI(rows)
		if err != nil {
			return nil, err
		}
		images = append(images, ci)
	}
	return images, rows.Err()
}

// Store provides image persistence operations.
type Store struct {
	db *sql.DB
}

// NewStore creates a new image Store.
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// GetCharacterImage returns the first character_image link for an image.
func (s *Store) GetCharacterImage(imageID string) (*CharacterImage, error) {
	row := s.db.QueryRow(
		`SELECT `+ciColumns+` FROM `+ciFrom+` WHERE ci.image_id = ? LIMIT 1`, imageID,
	)
	ci, err := scanCI(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get character image: %w", err)
	}
	return &ci, nil
}

// Create inserts a new image record.
func (s *Store) Create(img *Image) error {
	_, err := s.db.Exec(
		`INSERT INTO images (id, hash, original_filename, format, width, height, file_size, source, ingested_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		img.ID, img.Hash, img.OriginalFilename, img.Format, img.Width, img.Height, img.FileSize, img.Source,
		img.IngestedAt.UTC().Format(time.RFC3339),
	)
	if err != nil {
		return fmt.Errorf("insert image: %w", err)
	}
	return nil
}

// Get retrieves an image by ID.
func (s *Store) Get(id string) (*Image, error) {
	img := &Image{}
	var ingestedAt string
	err := s.db.QueryRow(
		`SELECT id, hash, original_filename, format, width, height, file_size, source, ingested_at
		 FROM images WHERE id = ?`, id,
	).Scan(&img.ID, &img.Hash, &img.OriginalFilename, &img.Format, &img.Width, &img.Height, &img.FileSize, &img.Source, &ingestedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get image: %w", err)
	}
	img.IngestedAt = parseTime(ingestedAt)
	return img, nil
}

// GetByHash returns an image with the given content hash, if it exists.
func (s *Store) GetByHash(hash string) (*Image, error) {
	img := &Image{}
	var ingestedAt string
	err := s.db.QueryRow(
		`SELECT id, hash, original_filename, format, width, height, file_size, source, ingested_at
		 FROM images WHERE hash = ? LIMIT 1`, hash,
	).Scan(&img.ID, &img.Hash, &img.OriginalFilename, &img.Format, &img.Width, &img.Height, &img.FileSize, &img.Source, &ingestedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get image by hash: %w", err)
	}
	img.IngestedAt = parseTime(ingestedAt)
	return img, nil
}

// CreateCharacterImage links an image to a character.
func (s *Store) CreateCharacterImage(ci *CharacterImage) error {
	_, err := s.db.Exec(
		`INSERT INTO character_images (image_id, character_id, era_id, set_type, triage_status, rating, ref_type, ref_score, ref_rank, caption, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		ci.ImageID, ci.CharacterID, ci.EraID, ci.SetType, ci.TriageStatus, ci.Rating,
		ci.RefType, ci.RefScore, ci.RefRank, ci.Caption,
		ci.CreatedAt.UTC().Format(time.RFC3339),
	)
	if err != nil {
		return fmt.Errorf("insert character image: %w", err)
	}
	return nil
}

// ListByCharacter returns all images for a character, optionally filtered by era.
func (s *Store) ListByCharacter(characterID string, eraID *string) ([]CharacterImage, error) {
	var rows *sql.Rows
	var err error
	if eraID != nil {
		rows, err = s.db.Query(
			`SELECT `+ciColumns+` FROM `+ciFrom+` WHERE ci.character_id = ? AND ci.era_id = ? ORDER BY ci.created_at DESC`,
			characterID, *eraID,
		)
	} else {
		rows, err = s.db.Query(
			`SELECT `+ciColumns+` FROM `+ciFrom+` WHERE ci.character_id = ? ORDER BY ci.created_at DESC`,
			characterID,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("list character images: %w", err)
	}
	return scanCIRows(rows)
}

// ListRefsByType returns reference images of a given type for a character era, ordered by rank.
func (s *Store) ListRefsByType(characterID, eraID string, refType RefType) ([]CharacterImage, error) {
	rows, err := s.db.Query(
		`SELECT `+ciColumns+` FROM `+ciFrom+`
		 WHERE ci.character_id = ? AND ci.era_id = ? AND ci.ref_type = ?
		 ORDER BY ci.ref_rank ASC NULLS LAST`,
		characterID, eraID, refType,
	)
	if err != nil {
		return nil, fmt.Errorf("list %s refs: %w", refType, err)
	}
	return scanCIRows(rows)
}

// ListFaceRefs returns face reference images for a character era, ordered by rank.
func (s *Store) ListFaceRefs(characterID, eraID string) ([]CharacterImage, error) {
	return s.ListRefsByType(characterID, eraID, RefFace)
}

// ListBodyRefs returns body reference images for a character era, ordered by rank.
func (s *Store) ListBodyRefs(characterID, eraID string) ([]CharacterImage, error) {
	return s.ListRefsByType(characterID, eraID, RefBody)
}

// CharacterImageUpdate holds optional fields for updating a character image.
type CharacterImageUpdate struct {
	SetType      *SetType      `json:"set_type,omitempty"`
	TriageStatus *TriageStatus `json:"triage_status,omitempty"`
	Rating       *int          `json:"rating,omitempty"`
	RefType      *string       `json:"ref_type,omitempty"` // use "" to clear, or "face"/"body"/"breasts"/"vagina"
	RefScore     *float64      `json:"ref_score,omitempty"`
	RefRank      *int          `json:"ref_rank,omitempty"`
	EraID        *string       `json:"era_id,omitempty"`
	Caption      *string       `json:"caption,omitempty"`
}

// UpdateCharacterImage updates fields on a character_images record.
func (s *Store) UpdateCharacterImage(imageID, characterID string, update *CharacterImageUpdate) error {
	if update.SetType != nil {
		s.db.Exec(`UPDATE character_images SET set_type = ? WHERE image_id = ? AND character_id = ?`, *update.SetType, imageID, characterID)
	}
	if update.TriageStatus != nil {
		s.db.Exec(`UPDATE character_images SET triage_status = ? WHERE image_id = ? AND character_id = ?`, *update.TriageStatus, imageID, characterID)
	}
	if update.Rating != nil {
		s.db.Exec(`UPDATE character_images SET rating = ? WHERE image_id = ? AND character_id = ?`, *update.Rating, imageID, characterID)
	}
	if update.RefType != nil {
		var val any
		if *update.RefType == "" {
			val = nil // clear ref_type
		} else {
			val = *update.RefType
		}
		s.db.Exec(`UPDATE character_images SET ref_type = ? WHERE image_id = ? AND character_id = ?`, val, imageID, characterID)
	}
	if update.RefScore != nil {
		s.db.Exec(`UPDATE character_images SET ref_score = ? WHERE image_id = ? AND character_id = ?`, *update.RefScore, imageID, characterID)
	}
	if update.RefRank != nil {
		s.db.Exec(`UPDATE character_images SET ref_rank = ? WHERE image_id = ? AND character_id = ?`, *update.RefRank, imageID, characterID)
	}
	if update.EraID != nil {
		s.db.Exec(`UPDATE character_images SET era_id = ? WHERE image_id = ? AND character_id = ?`, *update.EraID, imageID, characterID)
	}
	if update.Caption != nil {
		s.db.Exec(`UPDATE character_images SET caption = ? WHERE image_id = ? AND character_id = ?`, *update.Caption, imageID, characterID)
	}
	return nil
}

// BulkUpdateCharacterImages applies the same update to multiple images for a character.
func (s *Store) BulkUpdateCharacterImages(characterID string, imageIDs []string, update *CharacterImageUpdate) (int, error) {
	if len(imageIDs) == 0 {
		return 0, nil
	}

	// Build placeholder list
	placeholders := ""
	args := make([]any, 0, len(imageIDs)+2)
	for i, id := range imageIDs {
		if i > 0 {
			placeholders += ","
		}
		placeholders += "?"
		args = append(args, id)
	}

	applyBulk := func(field string, value any) error {
		query := fmt.Sprintf(`UPDATE character_images SET %s = ? WHERE character_id = ? AND image_id IN (%s)`, field, placeholders)
		allArgs := append([]any{value, characterID}, args...)
		_, err := s.db.Exec(query, allArgs...)
		return err
	}

	if update.SetType != nil {
		if err := applyBulk("set_type", *update.SetType); err != nil {
			return 0, err
		}
	}
	if update.TriageStatus != nil {
		if err := applyBulk("triage_status", *update.TriageStatus); err != nil {
			return 0, err
		}
	}
	if update.Rating != nil {
		if err := applyBulk("rating", *update.Rating); err != nil {
			return 0, err
		}
	}
	if update.RefType != nil {
		var val any
		if *update.RefType == "" {
			val = nil
		} else {
			val = *update.RefType
		}
		if err := applyBulk("ref_type", val); err != nil {
			return 0, err
		}
	}
	if update.RefRank != nil {
		if err := applyBulk("ref_rank", *update.RefRank); err != nil {
			return 0, err
		}
	}
	if update.EraID != nil {
		if err := applyBulk("era_id", *update.EraID); err != nil {
			return 0, err
		}
	}
	return len(imageIDs), nil
}

// ListPendingByCharacter returns images with triage_status='pending' for a character, optionally filtered by era.
func (s *Store) ListPendingByCharacter(characterID string, eraID *string) ([]CharacterImage, error) {
	var rows *sql.Rows
	var err error
	if eraID != nil {
		rows, err = s.db.Query(
			`SELECT `+ciColumns+` FROM `+ciFrom+` WHERE ci.character_id = ? AND ci.era_id = ? AND ci.triage_status = 'pending' ORDER BY ci.created_at DESC`,
			characterID, *eraID,
		)
	} else {
		rows, err = s.db.Query(
			`SELECT `+ciColumns+` FROM `+ciFrom+` WHERE ci.character_id = ? AND ci.triage_status = 'pending' ORDER BY ci.created_at DESC`,
			characterID,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("list pending: %w", err)
	}
	return scanCIRows(rows)
}

// ToggleFavorite sets or clears the is_favorited flag on a character image.
func (s *Store) ToggleFavorite(imageID, characterID string, favorited bool) error {
	_, err := s.db.Exec(
		`UPDATE character_images SET is_favorited = ? WHERE image_id = ? AND character_id = ?`,
		boolToInt(favorited), imageID, characterID,
	)
	return err
}

// ListFavorites returns favorited images for a character.
func (s *Store) ListFavorites(characterID string) ([]CharacterImage, error) {
	rows, err := s.db.Query(
		`SELECT `+ciColumns+` FROM `+ciFrom+` WHERE ci.character_id = ? AND ci.is_favorited = 1 ORDER BY ci.created_at DESC`,
		characterID,
	)
	if err != nil {
		return nil, fmt.Errorf("list favorites: %w", err)
	}
	return scanCIRows(rows)
}

// DeleteCharacterImage removes a character_images association and the underlying image record.
func (s *Store) DeleteCharacterImage(imageID, characterID string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	res, err := tx.Exec(`DELETE FROM character_images WHERE image_id = ? AND character_id = ?`, imageID, characterID)
	if err != nil {
		return fmt.Errorf("delete character_image: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("character image not found")
	}

	// Delete the image record if no other character references it.
	var remaining int
	if err := tx.QueryRow(`SELECT COUNT(*) FROM character_images WHERE image_id = ?`, imageID).Scan(&remaining); err != nil {
		return fmt.Errorf("check remaining refs: %w", err)
	}
	if remaining == 0 {
		if _, err := tx.Exec(`DELETE FROM images WHERE id = ?`, imageID); err != nil {
			return fmt.Errorf("delete image: %w", err)
		}
	}

	return tx.Commit()
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
