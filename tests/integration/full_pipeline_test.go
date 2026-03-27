package integration_test

import (
	"fmt"
	"os"
	"testing"
)

// TestJourney_FullPipeline tests: import → shoot → triage → ref mark → dataset → export.
func TestJourney_FullPipeline(t *testing.T) {
	s := newTestServer(t)

	// 1. Create character
	charID := s.createCharacter("Pipeline Test", "Pipeline", "development")
	t.Logf("character: %s", charID)

	// 2. Get auto-created Standard era
	code, body := s.get("/api/v1/characters/" + charID)
	if code != 200 {
		t.Fatalf("get character: %d", code)
	}
	var charResp struct {
		Eras []struct{ ID string `json:"id"` } `json:"eras"`
	}
	s.decode(body, &charResp)
	eraID := charResp.Eras[0].ID

	// 3. Create a shoot
	code, body = s.postJSON(fmt.Sprintf("/api/v1/characters/%s/shoots", charID), map[string]string{
		"name": "Initial Import",
	})
	if code != 201 {
		t.Fatalf("create shoot: %d", code)
	}
	var shootResp struct{ ID string `json:"id"` }
	s.decode(body, &shootResp)

	// 4. Import images with shoot assignment
	dir := writeTestImages(t, 5)
	code, body = s.postJSON("/api/v1/import/directory", map[string]any{
		"path":         dir,
		"character_id": charID,
		"era_id":       eraID,
		"shoot_id":     shootResp.ID,
		"source":       "manual",
	})
	if code != 200 {
		t.Fatalf("import: %d, %s", code, body)
	}
	var importResp struct{ Imported int `json:"imported"` }
	s.decode(body, &importResp)
	if importResp.Imported != 5 {
		t.Fatalf("imported: %d, want 5", importResp.Imported)
	}

	// 5. Verify shoot has images
	code, body = s.get(fmt.Sprintf("/api/v1/shoots/%s/images", shootResp.ID))
	var shootImgs []string
	s.decode(body, &shootImgs)
	if len(shootImgs) != 5 {
		t.Fatalf("shoot images: %d, want 5", len(shootImgs))
	}

	// 6. Bulk triage — approve all
	code, _ = s.putJSON(fmt.Sprintf("/api/v1/characters/%s/images/bulk", charID), map[string]any{
		"image_ids": shootImgs,
		"update":    map[string]any{"triage_status": "approved"},
	})
	if code != 200 {
		t.Fatalf("bulk triage: %d", code)
	}

	// 7. Bulk mark first 2 as face ref
	code, _ = s.putJSON(fmt.Sprintf("/api/v1/characters/%s/images/bulk", charID), map[string]any{
		"image_ids": shootImgs[:2],
		"update":    map[string]any{"is_face_ref": true, "ref_rank": 1},
	})
	if code != 200 {
		t.Fatalf("bulk face ref: %d", code)
	}

	// 8. Mark third as body ref
	code, _ = s.putJSON(fmt.Sprintf("/api/v1/characters/%s/images/bulk", charID), map[string]any{
		"image_ids": shootImgs[2:3],
		"update":    map[string]any{"is_body_ref": true, "ref_rank": 1},
	})
	if code != 200 {
		t.Fatalf("bulk body ref: %d", code)
	}

	// 9. Verify reference package has refs
	code, body = s.get(fmt.Sprintf("/api/v1/characters/%s/eras/%s/reference-package", charID, eraID))
	if code != 200 {
		t.Fatalf("ref package: %d", code)
	}
	var refPkg struct {
		FaceRefs []any `json:"face_refs"`
		BodyRefs []any `json:"body_refs"`
	}
	s.decode(body, &refPkg)
	if len(refPkg.FaceRefs) != 2 {
		t.Errorf("face refs: %d, want 2", len(refPkg.FaceRefs))
	}
	if len(refPkg.BodyRefs) != 1 {
		t.Errorf("body refs: %d, want 1", len(refPkg.BodyRefs))
	}

	// 10. Create dataset from search
	code, body = s.postJSON("/api/v1/datasets/from-search", map[string]any{
		"name": "Training Set",
		"type": "lora",
		"search": map[string]any{
			"character": charID,
			"limit":     50,
		},
	})
	if code != 201 {
		t.Fatalf("dataset from search: %d, %s", code, body)
	}
	var dsResp struct {
		Dataset    struct{ ID string `json:"id"` } `json:"dataset"`
		ImageCount int                              `json:"image_count"`
	}
	s.decode(body, &dsResp)
	if dsResp.ImageCount != 5 {
		t.Errorf("dataset images: %d, want 5", dsResp.ImageCount)
	}

	// 11. Export dataset
	exportDir := t.TempDir()
	code, body = s.postJSON(fmt.Sprintf("/api/v1/datasets/%s/export", dsResp.Dataset.ID), map[string]string{
		"output_dir": exportDir,
	})
	if code != 200 {
		t.Fatalf("export: %d, %s", code, body)
	}
	var exportResp struct {
		Exported int `json:"exported"`
	}
	s.decode(body, &exportResp)
	if exportResp.Exported != 5 {
		t.Errorf("exported: %d, want 5", exportResp.Exported)
	}

	// Verify files on disk
	entries, _ := os.ReadDir(exportDir)
	pngCount := 0
	for _, e := range entries {
		if !e.IsDir() {
			pngCount++
		}
	}
	if pngCount < 5 {
		t.Errorf("exported files: %d, want >=5", pngCount)
	}

	// 12. Verify audit trail has events
	code, body = s.get(fmt.Sprintf("/api/v1/audit?entity_type=character&entity_id=%s&limit=20", charID))
	if code != 200 {
		t.Fatalf("audit: %d", code)
	}
	var auditResp struct {
		Total int `json:"total"`
	}
	s.decode(body, &auditResp)
	if auditResp.Total == 0 {
		t.Error("expected audit events for character")
	}

	t.Logf("Full pipeline: import(5) → shoot → triage → refs(2f+1b) → dataset(5) → export(5) → audit(%d events)", auditResp.Total)
}

// TestDatasetExport tests the export endpoint writes files and captions.
func TestDatasetExport(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("ExportTest", "ExportTest", "development")

	// Ingest 3 images
	img1 := s.ingestImage(charID, 100)
	img2 := s.ingestImage(charID, 110)
	img3 := s.ingestImage(charID, 120)

	// Create dataset and add images
	code, body := s.postJSON("/api/v1/datasets", map[string]string{
		"name": "Export Test DS",
		"type": "lora",
	})
	if code != 201 {
		t.Fatalf("create dataset: %d", code)
	}
	var ds struct{ ID string `json:"id"` }
	s.decode(body, &ds)

	s.postJSON(fmt.Sprintf("/api/v1/datasets/%s/images", ds.ID), map[string]any{
		"image_ids": []string{img1, img2, img3},
	})

	// Add a caption to one image
	s.patchJSON(fmt.Sprintf("/api/v1/datasets/%s/images/%s", ds.ID, img1), map[string]any{
		"caption": "a test caption for image 1",
	})

	// Export
	exportDir := t.TempDir()
	code, body = s.postJSON(fmt.Sprintf("/api/v1/datasets/%s/export", ds.ID), map[string]string{
		"output_dir": exportDir,
	})
	if code != 200 {
		t.Fatalf("export: %d, %s", code, body)
	}
	var result struct {
		Exported int `json:"exported"`
		Skipped  int `json:"skipped"`
	}
	s.decode(body, &result)
	if result.Exported != 3 {
		t.Errorf("exported: %d, want 3", result.Exported)
	}

	// Check caption sidecar
	entries, _ := os.ReadDir(exportDir)
	hasTxt := false
	for _, e := range entries {
		if !e.IsDir() && len(e.Name()) > 4 && e.Name()[len(e.Name())-4:] == ".txt" {
			hasTxt = true
			break
		}
	}
	if !hasTxt {
		t.Error("expected .txt caption sidecar file")
	}
}

// TestPreprocessApply tests the preprocessing endpoint.
func TestPreprocessApply(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("PreprocessTest", "PreprocessTest", "development")
	imgID := s.ingestImage(charID, 200)

	// Apply a resize operation
	code, body := s.postJSON("/api/v1/preprocess/apply", map[string]any{
		"image_id": imgID,
		"operations": []map[string]any{
			{"type": "resize", "params": map[string]any{"width": 2, "height": 2}},
		},
	})
	if code != 201 {
		t.Fatalf("preprocess: %d, %s", code, body)
	}
	var result struct {
		DerivativeID string `json:"derivative_id"`
		ImageID      string `json:"image_id"`
	}
	s.decode(body, &result)
	if result.DerivativeID == "" {
		t.Error("expected derivative_id")
	}
	if result.ImageID == "" {
		t.Error("expected new image_id")
	}
	if result.ImageID == imgID {
		t.Error("derivative should have different image_id than source")
	}
}
