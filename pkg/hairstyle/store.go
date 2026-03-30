package hairstyle

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// Store provides hairstyle persistence operations.
type Store struct {
	db *sql.DB
}

// NewStore creates a hairstyle Store.
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

func parseTime(s string) time.Time {
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t
	}
	if t, err := time.Parse("2006-01-02 15:04:05", s); err == nil {
		return t
	}
	return time.Time{}
}

func tagsToJSON(tags []string) string {
	if len(tags) == 0 {
		return "[]"
	}
	b, _ := json.Marshal(tags)
	return string(b)
}

func tagsFromJSON(s string) []string {
	var tags []string
	if s == "" || s == "[]" {
		return nil
	}
	json.Unmarshal([]byte(s), &tags)
	return tags
}

const columns = `id, name, description, length, texture, style, color, tags,
	primary_image_id, source, provenance, source_url, source_site, status,
	created_at, updated_at`

func scanHairstyle(row interface{ Scan(...interface{}) error }) (*Hairstyle, error) {
	h := &Hairstyle{}
	var tagsJSON, createdAt, updatedAt string
	err := row.Scan(
		&h.ID, &h.Name, &h.Description, &h.Length, &h.Texture, &h.Style, &h.Color, &tagsJSON,
		&h.PrimaryImageID, &h.Source, &h.Provenance, &h.SourceURL, &h.SourceSite, &h.Status,
		&createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}
	h.Tags = tagsFromJSON(tagsJSON)
	h.CreatedAt = parseTime(createdAt)
	h.UpdatedAt = parseTime(updatedAt)
	return h, nil
}

func (s *Store) Create(h *Hairstyle) error {
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := s.db.Exec(
		fmt.Sprintf(`INSERT INTO hairstyles (%s) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, columns),
		h.ID, h.Name, h.Description, h.Length, h.Texture, h.Style, h.Color, tagsToJSON(h.Tags),
		h.PrimaryImageID, h.Source, h.Provenance, h.SourceURL, h.SourceSite, h.Status,
		now, now,
	)
	if err != nil {
		return fmt.Errorf("insert hairstyle: %w", err)
	}
	h.CreatedAt = parseTime(now)
	h.UpdatedAt = h.CreatedAt
	return nil
}

func (s *Store) Get(id string) (*Hairstyle, error) {
	h, err := scanHairstyle(s.db.QueryRow(
		fmt.Sprintf(`SELECT %s FROM hairstyles WHERE id = ?`, columns), id,
	))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get hairstyle: %w", err)
	}
	return h, nil
}

func (s *Store) Update(h *Hairstyle) error {
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := s.db.Exec(
		`UPDATE hairstyles SET name=?, description=?, length=?, texture=?, style=?, color=?, tags=?,
		 primary_image_id=?, source=?, provenance=?, source_url=?, source_site=?, status=?,
		 updated_at=? WHERE id=?`,
		h.Name, h.Description, h.Length, h.Texture, h.Style, h.Color, tagsToJSON(h.Tags),
		h.PrimaryImageID, h.Source, h.Provenance, h.SourceURL, h.SourceSite, h.Status,
		now, h.ID,
	)
	if err != nil {
		return fmt.Errorf("update hairstyle: %w", err)
	}
	h.UpdatedAt = parseTime(now)
	return nil
}

func (s *Store) Delete(id string) error {
	_, err := s.db.Exec(`DELETE FROM hairstyles WHERE id = ?`, id)
	return err
}

func (s *Store) List(q ListQuery) ([]Hairstyle, error) {
	query, args := buildListQuery(q)
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("list hairstyles: %w", err)
	}
	defer rows.Close()

	var out []Hairstyle
	for rows.Next() {
		h, err := scanHairstyle(rows)
		if err != nil {
			return nil, fmt.Errorf("scan hairstyle: %w", err)
		}
		out = append(out, *h)
	}
	return out, rows.Err()
}

func buildListQuery(q ListQuery) (string, []interface{}) {
	var where []string
	var args []interface{}

	useFTS := q.Q != ""

	if q.Status == "" {
		q.Status = "available"
	}
	if q.Status != "all" {
		where = append(where, "h.status = ?")
		args = append(args, q.Status)
	}

	addFilter := func(col, val string) {
		if val != "" {
			where = append(where, fmt.Sprintf("h.%s = ?", col))
			args = append(args, val)
		}
	}
	addFilter("length", q.Length)
	addFilter("texture", q.Texture)
	addFilter("style", q.Style)

	if q.CharacterID != "" {
		where = append(where, "EXISTS (SELECT 1 FROM hairstyle_affinity ha WHERE ha.hairstyle_id = h.id AND ha.character_id = ?)")
		args = append(args, q.CharacterID)
	}

	from := "hairstyles h"
	if useFTS {
		from = "hairstyles h JOIN hairstyles_fts fts ON h.rowid = fts.rowid"
		where = append(where, "hairstyles_fts MATCH ?")
		args = append(args, q.Q)
	}

	sortCol := "h.created_at"
	if q.Sort == "name" {
		sortCol = "h.name"
	}
	order := "DESC"
	if q.Order == "asc" {
		order = "ASC"
	}

	limit := q.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 250 {
		limit = 250
	}

	query := fmt.Sprintf(`SELECT %s FROM %s`, prefixColumns("h", columns), from)
	if len(where) > 0 {
		query += " WHERE " + strings.Join(where, " AND ")
	}
	query += fmt.Sprintf(" ORDER BY %s %s LIMIT ? OFFSET ?", sortCol, order)
	args = append(args, limit, q.Offset)

	return query, args
}

func prefixColumns(prefix, cols string) string {
	parts := strings.Split(cols, ",")
	for i, p := range parts {
		parts[i] = prefix + "." + strings.TrimSpace(p)
	}
	return strings.Join(parts, ", ")
}

func (s *Store) Facets(q ListQuery) (*Facets, error) {
	facets := &Facets{
		Length:  make(FacetCounts),
		Texture: make(FacetCounts),
		Style:   make(FacetCounts),
		Status:  make(FacetCounts),
	}

	for _, f := range []struct {
		col  string
		dest *FacetCounts
	}{
		{"length", &facets.Length},
		{"texture", &facets.Texture},
		{"style", &facets.Style},
		{"status", &facets.Status},
	} {
		if err := s.countFacet(q, f.col, f.dest); err != nil {
			return nil, err
		}
	}
	return facets, nil
}

func (s *Store) countFacet(q ListQuery, col string, dest *FacetCounts) error {
	var where []string
	var args []interface{}

	addFilter := func(filterCol, val string) {
		if val != "" && filterCol != col {
			where = append(where, fmt.Sprintf("%s = ?", filterCol))
			args = append(args, val)
		}
	}
	if q.Status != "all" && q.Status != "" && col != "status" {
		where = append(where, "status = ?")
		args = append(args, q.Status)
	} else if q.Status == "" && col != "status" {
		where = append(where, "status = ?")
		args = append(args, "available")
	}
	addFilter("length", q.Length)
	addFilter("texture", q.Texture)
	addFilter("style", q.Style)

	if q.CharacterID != "" {
		where = append(where, "EXISTS (SELECT 1 FROM hairstyle_affinity ha WHERE ha.hairstyle_id = hairstyles.id AND ha.character_id = ?)")
		args = append(args, q.CharacterID)
	}

	query := fmt.Sprintf("SELECT %s, COUNT(*) FROM hairstyles", col)
	if len(where) > 0 {
		query += " WHERE " + strings.Join(where, " AND ")
	}
	query += fmt.Sprintf(" GROUP BY %s HAVING %s != ''", col, col)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return fmt.Errorf("facet %s: %w", col, err)
	}
	defer rows.Close()
	for rows.Next() {
		var val string
		var count int
		if err := rows.Scan(&val, &count); err != nil {
			return err
		}
		(*dest)[val] = count
	}
	return rows.Err()
}

func (s *Store) AddAffinity(hairstyleID, characterID string) error {
	_, err := s.db.Exec(`INSERT OR IGNORE INTO hairstyle_affinity (hairstyle_id, character_id) VALUES (?, ?)`, hairstyleID, characterID)
	return err
}

func (s *Store) RemoveAffinity(hairstyleID, characterID string) error {
	_, err := s.db.Exec(`DELETE FROM hairstyle_affinity WHERE hairstyle_id = ? AND character_id = ?`, hairstyleID, characterID)
	return err
}

func (s *Store) ListAffinity(hairstyleID string) ([]string, error) {
	rows, err := s.db.Query(`SELECT character_id FROM hairstyle_affinity WHERE hairstyle_id = ? ORDER BY created_at`, hairstyleID)
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

func (s *Store) AddImage(hairstyleID, imageID string, sortOrder int) error {
	_, err := s.db.Exec(`INSERT INTO hairstyle_images (hairstyle_id, image_id, sort_order) VALUES (?, ?, ?)`, hairstyleID, imageID, sortOrder)
	return err
}

func (s *Store) ListImages(hairstyleID string) ([]HairstyleImage, error) {
	rows, err := s.db.Query(`SELECT hairstyle_id, image_id, sort_order, created_at FROM hairstyle_images WHERE hairstyle_id = ? ORDER BY sort_order`, hairstyleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []HairstyleImage
	for rows.Next() {
		var hi HairstyleImage
		var createdAt string
		if err := rows.Scan(&hi.HairstyleID, &hi.ImageID, &hi.SortOrder, &createdAt); err != nil {
			return nil, err
		}
		hi.CreatedAt = parseTime(createdAt)
		out = append(out, hi)
	}
	return out, rows.Err()
}

func (s *Store) SetPrimaryImage(hairstyleID, imageID string) error {
	_, err := s.db.Exec(`UPDATE hairstyles SET primary_image_id = ?, updated_at = datetime('now') WHERE id = ?`, imageID, hairstyleID)
	return err
}

func (s *Store) UpdateStatus(id, status string) error {
	_, err := s.db.Exec(`UPDATE hairstyles SET status = ?, updated_at = datetime('now') WHERE id = ?`, status, id)
	return err
}

func (s *Store) BulkUpdateStatus(ids []string, status string) error {
	if len(ids) == 0 {
		return nil
	}
	placeholders := strings.Repeat("?,", len(ids))
	placeholders = placeholders[:len(placeholders)-1]
	args := make([]interface{}, 0, len(ids)+1)
	args = append(args, status)
	for _, id := range ids {
		args = append(args, id)
	}
	_, err := s.db.Exec(
		fmt.Sprintf(`UPDATE hairstyles SET status = ?, updated_at = datetime('now') WHERE id IN (%s)`, placeholders),
		args...,
	)
	return err
}
