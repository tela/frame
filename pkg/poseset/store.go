package poseset

import (
	"database/sql"
	"time"
)

// Store provides operations for pose set tracking.
type Store struct {
	db *sql.DB
}

// NewStore creates a new pose set store.
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// PoseSetImage represents a single image in a character's standard pose set.
type PoseSetImage struct {
	CharacterID string    `json:"character_id"`
	EraID       string    `json:"era_id"`
	PoseID      string    `json:"pose_id"`
	OutfitID    string    `json:"outfit_id"`
	ImageID     *string   `json:"image_id"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

// StandardPose is a pose definition from the catalog.
type StandardPose struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Category      string `json:"category"`
	Framing       string `json:"framing"`
	ContentRating string `json:"content_rating"`
	PromptHints   string `json:"prompt_hints"`
	SortOrder     int    `json:"sort_order"`
}

// StandardOutfit is an outfit definition from the catalog.
type StandardOutfit struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	ContentRating string `json:"content_rating"`
	SortOrder     int    `json:"sort_order"`
}

// PoseSetStatus is the full status of a character's pose set for an era.
type PoseSetStatus struct {
	CharacterID string          `json:"character_id"`
	EraID       string          `json:"era_id"`
	Total       int             `json:"total"`
	Generated   int             `json:"generated"`
	Accepted    int             `json:"accepted"`
	Poses       []PoseSetEntry  `json:"poses"`
}

// PoseSetEntry is one cell in the pose set grid.
type PoseSetEntry struct {
	PoseID   string  `json:"pose_id"`
	PoseName string  `json:"pose_name"`
	Category string  `json:"category"`
	OutfitID string  `json:"outfit_id"`
	Status   string  `json:"status"` // "missing", "pending", "generated", "accepted", "rejected"
	ImageID  *string `json:"image_id"`
}

// ListPoses returns all standard pose definitions.
func (s *Store) ListPoses() ([]StandardPose, error) {
	rows, err := s.db.Query(`SELECT id, name, category, framing, content_rating, prompt_hints, sort_order FROM standard_poses ORDER BY sort_order`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var poses []StandardPose
	for rows.Next() {
		var p StandardPose
		if err := rows.Scan(&p.ID, &p.Name, &p.Category, &p.Framing, &p.ContentRating, &p.PromptHints, &p.SortOrder); err != nil {
			return nil, err
		}
		poses = append(poses, p)
	}
	return poses, rows.Err()
}

// ListOutfits returns all standard outfit definitions.
func (s *Store) ListOutfits() ([]StandardOutfit, error) {
	rows, err := s.db.Query(`SELECT id, name, content_rating, sort_order FROM standard_outfits ORDER BY sort_order`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var outfits []StandardOutfit
	for rows.Next() {
		var o StandardOutfit
		if err := rows.Scan(&o.ID, &o.Name, &o.ContentRating, &o.SortOrder); err != nil {
			return nil, err
		}
		outfits = append(outfits, o)
	}
	return outfits, rows.Err()
}

// GetStatus returns the full pose set status for a character/era.
func (s *Store) GetStatus(characterID, eraID string) (*PoseSetStatus, error) {
	poses, err := s.ListPoses()
	if err != nil {
		return nil, err
	}
	outfits, err := s.ListOutfits()
	if err != nil {
		return nil, err
	}

	// Load existing pose set images
	existing := map[string]PoseSetImage{}
	rows, err := s.db.Query(`SELECT pose_id, outfit_id, image_id, status FROM pose_set_images WHERE character_id = ? AND era_id = ?`, characterID, eraID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var psi PoseSetImage
		if err := rows.Scan(&psi.PoseID, &psi.OutfitID, &psi.ImageID, &psi.Status); err != nil {
			return nil, err
		}
		existing[psi.PoseID+"/"+psi.OutfitID] = psi
	}

	status := &PoseSetStatus{
		CharacterID: characterID,
		EraID:       eraID,
	}

	for _, pose := range poses {
		if pose.Category == "sfw_standard" {
			// SFW poses get all outfit variants
			for _, outfit := range outfits {
				entry := PoseSetEntry{
					PoseID:   pose.ID,
					PoseName: pose.Name,
					Category: pose.Category,
					OutfitID: outfit.ID,
					Status:   "missing",
				}
				if psi, ok := existing[pose.ID+"/"+outfit.ID]; ok {
					entry.Status = psi.Status
					entry.ImageID = psi.ImageID
				}
				status.Poses = append(status.Poses, entry)
				status.Total++
				if entry.Status == "generated" || entry.Status == "accepted" {
					status.Generated++
				}
				if entry.Status == "accepted" {
					status.Accepted++
				}
			}
		} else {
			// NSFW and anatomical poses are nude only
			entry := PoseSetEntry{
				PoseID:   pose.ID,
				PoseName: pose.Name,
				Category: pose.Category,
				OutfitID: "nude",
				Status:   "missing",
			}
			if psi, ok := existing[pose.ID+"/nude"]; ok {
				entry.Status = psi.Status
				entry.ImageID = psi.ImageID
			}
			status.Poses = append(status.Poses, entry)
			status.Total++
			if entry.Status == "generated" || entry.Status == "accepted" {
				status.Generated++
			}
			if entry.Status == "accepted" {
				status.Accepted++
			}
		}
	}

	return status, nil
}

// SetImage records a generated image for a pose set slot.
func (s *Store) SetImage(characterID, eraID, poseID, outfitID, imageID, status string) error {
	_, err := s.db.Exec(`
		INSERT INTO pose_set_images (character_id, era_id, pose_id, outfit_id, image_id, status, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (character_id, era_id, pose_id, outfit_id)
		DO UPDATE SET image_id = excluded.image_id, status = excluded.status`,
		characterID, eraID, poseID, outfitID, imageID, status, time.Now().UTC(),
	)
	return err
}

// UpdateStatus updates the status of a pose set image (e.g., accepted/rejected).
func (s *Store) UpdateStatus(characterID, eraID, poseID, outfitID, status string) error {
	_, err := s.db.Exec(`UPDATE pose_set_images SET status = ? WHERE character_id = ? AND era_id = ? AND pose_id = ? AND outfit_id = ?`,
		status, characterID, eraID, poseID, outfitID)
	return err
}
