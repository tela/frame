package integration_test

import (
	"fmt"
	"testing"
)

func TestBulkUpdateCharacterImages(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("BulkTest", "BulkTest", "development")

	// Ingest 3 images
	img1 := s.ingestImage(charID, 10)
	img2 := s.ingestImage(charID, 20)
	img3 := s.ingestImage(charID, 30)

	// Bulk mark as face_ref
	code, body := s.putJSON(fmt.Sprintf("/api/v1/characters/%s/images/bulk", charID), map[string]any{
		"image_ids": []string{img1, img2},
		"update":    map[string]any{"ref_type": "face", "ref_rank": 1},
	})
	if code != 200 {
		t.Fatalf("bulk update: status %d, body: %s", code, body)
	}
	var result struct{ Affected int `json:"affected"` }
	s.decode(body, &result)
	if result.Affected != 2 {
		t.Errorf("affected: got %d, want 2", result.Affected)
	}

	// Bulk change set_type
	code, _ = s.putJSON(fmt.Sprintf("/api/v1/characters/%s/images/bulk", charID), map[string]any{
		"image_ids": []string{img1, img2, img3},
		"update":    map[string]any{"set_type": "curated"},
	})
	if code != 200 {
		t.Fatalf("bulk set_type: status %d", code)
	}

	// Bulk triage
	code, _ = s.putJSON(fmt.Sprintf("/api/v1/characters/%s/images/bulk", charID), map[string]any{
		"image_ids": []string{img1, img3},
		"update":    map[string]any{"triage_status": "approved"},
	})
	if code != 200 {
		t.Fatalf("bulk triage: status %d", code)
	}
}

func TestBulkAddShootImages(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("ShootTest", "ShootTest", "development")

	// Create a shoot
	code, body := s.postJSON(fmt.Sprintf("/api/v1/characters/%s/shoots", charID), map[string]string{
		"name": "Test Shoot",
	})
	if code != 201 {
		t.Fatalf("create shoot: status %d", code)
	}
	var shoot struct{ ID string `json:"id"` }
	s.decode(body, &shoot)

	// Ingest images
	img1 := s.ingestImage(charID, 40)
	img2 := s.ingestImage(charID, 50)
	img3 := s.ingestImage(charID, 60)

	// Bulk add to shoot
	code, body = s.putJSON(fmt.Sprintf("/api/v1/shoots/%s/images/bulk", shoot.ID), map[string]any{
		"image_ids": []string{img1, img2, img3},
	})
	if code != 200 {
		t.Fatalf("bulk add shoot images: status %d, body: %s", code, body)
	}

	// Verify
	code, body = s.get(fmt.Sprintf("/api/v1/shoots/%s/images", shoot.ID))
	if code != 200 {
		t.Fatalf("list shoot images: status %d", code)
	}
	var ids []string
	s.decode(body, &ids)
	if len(ids) != 3 {
		t.Errorf("shoot images: got %d, want 3", len(ids))
	}
}

func TestImportToShoot(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("ImportShoot", "ImportShoot", "development")

	// Create a shoot
	code, body := s.postJSON(fmt.Sprintf("/api/v1/characters/%s/shoots", charID), map[string]string{
		"name": "Import Shoot",
	})
	var shoot struct{ ID string `json:"id"` }
	s.decode(body, &shoot)

	// Create test images directory
	dir := writeTestImages(t, 3)

	// Import with shoot_id
	code, body = s.postJSON("/api/v1/import/directory", map[string]string{
		"path":         dir,
		"character_id": charID,
		"shoot_id":     shoot.ID,
		"source":       "manual",
	})
	if code != 200 {
		t.Fatalf("import: status %d, body: %s", code, body)
	}
	var importResult struct {
		Imported int `json:"imported"`
	}
	s.decode(body, &importResult)
	if importResult.Imported != 3 {
		t.Fatalf("imported: got %d, want 3", importResult.Imported)
	}

	// Verify images are in the shoot
	code, body = s.get(fmt.Sprintf("/api/v1/shoots/%s/images", shoot.ID))
	var shootImgs []string
	s.decode(body, &shootImgs)
	if len(shootImgs) != 3 {
		t.Errorf("shoot images after import: got %d, want 3", len(shootImgs))
	}
}

func TestCreateDatasetFromSearch(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("SearchDS", "SearchDS", "cast")

	// Ingest and tag some images
	img1 := s.ingestImage(charID, 70)
	img2 := s.ingestImage(charID, 80)
	_ = s.ingestImage(charID, 90) // untagged

	// Tag two images
	s.postJSON(fmt.Sprintf("/api/v1/images/%s/tags", img1), map[string]string{
		"tag_namespace": "quality", "tag_value": "high",
	})
	s.postJSON(fmt.Sprintf("/api/v1/images/%s/tags", img2), map[string]string{
		"tag_namespace": "quality", "tag_value": "high",
	})

	// Create dataset from search (character filter only — all 3 images)
	code, body := s.postJSON("/api/v1/datasets/from-search", map[string]any{
		"name": "Search Dataset",
		"type": "lora",
		"search": map[string]any{
			"character": charID,
			"limit":     50,
		},
	})
	if code != 201 {
		t.Fatalf("create dataset from search: status %d, body: %s", code, body)
	}
	var dsResult struct {
		ImageCount int `json:"image_count"`
		Dataset    struct {
			ID          string `json:"id"`
			SourceQuery string `json:"source_query"`
		} `json:"dataset"`
	}
	s.decode(body, &dsResult)
	if dsResult.ImageCount != 3 {
		t.Errorf("image_count: got %d, want 3", dsResult.ImageCount)
	}
	if dsResult.Dataset.SourceQuery == "" || dsResult.Dataset.SourceQuery == "{}" {
		t.Error("expected source_query to be populated")
	}
}
