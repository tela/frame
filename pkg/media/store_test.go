package media_test

import (
	"testing"
	"time"

	"github.com/tela/frame/internal/testutil"
	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/media"
)

func TestCreateAndGetMediaItem(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := media.NewStore(db.DB)

	now := time.Now().UTC()
	item := &media.Item{
		ID: id.New(), ContentType: media.ContentWardrobe, Name: "Black Evening Dress",
		CreatedAt: now, UpdatedAt: now,
	}
	if err := store.Create(item); err != nil {
		t.Fatalf("create: %v", err)
	}

	got, err := store.Get(item.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got == nil {
		t.Fatal("expected item, got nil")
	}
	if got.Name != "Black Evening Dress" {
		t.Errorf("name = %q, want %q", got.Name, "Black Evening Dress")
	}
	if got.ContentType != media.ContentWardrobe {
		t.Errorf("content_type = %q, want %q", got.ContentType, media.ContentWardrobe)
	}
}

func TestGetNonexistentMediaItem(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := media.NewStore(db.DB)

	got, _ := store.Get("nonexistent")
	if got != nil {
		t.Errorf("expected nil, got %+v", got)
	}
}

func TestListByType(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := media.NewStore(db.DB)

	now := time.Now().UTC()
	store.Create(&media.Item{ID: id.New(), ContentType: media.ContentWardrobe, Name: "Dress", CreatedAt: now, UpdatedAt: now})
	store.Create(&media.Item{ID: id.New(), ContentType: media.ContentWardrobe, Name: "Shirt", CreatedAt: now, UpdatedAt: now})
	store.Create(&media.Item{ID: id.New(), ContentType: media.ContentProp, Name: "Journal", CreatedAt: now, UpdatedAt: now})

	wardrobe, err := store.ListByType(media.ContentWardrobe)
	if err != nil {
		t.Fatalf("list wardrobe: %v", err)
	}
	if len(wardrobe) != 2 {
		t.Errorf("got %d wardrobe items, want 2", len(wardrobe))
	}

	props, _ := store.ListByType(media.ContentProp)
	if len(props) != 1 {
		t.Errorf("got %d props, want 1", len(props))
	}

	locations, _ := store.ListByType(media.ContentLocation)
	if len(locations) != 0 {
		t.Errorf("got %d locations, want 0", len(locations))
	}
}

func TestAddAndListImages(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := media.NewStore(db.DB)

	now := time.Now().UTC()
	itemID := id.New()
	store.Create(&media.Item{ID: itemID, ContentType: media.ContentWardrobe, Name: "Dress", CreatedAt: now, UpdatedAt: now})

	img1 := testutil.SeedImage(t, db)
	img2 := testutil.SeedImage(t, db)

	store.AddImage(itemID, img1, 0)
	store.AddImage(itemID, img2, 1)

	images, err := store.ListImages(itemID)
	if err != nil {
		t.Fatalf("list images: %v", err)
	}
	if len(images) != 2 {
		t.Errorf("got %d images, want 2", len(images))
	}
}

func TestSetPrimaryImage(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := media.NewStore(db.DB)

	now := time.Now().UTC()
	itemID := id.New()
	store.Create(&media.Item{ID: itemID, ContentType: media.ContentProp, Name: "Journal", CreatedAt: now, UpdatedAt: now})

	imgID := testutil.SeedImage(t, db)
	store.AddImage(itemID, imgID, 0)
	store.SetPrimaryImage(itemID, imgID)

	got, _ := store.Get(itemID)
	if got.PrimaryImageID == nil || *got.PrimaryImageID != imgID {
		t.Errorf("primary_image_id = %v, want %q", got.PrimaryImageID, imgID)
	}
}
