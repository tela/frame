package template

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

// Store provides prompt template persistence.
type Store struct {
	db *sql.DB
}

// NewStore creates a new template Store.
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// Create inserts a new template.
func (s *Store) Create(t *Template) error {
	_, err := s.db.Exec(
		`INSERT INTO prompt_templates (id, name, prompt_body, negative_prompt, style_prompt, parameters, facet_tags, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		t.ID, t.Name, t.PromptBody, t.NegativePrompt, t.StylePrompt, t.Parameters, t.FacetTags,
		t.CreatedAt.UTC().Format(time.RFC3339), t.UpdatedAt.UTC().Format(time.RFC3339),
	)
	return err
}

// Get retrieves a template by ID.
func (s *Store) Get(id string) (*Template, error) {
	var t Template
	var createdAt, updatedAt string
	err := s.db.QueryRow(
		`SELECT id, name, prompt_body, negative_prompt, style_prompt, parameters, facet_tags, usage_count, created_at, updated_at
		 FROM prompt_templates WHERE id = ?`, id,
	).Scan(&t.ID, &t.Name, &t.PromptBody, &t.NegativePrompt, &t.StylePrompt, &t.Parameters, &t.FacetTags, &t.UsageCount, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get template: %w", err)
	}
	t.CreatedAt = parseTime(createdAt)
	t.UpdatedAt = parseTime(updatedAt)
	return &t, nil
}

// List returns all templates ordered by usage count descending.
func (s *Store) List() ([]Template, error) {
	rows, err := s.db.Query(
		`SELECT id, name, prompt_body, negative_prompt, style_prompt, parameters, facet_tags, usage_count, created_at, updated_at
		 FROM prompt_templates ORDER BY usage_count DESC, name ASC`)
	if err != nil {
		return nil, fmt.Errorf("list templates: %w", err)
	}
	defer rows.Close()

	var templates []Template
	for rows.Next() {
		var t Template
		var createdAt, updatedAt string
		if err := rows.Scan(&t.ID, &t.Name, &t.PromptBody, &t.NegativePrompt, &t.StylePrompt, &t.Parameters, &t.FacetTags, &t.UsageCount, &createdAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("scan template: %w", err)
		}
		t.CreatedAt = parseTime(createdAt)
		t.UpdatedAt = parseTime(updatedAt)
		templates = append(templates, t)
	}
	return templates, rows.Err()
}

// Update modifies a template.
func (s *Store) Update(t *Template) error {
	_, err := s.db.Exec(
		`UPDATE prompt_templates SET name = ?, prompt_body = ?, negative_prompt = ?, style_prompt = ?, parameters = ?, facet_tags = ?, updated_at = datetime('now')
		 WHERE id = ?`,
		t.Name, t.PromptBody, t.NegativePrompt, t.StylePrompt, t.Parameters, t.FacetTags, t.ID,
	)
	return err
}

// Delete removes a template.
func (s *Store) Delete(id string) error {
	_, err := s.db.Exec(`DELETE FROM prompt_templates WHERE id = ?`, id)
	return err
}

// IncrementUsage increments the usage count for a template.
func (s *Store) IncrementUsage(id string) error {
	_, err := s.db.Exec(`UPDATE prompt_templates SET usage_count = usage_count + 1 WHERE id = ?`, id)
	return err
}

// Duplicate creates a copy of a template with a new name.
func (s *Store) Duplicate(sourceID, newID, newName string) (*Template, error) {
	src, err := s.Get(sourceID)
	if err != nil || src == nil {
		return nil, fmt.Errorf("source template not found")
	}

	now := time.Now().UTC()
	dup := &Template{
		ID:             newID,
		Name:           newName,
		PromptBody:     src.PromptBody,
		NegativePrompt: src.NegativePrompt,
		StylePrompt:    src.StylePrompt,
		Parameters:     src.Parameters,
		FacetTags:      src.FacetTags,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if err := s.Create(dup); err != nil {
		return nil, err
	}
	return dup, nil
}
