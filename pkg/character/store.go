package character

import (
	"database/sql"
	"fmt"
	"strings"
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

// Ping checks database connectivity.
func (s *Store) Ping() error {
	return s.db.Ping()
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
		`INSERT INTO characters (id, name, display_name, folder_name, status, fig_published, fig_character_url, source,
		 gender, ethnicity, skin_tone, eye_color, eye_shape, natural_hair_color, natural_hair_texture, distinguishing_features,
		 created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		c.ID, c.Name, c.DisplayName, c.FolderName, c.Status, boolToInt(c.FigPublished), c.FigCharacterURL, c.Source,
		c.Gender, c.Ethnicity, c.SkinTone, c.EyeColor, c.EyeShape, c.NaturalHairColor, c.NaturalHairTexture, c.DistinguishingFeatures,
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
		`SELECT id, name, display_name, folder_name, status, fig_published, fig_character_url, source,
		 gender, ethnicity, skin_tone, eye_color, eye_shape, natural_hair_color, natural_hair_texture, distinguishing_features,
		 COALESCE(avatar_image_id, ''), created_at, updated_at
		 FROM characters WHERE id = ?`, id,
	).Scan(&c.ID, &c.Name, &c.DisplayName, &c.FolderName, &c.Status, &figPub, &c.FigCharacterURL, &c.Source,
		&c.Gender, &c.Ethnicity, &c.SkinTone, &c.EyeColor, &c.EyeShape, &c.NaturalHairColor, &c.NaturalHairTexture, &c.DistinguishingFeatures,
		&c.AvatarImageID, &createdAt, &updatedAt)
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
		`SELECT id, name, display_name, folder_name, status, fig_published, fig_character_url, source,
		 gender, ethnicity, skin_tone, eye_color, eye_shape, natural_hair_color, natural_hair_texture, distinguishing_features,
		 COALESCE(avatar_image_id, ''), created_at, updated_at
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
		if err := rows.Scan(&c.ID, &c.Name, &c.DisplayName, &c.FolderName, &c.Status, &figPub, &c.FigCharacterURL, &c.Source,
			&c.Gender, &c.Ethnicity, &c.SkinTone, &c.EyeColor, &c.EyeShape, &c.NaturalHairColor, &c.NaturalHairTexture, &c.DistinguishingFeatures,
			&c.AvatarImageID, &createdAt, &updatedAt); err != nil {
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

// SetAvatarImage sets the character's avatar image. Only called on favorite, not on unfavorite.
func (s *Store) SetAvatarImage(id, imageID string) error {
	_, err := s.db.Exec(
		`UPDATE characters SET avatar_image_id = ?, updated_at = datetime('now') WHERE id = ?`,
		imageID, id,
	)
	return err
}

// Delete removes a prospect character and all associated data.
// Only works for prospect status — development/cast characters must be archived.
func (s *Store) Delete(id string) error {
	// Verify the character is a prospect
	c, err := s.Get(id)
	if err != nil || c == nil {
		return fmt.Errorf("character %s not found", id)
	}
	if c.Status != StatusProspect {
		return fmt.Errorf("only prospect characters can be deleted; archive %s characters instead", c.Status)
	}

	// Cascade delete in dependency order
	s.db.Exec(`DELETE FROM pose_set_images WHERE character_id = ?`, id)
	s.db.Exec(`DELETE FROM character_looks WHERE character_id = ?`, id)
	s.db.Exec(`DELETE FROM shoots WHERE character_id = ?`, id)
	s.db.Exec(`DELETE FROM character_images WHERE character_id = ?`, id)
	s.db.Exec(`DELETE FROM eras WHERE character_id = ?`, id)
	_, err = s.db.Exec(`DELETE FROM characters WHERE id = ?`, id)
	return err
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

// UpdatePhysical updates the physical attribute fields on a character.
func (s *Store) UpdatePhysical(id string, fields map[string]interface{}) error {
	if len(fields) == 0 {
		return nil
	}
	allowed := map[string]bool{
		"gender": true, "ethnicity": true, "skin_tone": true,
		"eye_color": true, "eye_shape": true,
		"natural_hair_color": true, "natural_hair_texture": true,
		"distinguishing_features": true,
	}
	var setClauses []string
	var args []interface{}
	for k, v := range fields {
		if !allowed[k] {
			continue
		}
		setClauses = append(setClauses, k+" = ?")
		args = append(args, v)
	}
	if len(setClauses) == 0 {
		return nil
	}
	setClauses = append(setClauses, "updated_at = datetime('now')")
	args = append(args, id)

	query := "UPDATE characters SET " + strings.Join(setClauses, ", ") + " WHERE id = ?"
	_, err := s.db.Exec(query, args...)
	return err
}

// UpdateEra updates fields on an era record.
func (s *Store) UpdateEra(eraID string, fields map[string]interface{}) error {
	if len(fields) == 0 {
		return nil
	}
	allowed := map[string]bool{
		"label": true, "age_range": true, "time_period": true,
		"description": true, "visual_description": true, "prompt_prefix": true,
		"height_cm": true, "weight_kg": true, "build": true,
		"breast_size": true, "breast_tanner": true, "hip_shape": true,
		"pubic_hair_style": true, "pubic_hair_tanner": true,
		"hair_color": true, "hair_length": true,
		"gynecoid_stage": true, "waist_hip_ratio": true,
		"face_shape": true, "buccal_fat": true, "jaw_definition": true,
		"brow_ridge": true, "nasolabial_depth": true,
		"skin_texture": true, "skin_pore_visibility": true, "under_eye": true,
		"head_body_ratio": true, "leg_torso_ratio": true, "shoulder_hip_ratio": true,
		"areola_size": true, "areola_color": true, "areola_shape": true,
		"labia_majora": true, "labia_minora": true, "labia_color": true,
	}
	var setClauses []string
	var args []interface{}
	for k, v := range fields {
		if !allowed[k] {
			continue
		}
		setClauses = append(setClauses, k+" = ?")
		args = append(args, v)
	}
	if len(setClauses) == 0 {
		return nil
	}
	setClauses = append(setClauses, "updated_at = datetime('now')")
	args = append(args, eraID)

	query := "UPDATE eras SET " + strings.Join(setClauses, ", ") + " WHERE id = ?"
	_, err := s.db.Exec(query, args...)
	return err
}

// CreateEra inserts a new era for a character.
func (s *Store) CreateEra(e *Era) error {
	_, err := s.db.Exec(
		`INSERT INTO eras (id, character_id, label, age_range, time_period, description, visual_description, prompt_prefix, pipeline_settings, sort_order,
		 height_cm, weight_kg, build, breast_size, breast_tanner, hip_shape, pubic_hair_style, pubic_hair_tanner, hair_color, hair_length,
		 gynecoid_stage, waist_hip_ratio,
		 face_shape, buccal_fat, jaw_definition, brow_ridge, nasolabial_depth,
		 skin_texture, skin_pore_visibility, under_eye,
		 head_body_ratio, leg_torso_ratio, shoulder_hip_ratio,
		 areola_size, areola_color, areola_shape,
		 labia_majora, labia_minora, labia_color,
		 created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		e.ID, e.CharacterID, e.Label, e.AgeRange, e.TimePeriod, e.Description, e.VisualDescription, e.PromptPrefix, e.PipelineSettings, e.SortOrder,
		e.HeightCM, e.WeightKG, e.Build, e.BreastSize, e.BreastTanner, e.HipShape, e.PubicHairStyle, e.PubicHairTanner, e.HairColor, e.HairLength,
		e.GynecoidStage, e.WaistHipRatio,
		e.FaceShape, e.BuccalFat, e.JawDefinition, e.BrowRidge, e.NasolabialDepth,
		e.SkinTexture, e.SkinPoreVisibility, e.UnderEye,
		e.HeadBodyRatio, e.LegTorsoRatio, e.ShoulderHipRatio,
		e.AreolaSize, e.AreolaColor, e.AreolaShape,
		e.LabiaMajora, e.LabiaMinora, e.LabiaColor,
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
		`SELECT id, character_id, label, age_range, time_period, description, visual_description, prompt_prefix, pipeline_settings, sort_order,
		 height_cm, weight_kg, build, breast_size, breast_tanner, hip_shape, pubic_hair_style, pubic_hair_tanner, hair_color, hair_length,
		 gynecoid_stage, waist_hip_ratio,
		 face_shape, buccal_fat, jaw_definition, brow_ridge, nasolabial_depth,
		 skin_texture, skin_pore_visibility, under_eye,
		 head_body_ratio, leg_torso_ratio, shoulder_hip_ratio,
		 areola_size, areola_color, areola_shape,
		 labia_majora, labia_minora, labia_color,
		 created_at, updated_at
		 FROM eras WHERE id = ?`, id,
	).Scan(&e.ID, &e.CharacterID, &e.Label, &e.AgeRange, &e.TimePeriod, &e.Description, &e.VisualDescription, &e.PromptPrefix, &e.PipelineSettings, &e.SortOrder,
		&e.HeightCM, &e.WeightKG, &e.Build, &e.BreastSize, &e.BreastTanner, &e.HipShape, &e.PubicHairStyle, &e.PubicHairTanner, &e.HairColor, &e.HairLength,
		&e.GynecoidStage, &e.WaistHipRatio,
		&e.FaceShape, &e.BuccalFat, &e.JawDefinition, &e.BrowRidge, &e.NasolabialDepth,
		&e.SkinTexture, &e.SkinPoreVisibility, &e.UnderEye,
		&e.HeadBodyRatio, &e.LegTorsoRatio, &e.ShoulderHipRatio,
		&e.AreolaSize, &e.AreolaColor, &e.AreolaShape,
		&e.LabiaMajora, &e.LabiaMinora, &e.LabiaColor,
		&createdAt, &updatedAt)
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
		`SELECT id, character_id, label, age_range, time_period, description, visual_description, prompt_prefix, pipeline_settings, sort_order,
		 height_cm, weight_kg, build, breast_size, breast_tanner, hip_shape, pubic_hair_style, pubic_hair_tanner, hair_color, hair_length,
		 gynecoid_stage, waist_hip_ratio,
		 face_shape, buccal_fat, jaw_definition, brow_ridge, nasolabial_depth,
		 skin_texture, skin_pore_visibility, under_eye,
		 head_body_ratio, leg_torso_ratio, shoulder_hip_ratio,
		 areola_size, areola_color, areola_shape,
		 labia_majora, labia_minora, labia_color,
		 created_at, updated_at
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
		if err := rows.Scan(&e.ID, &e.CharacterID, &e.Label, &e.AgeRange, &e.TimePeriod, &e.Description, &e.VisualDescription, &e.PromptPrefix, &e.PipelineSettings, &e.SortOrder,
			&e.HeightCM, &e.WeightKG, &e.Build, &e.BreastSize, &e.BreastTanner, &e.HipShape, &e.PubicHairStyle, &e.PubicHairTanner, &e.HairColor, &e.HairLength,
			&e.GynecoidStage, &e.WaistHipRatio,
			&e.FaceShape, &e.BuccalFat, &e.JawDefinition, &e.BrowRidge, &e.NasolabialDepth,
			&e.SkinTexture, &e.SkinPoreVisibility, &e.UnderEye,
			&e.HeadBodyRatio, &e.LegTorsoRatio, &e.ShoulderHipRatio,
			&e.AreolaSize, &e.AreolaColor, &e.AreolaShape,
			&e.LabiaMajora, &e.LabiaMinora, &e.LabiaColor,
			&createdAt, &updatedAt); err != nil {
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
		        e.visual_description, e.prompt_prefix, e.pipeline_settings, e.sort_order,
		        e.height_cm, e.weight_kg, e.build, e.breast_size, e.breast_tanner,
		        e.hip_shape, e.pubic_hair_style, e.pubic_hair_tanner, e.hair_color, e.hair_length,
		        e.gynecoid_stage, e.waist_hip_ratio,
		        e.face_shape, e.buccal_fat, e.jaw_definition, e.brow_ridge, e.nasolabial_depth,
		        e.skin_texture, e.skin_pore_visibility, e.under_eye,
		        e.head_body_ratio, e.leg_torso_ratio, e.shoulder_hip_ratio,
		        e.areola_size, e.areola_color, e.areola_shape,
		        e.labia_majora, e.labia_minora, e.labia_color,
		        e.created_at, e.updated_at,
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
			&es.VisualDescription, &es.PromptPrefix, &es.PipelineSettings, &es.SortOrder,
			&es.HeightCM, &es.WeightKG, &es.Build, &es.BreastSize, &es.BreastTanner,
			&es.HipShape, &es.PubicHairStyle, &es.PubicHairTanner, &es.HairColor, &es.HairLength,
			&es.GynecoidStage, &es.WaistHipRatio,
			&es.FaceShape, &es.BuccalFat, &es.JawDefinition, &es.BrowRidge, &es.NasolabialDepth,
			&es.SkinTexture, &es.SkinPoreVisibility, &es.UnderEye,
			&es.HeadBodyRatio, &es.LegTorsoRatio, &es.ShoulderHipRatio,
			&es.AreolaSize, &es.AreolaColor, &es.AreolaShape,
			&es.LabiaMajora, &es.LabiaMinora, &es.LabiaColor,
			&createdAt, &updatedAt,
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
