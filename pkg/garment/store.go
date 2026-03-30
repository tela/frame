package garment

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// Store provides garment persistence operations.
type Store struct {
	db *sql.DB
}

// NewStore creates a garment Store.
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

const garmentColumns = `id, name, description, category, occasion_energy, era,
	aesthetic_cluster, dominant_signal, recessive_signal, material, color, tags,
	primary_image_id, source, provenance, source_url, source_site, status,
	created_at, updated_at`

func scanGarment(row interface{ Scan(...interface{}) error }) (*Garment, error) {
	g := &Garment{}
	var tagsJSON, createdAt, updatedAt string
	err := row.Scan(
		&g.ID, &g.Name, &g.Description, &g.Category, &g.OccasionEnergy, &g.Era,
		&g.AestheticCluster, &g.DominantSignal, &g.RecessiveSignal, &g.Material, &g.Color, &tagsJSON,
		&g.PrimaryImageID, &g.Source, &g.Provenance, &g.SourceURL, &g.SourceSite, &g.Status,
		&createdAt, &updatedAt,
	)
	if err != nil {
		return nil, err
	}
	g.Tags = tagsFromJSON(tagsJSON)
	g.CreatedAt = parseTime(createdAt)
	g.UpdatedAt = parseTime(updatedAt)
	return g, nil
}

// Create inserts a new garment.
func (s *Store) Create(g *Garment) error {
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := s.db.Exec(
		fmt.Sprintf(`INSERT INTO garments (%s) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, garmentColumns),
		g.ID, g.Name, g.Description, g.Category, g.OccasionEnergy, g.Era,
		g.AestheticCluster, g.DominantSignal, g.RecessiveSignal, g.Material, g.Color, tagsToJSON(g.Tags),
		g.PrimaryImageID, g.Source, g.Provenance, g.SourceURL, g.SourceSite, g.Status,
		now, now,
	)
	if err != nil {
		return fmt.Errorf("insert garment: %w", err)
	}
	g.CreatedAt = parseTime(now)
	g.UpdatedAt = g.CreatedAt
	return nil
}

// Get retrieves a garment by ID, or nil if not found.
func (s *Store) Get(id string) (*Garment, error) {
	g, err := scanGarment(s.db.QueryRow(
		fmt.Sprintf(`SELECT %s FROM garments WHERE id = ?`, garmentColumns), id,
	))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get garment: %w", err)
	}
	return g, nil
}

// Update modifies an existing garment.
func (s *Store) Update(g *Garment) error {
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := s.db.Exec(
		`UPDATE garments SET name=?, description=?, category=?, occasion_energy=?, era=?,
		 aesthetic_cluster=?, dominant_signal=?, recessive_signal=?, material=?, color=?, tags=?,
		 primary_image_id=?, source=?, provenance=?, source_url=?, source_site=?, status=?,
		 updated_at=? WHERE id=?`,
		g.Name, g.Description, g.Category, g.OccasionEnergy, g.Era,
		g.AestheticCluster, g.DominantSignal, g.RecessiveSignal, g.Material, g.Color, tagsToJSON(g.Tags),
		g.PrimaryImageID, g.Source, g.Provenance, g.SourceURL, g.SourceSite, g.Status,
		now, g.ID,
	)
	if err != nil {
		return fmt.Errorf("update garment: %w", err)
	}
	g.UpdatedAt = parseTime(now)
	return nil
}

// Delete removes a garment by ID.
func (s *Store) Delete(id string) error {
	_, err := s.db.Exec(`DELETE FROM garments WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete garment: %w", err)
	}
	return nil
}

// List returns garments matching the query filters.
func (s *Store) List(q ListQuery) ([]Garment, error) {
	query, args := buildListQuery(q)
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("list garments: %w", err)
	}
	defer rows.Close()

	var garments []Garment
	for rows.Next() {
		g, err := scanGarment(rows)
		if err != nil {
			return nil, fmt.Errorf("scan garment: %w", err)
		}
		garments = append(garments, *g)
	}
	return garments, rows.Err()
}

func buildListQuery(q ListQuery) (string, []interface{}) {
	var where []string
	var args []interface{}

	// FTS search — join garments_fts
	useFTS := q.Q != ""

	// Status filter (default: available)
	if q.Status == "" {
		q.Status = "available"
	}
	if q.Status != "all" {
		where = append(where, "g.status = ?")
		args = append(args, q.Status)
	}

	addFilter := func(col, val string) {
		if val != "" {
			where = append(where, fmt.Sprintf("g.%s = ?", col))
			args = append(args, val)
		}
	}
	addFilter("category", q.Category)
	addFilter("occasion_energy", q.OccasionEnergy)
	addFilter("era", q.Era)
	addFilter("aesthetic_cluster", q.AestheticCluster)
	addFilter("dominant_signal", q.DominantSignal)
	addFilter("material", q.Material)
	addFilter("provenance", q.Provenance)
	addFilter("source_site", q.SourceSite)

	// Character affinity filter
	if q.CharacterID != "" {
		where = append(where, "EXISTS (SELECT 1 FROM garment_affinity ga WHERE ga.garment_id = g.id AND ga.character_id = ?)")
		args = append(args, q.CharacterID)
	}

	// Build FROM clause
	from := "garments g"
	if useFTS {
		from = "garments g JOIN garments_fts fts ON g.rowid = fts.rowid"
		where = append(where, "garments_fts MATCH ?")
		args = append(args, q.Q)
	}

	// Sort
	sortCol := "g.created_at"
	switch q.Sort {
	case "name":
		sortCol = "g.name"
	case "category":
		sortCol = "g.category"
	}
	order := "DESC"
	if q.Order == "asc" {
		order = "ASC"
	}

	// Limit
	limit := q.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 250 {
		limit = 250
	}

	query := fmt.Sprintf(`SELECT %s FROM %s`, prefixColumns("g", garmentColumns), from)
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
		p = strings.TrimSpace(p)
		parts[i] = prefix + "." + p
	}
	return strings.Join(parts, ", ")
}

// Facets returns faceted counts for each taxonomy field, respecting current filters.
func (s *Store) Facets(q ListQuery) (*Facets, error) {
	facets := &Facets{
		Category:         make(FacetCounts),
		OccasionEnergy:   make(FacetCounts),
		Era:              make(FacetCounts),
		AestheticCluster: make(FacetCounts),
		DominantSignal:   make(FacetCounts),
		Material:         make(FacetCounts),
		Provenance:       make(FacetCounts),
		SourceSite:       make(FacetCounts),
		Status:           make(FacetCounts),
	}

	fields := []struct {
		col  string
		dest *FacetCounts
	}{
		{"category", &facets.Category},
		{"occasion_energy", &facets.OccasionEnergy},
		{"era", &facets.Era},
		{"aesthetic_cluster", &facets.AestheticCluster},
		{"dominant_signal", &facets.DominantSignal},
		{"material", &facets.Material},
		{"provenance", &facets.Provenance},
		{"source_site", &facets.SourceSite},
		{"status", &facets.Status},
	}

	for _, f := range fields {
		if err := s.countFacet(q, f.col, f.dest); err != nil {
			return nil, err
		}
	}
	return facets, nil
}

func (s *Store) countFacet(q ListQuery, col string, dest *FacetCounts) error {
	var where []string
	var args []interface{}

	// Apply all filters EXCEPT the one we're counting.
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

	addFilter("category", q.Category)
	addFilter("occasion_energy", q.OccasionEnergy)
	addFilter("era", q.Era)
	addFilter("aesthetic_cluster", q.AestheticCluster)
	addFilter("dominant_signal", q.DominantSignal)
	addFilter("material", q.Material)
	addFilter("provenance", q.Provenance)
	addFilter("source_site", q.SourceSite)

	if q.CharacterID != "" {
		where = append(where, "EXISTS (SELECT 1 FROM garment_affinity ga WHERE ga.garment_id = garments.id AND ga.character_id = ?)")
		args = append(args, q.CharacterID)
	}

	query := fmt.Sprintf("SELECT %s, COUNT(*) FROM garments", col)
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
			return fmt.Errorf("scan facet %s: %w", col, err)
		}
		(*dest)[val] = count
	}
	return rows.Err()
}

// AddAffinity links a garment to a character.
func (s *Store) AddAffinity(garmentID, characterID string) error {
	_, err := s.db.Exec(
		`INSERT OR IGNORE INTO garment_affinity (garment_id, character_id) VALUES (?, ?)`,
		garmentID, characterID,
	)
	if err != nil {
		return fmt.Errorf("add affinity: %w", err)
	}
	return nil
}

// RemoveAffinity removes a garment-character affinity link.
func (s *Store) RemoveAffinity(garmentID, characterID string) error {
	_, err := s.db.Exec(
		`DELETE FROM garment_affinity WHERE garment_id = ? AND character_id = ?`,
		garmentID, characterID,
	)
	if err != nil {
		return fmt.Errorf("remove affinity: %w", err)
	}
	return nil
}

// ListAffinity returns character IDs for a garment.
func (s *Store) ListAffinity(garmentID string) ([]string, error) {
	rows, err := s.db.Query(
		`SELECT character_id FROM garment_affinity WHERE garment_id = ? ORDER BY created_at`,
		garmentID,
	)
	if err != nil {
		return nil, fmt.Errorf("list affinity: %w", err)
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

// AddImage links an image to a garment.
func (s *Store) AddImage(garmentID, imageID string, sortOrder int) error {
	_, err := s.db.Exec(
		`INSERT INTO garment_images (garment_id, image_id, sort_order) VALUES (?, ?, ?)`,
		garmentID, imageID, sortOrder,
	)
	if err != nil {
		return fmt.Errorf("add garment image: %w", err)
	}
	return nil
}

// ListImages returns images for a garment, ordered by sort_order.
func (s *Store) ListImages(garmentID string) ([]GarmentImage, error) {
	rows, err := s.db.Query(
		`SELECT garment_id, image_id, sort_order, created_at
		 FROM garment_images WHERE garment_id = ? ORDER BY sort_order`,
		garmentID,
	)
	if err != nil {
		return nil, fmt.Errorf("list garment images: %w", err)
	}
	defer rows.Close()

	var images []GarmentImage
	for rows.Next() {
		var gi GarmentImage
		var createdAt string
		if err := rows.Scan(&gi.GarmentID, &gi.ImageID, &gi.SortOrder, &createdAt); err != nil {
			return nil, err
		}
		gi.CreatedAt = parseTime(createdAt)
		images = append(images, gi)
	}
	return images, rows.Err()
}

// SetPrimaryImage sets the primary image for a garment.
func (s *Store) SetPrimaryImage(garmentID, imageID string) error {
	_, err := s.db.Exec(
		`UPDATE garments SET primary_image_id = ?, updated_at = datetime('now') WHERE id = ?`,
		imageID, garmentID,
	)
	if err != nil {
		return fmt.Errorf("set primary image: %w", err)
	}
	return nil
}

// UpdateStatus changes the status of a garment.
func (s *Store) UpdateStatus(id, status string) error {
	_, err := s.db.Exec(
		`UPDATE garments SET status = ?, updated_at = datetime('now') WHERE id = ?`,
		status, id,
	)
	if err != nil {
		return fmt.Errorf("update status: %w", err)
	}
	return nil
}

// BulkUpdateStatus changes the status of multiple garments.
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
		fmt.Sprintf(`UPDATE garments SET status = ?, updated_at = datetime('now') WHERE id IN (%s)`, placeholders),
		args...,
	)
	if err != nil {
		return fmt.Errorf("bulk update status: %w", err)
	}
	return nil
}
