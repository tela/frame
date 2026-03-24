package tag

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

// Store provides tag and tag family persistence operations.
type Store struct {
	db *sql.DB
}

// NewStore creates a new tag Store.
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// --- Families ---

// ListFamilies returns all tag families ordered by sort_order.
func (s *Store) ListFamilies() ([]Family, error) {
	rows, err := s.db.Query(
		`SELECT id, name, description, color, sort_order, created_at
		 FROM tag_families ORDER BY sort_order`)
	if err != nil {
		return nil, fmt.Errorf("list families: %w", err)
	}
	defer rows.Close()

	var families []Family
	for rows.Next() {
		var f Family
		var createdAt string
		if err := rows.Scan(&f.ID, &f.Name, &f.Description, &f.Color, &f.SortOrder, &createdAt); err != nil {
			return nil, fmt.Errorf("scan family: %w", err)
		}
		f.CreatedAt = parseTime(createdAt)
		families = append(families, f)
	}
	return families, rows.Err()
}

// GetFamily retrieves a tag family by ID.
func (s *Store) GetFamily(id string) (*Family, error) {
	var f Family
	var createdAt string
	err := s.db.QueryRow(
		`SELECT id, name, description, color, sort_order, created_at
		 FROM tag_families WHERE id = ?`, id,
	).Scan(&f.ID, &f.Name, &f.Description, &f.Color, &f.SortOrder, &createdAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get family: %w", err)
	}
	f.CreatedAt = parseTime(createdAt)
	return &f, nil
}

// CreateFamily inserts a new tag family.
func (s *Store) CreateFamily(f *Family) error {
	_, err := s.db.Exec(
		`INSERT INTO tag_families (id, name, description, color, sort_order, created_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		f.ID, f.Name, f.Description, f.Color, f.SortOrder,
		f.CreatedAt.UTC().Format(time.RFC3339),
	)
	return err
}

// UpdateFamily updates a tag family.
func (s *Store) UpdateFamily(id, name, description, color string, sortOrder int) error {
	_, err := s.db.Exec(
		`UPDATE tag_families SET name = ?, description = ?, color = ?, sort_order = ? WHERE id = ?`,
		name, description, color, sortOrder, id,
	)
	return err
}

// DeleteFamily deletes a tag family. Tags in the family must be reassigned first.
func (s *Store) DeleteFamily(id string) error {
	_, err := s.db.Exec(`DELETE FROM tag_families WHERE id = ?`, id)
	return err
}

// --- Tags ---

// ListTags returns tag summaries, optionally filtered by family.
func (s *Store) ListTags(familyID *string) ([]TagSummary, error) {
	var rows *sql.Rows
	var err error
	if familyID != nil {
		rows, err = s.db.Query(
			`SELECT family_id, tag_namespace, tag_value, COUNT(*) as cnt
			 FROM image_tags WHERE family_id = ?
			 GROUP BY family_id, tag_namespace, tag_value
			 ORDER BY cnt DESC`, *familyID)
	} else {
		rows, err = s.db.Query(
			`SELECT family_id, tag_namespace, tag_value, COUNT(*) as cnt
			 FROM image_tags
			 GROUP BY family_id, tag_namespace, tag_value
			 ORDER BY cnt DESC`)
	}
	if err != nil {
		return nil, fmt.Errorf("list tags: %w", err)
	}
	defer rows.Close()

	var tags []TagSummary
	for rows.Next() {
		var t TagSummary
		if err := rows.Scan(&t.FamilyID, &t.TagNamespace, &t.TagValue, &t.Count); err != nil {
			return nil, fmt.Errorf("scan tag: %w", err)
		}
		tags = append(tags, t)
	}
	return tags, rows.Err()
}

// AddTag adds a tag to an image.
func (s *Store) AddTag(imageID, namespace, value, source string, familyID *string) error {
	_, err := s.db.Exec(
		`INSERT OR IGNORE INTO image_tags (image_id, tag_namespace, tag_value, source, family_id)
		 VALUES (?, ?, ?, ?, ?)`,
		imageID, namespace, value, source, familyID,
	)
	return err
}

// RemoveTag removes a tag from an image.
func (s *Store) RemoveTag(imageID, namespace, value string) error {
	_, err := s.db.Exec(
		`DELETE FROM image_tags WHERE image_id = ? AND tag_namespace = ? AND tag_value = ?`,
		imageID, namespace, value,
	)
	return err
}

// GetImageTags returns all tags for an image.
func (s *Store) GetImageTags(imageID string) ([]Tag, error) {
	rows, err := s.db.Query(
		`SELECT id, image_id, family_id, tag_namespace, tag_value, source, created_at
		 FROM image_tags WHERE image_id = ? ORDER BY tag_namespace, tag_value`, imageID)
	if err != nil {
		return nil, fmt.Errorf("get image tags: %w", err)
	}
	defer rows.Close()

	var tags []Tag
	for rows.Next() {
		var t Tag
		var createdAt string
		if err := rows.Scan(&t.ID, &t.ImageID, &t.FamilyID, &t.TagNamespace, &t.TagValue, &t.Source, &createdAt); err != nil {
			return nil, fmt.Errorf("scan tag: %w", err)
		}
		t.CreatedAt = parseTime(createdAt)
		tags = append(tags, t)
	}
	return tags, rows.Err()
}

// BulkTag adds or removes a tag from multiple images.
func (s *Store) BulkTag(req *BulkTagRequest) (int, error) {
	var affected int
	for _, imgID := range req.ImageIDs {
		var err error
		if req.Action == "add" {
			err = s.AddTag(imgID, req.TagNamespace, req.TagValue, "manual", req.FamilyID)
		} else {
			err = s.RemoveTag(imgID, req.TagNamespace, req.TagValue)
		}
		if err != nil {
			return affected, err
		}
		affected++
	}
	return affected, nil
}

// RenameTag renames a tag value across all images.
func (s *Store) RenameTag(namespace, oldValue, newValue string) (int64, error) {
	res, err := s.db.Exec(
		`UPDATE image_tags SET tag_value = ? WHERE tag_namespace = ? AND tag_value = ?`,
		newValue, namespace, oldValue,
	)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

// MergeTag merges one tag into another (reassigns all usages).
func (s *Store) MergeTag(namespace, fromValue, toValue string) (int64, error) {
	// Update tags that don't already have the target
	res, err := s.db.Exec(
		`UPDATE OR IGNORE image_tags SET tag_value = ? WHERE tag_namespace = ? AND tag_value = ?`,
		toValue, namespace, fromValue,
	)
	if err != nil {
		return 0, err
	}
	// Delete any remaining (duplicates that couldn't be updated due to unique constraint)
	s.db.Exec(`DELETE FROM image_tags WHERE tag_namespace = ? AND tag_value = ?`, namespace, fromValue)
	return res.RowsAffected()
}

// DeleteTag removes a tag from all images.
func (s *Store) DeleteTag(namespace, value string) (int64, error) {
	res, err := s.db.Exec(
		`DELETE FROM image_tags WHERE tag_namespace = ? AND tag_value = ?`,
		namespace, value,
	)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}
