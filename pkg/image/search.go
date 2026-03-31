package image

import (
	"database/sql"
	"fmt"
	"strings"
)

// SearchParams defines the filter criteria for image search.
type SearchParams struct {
	CharacterID  string   // filter by character (empty = all)
	EraID        string   // filter by era (empty = all)
	Tags         []string // filter by tags as "namespace:value" pairs (AND logic)
	RatingMin    int      // minimum rating (0 = no filter)
	Source       string   // filter by source (empty = all)
	SetType      string   // filter by set type (empty = all)
	TriageStatus string   // filter by triage status (empty = all)
	HasCharacter *bool    // nil = all, true = character images only, false = standalone only
	Limit        int      // max results (default 50)
	Offset       int      // pagination offset
}

// SearchResult is an image with its character context.
type SearchResult struct {
	Image
	CharacterID   *string      `json:"character_id,omitempty"`
	CharacterName *string      `json:"character_name,omitempty"`
	EraID         *string      `json:"era_id,omitempty"`
	EraLabel      *string      `json:"era_label,omitempty"`
	SetType       *SetType     `json:"set_type,omitempty"`
	TriageStatus  *TriageStatus `json:"triage_status,omitempty"`
	Rating        *int         `json:"rating,omitempty"`
	RefType       *RefType     `json:"ref_type"`
}

// SearchResults wraps results with total count for pagination.
type SearchResults struct {
	Images []SearchResult `json:"images"`
	Total  int            `json:"total"`
	Limit  int            `json:"limit"`
	Offset int            `json:"offset"`
}

// Search performs a multi-faceted image search.
func (s *Store) Search(params *SearchParams) (*SearchResults, error) {
	if params.Limit <= 0 {
		params.Limit = 50
	}
	if params.Limit > 200 {
		params.Limit = 200
	}

	// Build the query dynamically
	var where []string
	var args []any

	baseQuery := `
		SELECT i.id, i.hash, i.original_filename, i.format, i.width, i.height, i.file_size, i.source, i.ingested_at,
		       ci.character_id, c.name, ci.era_id, e.label, ci.set_type, ci.triage_status, ci.rating, ci.ref_type
		FROM images i
		LEFT JOIN character_images ci ON ci.image_id = i.id
		LEFT JOIN characters c ON c.id = ci.character_id
		LEFT JOIN eras e ON e.id = ci.era_id`

	if params.CharacterID != "" {
		where = append(where, "ci.character_id = ?")
		args = append(args, params.CharacterID)
	}
	if params.EraID != "" {
		where = append(where, "ci.era_id = ?")
		args = append(args, params.EraID)
	}
	if params.Source != "" {
		where = append(where, "i.source = ?")
		args = append(args, params.Source)
	}
	if params.SetType != "" {
		where = append(where, "ci.set_type = ?")
		args = append(args, params.SetType)
	}
	if params.TriageStatus != "" {
		where = append(where, "ci.triage_status = ?")
		args = append(args, params.TriageStatus)
	}
	if params.RatingMin > 0 {
		where = append(where, "ci.rating >= ?")
		args = append(args, params.RatingMin)
	}
	if params.HasCharacter != nil {
		if *params.HasCharacter {
			where = append(where, "ci.character_id IS NOT NULL")
		} else {
			where = append(where, "ci.character_id IS NULL")
		}
	}

	// Tag filtering: each tag requires a matching row in image_tags (AND logic)
	for i, tagStr := range params.Tags {
		parts := strings.SplitN(tagStr, ":", 2)
		if len(parts) != 2 {
			continue
		}
		alias := fmt.Sprintf("t%d", i)
		baseQuery += fmt.Sprintf(` INNER JOIN image_tags %s ON %s.image_id = i.id AND %s.tag_namespace = ? AND %s.tag_value = ?`, alias, alias, alias, alias)
		args = append(args, parts[0], parts[1])
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = " WHERE " + strings.Join(where, " AND ")
	}

	// Count total
	countQuery := "SELECT COUNT(DISTINCT i.id) FROM images i LEFT JOIN character_images ci ON ci.image_id = i.id LEFT JOIN characters c ON c.id = ci.character_id LEFT JOIN eras e ON e.id = ci.era_id"
	// Re-add tag joins for count
	for i, tagStr := range params.Tags {
		parts := strings.SplitN(tagStr, ":", 2)
		if len(parts) != 2 {
			continue
		}
		alias := fmt.Sprintf("t%d", i)
		countQuery += fmt.Sprintf(` INNER JOIN image_tags %s ON %s.image_id = i.id AND %s.tag_namespace = ? AND %s.tag_value = ?`, alias, alias, alias, alias)
	}
	countQuery += whereClause

	// Build count args (tag args first from joins, then where args)
	var countArgs []any
	for _, tagStr := range params.Tags {
		parts := strings.SplitN(tagStr, ":", 2)
		if len(parts) == 2 {
			countArgs = append(countArgs, parts[0], parts[1])
		}
	}
	// Add where args (skip tag args which are already in countArgs for joins)
	// Actually the where args don't include tag args, so just append
	for _, a := range args[len(countArgs):] {
		countArgs = append(countArgs, a)
	}

	var total int
	if err := s.db.QueryRow(countQuery, countArgs...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count search results: %w", err)
	}

	// Main query with pagination
	fullQuery := baseQuery + whereClause + " GROUP BY i.id ORDER BY i.ingested_at DESC LIMIT ? OFFSET ?"
	args = append(args, params.Limit, params.Offset)

	rows, err := s.db.Query(fullQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("search images: %w", err)
	}
	defer rows.Close()

	var results []SearchResult
	for rows.Next() {
		var r SearchResult
		var ingestedAt string
		var charID, charName, eraID, eraLabel sql.NullString
		var setType, triageStatus sql.NullString
		var rating sql.NullInt64
		var refType sql.NullString

		if err := rows.Scan(
			&r.ID, &r.Hash, &r.OriginalFilename, &r.Format, &r.Width, &r.Height, &r.FileSize, &r.Source, &ingestedAt,
			&charID, &charName, &eraID, &eraLabel, &setType, &triageStatus, &rating, &refType,
		); err != nil {
			return nil, fmt.Errorf("scan search result: %w", err)
		}
		r.IngestedAt = parseTime(ingestedAt)
		if charID.Valid {
			r.CharacterID = &charID.String
		}
		if charName.Valid {
			r.CharacterName = &charName.String
		}
		if eraID.Valid {
			r.EraID = &eraID.String
		}
		if eraLabel.Valid {
			r.EraLabel = &eraLabel.String
		}
		if setType.Valid {
			st := SetType(setType.String)
			r.SetType = &st
		}
		if triageStatus.Valid {
			ts := TriageStatus(triageStatus.String)
			r.TriageStatus = &ts
		}
		if rating.Valid {
			v := int(rating.Int64)
			r.Rating = &v
		}
		if refType.Valid {
			rt := RefType(refType.String)
			r.RefType = &rt
		}

		results = append(results, r)
	}

	if results == nil {
		results = []SearchResult{}
	}

	return &SearchResults{
		Images: results,
		Total:  total,
		Limit:  params.Limit,
		Offset: params.Offset,
	}, rows.Err()
}
