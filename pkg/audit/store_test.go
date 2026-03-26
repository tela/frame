package audit_test

import (
	"testing"

	"github.com/tela/frame/internal/testutil"
	"github.com/tela/frame/pkg/audit"
)

func TestLogAndQuery(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := audit.NewStore(db.DB)

	store.LogSimple("character", "char1", "created")
	store.LogFieldChange("image", "img1", "rating_changed", "rating", "3", "5", map[string]string{"character_id": "char1"})
	store.LogSimple("image", "img2", "ingested")

	// Query all
	result, err := store.Query("", "", 50, 0)
	if err != nil {
		t.Fatalf("query: %v", err)
	}
	if result.Total != 3 {
		t.Errorf("total = %d, want 3", result.Total)
	}

	// Query by entity type
	result, _ = store.Query("image", "", 50, 0)
	if result.Total != 2 {
		t.Errorf("image events = %d, want 2", result.Total)
	}

	// Query by entity ID
	result, _ = store.Query("", "img1", 50, 0)
	if result.Total != 1 {
		t.Errorf("img1 events = %d, want 1", result.Total)
	}

	// Check field change details
	event := result.Events[0]
	if event.Action != "rating_changed" {
		t.Errorf("action = %q, want rating_changed", event.Action)
	}
	if event.Field == nil || *event.Field != "rating" {
		t.Errorf("field = %v, want rating", event.Field)
	}
	if event.OldValue == nil || *event.OldValue != "3" {
		t.Errorf("old_value = %v, want 3", event.OldValue)
	}
	if event.NewValue == nil || *event.NewValue != "5" {
		t.Errorf("new_value = %v, want 5", event.NewValue)
	}
	if event.Context["character_id"] != "char1" {
		t.Errorf("context character_id = %q, want char1", event.Context["character_id"])
	}
}

func TestQueryPagination(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := audit.NewStore(db.DB)

	for i := 0; i < 10; i++ {
		store.LogSimple("image", "img1", "updated")
	}

	result, _ := store.Query("", "", 3, 0)
	if len(result.Events) != 3 {
		t.Errorf("page 1 = %d, want 3", len(result.Events))
	}
	if result.Total != 10 {
		t.Errorf("total = %d, want 10", result.Total)
	}
}
