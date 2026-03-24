package image_test

import (
	"testing"
	"time"

	"github.com/tela/frame/internal/testutil"
	"github.com/tela/frame/pkg/database"
	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/image"
)

func seedCharacterWithEra(t *testing.T, db *database.DB) (string, string) {
	t.Helper()
	charID := id.New()
	eraID := id.New()
	db.Exec(`INSERT INTO characters (id, name, display_name, folder_name, status) VALUES (?, 'SearchChar', 'SC', 'sc-test', 'cast')`, charID)
	db.Exec(`INSERT INTO eras (id, character_id, label, pipeline_settings, sort_order) VALUES (?, ?, 'Test Era', '{}', 1)`, eraID, charID)
	return charID, eraID
}

func ingestTestImage(t *testing.T, store *image.Store, charID string, eraID *string, source image.Source, rating *int) string {
	t.Helper()
	imgID := id.New()
	store.Create(&image.Image{ID: imgID, Hash: id.New(), Format: "png", Width: 512, Height: 512, Source: source, IngestedAt: time.Now().UTC()})
	store.CreateCharacterImage(&image.CharacterImage{
		ImageID: imgID, CharacterID: charID, EraID: eraID,
		SetType: image.SetStaging, TriageStatus: image.TriageApproved,
		Rating: rating, CreatedAt: time.Now().UTC(),
	})
	return imgID
}

func TestSearchBasic(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	charID, eraID := seedCharacterWithEra(t, db)

	// Create 3 images
	for i := 0; i < 3; i++ {
		ingestTestImage(t, store, charID, &eraID, image.SourceManual, nil)
	}

	results, err := store.Search(&image.SearchParams{})
	if err != nil {
		t.Fatalf("search: %v", err)
	}
	if results.Total != 3 {
		t.Errorf("total = %d, want 3", results.Total)
	}
	if len(results.Images) != 3 {
		t.Errorf("images = %d, want 3", len(results.Images))
	}
}

func TestSearchByCharacter(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	char1, era1 := seedCharacterWithEra(t, db)
	char2, era2 := seedCharacterWithEra(t, db)

	ingestTestImage(t, store, char1, &era1, image.SourceManual, nil)
	ingestTestImage(t, store, char1, &era1, image.SourceManual, nil)
	ingestTestImage(t, store, char2, &era2, image.SourceManual, nil)

	results, _ := store.Search(&image.SearchParams{CharacterID: char1})
	if results.Total != 2 {
		t.Errorf("total = %d, want 2", results.Total)
	}
}

func TestSearchByRating(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	charID, eraID := seedCharacterWithEra(t, db)

	r1, r3, r5 := 1, 3, 5
	ingestTestImage(t, store, charID, &eraID, image.SourceManual, &r1)
	ingestTestImage(t, store, charID, &eraID, image.SourceManual, &r3)
	ingestTestImage(t, store, charID, &eraID, image.SourceManual, &r5)

	results, _ := store.Search(&image.SearchParams{RatingMin: 3})
	if results.Total != 2 {
		t.Errorf("total = %d, want 2 (rating >= 3)", results.Total)
	}
}

func TestSearchByTags(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	charID, eraID := seedCharacterWithEra(t, db)

	img1 := ingestTestImage(t, store, charID, &eraID, image.SourceManual, nil)
	img2 := ingestTestImage(t, store, charID, &eraID, image.SourceManual, nil)
	ingestTestImage(t, store, charID, &eraID, image.SourceManual, nil) // no tags

	// Tag img1 and img2 with pose:front-facing
	db.Exec(`INSERT INTO image_tags (image_id, tag_namespace, tag_value, source) VALUES (?, 'pose', 'front-facing', 'manual')`, img1)
	db.Exec(`INSERT INTO image_tags (image_id, tag_namespace, tag_value, source) VALUES (?, 'pose', 'front-facing', 'manual')`, img2)
	// Tag only img1 with quality:high
	db.Exec(`INSERT INTO image_tags (image_id, tag_namespace, tag_value, source) VALUES (?, 'quality', 'high', 'manual')`, img1)

	// Search for pose:front-facing — should find 2
	results, _ := store.Search(&image.SearchParams{Tags: []string{"pose:front-facing"}})
	if results.Total != 2 {
		t.Errorf("pose:front-facing total = %d, want 2", results.Total)
	}

	// Search for both tags (AND) — should find 1
	results, _ = store.Search(&image.SearchParams{Tags: []string{"pose:front-facing", "quality:high"}})
	if results.Total != 1 {
		t.Errorf("pose:front-facing AND quality:high total = %d, want 1", results.Total)
	}
}

func TestSearchPagination(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	charID, eraID := seedCharacterWithEra(t, db)

	for i := 0; i < 10; i++ {
		ingestTestImage(t, store, charID, &eraID, image.SourceManual, nil)
	}

	// Page 1
	r1, _ := store.Search(&image.SearchParams{Limit: 3, Offset: 0})
	if len(r1.Images) != 3 {
		t.Errorf("page 1 images = %d, want 3", len(r1.Images))
	}
	if r1.Total != 10 {
		t.Errorf("total = %d, want 10", r1.Total)
	}

	// Page 4 (last partial page)
	r4, _ := store.Search(&image.SearchParams{Limit: 3, Offset: 9})
	if len(r4.Images) != 1 {
		t.Errorf("page 4 images = %d, want 1", len(r4.Images))
	}
}

func TestSearchBySource(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	charID, eraID := seedCharacterWithEra(t, db)

	ingestTestImage(t, store, charID, &eraID, image.SourceFig, nil)
	ingestTestImage(t, store, charID, &eraID, image.SourceComfyUI, nil)
	ingestTestImage(t, store, charID, &eraID, image.SourceManual, nil)

	results, _ := store.Search(&image.SearchParams{Source: "fig"})
	if results.Total != 1 {
		t.Errorf("fig source total = %d, want 1", results.Total)
	}
}
