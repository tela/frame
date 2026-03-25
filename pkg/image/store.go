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
	var ci CharacterImage
	var createdAt string
	var isFaceRef, isBodyRef int
	err := s.db.QueryRow(
		`SELECT image_id, character_id, era_id, set_type, triage_status, rating, is_face_ref, is_body_ref, ref_score, ref_rank, caption, created_at
		 FROM character_images WHERE image_id = ? LIMIT 1`, imageID,
	).Scan(&ci.ImageID, &ci.CharacterID, &ci.EraID, &ci.SetType, &ci.TriageStatus,
		&ci.Rating, &isFaceRef, &isBodyRef, &ci.RefScore, &ci.RefRank, &ci.Caption, &createdAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get character image: %w", err)
	}
	ci.IsFaceRef = isFaceRef != 0
	ci.IsBodyRef = isBodyRef != 0
	ci.CreatedAt = parseTime(createdAt)
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
		`INSERT INTO character_images (image_id, character_id, era_id, set_type, triage_status, rating, is_face_ref, is_body_ref, ref_score, ref_rank, caption, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		ci.ImageID, ci.CharacterID, ci.EraID, ci.SetType, ci.TriageStatus, ci.Rating,
		boolToInt(ci.IsFaceRef), boolToInt(ci.IsBodyRef), ci.RefScore, ci.RefRank, ci.Caption,
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
			`SELECT image_id, character_id, era_id, set_type, triage_status, rating, is_face_ref, is_body_ref, ref_score, ref_rank, caption, created_at
			 FROM character_images WHERE character_id = ? AND era_id = ? ORDER BY created_at DESC`,
			characterID, *eraID,
		)
	} else {
		rows, err = s.db.Query(
			`SELECT image_id, character_id, era_id, set_type, triage_status, rating, is_face_ref, is_body_ref, ref_score, ref_rank, caption, created_at
			 FROM character_images WHERE character_id = ? ORDER BY created_at DESC`,
			characterID,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("list character images: %w", err)
	}
	defer rows.Close()

	var images []CharacterImage
	for rows.Next() {
		var ci CharacterImage
		var createdAt string
		var isFaceRef, isBodyRef int
		if err := rows.Scan(
			&ci.ImageID, &ci.CharacterID, &ci.EraID, &ci.SetType, &ci.TriageStatus,
			&ci.Rating, &isFaceRef, &isBodyRef, &ci.RefScore, &ci.RefRank, &ci.Caption, &createdAt,
		); err != nil {
			return nil, fmt.Errorf("scan character image: %w", err)
		}
		ci.IsFaceRef = isFaceRef != 0
		ci.IsBodyRef = isBodyRef != 0
		ci.CreatedAt = parseTime(createdAt)
		images = append(images, ci)
	}
	return images, rows.Err()
}

// ListFaceRefs returns face reference images for a character era, ordered by rank.
func (s *Store) ListFaceRefs(characterID, eraID string) ([]CharacterImage, error) {
	rows, err := s.db.Query(
		`SELECT image_id, character_id, era_id, set_type, triage_status, rating, is_face_ref, is_body_ref, ref_score, ref_rank, caption, created_at
		 FROM character_images
		 WHERE character_id = ? AND era_id = ? AND is_face_ref = 1
		 ORDER BY ref_rank ASC NULLS LAST`,
		characterID, eraID,
	)
	if err != nil {
		return nil, fmt.Errorf("list face refs: %w", err)
	}
	defer rows.Close()

	var refs []CharacterImage
	for rows.Next() {
		var ci CharacterImage
		var createdAt string
		var isFaceRef, isBodyRef int
		if err := rows.Scan(
			&ci.ImageID, &ci.CharacterID, &ci.EraID, &ci.SetType, &ci.TriageStatus,
			&ci.Rating, &isFaceRef, &isBodyRef, &ci.RefScore, &ci.RefRank, &ci.Caption, &createdAt,
		); err != nil {
			return nil, fmt.Errorf("scan face ref: %w", err)
		}
		ci.IsFaceRef = isFaceRef != 0
		ci.IsBodyRef = isBodyRef != 0
		ci.CreatedAt = parseTime(createdAt)
		refs = append(refs, ci)
	}
	return refs, rows.Err()
}

// ListBodyRefs returns body reference images for a character era, ordered by rank.
func (s *Store) ListBodyRefs(characterID, eraID string) ([]CharacterImage, error) {
	rows, err := s.db.Query(
		`SELECT image_id, character_id, era_id, set_type, triage_status, rating, is_face_ref, is_body_ref, ref_score, ref_rank, caption, created_at
		 FROM character_images
		 WHERE character_id = ? AND era_id = ? AND is_body_ref = 1
		 ORDER BY ref_rank ASC NULLS LAST`,
		characterID, eraID,
	)
	if err != nil {
		return nil, fmt.Errorf("list body refs: %w", err)
	}
	defer rows.Close()

	var refs []CharacterImage
	for rows.Next() {
		var ci CharacterImage
		var createdAt string
		var isFaceRef, isBodyRef int
		if err := rows.Scan(
			&ci.ImageID, &ci.CharacterID, &ci.EraID, &ci.SetType, &ci.TriageStatus,
			&ci.Rating, &isFaceRef, &isBodyRef, &ci.RefScore, &ci.RefRank, &ci.Caption, &createdAt,
		); err != nil {
			return nil, fmt.Errorf("scan body ref: %w", err)
		}
		ci.IsFaceRef = isFaceRef != 0
		ci.IsBodyRef = isBodyRef != 0
		ci.CreatedAt = parseTime(createdAt)
		refs = append(refs, ci)
	}
	return refs, rows.Err()
}

// CharacterImageUpdate holds optional fields for updating a character image.
type CharacterImageUpdate struct {
	SetType      *SetType      `json:"set_type,omitempty"`
	TriageStatus *TriageStatus `json:"triage_status,omitempty"`
	Rating       *int          `json:"rating,omitempty"`
	IsFaceRef    *bool         `json:"is_face_ref,omitempty"`
	IsBodyRef    *bool         `json:"is_body_ref,omitempty"`
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
	if update.IsFaceRef != nil {
		s.db.Exec(`UPDATE character_images SET is_face_ref = ? WHERE image_id = ? AND character_id = ?`, boolToInt(*update.IsFaceRef), imageID, characterID)
	}
	if update.IsBodyRef != nil {
		s.db.Exec(`UPDATE character_images SET is_body_ref = ? WHERE image_id = ? AND character_id = ?`, boolToInt(*update.IsBodyRef), imageID, characterID)
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

// ListPendingByCharacter returns images with triage_status='pending' for a character, optionally filtered by era.
func (s *Store) ListPendingByCharacter(characterID string, eraID *string) ([]CharacterImage, error) {
	var rows *sql.Rows
	var err error
	if eraID != nil {
		rows, err = s.db.Query(
			`SELECT image_id, character_id, era_id, set_type, triage_status, rating, is_face_ref, is_body_ref, ref_score, ref_rank, caption, created_at
			 FROM character_images WHERE character_id = ? AND era_id = ? AND triage_status = 'pending' ORDER BY created_at DESC`,
			characterID, *eraID,
		)
	} else {
		rows, err = s.db.Query(
			`SELECT image_id, character_id, era_id, set_type, triage_status, rating, is_face_ref, is_body_ref, ref_score, ref_rank, caption, created_at
			 FROM character_images WHERE character_id = ? AND triage_status = 'pending' ORDER BY created_at DESC`,
			characterID,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("list pending: %w", err)
	}
	defer rows.Close()

	var images []CharacterImage
	for rows.Next() {
		var ci CharacterImage
		var createdAt string
		var isFaceRef, isBodyRef int
		if err := rows.Scan(
			&ci.ImageID, &ci.CharacterID, &ci.EraID, &ci.SetType, &ci.TriageStatus,
			&ci.Rating, &isFaceRef, &isBodyRef, &ci.RefScore, &ci.RefRank, &ci.Caption, &createdAt,
		); err != nil {
			return nil, fmt.Errorf("scan pending: %w", err)
		}
		ci.IsFaceRef = isFaceRef != 0
		ci.IsBodyRef = isBodyRef != 0
		ci.CreatedAt = parseTime(createdAt)
		images = append(images, ci)
	}
	return images, rows.Err()
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
