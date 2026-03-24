package tag_test

import (
	"testing"

	"github.com/tela/frame/internal/testutil"
	"github.com/tela/frame/pkg/tag"
)

func TestListFamilies(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := tag.NewStore(db.DB)

	families, err := store.ListFamilies()
	if err != nil {
		t.Fatalf("list families: %v", err)
	}
	// Should have 4 seeded families
	if len(families) != 4 {
		t.Errorf("got %d families, want 4", len(families))
	}
}

func TestGetFamily(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := tag.NewStore(db.DB)

	f, err := store.GetFamily("fam_character")
	if err != nil {
		t.Fatalf("get family: %v", err)
	}
	if f == nil {
		t.Fatal("expected family, got nil")
	}
	if f.Name != "Character Identity" {
		t.Errorf("name = %q, want %q", f.Name, "Character Identity")
	}
}

func TestGetNonexistentFamily(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := tag.NewStore(db.DB)

	f, err := store.GetFamily("nonexistent")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if f != nil {
		t.Errorf("expected nil, got %+v", f)
	}
}

func TestAddAndGetImageTags(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := tag.NewStore(db.DB)
	imgID := testutil.SeedImage(t, db)

	familyID := "fam_character"
	if err := store.AddTag(imgID, "pose", "front-facing", "manual", &familyID); err != nil {
		t.Fatalf("add tag: %v", err)
	}
	if err := store.AddTag(imgID, "expression", "neutral", "manual", &familyID); err != nil {
		t.Fatalf("add tag: %v", err)
	}

	tags, err := store.GetImageTags(imgID)
	if err != nil {
		t.Fatalf("get image tags: %v", err)
	}
	if len(tags) != 2 {
		t.Fatalf("got %d tags, want 2", len(tags))
	}
}

func TestAddDuplicateTagIsIdempotent(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := tag.NewStore(db.DB)
	imgID := testutil.SeedImage(t, db)

	store.AddTag(imgID, "pose", "front-facing", "manual", nil)
	store.AddTag(imgID, "pose", "front-facing", "manual", nil)

	tags, _ := store.GetImageTags(imgID)
	if len(tags) != 1 {
		t.Errorf("got %d tags, want 1 (duplicate should be ignored)", len(tags))
	}
}

func TestRemoveTag(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := tag.NewStore(db.DB)
	imgID := testutil.SeedImage(t, db)

	store.AddTag(imgID, "pose", "front-facing", "manual", nil)
	store.RemoveTag(imgID, "pose", "front-facing")

	tags, _ := store.GetImageTags(imgID)
	if len(tags) != 0 {
		t.Errorf("got %d tags, want 0", len(tags))
	}
}

func TestListTagsByFamily(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := tag.NewStore(db.DB)
	img1 := testutil.SeedImage(t, db)
	img2 := testutil.SeedImage(t, db)

	charFamily := "fam_character"
	nsfwFamily := "fam_nsfw"
	store.AddTag(img1, "pose", "front-facing", "manual", &charFamily)
	store.AddTag(img2, "pose", "front-facing", "manual", &charFamily)
	store.AddTag(img1, "body-area", "face", "manual", &nsfwFamily)

	// Filter by character family
	charTags, err := store.ListTags(&charFamily)
	if err != nil {
		t.Fatalf("list tags: %v", err)
	}
	if len(charTags) != 1 {
		t.Fatalf("got %d character tags, want 1", len(charTags))
	}
	if charTags[0].Count != 2 {
		t.Errorf("count = %d, want 2", charTags[0].Count)
	}

	// Filter by nsfw family
	nsfwTags, _ := store.ListTags(&nsfwFamily)
	if len(nsfwTags) != 1 {
		t.Fatalf("got %d nsfw tags, want 1", len(nsfwTags))
	}
}

func TestBulkTagAdd(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := tag.NewStore(db.DB)
	img1 := testutil.SeedImage(t, db)
	img2 := testutil.SeedImage(t, db)
	img3 := testutil.SeedImage(t, db)

	affected, err := store.BulkTag(&tag.BulkTagRequest{
		ImageIDs:     []string{img1, img2, img3},
		TagNamespace: "quality",
		TagValue:     "high",
		Action:       "add",
	})
	if err != nil {
		t.Fatalf("bulk tag: %v", err)
	}
	if affected != 3 {
		t.Errorf("affected = %d, want 3", affected)
	}

	// Verify each image has the tag
	for _, imgID := range []string{img1, img2, img3} {
		tags, _ := store.GetImageTags(imgID)
		if len(tags) != 1 {
			t.Errorf("image %s has %d tags, want 1", imgID, len(tags))
		}
	}
}

func TestBulkTagRemove(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := tag.NewStore(db.DB)
	img1 := testutil.SeedImage(t, db)
	img2 := testutil.SeedImage(t, db)

	store.AddTag(img1, "quality", "high", "manual", nil)
	store.AddTag(img2, "quality", "high", "manual", nil)

	store.BulkTag(&tag.BulkTagRequest{
		ImageIDs:     []string{img1, img2},
		TagNamespace: "quality",
		TagValue:     "high",
		Action:       "remove",
	})

	tags1, _ := store.GetImageTags(img1)
	tags2, _ := store.GetImageTags(img2)
	if len(tags1) != 0 || len(tags2) != 0 {
		t.Error("tags should be removed after bulk remove")
	}
}

func TestRenameTag(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := tag.NewStore(db.DB)
	imgID := testutil.SeedImage(t, db)

	store.AddTag(imgID, "expression", "smiling", "manual", nil)
	affected, err := store.RenameTag("expression", "smiling", "smile")
	if err != nil {
		t.Fatalf("rename: %v", err)
	}
	if affected != 1 {
		t.Errorf("affected = %d, want 1", affected)
	}

	tags, _ := store.GetImageTags(imgID)
	if len(tags) != 1 || tags[0].TagValue != "smile" {
		t.Errorf("expected tag value 'smile', got %v", tags)
	}
}

func TestDeleteTag(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := tag.NewStore(db.DB)
	img1 := testutil.SeedImage(t, db)
	img2 := testutil.SeedImage(t, db)

	store.AddTag(img1, "style", "3d", "manual", nil)
	store.AddTag(img2, "style", "3d", "manual", nil)

	affected, err := store.DeleteTag("style", "3d")
	if err != nil {
		t.Fatalf("delete: %v", err)
	}
	if affected != 2 {
		t.Errorf("affected = %d, want 2", affected)
	}

	tags1, _ := store.GetImageTags(img1)
	tags2, _ := store.GetImageTags(img2)
	if len(tags1) != 0 || len(tags2) != 0 {
		t.Error("tags should be deleted")
	}
}
