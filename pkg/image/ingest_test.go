package image_test

import (
	"strings"
	"testing"

	"github.com/tela/frame/internal/testutil"
	"github.com/tela/frame/pkg/image"
)

// testPNG returns a valid 2x2 RGBA PNG image.
func testPNG() []byte {
	return []byte{
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
		0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02, 0x08, 0x02, 0x00, 0x00, 0x00, 0xfd, 0xd4, 0x9a,
		0x73, 0x00, 0x00, 0x00, 0x1b, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0xfa, 0xcf, 0xc0, 0xc0,
		0xf0, 0x9f, 0x81, 0x89, 0x91, 0xe1, 0xff, 0x7f, 0x06, 0x06, 0x40, 0x00, 0x00, 0x00, 0xff, 0xff,
		0x1d, 0x21, 0x04, 0x02, 0x86, 0x74, 0xbd, 0x7b, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
		0xae, 0x42, 0x60, 0x82,
	}
}

func TestIngestCharacterImage(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	root := t.TempDir()
	ingester := image.NewIngester(store, root)

	charID := "abc123"
	// Seed a character so FK constraint is satisfied
	db.Exec(`INSERT INTO characters (id, name, display_name, folder_name, status) VALUES (?, 'Test', 'T', 'test-abc1234', 'cast')`, charID)

	// Valid 2x2 RGBA PNG
	png := testPNG()

	result, err := ingester.Ingest(&image.IngestRequest{
		Filename:      "test.png",
		Data:          png,
		Source:        image.SourceManual,
		CharacterID:   charID,
		CharacterSlug: "test-abc1234",
	})
	if err != nil {
		t.Fatalf("ingest: %v", err)
	}
	if result.ImageID == "" {
		t.Fatal("expected image ID")
	}
	if result.Format != "png" {
		t.Errorf("format = %q, want png", result.Format)
	}

	// Verify file path uses slug
	origPath := ingester.OriginalPath(result.ImageID, "test-abc1234", nil, "png")
	if !strings.Contains(origPath, "test-abc1234") {
		t.Errorf("path should contain slug: %s", origPath)
	}
	if strings.Contains(origPath, charID) && !strings.Contains("test-abc1234", charID) {
		t.Errorf("path should use slug not raw ID: %s", origPath)
	}
}

func TestIngestStandaloneImage(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	root := t.TempDir()
	ingester := image.NewIngester(store, root)

	png := testPNG()

	// No CharacterID — standalone/feature image
	result, err := ingester.Ingest(&image.IngestRequest{
		Filename:      "ref.png",
		Data:          png,
		Source:        image.SourceManual,
		FeatureFolder: "faces-a7f3b2c",
	})
	if err != nil {
		t.Fatalf("ingest: %v", err)
	}
	if result.ImageID == "" {
		t.Fatal("expected image ID")
	}

	// Verify file path uses feature folder
	origPath := ingester.FeatureOriginalPath(result.ImageID, "faces-a7f3b2c", "png")
	if !strings.Contains(origPath, "features/faces-a7f3b2c") {
		t.Errorf("path should contain features folder: %s", origPath)
	}

	// Verify no character_images record was created
	ci, _ := store.GetCharacterImage(result.ImageID)
	if ci != nil {
		t.Error("standalone image should not have a character_images record")
	}
}

func TestIngestDuplicateCharacterImage(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	root := t.TempDir()
	ingester := image.NewIngester(store, root)

	charID := "dup123"
	db.Exec(`INSERT INTO characters (id, name, display_name, folder_name, status) VALUES (?, 'Dup', 'D', 'dup-dup1234', 'cast')`, charID)

	png := testPNG()

	r1, err := ingester.Ingest(&image.IngestRequest{
		Filename: "first.png", Data: png, Source: image.SourceManual,
		CharacterID: charID, CharacterSlug: "dup-dup1234",
	})
	if err != nil {
		t.Fatalf("first ingest: %v", err)
	}
	if r1.IsDuplicate {
		t.Error("first ingest should not be duplicate")
	}

	r2, err := ingester.Ingest(&image.IngestRequest{
		Filename: "second.png", Data: png, Source: image.SourceManual,
		CharacterID: charID, CharacterSlug: "dup-dup1234",
	})
	if err != nil {
		t.Fatalf("second ingest: %v", err)
	}
	if !r2.IsDuplicate {
		t.Error("second ingest should be duplicate")
	}
	if r2.ImageID != r1.ImageID {
		t.Errorf("duplicate should return same ID: got %s, want %s", r2.ImageID, r1.ImageID)
	}
}
