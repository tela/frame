package image_test

import (
	"testing"
	"time"

	"github.com/tela/frame/internal/testutil"
	"github.com/tela/frame/pkg/database"
	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/image"
)

func seedCharacter(t *testing.T, db *database.DB) string {
	t.Helper()
	charID := id.New()
	_, err := db.Exec(
		`INSERT INTO characters (id, name, display_name, status) VALUES (?, 'Test', 'T', 'cast')`,
		charID,
	)
	if err != nil {
		t.Fatalf("seed character: %v", err)
	}
	return charID
}

func TestCreateAndGetImage(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)

	img := &image.Image{
		ID: id.New(), Hash: "abc123", OriginalFilename: "photo.png",
		Format: "png", Width: 1024, Height: 1024, FileSize: 500000,
		Source: image.SourceManual, IngestedAt: time.Now().UTC(),
	}

	if err := store.Create(img); err != nil {
		t.Fatalf("create: %v", err)
	}

	got, err := store.Get(img.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got == nil {
		t.Fatal("expected image, got nil")
	}
	if got.Hash != "abc123" {
		t.Errorf("hash = %q, want %q", got.Hash, "abc123")
	}
	if got.Width != 1024 {
		t.Errorf("width = %d, want 1024", got.Width)
	}
	if got.Format != "png" {
		t.Errorf("format = %q, want %q", got.Format, "png")
	}
}

func TestGetByHash(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)

	imgID := id.New()
	store.Create(&image.Image{
		ID: imgID, Hash: "uniquehash", Format: "jpg",
		Source: image.SourceFig, IngestedAt: time.Now().UTC(),
	})

	got, err := store.GetByHash("uniquehash")
	if err != nil {
		t.Fatalf("get by hash: %v", err)
	}
	if got == nil {
		t.Fatal("expected image, got nil")
	}
	if got.ID != imgID {
		t.Errorf("id = %q, want %q", got.ID, imgID)
	}
}

func TestGetByHashNotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)

	got, _ := store.GetByHash("nonexistent")
	if got != nil {
		t.Errorf("expected nil, got %+v", got)
	}
}

func TestCreateAndListCharacterImages(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	charID := seedCharacter(t, db)

	for i := 0; i < 3; i++ {
		imgID := id.New()
		store.Create(&image.Image{
			ID: imgID, Hash: id.New(), Format: "png",
			Source: image.SourceManual, IngestedAt: time.Now().UTC(),
		})
		store.CreateCharacterImage(&image.CharacterImage{
			ImageID: imgID, CharacterID: charID,
			SetType: image.SetStaging, TriageStatus: image.TriagePending,
			CreatedAt: time.Now().UTC(),
		})
	}

	images, err := store.ListByCharacter(charID, nil)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(images) != 3 {
		t.Errorf("got %d images, want 3", len(images))
	}
}

func TestListFaceAndBodyRefs(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	charID := seedCharacter(t, db)

	eraID := id.New()
	db.Exec(`INSERT INTO eras (id, character_id, label, pipeline_settings, sort_order) VALUES (?, ?, 'Test Era', '{}', 1)`, eraID, charID)

	// Create face ref
	faceImgID := id.New()
	store.Create(&image.Image{ID: faceImgID, Hash: id.New(), Format: "png", Source: image.SourceManual, IngestedAt: time.Now().UTC()})
	score := 93.4
	rank := 1
	store.CreateCharacterImage(&image.CharacterImage{
		ImageID: faceImgID, CharacterID: charID, EraID: &eraID,
		SetType: image.SetReference, TriageStatus: image.TriageApproved,
		IsFaceRef: true, RefScore: &score, RefRank: &rank,
		CreatedAt: time.Now().UTC(),
	})

	// Create body ref
	bodyImgID := id.New()
	store.Create(&image.Image{ID: bodyImgID, Hash: id.New(), Format: "png", Source: image.SourceManual, IngestedAt: time.Now().UTC()})
	store.CreateCharacterImage(&image.CharacterImage{
		ImageID: bodyImgID, CharacterID: charID, EraID: &eraID,
		SetType: image.SetReference, TriageStatus: image.TriageApproved,
		IsBodyRef: true, RefScore: &score, RefRank: &rank,
		CreatedAt: time.Now().UTC(),
	})

	faceRefs, err := store.ListFaceRefs(charID, eraID)
	if err != nil {
		t.Fatalf("list face refs: %v", err)
	}
	if len(faceRefs) != 1 {
		t.Errorf("got %d face refs, want 1", len(faceRefs))
	}

	bodyRefs, err := store.ListBodyRefs(charID, eraID)
	if err != nil {
		t.Fatalf("list body refs: %v", err)
	}
	if len(bodyRefs) != 1 {
		t.Errorf("got %d body refs, want 1", len(bodyRefs))
	}
}

func TestGetCharacterImage(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	charID := seedCharacter(t, db)

	imgID := id.New()
	store.Create(&image.Image{ID: imgID, Hash: id.New(), Format: "png", Source: image.SourceManual, IngestedAt: time.Now().UTC()})
	store.CreateCharacterImage(&image.CharacterImage{
		ImageID: imgID, CharacterID: charID,
		SetType: image.SetStaging, TriageStatus: image.TriagePending,
		CreatedAt: time.Now().UTC(),
	})

	ci, err := store.GetCharacterImage(imgID)
	if err != nil {
		t.Fatalf("get character image: %v", err)
	}
	if ci == nil {
		t.Fatal("expected character image, got nil")
	}
	if ci.CharacterID != charID {
		t.Errorf("character_id = %q, want %q", ci.CharacterID, charID)
	}
}
