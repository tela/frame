package audit

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/tela/frame/pkg/id"
)

// Event is a single audit log entry.
type Event struct {
	ID         string            `json:"id"`
	EntityType string            `json:"entity_type"`
	EntityID   string            `json:"entity_id"`
	Action     string            `json:"action"`
	Field      *string           `json:"field,omitempty"`
	OldValue   *string           `json:"old_value,omitempty"`
	NewValue   *string           `json:"new_value,omitempty"`
	Context    map[string]string `json:"context"`
	CreatedAt  time.Time         `json:"created_at"`
}

// EventList wraps results with total for pagination.
type EventList struct {
	Events []Event `json:"events"`
	Total  int     `json:"total"`
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

// Store provides audit log persistence.
type Store struct {
	db *sql.DB
}

// NewStore creates a new audit Store.
func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// Log records an audit event.
func (s *Store) Log(entityType, entityID, action string, field, oldValue, newValue *string, context map[string]string) error {
	ctxJSON, _ := json.Marshal(context)
	if context == nil {
		ctxJSON = []byte("{}")
	}
	_, err := s.db.Exec(
		`INSERT INTO audit_log (id, entity_type, entity_id, action, field, old_value, new_value, context)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		id.New(), entityType, entityID, action, field, oldValue, newValue, string(ctxJSON),
	)
	return err
}

// LogSimple records an audit event with minimal context.
func (s *Store) LogSimple(entityType, entityID, action string) error {
	return s.Log(entityType, entityID, action, nil, nil, nil, nil)
}

// LogFieldChange records a field change with old and new values.
func (s *Store) LogFieldChange(entityType, entityID, action, field, oldValue, newValue string, context map[string]string) error {
	return s.Log(entityType, entityID, action, &field, &oldValue, &newValue, context)
}

// QueryParams defines filters for audit log queries.
type QueryParams struct {
	EntityType string
	EntityID   string
	Action     string
	Search     string // LIKE search on entity_id
	DateFrom   string
	DateTo     string
	Limit      int
	Offset     int
}

// Query returns audit events filtered by the given parameters.
func (s *Store) Query(entityType, entityID string, limit, offset int) (*EventList, error) {
	return s.QueryFiltered(&QueryParams{
		EntityType: entityType, EntityID: entityID, Limit: limit, Offset: offset,
	})
}

// QueryFiltered returns audit events with full filter support.
func (s *Store) QueryFiltered(params *QueryParams) (*EventList, error) {
	if params.Limit <= 0 {
		params.Limit = 50
	}

	var where []string
	var args []any
	if params.EntityType != "" {
		where = append(where, "entity_type = ?")
		args = append(args, params.EntityType)
	}
	if params.EntityID != "" {
		where = append(where, "entity_id = ?")
		args = append(args, params.EntityID)
	}
	if params.Action != "" {
		where = append(where, "action LIKE ?")
		args = append(args, "%"+params.Action+"%")
	}
	if params.Search != "" {
		where = append(where, "entity_id LIKE ?")
		args = append(args, "%"+params.Search+"%")
	}
	if params.DateFrom != "" {
		where = append(where, "created_at >= ?")
		args = append(args, params.DateFrom)
	}
	if params.DateTo != "" {
		where = append(where, "created_at <= ?")
		args = append(args, params.DateTo)
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = " WHERE " + strings.Join(where, " AND ")
	}

	// Count
	var total int
	if err := s.db.QueryRow("SELECT COUNT(*) FROM audit_log"+whereClause, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count audit events: %w", err)
	}

	// Data
	dataQuery := `SELECT id, entity_type, entity_id, action, field, old_value, new_value, context, created_at
		FROM audit_log` + whereClause + ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
	args = append(args, params.Limit, params.Offset)

	rows, err := s.db.Query(dataQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("query audit events: %w", err)
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		var e Event
		var createdAt, ctxJSON string
		if err := rows.Scan(&e.ID, &e.EntityType, &e.EntityID, &e.Action, &e.Field, &e.OldValue, &e.NewValue, &ctxJSON, &createdAt); err != nil {
			return nil, fmt.Errorf("scan audit event: %w", err)
		}
		e.CreatedAt = parseTime(createdAt)
		json.Unmarshal([]byte(ctxJSON), &e.Context)
		if e.Context == nil {
			e.Context = map[string]string{}
		}
		events = append(events, e)
	}
	if events == nil {
		events = []Event{}
	}

	return &EventList{Events: events, Total: total}, rows.Err()
}
