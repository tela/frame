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
		RefType: refTypePtr(image.RefFace), RefScore: &score, RefRank: &rank,
		CreatedAt: time.Now().UTC(),
	})

	// Create body ref
	bodyImgID := id.New()
	store.Create(&image.Image{ID: bodyImgID, Hash: id.New(), Format: "png", Source: image.SourceManual, IngestedAt: time.Now().UTC()})
	store.CreateCharacterImage(&image.CharacterImage{
		ImageID: bodyImgID, CharacterID: charID, EraID: &eraID,
		SetType: image.SetReference, TriageStatus: image.TriageApproved,
		RefType: refTypePtr(image.RefBody), RefScore: &score, RefRank: &rank,
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

func TestUpdateCharacterImage(t *testing.T) {
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

	// Update rating
	rating := 4
	store.UpdateCharacterImage(imgID, charID, &image.CharacterImageUpdate{Rating: &rating})

	ci, _ := store.GetCharacterImage(imgID)
	if ci.Rating == nil || *ci.Rating != 4 {
		t.Errorf("rating = %v, want 4", ci.Rating)
	}

	// Update set type and triage status
	setType := image.SetReference
	triageStatus := image.TriageApproved
	store.UpdateCharacterImage(imgID, charID, &image.CharacterImageUpdate{
		SetType:      &setType,
		TriageStatus: &triageStatus,
	})

	ci, _ = store.GetCharacterImage(imgID)
	if ci.SetType != image.SetReference {
		t.Errorf("set_type = %q, want %q", ci.SetType, image.SetReference)
	}
	if ci.TriageStatus != image.TriageApproved {
		t.Errorf("triage_status = %q, want %q", ci.TriageStatus, image.TriageApproved)
	}

	// Promote to face ref
	faceType := "face"
	score := 92.5
	rank := 1
	store.UpdateCharacterImage(imgID, charID, &image.CharacterImageUpdate{
		RefType:  &faceType,
		RefScore: &score,
		RefRank:  &rank,
	})

	ci, _ = store.GetCharacterImage(imgID)
	if ci.RefType == nil || *ci.RefType != image.RefFace {
		t.Errorf("ref_type = %v, want face", ci.RefType)
	}
	if ci.RefScore == nil || *ci.RefScore != 92.5 {
		t.Errorf("ref_score = %v, want 92.5", ci.RefScore)
	}
}

func TestUpdateCaption(t *testing.T) {
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

	// Initially no caption
	ci, _ := store.GetCharacterImage(imgID)
	if ci.Caption != nil {
		t.Errorf("expected nil caption, got %q", *ci.Caption)
	}

	// Set caption
	caption := "a portrait of Eleanor in soft natural light, front-facing, neutral expression"
	store.UpdateCharacterImage(imgID, charID, &image.CharacterImageUpdate{Caption: &caption})

	ci, _ = store.GetCharacterImage(imgID)
	if ci.Caption == nil || *ci.Caption != caption {
		t.Errorf("caption = %v, want %q", ci.Caption, caption)
	}
}

func TestListPendingByCharacter(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := image.NewStore(db.DB)
	charID := seedCharacter(t, db)

	// Create 3 images: 2 pending, 1 approved
	for i := 0; i < 3; i++ {
		imgID := id.New()
		store.Create(&image.Image{ID: imgID, Hash: id.New(), Format: "png", Source: image.SourceManual, IngestedAt: time.Now().UTC()})
		status := image.TriagePending
		if i == 2 {
			status = image.TriageApproved
		}
		store.CreateCharacterImage(&image.CharacterImage{
			ImageID: imgID, CharacterID: charID,
			SetType: image.SetStaging, TriageStatus: status,
			CreatedAt: time.Now().UTC(),
		})
	}

	pending, err := store.ListPendingByCharacter(charID, nil)
	if err != nil {
		t.Fatalf("list pending: %v", err)
	}
	if len(pending) != 2 {
		t.Errorf("got %d pending, want 2", len(pending))
	}
}

func refTypePtr(rt image.RefType) *image.RefType { return &rt }
