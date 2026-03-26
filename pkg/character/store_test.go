package character_test

import (
	"testing"
	"time"

	"github.com/tela/frame/internal/testutil"
	"github.com/tela/frame/pkg/character"
	"github.com/tela/frame/pkg/id"
)

func TestSlug(t *testing.T) {
	tests := []struct {
		name        string
		displayName string
		id          string
		want        string
	}{
		{"Esme Thornton", "Esme", "a7f3b2c1d9e04f6a", "esme-a7f3b2c"},
		{"Dr. John Montague", "Montague", "d4e5f67890123456", "montague-d4e5f67"},
		{"Sarah Mitchell", "", "abc1234567890def", "sarah-mitchell-abc1234"},
		{"Mrs. O'Brien-Smith", "Mrs. O'B", "1234567890abcdef", "mrs-o-b-1234567"},
	}
	for _, tt := range tests {
		c := &character.Character{ID: tt.id, Name: tt.name, DisplayName: tt.displayName}
		got := c.Slug()
		if got != tt.want {
			t.Errorf("Slug(%q, %q) = %q, want %q", tt.name, tt.displayName, got, tt.want)
		}
	}
}

func TestCreateSetsFolderName(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := character.NewStore(db.DB)

	now := time.Now().UTC()
	c := &character.Character{
		ID: "a7f3b2c1d9e04f6a", Name: "Esme Thornton", DisplayName: "Esme",
		Status: character.StatusCast, CreatedAt: now, UpdatedAt: now,
	}
	store.Create(c)

	got, _ := store.Get(c.ID)
	if got.FolderName == "" {
		t.Error("folder_name should be set automatically")
	}
	if got.FolderName != "esme-a7f3b2c" {
		t.Errorf("folder_name = %q, want %q", got.FolderName, "esme-a7f3b2c")
	}
}

func TestCreateAndGetCharacter(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := character.NewStore(db.DB)

	now := time.Now().UTC()
	c := &character.Character{
		ID:          id.New(),
		Name:        "Sarah Mitchell",
		DisplayName: "Sarah",
		Status:      character.StatusProspect,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := store.Create(c); err != nil {
		t.Fatalf("create: %v", err)
	}

	got, err := store.Get(c.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got == nil {
		t.Fatal("expected character, got nil")
	}
	if got.Name != "Sarah Mitchell" {
		t.Errorf("name = %q, want %q", got.Name, "Sarah Mitchell")
	}
	if got.DisplayName != "Sarah" {
		t.Errorf("display_name = %q, want %q", got.DisplayName, "Sarah")
	}
	if got.Status != character.StatusProspect {
		t.Errorf("status = %q, want %q", got.Status, character.StatusProspect)
	}
}

func TestGetNonexistentCharacter(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := character.NewStore(db.DB)

	got, err := store.Get("nonexistent")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got != nil {
		t.Errorf("expected nil, got %+v", got)
	}
}

func TestListCharacters(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := character.NewStore(db.DB)

	now := time.Now().UTC()
	for _, name := range []string{"Alpha", "Beta", "Gamma"} {
		store.Create(&character.Character{
			ID: id.New(), Name: name, DisplayName: name,
			Status: character.StatusCast, CreatedAt: now, UpdatedAt: now,
		})
	}

	chars, err := store.List()
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(chars) != 3 {
		t.Errorf("got %d characters, want 3", len(chars))
	}
}

func TestUpdateStatus(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := character.NewStore(db.DB)

	now := time.Now().UTC()
	c := &character.Character{
		ID: id.New(), Name: "Test", DisplayName: "T",
		Status: character.StatusProspect, CreatedAt: now, UpdatedAt: now,
	}
	store.Create(c)

	if err := store.UpdateStatus(c.ID, character.StatusCast); err != nil {
		t.Fatalf("update status: %v", err)
	}

	got, _ := store.Get(c.ID)
	if got.Status != character.StatusCast {
		t.Errorf("status = %q, want %q", got.Status, character.StatusCast)
	}
}

func TestUpdateStatusNonexistent(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := character.NewStore(db.DB)

	err := store.UpdateStatus("nonexistent", character.StatusCast)
	if err == nil {
		t.Error("expected error for nonexistent character")
	}
}

func TestUpdateNameAndDisplayName(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := character.NewStore(db.DB)

	now := time.Now().UTC()
	c := &character.Character{
		ID: id.New(), Name: "Old Name", DisplayName: "Old",
		Status: character.StatusProspect, CreatedAt: now, UpdatedAt: now,
	}
	store.Create(c)

	if err := store.Update(c.ID, "New Name", "New"); err != nil {
		t.Fatalf("update: %v", err)
	}

	got, _ := store.Get(c.ID)
	if got.Name != "New Name" {
		t.Errorf("name = %q, want %q", got.Name, "New Name")
	}
	if got.DisplayName != "New" {
		t.Errorf("display_name = %q, want %q", got.DisplayName, "New")
	}
}

func TestCreateAndListEras(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := character.NewStore(db.DB)

	now := time.Now().UTC()
	charID := id.New()
	store.Create(&character.Character{
		ID: charID, Name: "Test", DisplayName: "T",
		Status: character.StatusCast, CreatedAt: now, UpdatedAt: now,
	})

	era1 := &character.Era{
		ID: id.New(), CharacterID: charID, Label: "Young Adult",
		VisualDescription: "early 20s", PipelineSettings: "{}",
		SortOrder: 1, CreatedAt: now, UpdatedAt: now,
	}
	era2 := &character.Era{
		ID: id.New(), CharacterID: charID, Label: "The Haunting",
		VisualDescription: "late 20s", PipelineSettings: "{}",
		SortOrder: 2, CreatedAt: now, UpdatedAt: now,
	}

	if err := store.CreateEra(era1); err != nil {
		t.Fatalf("create era 1: %v", err)
	}
	if err := store.CreateEra(era2); err != nil {
		t.Fatalf("create era 2: %v", err)
	}

	eras, err := store.ListEras(charID)
	if err != nil {
		t.Fatalf("list eras: %v", err)
	}
	if len(eras) != 2 {
		t.Fatalf("got %d eras, want 2", len(eras))
	}
	if eras[0].Label != "Young Adult" {
		t.Errorf("first era = %q, want %q", eras[0].Label, "Young Adult")
	}
	if eras[1].Label != "The Haunting" {
		t.Errorf("second era = %q, want %q", eras[1].Label, "The Haunting")
	}
}

func TestGetEra(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := character.NewStore(db.DB)

	now := time.Now().UTC()
	charID := id.New()
	store.Create(&character.Character{
		ID: charID, Name: "Test", DisplayName: "T",
		Status: character.StatusCast, CreatedAt: now, UpdatedAt: now,
	})

	eraID := id.New()
	store.CreateEra(&character.Era{
		ID: eraID, CharacterID: charID, Label: "Era One",
		PipelineSettings: "{}", SortOrder: 1, CreatedAt: now, UpdatedAt: now,
	})

	got, err := store.GetEra(eraID)
	if err != nil {
		t.Fatalf("get era: %v", err)
	}
	if got == nil {
		t.Fatal("expected era, got nil")
	}
	if got.Label != "Era One" {
		t.Errorf("label = %q, want %q", got.Label, "Era One")
	}
	if got.CharacterID != charID {
		t.Errorf("character_id = %q, want %q", got.CharacterID, charID)
	}
}

func TestListErasWithStats(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := character.NewStore(db.DB)

	now := time.Now().UTC()
	charID := id.New()
	store.Create(&character.Character{
		ID: charID, Name: "Test", DisplayName: "T",
		Status: character.StatusCast, CreatedAt: now, UpdatedAt: now,
	})
	eraID := id.New()
	store.CreateEra(&character.Era{
		ID: eraID, CharacterID: charID, Label: "Test Era",
		PipelineSettings: "{}", SortOrder: 1, CreatedAt: now, UpdatedAt: now,
	})

	eras, err := store.ListErasWithStats(charID)
	if err != nil {
		t.Fatalf("list eras with stats: %v", err)
	}
	if len(eras) != 1 {
		t.Fatalf("got %d eras, want 1", len(eras))
	}
	if eras[0].ImageCount != 0 {
		t.Errorf("image_count = %d, want 0", eras[0].ImageCount)
	}
	if eras[0].ReferencePackageReady {
		t.Error("reference_package_ready should be false with no images")
	}
}
