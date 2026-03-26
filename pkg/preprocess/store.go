package preprocess

import (
	"database/sql"
	"encoding/json"
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

// Store provides derivative and preset persistence operations.
type Store struct {
	db *sql.DB
}

// NewStore creates a new preprocess Store.
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// --- Derivatives ---

// CreateDerivative records a new derivative.
func (s *Store) CreateDerivative(d *Derivative) error {
	opsJSON, err := json.Marshal(d.Operations)
	if err != nil {
		return fmt.Errorf("marshal operations: %w", err)
	}
	_, err = s.db.Exec(
		`INSERT INTO image_derivatives (id, source_image_id, operations, created_at)
		 VALUES (?, ?, ?, ?)`,
		d.ID, d.SourceImageID, string(opsJSON),
		d.CreatedAt.UTC().Format(time.RFC3339),
	)
	return err
}

// GetDerivative retrieves a derivative by ID.
func (s *Store) GetDerivative(id string) (*Derivative, error) {
	var d Derivative
	var opsJSON, createdAt string
	err := s.db.QueryRow(
		`SELECT id, source_image_id, operations, created_at
		 FROM image_derivatives WHERE id = ?`, id,
	).Scan(&d.ID, &d.SourceImageID, &opsJSON, &createdAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get derivative: %w", err)
	}
	if err := json.Unmarshal([]byte(opsJSON), &d.Operations); err != nil {
		return nil, fmt.Errorf("unmarshal operations: %w", err)
	}
	d.CreatedAt = parseTime(createdAt)
	return &d, nil
}

// ListDerivatives returns all derivatives for a source image.
func (s *Store) ListDerivatives(sourceImageID string) ([]Derivative, error) {
	rows, err := s.db.Query(
		`SELECT id, source_image_id, operations, created_at
		 FROM image_derivatives WHERE source_image_id = ?
		 ORDER BY created_at DESC`, sourceImageID)
	if err != nil {
		return nil, fmt.Errorf("list derivatives: %w", err)
	}
	defer rows.Close()

	var derivs []Derivative
	for rows.Next() {
		var d Derivative
		var opsJSON, createdAt string
		if err := rows.Scan(&d.ID, &d.SourceImageID, &opsJSON, &createdAt); err != nil {
			return nil, fmt.Errorf("scan derivative: %w", err)
		}
		if err := json.Unmarshal([]byte(opsJSON), &d.Operations); err != nil {
			return nil, fmt.Errorf("unmarshal operations: %w", err)
		}
		d.CreatedAt = parseTime(createdAt)
		derivs = append(derivs, d)
	}
	return derivs, rows.Err()
}

// GetLineage traces an image back through its derivative chain to the original.
func (s *Store) GetLineage(imageID string) (*Lineage, error) {
	lineage := &Lineage{}
	currentID := imageID

	for {
		d, err := s.GetDerivative(currentID)
		if err != nil {
			return nil, err
		}
		if d == nil {
			// currentID is not a derivative — it's the original
			lineage.Original = currentID
			break
		}
		lineage.Chain = append([]Derivative{*d}, lineage.Chain...)
		currentID = d.SourceImageID
	}

	return lineage, nil
}

// --- Presets ---

// CreatePreset saves a preprocessing preset.
func (s *Store) CreatePreset(p *Preset) error {
	opsJSON, err := json.Marshal(p.Operations)
	if err != nil {
		return fmt.Errorf("marshal operations: %w", err)
	}
	_, err = s.db.Exec(
		`INSERT INTO preprocess_presets (id, name, operations, created_at) VALUES (?, ?, ?, ?)`,
		p.ID, p.Name, string(opsJSON),
		p.CreatedAt.UTC().Format(time.RFC3339),
	)
	return err
}

// GetPreset retrieves a preset by ID.
func (s *Store) GetPreset(id string) (*Preset, error) {
	var p Preset
	var opsJSON, createdAt string
	err := s.db.QueryRow(`SELECT id, name, operations, created_at FROM preprocess_presets WHERE id = ?`, id).
		Scan(&p.ID, &p.Name, &opsJSON, &createdAt)
	if err != nil {
		if err.Error() == "sql: no rows in result set" {
			return nil, nil
		}
		return nil, err
	}
	if err := json.Unmarshal([]byte(opsJSON), &p.Operations); err != nil {
		return nil, fmt.Errorf("unmarshal operations: %w", err)
	}
	p.CreatedAt = parseTime(createdAt)
	return &p, nil
}

// ListPresets returns all saved presets.
func (s *Store) ListPresets() ([]Preset, error) {
	rows, err := s.db.Query(
		`SELECT id, name, operations, created_at FROM preprocess_presets ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("list presets: %w", err)
	}
	defer rows.Close()

	var presets []Preset
	for rows.Next() {
		var p Preset
		var opsJSON, createdAt string
		if err := rows.Scan(&p.ID, &p.Name, &opsJSON, &createdAt); err != nil {
			return nil, fmt.Errorf("scan preset: %w", err)
		}
		if err := json.Unmarshal([]byte(opsJSON), &p.Operations); err != nil {
			return nil, fmt.Errorf("unmarshal operations: %w", err)
		}
		p.CreatedAt = parseTime(createdAt)
		presets = append(presets, p)
	}
	return presets, rows.Err()
}

// DeletePreset removes a preset.
func (s *Store) DeletePreset(id string) error {
	_, err := s.db.Exec(`DELETE FROM preprocess_presets WHERE id = ?`, id)
	return err
}
