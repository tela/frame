package garment

import (
	"testing"

	"github.com/tela/frame/pkg/database"
	"github.com/tela/frame/pkg/id"
)

func testStore(t *testing.T) *Store {
	t.Helper()
	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return NewStore(db.DB)
}

func testGarment() *Garment {
	return &Garment{
		ID:             id.New(),
		Name:           "Midnight Silk Slip Dress",
		Description:    "A floor-length bias-cut slip dress",
		Category:       "dress",
		OccasionEnergy: "formal",
		Era:            "contemporary",
		AestheticCluster: "minimalist",
		DominantSignal: "elegance",
		RecessiveSignal: "vulnerability",
		Material:       "silk",
		Color:          "midnight navy",
		Tags:           []string{"evening", "editorial"},
		Source:         "manual",
		Status:         "ingested",
	}
}

func TestCreateAndGet(t *testing.T) {
	s := testStore(t)
	g := testGarment()

	if err := s.Create(g); err != nil {
		t.Fatalf("Create: %v", err)
	}

	got, err := s.Get(g.ID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got == nil {
		t.Fatal("expected garment, got nil")
	}
	if got.Name != "Midnight Silk Slip Dress" {
		t.Errorf("Name = %q", got.Name)
	}
	if got.Category != "dress" {
		t.Errorf("Category = %q", got.Category)
	}
	if len(got.Tags) != 2 || got.Tags[0] != "evening" {
		t.Errorf("Tags = %v", got.Tags)
	}
}

func TestGetNotFound(t *testing.T) {
	s := testStore(t)
	got, err := s.Get("nonexistent")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got != nil {
		t.Error("expected nil for nonexistent garment")
	}
}

func TestUpdate(t *testing.T) {
	s := testStore(t)
	g := testGarment()
	s.Create(g)

	g.Name = "Updated Name"
	g.Category = "lingerie"
	if err := s.Update(g); err != nil {
		t.Fatalf("Update: %v", err)
	}

	got, _ := s.Get(g.ID)
	if got.Name != "Updated Name" {
		t.Errorf("Name = %q", got.Name)
	}
	if got.Category != "lingerie" {
		t.Errorf("Category = %q", got.Category)
	}
}

func TestDelete(t *testing.T) {
	s := testStore(t)
	g := testGarment()
	s.Create(g)

	if err := s.Delete(g.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	got, _ := s.Get(g.ID)
	if got != nil {
		t.Error("expected nil after delete")
	}
}

func TestListWithStatusFilter(t *testing.T) {
	s := testStore(t)

	g1 := testGarment()
	g1.Status = "available"
	s.Create(g1)

	g2 := testGarment()
	g2.Status = "ingested"
	s.Create(g2)

	// Default filter is "available"
	list, err := s.List(ListQuery{})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 available garment, got %d", len(list))
	}

	// "all" status returns both
	list, err = s.List(ListQuery{Status: "all"})
	if err != nil {
		t.Fatalf("List all: %v", err)
	}
	if len(list) != 2 {
		t.Fatalf("expected 2 garments, got %d", len(list))
	}
}

func TestListWithCategoryFilter(t *testing.T) {
	s := testStore(t)

	g1 := testGarment()
	g1.Category = "dress"
	g1.Status = "available"
	s.Create(g1)

	g2 := testGarment()
	g2.Category = "top"
	g2.Status = "available"
	s.Create(g2)

	list, _ := s.List(ListQuery{Category: "dress"})
	if len(list) != 1 {
		t.Fatalf("expected 1 dress, got %d", len(list))
	}
	if list[0].Category != "dress" {
		t.Errorf("Category = %q", list[0].Category)
	}
}

func TestListFTSSearch(t *testing.T) {
	s := testStore(t)

	g1 := testGarment()
	g1.Name = "Red Cotton Sundress"
	g1.Status = "available"
	s.Create(g1)

	g2 := testGarment()
	g2.Name = "Black Leather Jacket"
	g2.Material = "leather"
	g2.Status = "available"
	s.Create(g2)

	list, err := s.List(ListQuery{Q: "leather"})
	if err != nil {
		t.Fatalf("List FTS: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 match for 'leather', got %d", len(list))
	}
	if list[0].Name != "Black Leather Jacket" {
		t.Errorf("Name = %q", list[0].Name)
	}
}

func TestFacets(t *testing.T) {
	s := testStore(t)

	for _, cat := range []string{"dress", "dress", "top"} {
		g := testGarment()
		g.Category = cat
		g.Status = "available"
		s.Create(g)
	}

	facets, err := s.Facets(ListQuery{Status: "available"})
	if err != nil {
		t.Fatalf("Facets: %v", err)
	}

	if facets.Category["dress"] != 2 {
		t.Errorf("dress count = %d, want 2", facets.Category["dress"])
	}
	if facets.Category["top"] != 1 {
		t.Errorf("top count = %d, want 1", facets.Category["top"])
	}
}

func TestAffinity(t *testing.T) {
	s := testStore(t)

	// Need a character in the DB for FK
	db := s.db
	charID := id.New()
	db.Exec(`INSERT INTO characters (id, name, display_name, status) VALUES (?, 'Test', 'Test', 'cast')`, charID)

	g := testGarment()
	s.Create(g)

	// Add affinity
	if err := s.AddAffinity(g.ID, charID); err != nil {
		t.Fatalf("AddAffinity: %v", err)
	}

	// List affinity
	ids, err := s.ListAffinity(g.ID)
	if err != nil {
		t.Fatalf("ListAffinity: %v", err)
	}
	if len(ids) != 1 || ids[0] != charID {
		t.Errorf("affinity = %v", ids)
	}

	// Idempotent add
	if err := s.AddAffinity(g.ID, charID); err != nil {
		t.Fatalf("AddAffinity idempotent: %v", err)
	}

	// Remove affinity
	if err := s.RemoveAffinity(g.ID, charID); err != nil {
		t.Fatalf("RemoveAffinity: %v", err)
	}
	ids, _ = s.ListAffinity(g.ID)
	if len(ids) != 0 {
		t.Error("expected empty affinity after remove")
	}
}

func TestListByCharacterAffinity(t *testing.T) {
	s := testStore(t)
	db := s.db

	charID := id.New()
	db.Exec(`INSERT INTO characters (id, name, display_name, status) VALUES (?, 'Test', 'Test', 'cast')`, charID)

	g1 := testGarment()
	g1.Status = "available"
	s.Create(g1)
	s.AddAffinity(g1.ID, charID)

	g2 := testGarment()
	g2.Status = "available"
	s.Create(g2)
	// g2 has no affinity

	list, err := s.List(ListQuery{CharacterID: charID})
	if err != nil {
		t.Fatalf("List by character: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 garment with affinity, got %d", len(list))
	}
	if list[0].ID != g1.ID {
		t.Errorf("wrong garment returned")
	}
}

func TestImages(t *testing.T) {
	s := testStore(t)
	g := testGarment()
	s.Create(g)

	// Need an image in the DB for FK
	imgID := id.New()
	s.db.Exec(`INSERT INTO images (id, hash, source) VALUES (?, 'abc', 'manual')`, imgID)

	if err := s.AddImage(g.ID, imgID, 0); err != nil {
		t.Fatalf("AddImage: %v", err)
	}

	images, err := s.ListImages(g.ID)
	if err != nil {
		t.Fatalf("ListImages: %v", err)
	}
	if len(images) != 1 {
		t.Fatalf("expected 1 image, got %d", len(images))
	}
	if images[0].ImageID != imgID {
		t.Errorf("ImageID = %q", images[0].ImageID)
	}

	if err := s.SetPrimaryImage(g.ID, imgID); err != nil {
		t.Fatalf("SetPrimaryImage: %v", err)
	}
	got, _ := s.Get(g.ID)
	if got.PrimaryImageID == nil || *got.PrimaryImageID != imgID {
		t.Error("primary image not set")
	}
}

func TestBulkUpdateStatus(t *testing.T) {
	s := testStore(t)

	var ids []string
	for i := 0; i < 3; i++ {
		g := testGarment()
		g.Status = "ingested"
		s.Create(g)
		ids = append(ids, g.ID)
	}

	if err := s.BulkUpdateStatus(ids, "available"); err != nil {
		t.Fatalf("BulkUpdateStatus: %v", err)
	}

	for _, gid := range ids {
		got, _ := s.Get(gid)
		if got.Status != "available" {
			t.Errorf("garment %s status = %q, want available", gid, got.Status)
		}
	}
}

func TestUpdateStatus(t *testing.T) {
	s := testStore(t)
	g := testGarment()
	s.Create(g)

	if err := s.UpdateStatus(g.ID, "available"); err != nil {
		t.Fatalf("UpdateStatus: %v", err)
	}

	got, _ := s.Get(g.ID)
	if got.Status != "available" {
		t.Errorf("Status = %q, want available", got.Status)
	}
}
