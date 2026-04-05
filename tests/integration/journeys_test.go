package integration_test

import (
	"fmt"
	"testing"
)

// Journey 1: Scout a New Character from Images
func TestJourney_ScoutCharacter(t *testing.T) {
	s := newTestServer(t)

	// Create prospect character
	charID := s.createCharacter("Celeste Noir", "Celeste", "prospect")
	if charID == "" {
		t.Fatal("expected character ID")
	}

	// Verify character exists with correct status
	code, body := s.get(fmt.Sprintf("/api/v1/characters/%s", charID))
	if code != 200 {
		t.Fatalf("get character: %d", code)
	}
	var char struct {
		Status string `json:"status"`
		Source string `json:"source"`
	}
	s.decode(body, &char)
	if char.Status != "prospect" {
		t.Errorf("status = %q, want prospect", char.Status)
	}
	if char.Source != "frame" {
		t.Errorf("source = %q, want frame", char.Source)
	}

	// Upload 5 images
	imageIDs := make([]string, 5)
	for i := 0; i < 5; i++ {
		imageIDs[i] = s.ingestImage(charID, byte(i*50))
	}

	// Verify images exist
	code, body = s.get(fmt.Sprintf("/api/v1/characters/%s/images", charID))
	if code != 200 {
		t.Fatalf("list images: %d", code)
	}
	var images []struct{ ImageID string `json:"image_id"` }
	s.decode(body, &images)
	if len(images) != 5 {
		t.Errorf("images = %d, want 5", len(images))
	}

	// Favorite 3 images
	for i := 0; i < 3; i++ {
		code, _ = s.postJSON(
			fmt.Sprintf("/api/v1/characters/%s/images/%s/favorite", charID, imageIDs[i]),
			map[string]bool{"favorited": true},
		)
		if code != 200 {
			t.Fatalf("favorite: %d", code)
		}
	}

	// Verify favorites
	code, body = s.get(fmt.Sprintf("/api/v1/characters/%s/favorites", charID))
	if code != 200 {
		t.Fatalf("list favorites: %d", code)
	}
	var favs []struct{ ImageID string `json:"image_id"` }
	s.decode(body, &favs)
	if len(favs) != 3 {
		t.Errorf("favorites = %d, want 3", len(favs))
	}

	// Character appears in list
	code, body = s.get("/api/v1/characters")
	if code != 200 {
		t.Fatalf("list characters: %d", code)
	}
	var chars []struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	s.decode(body, &chars)
	found := false
	for _, c := range chars {
		if c.ID == charID && c.Status == "prospect" {
			found = true
		}
	}
	if !found {
		t.Error("prospect character not found in list")
	}
}

// Journey 3: Import Existing Images for a Character
func TestJourney_ImportForCharacter(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Eleanor Vance", "Eleanor", "cast")
	eraID := s.createEra(charID, "Young Adult")

	// Create test images on disk
	imgDir := s.writeTestImages(10)

	// Import directory
	code, body := s.postJSON("/api/v1/import/directory", map[string]any{
		"path":         imgDir,
		"character_id": charID,
		"era_id":       eraID,
		"source":       "comfyui",
		"tags":         []string{"pose:portrait", "quality:high"},
	})
	if code != 200 {
		t.Fatalf("import: %d, body: %s", code, body)
	}
	var result struct {
		Imported int `json:"imported"`
		Skipped  int `json:"skipped"`
		Failed   int `json:"failed"`
		Total    int `json:"total"`
	}
	s.decode(body, &result)
	if result.Imported != 10 {
		t.Errorf("imported = %d, want 10", result.Imported)
	}
	if result.Total != 10 {
		t.Errorf("total = %d, want 10", result.Total)
	}

	// Re-import same directory (dedup)
	code, body = s.postJSON("/api/v1/import/directory", map[string]any{
		"path":         imgDir,
		"character_id": charID,
		"source":       "comfyui",
	})
	s.decode(body, &result)
	if result.Skipped != 10 {
		t.Errorf("skipped on re-import = %d, want 10", result.Skipped)
	}

	// Verify images in era
	code, body = s.get(fmt.Sprintf("/api/v1/characters/%s/images?era_id=%s", charID, eraID))
	var imgs []struct{ ImageID string `json:"image_id"` }
	s.decode(body, &imgs)
	if len(imgs) != 10 {
		t.Errorf("era images = %d, want 10", len(imgs))
	}
}

// Journey 4: Import Reference Images (No Character)
func TestJourney_ImportReferences(t *testing.T) {
	s := newTestServer(t)

	imgDir := s.writeTestImages(5)

	code, body := s.postJSON("/api/v1/import/directory", map[string]any{
		"path":   imgDir,
		"source": "manual",
		"tags":   []string{"body-area:torso", "quality:high"},
	})
	if code != 200 {
		t.Fatalf("import: %d, body: %s", code, body)
	}
	var result struct{ Imported int `json:"imported"` }
	s.decode(body, &result)
	if result.Imported != 5 {
		t.Errorf("imported = %d, want 5", result.Imported)
	}

	// Searchable as standalone
	code, body = s.get("/api/v1/images/search?limit=50")
	var search struct {
		Total  int `json:"total"`
		Images []struct {
			CharacterID *string `json:"character_id"`
		} `json:"images"`
	}
	s.decode(body, &search)
	if search.Total < 5 {
		t.Errorf("search total = %d, want >= 5", search.Total)
	}
}

// Journey 5: Triage Incoming Images
func TestJourney_Triage(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Eleanor", "Eleanor", "cast")
	_ = s.createEra(charID, "The Haunting")

	// Ingest 6 images (all start as pending)
	imageIDs := make([]string, 6)
	for i := 0; i < 6; i++ {
		imageIDs[i] = s.ingestImage(charID, byte(100+i*20))
	}

	// Verify all pending
	_, body := s.get(fmt.Sprintf("/api/v1/characters/%s/images/pending", charID))
	var pending []struct{ ImageID string `json:"image_id"` }
	s.decode(body, &pending)
	if len(pending) != 6 {
		t.Fatalf("pending = %d, want 6 (got body: %s)", len(pending), string(body))
	}

	// Accept 3
	for i := 0; i < 3; i++ {
		s.patchJSON(
			fmt.Sprintf("/api/v1/characters/%s/images/%s", charID, imageIDs[i]),
			map[string]string{"triage_status": "approved"},
		)
	}
	// Reject 2
	for i := 3; i < 5; i++ {
		s.patchJSON(
			fmt.Sprintf("/api/v1/characters/%s/images/%s", charID, imageIDs[i]),
			map[string]string{"triage_status": "rejected"},
		)
	}
	// Archive 1
	s.patchJSON(
		fmt.Sprintf("/api/v1/characters/%s/images/%s", charID, imageIDs[5]),
		map[string]string{"triage_status": "archived"},
	)

	// Verify pending is now empty
	_, body = s.get(fmt.Sprintf("/api/v1/characters/%s/images/pending", charID))
	s.decode(body, &pending)
	if len(pending) != 0 {
		t.Errorf("pending after triage = %d, want 0", len(pending))
	}

	// Verify audit events exist
	_, body = s.get(fmt.Sprintf("/api/v1/audit?entity_type=image&entity_id=%s", imageIDs[0]))
	var auditResult struct{ Total int `json:"total"` }
	s.decode(body, &auditResult)
	if auditResult.Total < 1 {
		t.Errorf("audit events for image = %d, want >= 1", auditResult.Total)
	}
}

// Journey 6: Curate Images in an Era Workspace
func TestJourney_CurateEra(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Eleanor", "Eleanor", "cast")
	eraID := s.createEra(charID, "Young Adult")

	// Ingest 5 images
	imageIDs := make([]string, 5)
	for i := 0; i < 5; i++ {
		imageIDs[i] = s.ingestImage(charID, byte(i*40))
	}

	// Rate images
	for i, id := range imageIDs {
		s.patchJSON(
			fmt.Sprintf("/api/v1/characters/%s/images/%s", charID, id),
			map[string]any{"rating": i + 1},
		)
	}

	// Tag images via bulk tag
	s.postJSON("/api/v1/images/bulk-tag", map[string]any{
		"image_ids":     imageIDs[:3],
		"tag_namespace": "pose",
		"tag_value":     "front-facing",
		"family_id":     "fam_character",
		"action":        "add",
	})

	// Promote best to face ref (assign to era first)
	s.patchJSON(
		fmt.Sprintf("/api/v1/characters/%s/images/%s", charID, imageIDs[4]),
		map[string]any{"ref_type": "face", "ref_score": 95.0, "ref_rank": 1, "set_type": "reference", "era_id": eraID},
	)

	// Promote another to body ref
	s.patchJSON(
		fmt.Sprintf("/api/v1/characters/%s/images/%s", charID, imageIDs[3]),
		map[string]any{"ref_type": "body", "set_type": "reference", "era_id": eraID},
	)

	// Verify reference package
	code, body := s.get(fmt.Sprintf("/api/v1/characters/%s/eras/%s/reference-package", charID, eraID))
	if code != 200 {
		t.Fatalf("ref package: %d", code)
	}
	var refPkg struct {
		FaceRefs []struct{ ImageID string `json:"image_id"` } `json:"face_refs"`
		BodyRefs []struct{ ImageID string `json:"image_id"` } `json:"body_refs"`
	}
	s.decode(body, &refPkg)
	if len(refPkg.FaceRefs) != 1 {
		t.Errorf("face refs = %d, want 1", len(refPkg.FaceRefs))
	}
	if len(refPkg.BodyRefs) != 1 {
		t.Errorf("body refs = %d, want 1", len(refPkg.BodyRefs))
	}

	// Verify tags
	code, body = s.get(fmt.Sprintf("/api/v1/images/%s/tags", imageIDs[0]))
	var tags []struct {
		TagNamespace string `json:"tag_namespace"`
		TagValue     string `json:"tag_value"`
	}
	s.decode(body, &tags)
	if len(tags) < 1 {
		t.Error("expected at least 1 tag on image")
	}
}

// Journey 7: Search and Build a Dataset
func TestJourney_SearchAndDataset(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Eleanor", "Eleanor", "cast")

	// Ingest images
	imageIDs := make([]string, 8)
	for i := 0; i < 8; i++ {
		imageIDs[i] = s.ingestImage(charID, byte(i*30))
	}

	// Rate some highly
	for i := 0; i < 5; i++ {
		s.patchJSON(
			fmt.Sprintf("/api/v1/characters/%s/images/%s", charID, imageIDs[i]),
			map[string]any{"rating": 4},
		)
	}

	// Search by rating
	code, body := s.get(fmt.Sprintf("/api/v1/images/search?character=%s&rating_min=4", charID))
	var search struct {
		Total  int                      `json:"total"`
		Images []map[string]interface{} `json:"images"`
	}
	s.decode(body, &search)
	if search.Total != 5 {
		t.Errorf("search results = %d, want 5", search.Total)
	}

	// Create dataset
	code, body = s.postJSON("/api/v1/datasets", map[string]any{
		"name":         "Eleanor LoRA v1",
		"type":         "lora",
		"character_id": charID,
	})
	if code != 201 {
		t.Fatalf("create dataset: %d", code)
	}
	var ds struct{ ID string `json:"id"` }
	s.decode(body, &ds)

	// Add images to dataset
	code, _ = s.postJSON(fmt.Sprintf("/api/v1/datasets/%s/images", ds.ID), map[string]any{
		"image_ids": imageIDs[:5],
	})
	if code != 201 {
		t.Fatalf("add dataset images: %d", code)
	}

	// Verify dataset has images
	code, body = s.get(fmt.Sprintf("/api/v1/datasets/%s", ds.ID))
	var dsDetail struct {
		Dataset struct{ Name string `json:"name"` } `json:"dataset"`
		Images  []struct{ ImageID string `json:"image_id"` } `json:"images"`
	}
	s.decode(body, &dsDetail)
	if len(dsDetail.Images) != 5 {
		t.Errorf("dataset images = %d, want 5", len(dsDetail.Images))
	}

	// Fork dataset
	code, body = s.postJSON(fmt.Sprintf("/api/v1/datasets/%s/fork", ds.ID), map[string]string{
		"name": "Eleanor LoRA v2",
	})
	if code != 201 {
		t.Fatalf("fork: %d", code)
	}
	var forked struct{ ID string `json:"id"` }
	s.decode(body, &forked)
	if forked.ID == ds.ID {
		t.Error("fork should have different ID")
	}

	// Verify fork has same images
	code, body = s.get(fmt.Sprintf("/api/v1/datasets/%s", forked.ID))
	s.decode(body, &dsDetail)
	if len(dsDetail.Images) != 5 {
		t.Errorf("forked dataset images = %d, want 5", len(dsDetail.Images))
	}
}

// Journey 8: Tag Management and Taxonomy
func TestJourney_TagTaxonomy(t *testing.T) {
	s := newTestServer(t)

	// Verify seeded families exist
	code, body := s.get("/api/v1/tag-families")
	var families []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}
	s.decode(body, &families)
	if len(families) < 4 {
		t.Fatalf("families = %d, want >= 4", len(families))
	}

	// Get taxonomy for character identity
	code, body = s.get("/api/v1/tag-families/fam_character/taxonomy")
	if code != 200 {
		t.Fatalf("taxonomy: %d", code)
	}
	var taxonomy struct {
		Namespaces []struct {
			Name   string `json:"name"`
			Values []struct{ Value string `json:"value"` } `json:"values"`
		} `json:"namespaces"`
	}
	s.decode(body, &taxonomy)
	if len(taxonomy.Namespaces) < 5 {
		t.Errorf("namespaces = %d, want >= 5", len(taxonomy.Namespaces))
	}

	// Create new namespace in NSFW family
	code, body = s.postJSON("/api/v1/tag-families/fam_nsfw/namespaces", map[string]string{
		"name": "content-type", "description": "Type of content",
	})
	if code != 201 {
		t.Fatalf("create namespace: %d, body: %s", code, body)
	}
	var ns struct{ ID string `json:"id"` }
	s.decode(body, &ns)

	// Add value to new namespace
	code, body = s.postJSON(fmt.Sprintf("/api/v1/namespaces/%s/values", ns.ID), map[string]string{
		"value": "solo", "description": "Single subject",
	})
	if code != 201 {
		t.Fatalf("create value: %d", code)
	}

	// Validate tag
	code, body = s.get("/api/v1/tags/validate?family=fam_character&namespace=pose&value=front-facing")
	var valid struct{ Valid bool `json:"valid"` }
	s.decode(body, &valid)
	if !valid.Valid {
		t.Error("pose:front-facing should be valid")
	}

	// Validate invalid tag
	code, body = s.get("/api/v1/tags/validate?family=fam_character&namespace=pose&value=nonexistent")
	s.decode(body, &valid)
	if valid.Valid {
		t.Error("pose:nonexistent should be invalid")
	}

	// Create character, tag an image, then rename and merge
	charID := s.createCharacter("Test", "Test", "cast")
	imgID := s.ingestImage(charID, 100)

	// Add tag
	s.postJSON(fmt.Sprintf("/api/v1/images/%s/tags", imgID), map[string]any{
		"tag_namespace": "style", "tag_value": "noir", "family_id": "fam_character",
	})

	// Rename
	s.postJSON("/api/v1/tags/rename", map[string]string{
		"namespace": "style", "old_value": "noir", "new_value": "film-noir",
	})

	// Verify rename
	code, body = s.get(fmt.Sprintf("/api/v1/images/%s/tags", imgID))
	var imgTags []struct{ TagValue string `json:"tag_value"` }
	s.decode(body, &imgTags)
	found := false
	for _, t2 := range imgTags {
		if t2.TagValue == "film-noir" {
			found = true
		}
	}
	if !found {
		t.Error("renamed tag 'film-noir' not found")
	}

	// Delete tag
	s.postJSON("/api/v1/tags/delete", map[string]string{
		"namespace": "style", "value": "film-noir",
	})
	code, body = s.get(fmt.Sprintf("/api/v1/images/%s/tags", imgID))
	s.decode(body, &imgTags)
	if len(imgTags) != 0 {
		t.Errorf("tags after delete = %d, want 0", len(imgTags))
	}
}

// Journey 10: Create and Manage Prompt Templates
func TestJourney_PromptTemplates(t *testing.T) {
	s := newTestServer(t)

	// Create template
	code, body := s.postJSON("/api/v1/templates", map[string]string{
		"name":            "Dramatic Noir Portrait",
		"prompt_body":     "35mm noir portrait of [SUBJECT], dramatic shadows",
		"negative_prompt": "blurry, low quality",
	})
	if code != 201 {
		t.Fatalf("create: %d", code)
	}
	var tmpl struct{ ID string `json:"id"` }
	s.decode(body, &tmpl)

	// List templates
	code, body = s.get("/api/v1/templates")
	var templates []struct{ Name string `json:"name"` }
	s.decode(body, &templates)
	if len(templates) != 1 {
		t.Errorf("templates = %d, want 1", len(templates))
	}

	// Duplicate
	code, body = s.postJSON(fmt.Sprintf("/api/v1/templates/%s/duplicate", tmpl.ID), map[string]string{
		"name": "Dramatic Noir v2",
	})
	if code != 201 {
		t.Fatalf("duplicate: %d", code)
	}
	var dup struct{ ID string `json:"id"` }
	s.decode(body, &dup)
	if dup.ID == tmpl.ID {
		t.Error("duplicate should have different ID")
	}

	// Delete original
	code, _ = s.delete(fmt.Sprintf("/api/v1/templates/%s", tmpl.ID))
	if code != 200 {
		t.Fatalf("delete: %d", code)
	}

	// Verify only duplicate remains
	code, body = s.get("/api/v1/templates")
	s.decode(body, &templates)
	if len(templates) != 1 {
		t.Errorf("templates after delete = %d, want 1", len(templates))
	}
	if templates[0].Name != "Dramatic Noir v2" {
		t.Errorf("remaining template = %q, want Dramatic Noir v2", templates[0].Name)
	}
}

// Journey 11: Audit Trail
func TestJourney_AuditTrail(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Audited Character", "Audited", "cast")

	// Ingest image (should create audit event)
	imgID := s.ingestImage(charID, 42)

	// Rate it (audit event)
	s.patchJSON(
		fmt.Sprintf("/api/v1/characters/%s/images/%s", charID, imgID),
		map[string]any{"rating": 5},
	)

	// Change triage status (audit event)
	s.patchJSON(
		fmt.Sprintf("/api/v1/characters/%s/images/%s", charID, imgID),
		map[string]any{"triage_status": "approved"},
	)

	// Promote to face ref (audit event)
	s.patchJSON(
		fmt.Sprintf("/api/v1/characters/%s/images/%s", charID, imgID),
		map[string]any{"ref_type": "face"},
	)

	// Query audit for this image
	code, body := s.get(fmt.Sprintf("/api/v1/audit?entity_type=image&entity_id=%s", imgID))
	if code != 200 {
		t.Fatalf("audit query: %d", code)
	}
	var result struct {
		Total  int `json:"total"`
		Events []struct {
			Action string `json:"action"`
		} `json:"events"`
	}
	s.decode(body, &result)

	// Should have at least: rating_changed, triage_approved, face_ref_promoted
	if result.Total < 3 {
		t.Errorf("audit events = %d, want >= 3", result.Total)
	}

	// Verify specific actions exist
	actions := make(map[string]bool)
	for _, e := range result.Events {
		actions[e.Action] = true
	}
	for _, expected := range []string{"rating_changed", "triage_approved", "face_ref_promoted"} {
		if !actions[expected] {
			t.Errorf("missing audit action: %s", expected)
		}
	}

	// Query audit for the character
	code, body = s.get(fmt.Sprintf("/api/v1/audit?entity_type=character&entity_id=%s", charID))
	s.decode(body, &result)
	if result.Total < 1 {
		t.Errorf("character audit events = %d, want >= 1 (created)", result.Total)
	}
}
