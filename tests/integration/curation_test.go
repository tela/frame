package integration_test

import (
	"net/http"
	"testing"
)

func TestCuration_SetRefType(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Ref Test", "Ref Test", "development")
	eraID := s.createEra(charID, "Standard")

	// Ingest an image into the era
	imgID := s.ingestEraImage(charID, eraID, 160)

	// Set ref_type to face
	code, _ := s.patchJSON("/api/v1/characters/"+charID+"/images/"+imgID, map[string]any{
		"ref_type": "face",
	})
	if code != http.StatusOK {
		t.Fatalf("set ref_type: expected 200, got %d", code)
	}

	// Verify it appears in the reference package
	code, body := s.get("/api/v1/characters/" + charID + "/eras/" + eraID + "/reference-package")
	if code != http.StatusOK {
		t.Fatalf("get ref package: expected 200, got %d: %s", code, body)
	}
	var refPkg struct {
		FaceRefs []struct{ ImageID string `json:"image_id"` } `json:"face_refs"`
		BodyRefs []struct{ ImageID string `json:"image_id"` } `json:"body_refs"`
	}
	s.decode(body, &refPkg)

	if len(refPkg.FaceRefs) != 1 {
		t.Fatalf("expected 1 face ref, got %d", len(refPkg.FaceRefs))
	}
	if refPkg.FaceRefs[0].ImageID != imgID {
		t.Errorf("expected face ref to be %s, got %s", imgID, refPkg.FaceRefs[0].ImageID)
	}
}

func TestCuration_ClearRefType(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Clear Ref", "Clear Ref", "development")
	eraID := s.createEra(charID, "Standard")
	imgID := s.ingestEraImage(charID, eraID, 170)

	// Set then clear ref_type
	s.patchJSON("/api/v1/characters/"+charID+"/images/"+imgID, map[string]any{"ref_type": "face"})
	s.patchJSON("/api/v1/characters/"+charID+"/images/"+imgID, map[string]any{"ref_type": ""})

	code, body := s.get("/api/v1/characters/" + charID + "/eras/" + eraID + "/reference-package")
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	var refPkg struct {
		FaceRefs []struct{ ImageID string `json:"image_id"` } `json:"face_refs"`
	}
	s.decode(body, &refPkg)
	if len(refPkg.FaceRefs) != 0 {
		t.Errorf("expected 0 face refs after clearing, got %d", len(refPkg.FaceRefs))
	}
}

func TestCuration_TriageApproveReject(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Triage Test", "Triage Test", "development")
	eraID := s.createEra(charID, "Standard")
	imgID := s.ingestEraImage(charID, eraID, 180)

	// New images should be pending
	code, body := s.get("/api/v1/characters/" + charID + "/images/pending?era_id=" + eraID)
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	var pending []struct{ ImageID string `json:"image_id"` }
	s.decode(body, &pending)
	if len(pending) != 1 {
		t.Fatalf("expected 1 pending image, got %d", len(pending))
	}

	// Approve
	code, _ = s.patchJSON("/api/v1/characters/"+charID+"/images/"+imgID, map[string]any{
		"triage_status": "approved",
	})
	if code != http.StatusOK {
		t.Fatalf("approve: expected 200, got %d", code)
	}

	// Should no longer be pending
	code, body = s.get("/api/v1/characters/" + charID + "/images/pending?era_id=" + eraID)
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	s.decode(body, &pending)
	if len(pending) != 0 {
		t.Errorf("expected 0 pending after approve, got %d", len(pending))
	}
}

func TestCuration_Rating(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Rating Test", "Rating Test", "development")
	eraID := s.createEra(charID, "Standard")
	imgID := s.ingestEraImage(charID, eraID, 190)

	// Set rating to 4
	code, _ := s.patchJSON("/api/v1/characters/"+charID+"/images/"+imgID, map[string]any{
		"rating": 4,
	})
	if code != http.StatusOK {
		t.Fatalf("set rating: expected 200, got %d", code)
	}

	// Verify via image list
	code, body := s.get("/api/v1/characters/" + charID + "/images?era_id=" + eraID)
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	var images []struct {
		ImageID string `json:"image_id"`
		Rating  *int   `json:"rating"`
	}
	s.decode(body, &images)
	found := false
	for _, img := range images {
		if img.ImageID == imgID {
			found = true
			if img.Rating == nil || *img.Rating != 4 {
				t.Errorf("expected rating=4, got %v", img.Rating)
			}
		}
	}
	if !found {
		t.Error("image not found in list")
	}
}

func TestCuration_BulkTriageApprove(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Bulk Triage", "Bulk Triage", "development")
	eraID := s.createEra(charID, "Standard")
	img1 := s.ingestEraImage(charID, eraID, 200)
	img2 := s.ingestEraImage(charID, eraID, 210)
	img3 := s.ingestEraImage(charID, eraID, 220)

	// Bulk approve img1 and img2
	code, body := s.putJSON("/api/v1/characters/"+charID+"/images/bulk", map[string]any{
		"image_ids": []string{img1, img2},
		"update":    map[string]string{"triage_status": "approved"},
	})
	if code != http.StatusOK {
		t.Fatalf("bulk approve: expected 200, got %d: %s", code, body)
	}
	var result struct{ Affected int `json:"affected"` }
	s.decode(body, &result)
	if result.Affected != 2 {
		t.Errorf("expected 2 affected, got %d", result.Affected)
	}

	// img3 should still be pending
	code, body = s.get("/api/v1/characters/" + charID + "/images/pending?era_id=" + eraID)
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	var pending []struct{ ImageID string `json:"image_id"` }
	s.decode(body, &pending)
	if len(pending) != 1 {
		t.Fatalf("expected 1 pending, got %d", len(pending))
	}
	if pending[0].ImageID != img3 {
		t.Errorf("expected pending image to be %s, got %s", img3, pending[0].ImageID)
	}
}
