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

type testImageOpts struct {
	source       image.Source
	rating       *int
	filename     string
	caption      string
	triageStatus image.TriageStatus
	setType      image.SetType
	ingestedAt   time.Time
}

func ingestTestImage(t *testing.T, store *image.Store, charID string, eraID *string, source image.Source, rating *int) string {
	t.Helper()
	return ingestTestImageOpts(t, store, charID, eraID, testImageOpts{source: source, rating: rating})
}

func ingestTestImageOpts(t *testing.T, store *image.Store, charID string, eraID *string, opts testImageOpts) string {
	t.Helper()
	imgID := id.New()
	if opts.source == "" {
		opts.source = image.SourceManual
	}
	if opts.triageStatus == "" {
		opts.triageStatus = image.TriageApproved
	}
	if opts.setType == "" {
		opts.setType = image.SetStaging
	}
	ts := opts.ingestedAt
	if ts.IsZero() {
		ts = time.Now().UTC()
	}
	filename := opts.filename
	if filename == "" {
		filename = "test_" + imgID + ".png"
	}
	store.Create(&image.Image{ID: imgID, Hash: id.New(), OriginalFilename: filename, Format: "png", Width: 512, Height: 512, Source: opts.source, IngestedAt: ts})
	ci := &image.CharacterImage{
		ImageID: imgID, CharacterID: charID, EraID: eraID,
		SetType: opts.setType, TriageStatus: opts.triageStatus,
		Rating: opts.rating, CreatedAt: ts,
	}
	if opts.caption != "" {
		ci.Caption = &opts.caption
	}
	store.CreateCharacterImage(ci)
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

func TestSearchByEra(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	charID, era1 := seedCharacterWithEra(t, db)
	era2 := id.New()
	db.Exec(`INSERT INTO eras (id, character_id, label, pipeline_settings, sort_order) VALUES (?, ?, 'Era 2', '{}', 2)`, era2, charID)

	ingestTestImage(t, store, charID, &era1, image.SourceManual, nil)
	ingestTestImage(t, store, charID, &era1, image.SourceManual, nil)
	ingestTestImage(t, store, charID, &era2, image.SourceManual, nil)

	results, _ := store.Search(&image.SearchParams{EraID: era1})
	if results.Total != 2 {
		t.Errorf("era1 total = %d, want 2", results.Total)
	}
}

func TestSearchByTriageStatus(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	charID, eraID := seedCharacterWithEra(t, db)

	ingestTestImageOpts(t, store, charID, &eraID, testImageOpts{triageStatus: image.TriagePending})
	ingestTestImageOpts(t, store, charID, &eraID, testImageOpts{triageStatus: image.TriagePending})
	ingestTestImageOpts(t, store, charID, &eraID, testImageOpts{triageStatus: image.TriageApproved})

	results, _ := store.Search(&image.SearchParams{TriageStatus: "pending"})
	if results.Total != 2 {
		t.Errorf("pending total = %d, want 2", results.Total)
	}
}

func TestSearchBySetType(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	charID, eraID := seedCharacterWithEra(t, db)

	ingestTestImageOpts(t, store, charID, &eraID, testImageOpts{setType: image.SetReference})
	ingestTestImageOpts(t, store, charID, &eraID, testImageOpts{setType: image.SetCurated})
	ingestTestImageOpts(t, store, charID, &eraID, testImageOpts{setType: image.SetCurated})

	results, _ := store.Search(&image.SearchParams{SetType: "curated"})
	if results.Total != 2 {
		t.Errorf("curated total = %d, want 2", results.Total)
	}
}

func TestSearchByQuery(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	charID, eraID := seedCharacterWithEra(t, db)

	ingestTestImageOpts(t, store, charID, &eraID, testImageOpts{filename: "headshot_neutral_001.png"})
	ingestTestImageOpts(t, store, charID, &eraID, testImageOpts{filename: "full_body_002.png"})
	ingestTestImageOpts(t, store, charID, &eraID, testImageOpts{caption: "beautiful headshot with soft lighting"})

	// Search by filename
	results, _ := store.Search(&image.SearchParams{Query: "headshot"})
	if results.Total != 2 {
		t.Errorf("query 'headshot' total = %d, want 2 (1 filename + 1 caption)", results.Total)
	}

	// Search by caption only
	results, _ = store.Search(&image.SearchParams{Query: "soft lighting"})
	if results.Total != 1 {
		t.Errorf("query 'soft lighting' total = %d, want 1", results.Total)
	}
}

func TestSearchByDateRange(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	charID, eraID := seedCharacterWithEra(t, db)

	old := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	mid := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
	recent := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)

	ingestTestImageOpts(t, store, charID, &eraID, testImageOpts{ingestedAt: old})
	ingestTestImageOpts(t, store, charID, &eraID, testImageOpts{ingestedAt: mid})
	ingestTestImageOpts(t, store, charID, &eraID, testImageOpts{ingestedAt: recent})

	// From 2025-06-01
	results, _ := store.Search(&image.SearchParams{DateFrom: "2025-06-01"})
	if results.Total != 2 {
		t.Errorf("from 2025-06-01 total = %d, want 2", results.Total)
	}

	// To 2025-12-31
	results, _ = store.Search(&image.SearchParams{DateTo: "2025-12-31"})
	if results.Total != 2 {
		t.Errorf("to 2025-12-31 total = %d, want 2", results.Total)
	}

	// Range
	results, _ = store.Search(&image.SearchParams{DateFrom: "2025-03-01", DateTo: "2025-12-31"})
	if results.Total != 1 {
		t.Errorf("range total = %d, want 1", results.Total)
	}
}

func TestSearchSortByRating(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	charID, eraID := seedCharacterWithEra(t, db)

	r1, r5, r3 := 1, 5, 3
	ingestTestImage(t, store, charID, &eraID, image.SourceManual, &r1)
	ingestTestImage(t, store, charID, &eraID, image.SourceManual, &r5)
	ingestTestImage(t, store, charID, &eraID, image.SourceManual, &r3)

	results, _ := store.Search(&image.SearchParams{SortBy: "rating"})
	if results.Total != 3 {
		t.Fatalf("total = %d, want 3", results.Total)
	}
	// First result should have highest rating
	if results.Images[0].Rating == nil || *results.Images[0].Rating != 5 {
		t.Errorf("first result rating = %v, want 5", results.Images[0].Rating)
	}
}

func TestSearchCombinedFilters(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	charID, eraID := seedCharacterWithEra(t, db)

	r4, r2 := 4, 2
	ingestTestImageOpts(t, store, charID, &eraID, testImageOpts{source: image.SourceComfyUI, rating: &r4, triageStatus: image.TriageApproved})
	ingestTestImageOpts(t, store, charID, &eraID, testImageOpts{source: image.SourceComfyUI, rating: &r2, triageStatus: image.TriageApproved})
	ingestTestImageOpts(t, store, charID, &eraID, testImageOpts{source: image.SourceManual, rating: &r4, triageStatus: image.TriageApproved})
	ingestTestImageOpts(t, store, charID, &eraID, testImageOpts{source: image.SourceComfyUI, rating: &r4, triageStatus: image.TriageRejected})

	// ComfyUI + rating >= 3 + approved
	results, _ := store.Search(&image.SearchParams{
		Source: "comfyui", RatingMin: 3, TriageStatus: "approved",
	})
	if results.Total != 1 {
		t.Errorf("combined filter total = %d, want 1", results.Total)
	}
}

func TestSearchLimitBounds(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)

	// Default limit
	results, _ := store.Search(&image.SearchParams{})
	if results.Limit != 50 {
		t.Errorf("default limit = %d, want 50", results.Limit)
	}

	// Exceeds max
	results, _ = store.Search(&image.SearchParams{Limit: 500})
	if results.Limit != 200 {
		t.Errorf("max limit = %d, want 200", results.Limit)
	}

	// Negative
	results, _ = store.Search(&image.SearchParams{Limit: -1})
	if results.Limit != 50 {
		t.Errorf("negative limit = %d, want 50", results.Limit)
	}
}

func TestSearchEmptyResults(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)

	results, err := store.Search(&image.SearchParams{CharacterID: "nonexistent"})
	if err != nil {
		t.Fatalf("search: %v", err)
	}
	if results.Total != 0 {
		t.Errorf("total = %d, want 0", results.Total)
	}
	if len(results.Images) != 0 {
		t.Errorf("images = %d, want 0", len(results.Images))
	}
}
