package image

import (
	"database/sql"
	"fmt"
	"time"
)

// Store provides image persistence operations.
type Store struct {
	db *sql.DB
}

// NewStore creates a new image Store.
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
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
	img.IngestedAt, _ = time.Parse(time.RFC3339, ingestedAt)
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
	img.IngestedAt, _ = time.Parse(time.RFC3339, ingestedAt)
	return img, nil
}

// CreateCharacterImage links an image to a character.
func (s *Store) CreateCharacterImage(ci *CharacterImage) error {
	_, err := s.db.Exec(
		`INSERT INTO character_images (image_id, character_id, era_id, set_type, triage_status, rating, is_face_ref, is_body_ref, ref_score, ref_rank, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		ci.ImageID, ci.CharacterID, ci.EraID, ci.SetType, ci.TriageStatus, ci.Rating,
		boolToInt(ci.IsFaceRef), boolToInt(ci.IsBodyRef), ci.RefScore, ci.RefRank,
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
			`SELECT image_id, character_id, era_id, set_type, triage_status, rating, is_face_ref, is_body_ref, ref_score, ref_rank, created_at
			 FROM character_images WHERE character_id = ? AND era_id = ? ORDER BY created_at DESC`,
			characterID, *eraID,
		)
	} else {
		rows, err = s.db.Query(
			`SELECT image_id, character_id, era_id, set_type, triage_status, rating, is_face_ref, is_body_ref, ref_score, ref_rank, created_at
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
			&ci.Rating, &isFaceRef, &isBodyRef, &ci.RefScore, &ci.RefRank, &createdAt,
		); err != nil {
			return nil, fmt.Errorf("scan character image: %w", err)
		}
		ci.IsFaceRef = isFaceRef != 0
		ci.IsBodyRef = isBodyRef != 0
		ci.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		images = append(images, ci)
	}
	return images, rows.Err()
}

// ListFaceRefs returns face reference images for a character era, ordered by rank.
func (s *Store) ListFaceRefs(characterID, eraID string) ([]CharacterImage, error) {
	rows, err := s.db.Query(
		`SELECT image_id, character_id, era_id, set_type, triage_status, rating, is_face_ref, is_body_ref, ref_score, ref_rank, created_at
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
			&ci.Rating, &isFaceRef, &isBodyRef, &ci.RefScore, &ci.RefRank, &createdAt,
		); err != nil {
			return nil, fmt.Errorf("scan face ref: %w", err)
		}
		ci.IsFaceRef = isFaceRef != 0
		ci.IsBodyRef = isBodyRef != 0
		ci.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		refs = append(refs, ci)
	}
	return refs, rows.Err()
}

// ListBodyRefs returns body reference images for a character era, ordered by rank.
func (s *Store) ListBodyRefs(characterID, eraID string) ([]CharacterImage, error) {
	rows, err := s.db.Query(
		`SELECT image_id, character_id, era_id, set_type, triage_status, rating, is_face_ref, is_body_ref, ref_score, ref_rank, created_at
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
			&ci.Rating, &isFaceRef, &isBodyRef, &ci.RefScore, &ci.RefRank, &createdAt,
		); err != nil {
			return nil, fmt.Errorf("scan body ref: %w", err)
		}
		ci.IsFaceRef = isFaceRef != 0
		ci.IsBodyRef = isBodyRef != 0
		ci.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		refs = append(refs, ci)
	}
	return refs, rows.Err()
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
