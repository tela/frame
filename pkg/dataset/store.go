package dataset

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/tela/frame/pkg/id"
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

// Store provides dataset persistence operations.
type Store struct {
	db *sql.DB
}

// NewStore creates a new dataset Store.
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// Create inserts a new dataset.
func (s *Store) Create(d *Dataset) error {
	_, err := s.db.Exec(
		`INSERT INTO datasets (id, name, description, type, character_id, era_id, source_query, export_config, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		d.ID, d.Name, d.Description, d.Type, d.CharacterID, d.EraID, d.SourceQuery, d.ExportConfig,
		d.CreatedAt.UTC().Format(time.RFC3339), d.UpdatedAt.UTC().Format(time.RFC3339),
	)
	return err
}

// Get retrieves a dataset by ID.
func (s *Store) Get(id string) (*Dataset, error) {
	var d Dataset
	var createdAt, updatedAt string
	err := s.db.QueryRow(
		`SELECT id, name, description, type, character_id, era_id, source_query, export_config, created_at, updated_at
		 FROM datasets WHERE id = ?`, id,
	).Scan(&d.ID, &d.Name, &d.Description, &d.Type, &d.CharacterID, &d.EraID, &d.SourceQuery, &d.ExportConfig, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get dataset: %w", err)
	}
	d.CreatedAt = parseTime(createdAt)
	d.UpdatedAt = parseTime(updatedAt)
	return &d, nil
}

// List returns all datasets with image counts.
func (s *Store) List() ([]DatasetWithStats, error) {
	rows, err := s.db.Query(
		`SELECT d.id, d.name, d.description, d.type, d.character_id, d.era_id,
		        d.source_query, d.export_config, d.created_at, d.updated_at,
		        COALESCE(di.total, 0), COALESCE(di.included, 0)
		 FROM datasets d
		 LEFT JOIN (
		     SELECT dataset_id, COUNT(*) as total, SUM(included) as included
		     FROM dataset_images GROUP BY dataset_id
		 ) di ON di.dataset_id = d.id
		 ORDER BY d.updated_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("list datasets: %w", err)
	}
	defer rows.Close()

	var datasets []DatasetWithStats
	for rows.Next() {
		var ds DatasetWithStats
		var createdAt, updatedAt string
		if err := rows.Scan(
			&ds.ID, &ds.Name, &ds.Description, &ds.Type, &ds.CharacterID, &ds.EraID,
			&ds.SourceQuery, &ds.ExportConfig, &createdAt, &updatedAt,
			&ds.ImageCount, &ds.IncludedCount,
		); err != nil {
			return nil, fmt.Errorf("scan dataset: %w", err)
		}
		ds.CreatedAt = parseTime(createdAt)
		ds.UpdatedAt = parseTime(updatedAt)
		datasets = append(datasets, ds)
	}
	return datasets, rows.Err()
}

// Update modifies a dataset's metadata.
func (s *Store) Update(datasetID, name, description string, exportConfig string) error {
	_, err := s.db.Exec(
		`UPDATE datasets SET name = ?, description = ?, export_config = ?, updated_at = datetime('now') WHERE id = ?`,
		name, description, exportConfig, datasetID,
	)
	return err
}

// Delete removes a dataset and its image associations.
func (s *Store) Delete(datasetID string) error {
	_, err := s.db.Exec(`DELETE FROM datasets WHERE id = ?`, datasetID)
	return err
}

// Fork duplicates a dataset with a new ID and name.
func (s *Store) Fork(sourceID, newName string) (*Dataset, error) {
	src, err := s.Get(sourceID)
	if err != nil || src == nil {
		return nil, fmt.Errorf("source dataset not found")
	}

	newID := id.New()
	now := time.Now().UTC()

	forked := &Dataset{
		ID:           newID,
		Name:         newName,
		Description:  src.Description,
		Type:         src.Type,
		CharacterID:  src.CharacterID,
		EraID:        src.EraID,
		SourceQuery:  src.SourceQuery,
		ExportConfig: src.ExportConfig,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if err := s.Create(forked); err != nil {
		return nil, fmt.Errorf("create forked dataset: %w", err)
	}

	// Copy image associations
	_, err = s.db.Exec(
		`INSERT INTO dataset_images (dataset_id, image_id, sort_order, caption, included)
		 SELECT ?, image_id, sort_order, caption, included FROM dataset_images WHERE dataset_id = ?`,
		newID, sourceID,
	)
	if err != nil {
		return nil, fmt.Errorf("copy dataset images: %w", err)
	}

	return forked, nil
}

// --- Dataset Images ---

// AddImage adds an image to a dataset.
func (s *Store) AddImage(datasetID, imageID string, sortOrder int) error {
	_, err := s.db.Exec(
		`INSERT OR IGNORE INTO dataset_images (dataset_id, image_id, sort_order) VALUES (?, ?, ?)`,
		datasetID, imageID, sortOrder,
	)
	if err == nil {
		s.db.Exec(`UPDATE datasets SET updated_at = datetime('now') WHERE id = ?`, datasetID)
	}
	return err
}

// AddImages adds multiple images to a dataset.
func (s *Store) AddImages(datasetID string, imageIDs []string) error {
	for i, imgID := range imageIDs {
		if err := s.AddImage(datasetID, imgID, i); err != nil {
			return err
		}
	}
	return nil
}

// RemoveImage removes an image from a dataset.
func (s *Store) RemoveImage(datasetID, imageID string) error {
	_, err := s.db.Exec(
		`DELETE FROM dataset_images WHERE dataset_id = ? AND image_id = ?`,
		datasetID, imageID,
	)
	if err == nil {
		s.db.Exec(`UPDATE datasets SET updated_at = datetime('now') WHERE id = ?`, datasetID)
	}
	return err
}

// UpdateImage updates a dataset image's caption, sort order, or included state.
func (s *Store) UpdateImage(datasetID, imageID string, caption *string, sortOrder *int, included *bool) error {
	if caption != nil {
		s.db.Exec(`UPDATE dataset_images SET caption = ? WHERE dataset_id = ? AND image_id = ?`, *caption, datasetID, imageID)
	}
	if sortOrder != nil {
		s.db.Exec(`UPDATE dataset_images SET sort_order = ? WHERE dataset_id = ? AND image_id = ?`, *sortOrder, datasetID, imageID)
	}
	if included != nil {
		inc := 0
		if *included {
			inc = 1
		}
		s.db.Exec(`UPDATE dataset_images SET included = ? WHERE dataset_id = ? AND image_id = ?`, inc, datasetID, imageID)
	}
	s.db.Exec(`UPDATE datasets SET updated_at = datetime('now') WHERE id = ?`, datasetID)
	return nil
}

// ListImages returns all images in a dataset, ordered by sort_order.
func (s *Store) ListImages(datasetID string) ([]DatasetImage, error) {
	rows, err := s.db.Query(
		`SELECT dataset_id, image_id, sort_order, caption, included, created_at
		 FROM dataset_images WHERE dataset_id = ? ORDER BY sort_order`, datasetID)
	if err != nil {
		return nil, fmt.Errorf("list dataset images: %w", err)
	}
	defer rows.Close()

	var images []DatasetImage
	for rows.Next() {
		var di DatasetImage
		var createdAt string
		var included int
		if err := rows.Scan(&di.DatasetID, &di.ImageID, &di.SortOrder, &di.Caption, &included, &createdAt); err != nil {
			return nil, fmt.Errorf("scan dataset image: %w", err)
		}
		di.Included = included != 0
		di.CreatedAt = parseTime(createdAt)
		images = append(images, di)
	}
	return images, rows.Err()
}
