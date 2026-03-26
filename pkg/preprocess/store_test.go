package preprocess_test

import (
	"testing"
	"time"

	"github.com/tela/frame/internal/testutil"
	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/preprocess"
)

func TestCreateAndGetDerivative(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := preprocess.NewStore(db.DB)
	imgID := testutil.SeedImage(t, db)

	derivID := id.New()
	d := &preprocess.Derivative{
		ID:            derivID,
		SourceImageID: imgID,
		Operations: []preprocess.Operation{
			{Type: preprocess.OpCrop, Params: map[string]any{"x": 100, "y": 50, "width": 512, "height": 512}, Timestamp: time.Now().UTC()},
			{Type: preprocess.OpResize, Params: map[string]any{"width": 768, "height": 768}, Timestamp: time.Now().UTC()},
		},
		CreatedAt: time.Now().UTC(),
	}

	if err := store.CreateDerivative(d); err != nil {
		t.Fatalf("create: %v", err)
	}

	got, err := store.GetDerivative(derivID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got == nil {
		t.Fatal("expected derivative, got nil")
	}
	if got.SourceImageID != imgID {
		t.Errorf("source = %q, want %q", got.SourceImageID, imgID)
	}
	if len(got.Operations) != 2 {
		t.Errorf("got %d operations, want 2", len(got.Operations))
	}
	if got.Operations[0].Type != preprocess.OpCrop {
		t.Errorf("first op = %q, want %q", got.Operations[0].Type, preprocess.OpCrop)
	}
}

func TestGetNonexistentDerivative(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := preprocess.NewStore(db.DB)

	got, err := store.GetDerivative("nonexistent")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got != nil {
		t.Errorf("expected nil, got %+v", got)
	}
}

func TestListDerivatives(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := preprocess.NewStore(db.DB)
	imgID := testutil.SeedImage(t, db)

	for i := 0; i < 3; i++ {
		store.CreateDerivative(&preprocess.Derivative{
			ID:            id.New(),
			SourceImageID: imgID,
			Operations:    []preprocess.Operation{{Type: preprocess.OpResize, Params: map[string]any{"width": 512}}},
			CreatedAt:     time.Now().UTC(),
		})
	}

	derivs, err := store.ListDerivatives(imgID)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(derivs) != 3 {
		t.Errorf("got %d derivatives, want 3", len(derivs))
	}
}

func TestGetLineage(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := preprocess.NewStore(db.DB)
	originalID := testutil.SeedImage(t, db)

	// Original is not a derivative, so lineage should just return it as the original
	lineage, err := store.GetLineage(originalID)
	if err != nil {
		t.Fatalf("lineage: %v", err)
	}
	if lineage.Original != originalID {
		t.Errorf("original = %q, want %q", lineage.Original, originalID)
	}
	if len(lineage.Chain) != 0 {
		t.Errorf("chain length = %d, want 0", len(lineage.Chain))
	}
}

func TestPresets(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := preprocess.NewStore(db.DB)

	preset := &preprocess.Preset{
		ID:   id.New(),
		Name: "Square 768",
		Operations: []preprocess.Operation{
			{Type: preprocess.OpCrop, Params: map[string]any{"width": 768, "height": 768}},
			{Type: preprocess.OpResize, Params: map[string]any{"width": 768, "height": 768}},
		},
		CreatedAt: time.Now().UTC(),
	}
	if err := store.CreatePreset(preset); err != nil {
		t.Fatalf("create preset: %v", err)
	}

	presets, err := store.ListPresets()
	if err != nil {
		t.Fatalf("list presets: %v", err)
	}
	if len(presets) != 1 {
		t.Fatalf("got %d presets, want 1", len(presets))
	}
	if presets[0].Name != "Square 768" {
		t.Errorf("name = %q, want %q", presets[0].Name, "Square 768")
	}
	if len(presets[0].Operations) != 2 {
		t.Errorf("operations = %d, want 2", len(presets[0].Operations))
	}

	store.DeletePreset(preset.ID)
	presets, _ = store.ListPresets()
	if len(presets) != 0 {
		t.Errorf("got %d presets after delete, want 0", len(presets))
	}
}
