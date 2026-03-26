package dataset_test

import (
	"testing"
	"time"

	"github.com/tela/frame/internal/testutil"
	"github.com/tela/frame/pkg/dataset"
	"github.com/tela/frame/pkg/id"
)

func TestCreateAndGetDataset(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := dataset.NewStore(db.DB)

	now := time.Now().UTC()
	ds := &dataset.Dataset{
		ID: id.New(), Name: "Eleanor LoRA v3", Description: "Training set",
		Type: dataset.TypeLoRA, SourceQuery: "{}", ExportConfig: "{}",
		CreatedAt: now, UpdatedAt: now,
	}
	if err := store.Create(ds); err != nil {
		t.Fatalf("create: %v", err)
	}

	got, err := store.Get(ds.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got == nil {
		t.Fatal("expected dataset, got nil")
	}
	if got.Name != "Eleanor LoRA v3" {
		t.Errorf("name = %q, want %q", got.Name, "Eleanor LoRA v3")
	}
	if got.Type != dataset.TypeLoRA {
		t.Errorf("type = %q, want %q", got.Type, dataset.TypeLoRA)
	}
}

func TestListDatasetsWithStats(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := dataset.NewStore(db.DB)

	now := time.Now().UTC()
	dsID := id.New()
	store.Create(&dataset.Dataset{
		ID: dsID, Name: "Test", Type: dataset.TypeGeneral,
		SourceQuery: "{}", ExportConfig: "{}",
		CreatedAt: now, UpdatedAt: now,
	})

	img1 := testutil.SeedImage(t, db)
	img2 := testutil.SeedImage(t, db)
	store.AddImage(dsID, img1, 0)
	store.AddImage(dsID, img2, 1)

	datasets, err := store.List()
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(datasets) != 1 {
		t.Fatalf("got %d datasets, want 1", len(datasets))
	}
	if datasets[0].ImageCount != 2 {
		t.Errorf("image_count = %d, want 2", datasets[0].ImageCount)
	}
	if datasets[0].IncludedCount != 2 {
		t.Errorf("included_count = %d, want 2", datasets[0].IncludedCount)
	}
}

func TestForkDataset(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := dataset.NewStore(db.DB)

	now := time.Now().UTC()
	srcID := id.New()
	store.Create(&dataset.Dataset{
		ID: srcID, Name: "Original", Type: dataset.TypeLoRA,
		SourceQuery: "{}", ExportConfig: "{}", CreatedAt: now, UpdatedAt: now,
	})

	img1 := testutil.SeedImage(t, db)
	img2 := testutil.SeedImage(t, db)
	store.AddImage(srcID, img1, 0)
	store.AddImage(srcID, img2, 1)

	forked, err := store.Fork(srcID, "Fork of Original")
	if err != nil {
		t.Fatalf("fork: %v", err)
	}
	if forked.Name != "Fork of Original" {
		t.Errorf("name = %q, want %q", forked.Name, "Fork of Original")
	}
	if forked.ID == srcID {
		t.Error("forked should have different ID")
	}

	// Verify forked has same images
	images, _ := store.ListImages(forked.ID)
	if len(images) != 2 {
		t.Errorf("forked has %d images, want 2", len(images))
	}
}

func TestAddRemoveImages(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := dataset.NewStore(db.DB)

	now := time.Now().UTC()
	dsID := id.New()
	store.Create(&dataset.Dataset{
		ID: dsID, Name: "Test", Type: dataset.TypeGeneral,
		SourceQuery: "{}", ExportConfig: "{}", CreatedAt: now, UpdatedAt: now,
	})

	img := testutil.SeedImage(t, db)
	store.AddImage(dsID, img, 0)

	images, _ := store.ListImages(dsID)
	if len(images) != 1 {
		t.Fatalf("got %d images, want 1", len(images))
	}

	store.RemoveImage(dsID, img)
	images, _ = store.ListImages(dsID)
	if len(images) != 0 {
		t.Errorf("got %d images after remove, want 0", len(images))
	}
}

func TestUpdateDatasetImage(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := dataset.NewStore(db.DB)

	now := time.Now().UTC()
	dsID := id.New()
	store.Create(&dataset.Dataset{
		ID: dsID, Name: "Test", Type: dataset.TypeGeneral,
		SourceQuery: "{}", ExportConfig: "{}", CreatedAt: now, UpdatedAt: now,
	})

	img := testutil.SeedImage(t, db)
	store.AddImage(dsID, img, 0)

	caption := "a portrait photo"
	included := false
	store.UpdateImage(dsID, img, &caption, nil, &included)

	images, _ := store.ListImages(dsID)
	if len(images) != 1 {
		t.Fatalf("got %d images, want 1", len(images))
	}
	if images[0].Caption == nil || *images[0].Caption != "a portrait photo" {
		t.Errorf("caption = %v, want %q", images[0].Caption, "a portrait photo")
	}
	if images[0].Included {
		t.Error("expected included=false")
	}
}

func TestAddDuplicateImageIsIdempotent(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := dataset.NewStore(db.DB)

	now := time.Now().UTC()
	dsID := id.New()
	store.Create(&dataset.Dataset{
		ID: dsID, Name: "Test", Type: dataset.TypeGeneral,
		SourceQuery: "{}", ExportConfig: "{}", CreatedAt: now, UpdatedAt: now,
	})

	img := testutil.SeedImage(t, db)
	store.AddImage(dsID, img, 0)
	store.AddImage(dsID, img, 1) // duplicate

	images, _ := store.ListImages(dsID)
	if len(images) != 1 {
		t.Errorf("got %d images, want 1", len(images))
	}
}

func TestDeleteDatasetCascadesImages(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := dataset.NewStore(db.DB)

	now := time.Now().UTC()
	dsID := id.New()
	store.Create(&dataset.Dataset{
		ID: dsID, Name: "Test", Type: dataset.TypeGeneral,
		SourceQuery: "{}", ExportConfig: "{}", CreatedAt: now, UpdatedAt: now,
	})

	img := testutil.SeedImage(t, db)
	store.AddImage(dsID, img, 0)

	store.Delete(dsID)

	got, _ := store.Get(dsID)
	if got != nil {
		t.Error("dataset should be deleted")
	}
}
