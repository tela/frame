package template_test

import (
	"testing"
	"time"

	"github.com/tela/frame/internal/testutil"
	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/template"
)

func TestCreateAndGetTemplate(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := template.NewStore(db.DB)

	now := time.Now().UTC()
	tmpl := &template.Template{
		ID: id.New(), Name: "Cinematic Close-up",
		PromptBody:     "35mm cinematic close-up of [SUBJECT], dramatic lighting",
		NegativePrompt: "blurry, low quality",
		StylePrompt:    "photorealistic, 8k",
		Parameters:     `{"steps":30,"cfg":7.5}`,
		FacetTags:      `["pose:close-up","style:cinematic"]`,
		CreatedAt:      now, UpdatedAt: now,
	}
	if err := store.Create(tmpl); err != nil {
		t.Fatalf("create: %v", err)
	}

	got, err := store.Get(tmpl.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got == nil {
		t.Fatal("expected template, got nil")
	}
	if got.Name != "Cinematic Close-up" {
		t.Errorf("name = %q, want %q", got.Name, "Cinematic Close-up")
	}
	if got.PromptBody != tmpl.PromptBody {
		t.Errorf("prompt_body mismatch")
	}
}

func TestListTemplates(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := template.NewStore(db.DB)

	now := time.Now().UTC()
	for _, name := range []string{"Template A", "Template B", "Template C"} {
		store.Create(&template.Template{
			ID: id.New(), Name: name, Parameters: "{}", FacetTags: "[]",
			CreatedAt: now, UpdatedAt: now,
		})
	}

	templates, err := store.List()
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(templates) != 3 {
		t.Errorf("got %d templates, want 3", len(templates))
	}
}

func TestUpdateTemplate(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := template.NewStore(db.DB)

	now := time.Now().UTC()
	tmpl := &template.Template{
		ID: id.New(), Name: "Original", Parameters: "{}", FacetTags: "[]",
		CreatedAt: now, UpdatedAt: now,
	}
	store.Create(tmpl)

	tmpl.Name = "Updated"
	tmpl.PromptBody = "new prompt"
	store.Update(tmpl)

	got, _ := store.Get(tmpl.ID)
	if got.Name != "Updated" {
		t.Errorf("name = %q, want %q", got.Name, "Updated")
	}
	if got.PromptBody != "new prompt" {
		t.Errorf("prompt_body = %q, want %q", got.PromptBody, "new prompt")
	}
}

func TestDeleteTemplate(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := template.NewStore(db.DB)

	now := time.Now().UTC()
	tmplID := id.New()
	store.Create(&template.Template{
		ID: tmplID, Name: "Doomed", Parameters: "{}", FacetTags: "[]",
		CreatedAt: now, UpdatedAt: now,
	})

	store.Delete(tmplID)
	got, _ := store.Get(tmplID)
	if got != nil {
		t.Error("expected nil after delete")
	}
}

func TestDuplicateTemplate(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := template.NewStore(db.DB)

	now := time.Now().UTC()
	srcID := id.New()
	store.Create(&template.Template{
		ID: srcID, Name: "Original", PromptBody: "source prompt",
		Parameters: `{"steps":50}`, FacetTags: `["style:noir"]`,
		CreatedAt: now, UpdatedAt: now,
	})

	dup, err := store.Duplicate(srcID, id.New(), "Copy of Original")
	if err != nil {
		t.Fatalf("duplicate: %v", err)
	}
	if dup.Name != "Copy of Original" {
		t.Errorf("name = %q", dup.Name)
	}
	if dup.PromptBody != "source prompt" {
		t.Errorf("prompt_body should be copied")
	}
	if dup.ID == srcID {
		t.Error("duplicate should have different ID")
	}
}

func TestIncrementUsage(t *testing.T) {
	db := testutil.NewTestDB(t)
	store := template.NewStore(db.DB)

	now := time.Now().UTC()
	tmplID := id.New()
	store.Create(&template.Template{
		ID: tmplID, Name: "Popular", Parameters: "{}", FacetTags: "[]",
		CreatedAt: now, UpdatedAt: now,
	})

	store.IncrementUsage(tmplID)
	store.IncrementUsage(tmplID)
	store.IncrementUsage(tmplID)

	got, _ := store.Get(tmplID)
	if got.UsageCount != 3 {
		t.Errorf("usage_count = %d, want 3", got.UsageCount)
	}
}
