package hairstyle

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

func testHairstyle() *Hairstyle {
	return &Hairstyle{
		ID:          id.New(),
		Name:        "Victory Rolls",
		Description: "Classic 1940s pin-up hairstyle",
		Length:      "medium",
		Texture:     "wavy",
		Style:       "structured",
		Color:       "honey blonde",
		Tags:        []string{"vintage", "pin-up"},
		Source:      "manual",
		Status:      "ingested",
	}
}

func TestCreateAndGet(t *testing.T) {
	s := testStore(t)
	h := testHairstyle()
	if err := s.Create(h); err != nil {
		t.Fatalf("Create: %v", err)
	}
	got, err := s.Get(h.ID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got == nil {
		t.Fatal("expected hairstyle, got nil")
	}
	if got.Name != "Victory Rolls" {
		t.Errorf("Name = %q", got.Name)
	}
	if got.Length != "medium" {
		t.Errorf("Length = %q", got.Length)
	}
	if got.Texture != "wavy" {
		t.Errorf("Texture = %q", got.Texture)
	}
	if len(got.Tags) != 2 {
		t.Errorf("Tags = %v", got.Tags)
	}
}

func TestGetNotFound(t *testing.T) {
	s := testStore(t)
	got, _ := s.Get("nonexistent")
	if got != nil {
		t.Error("expected nil")
	}
}

func TestUpdate(t *testing.T) {
	s := testStore(t)
	h := testHairstyle()
	s.Create(h)
	h.Name = "Updated Rolls"
	h.Length = "long"
	if err := s.Update(h); err != nil {
		t.Fatalf("Update: %v", err)
	}
	got, _ := s.Get(h.ID)
	if got.Name != "Updated Rolls" || got.Length != "long" {
		t.Errorf("update didn't persist")
	}
}

func TestDelete(t *testing.T) {
	s := testStore(t)
	h := testHairstyle()
	s.Create(h)
	s.Delete(h.ID)
	got, _ := s.Get(h.ID)
	if got != nil {
		t.Error("expected nil after delete")
	}
}

func TestListWithFilters(t *testing.T) {
	s := testStore(t)
	h1 := testHairstyle()
	h1.Status = "available"
	h1.Length = "medium"
	s.Create(h1)

	h2 := testHairstyle()
	h2.Status = "available"
	h2.Length = "long"
	s.Create(h2)

	// Filter by length
	list, _ := s.List(ListQuery{Length: "medium"})
	if len(list) != 1 {
		t.Fatalf("expected 1, got %d", len(list))
	}

	// All available
	list, _ = s.List(ListQuery{})
	if len(list) != 2 {
		t.Fatalf("expected 2, got %d", len(list))
	}
}

func TestFTSSearch(t *testing.T) {
	s := testStore(t)
	h1 := testHairstyle()
	h1.Name = "Loose Beach Waves"
	h1.Status = "available"
	s.Create(h1)

	h2 := testHairstyle()
	h2.Name = "Tight Braided Crown"
	h2.Status = "available"
	s.Create(h2)

	list, err := s.List(ListQuery{Q: "beach"})
	if err != nil {
		t.Fatalf("FTS: %v", err)
	}
	if len(list) != 1 || list[0].Name != "Loose Beach Waves" {
		t.Errorf("FTS result = %v", list)
	}
}

func TestFacets(t *testing.T) {
	s := testStore(t)
	for _, tex := range []string{"wavy", "wavy", "curly"} {
		h := testHairstyle()
		h.Texture = tex
		h.Status = "available"
		s.Create(h)
	}
	facets, _ := s.Facets(ListQuery{Status: "available"})
	if facets.Texture["wavy"] != 2 {
		t.Errorf("wavy = %d", facets.Texture["wavy"])
	}
	if facets.Texture["curly"] != 1 {
		t.Errorf("curly = %d", facets.Texture["curly"])
	}
}

func TestAffinity(t *testing.T) {
	s := testStore(t)
	charID := id.New()
	s.db.Exec(`INSERT INTO characters (id, name, display_name, status) VALUES (?, 'Test', 'Test', 'cast')`, charID)

	h := testHairstyle()
	s.Create(h)
	s.AddAffinity(h.ID, charID)

	ids, _ := s.ListAffinity(h.ID)
	if len(ids) != 1 || ids[0] != charID {
		t.Errorf("affinity = %v", ids)
	}

	s.RemoveAffinity(h.ID, charID)
	ids, _ = s.ListAffinity(h.ID)
	if len(ids) != 0 {
		t.Error("expected empty after remove")
	}
}

func TestImages(t *testing.T) {
	s := testStore(t)
	h := testHairstyle()
	s.Create(h)
	imgID := id.New()
	s.db.Exec(`INSERT INTO images (id, hash, source) VALUES (?, 'abc', 'manual')`, imgID)

	s.AddImage(h.ID, imgID, 0)
	images, _ := s.ListImages(h.ID)
	if len(images) != 1 || images[0].ImageID != imgID {
		t.Errorf("images = %v", images)
	}

	s.SetPrimaryImage(h.ID, imgID)
	got, _ := s.Get(h.ID)
	if got.PrimaryImageID == nil || *got.PrimaryImageID != imgID {
		t.Error("primary image not set")
	}
}

func TestBulkUpdateStatus(t *testing.T) {
	s := testStore(t)
	var ids []string
	for i := 0; i < 3; i++ {
		h := testHairstyle()
		s.Create(h)
		ids = append(ids, h.ID)
	}
	s.BulkUpdateStatus(ids, "available")
	for _, hid := range ids {
		got, _ := s.Get(hid)
		if got.Status != "available" {
			t.Errorf("status = %q", got.Status)
		}
	}
}
