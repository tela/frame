package integration_test

import (
	"fmt"
	"testing"
)

// --- LoRA Registry ---

func TestLoRACRUD(t *testing.T) {
	s := newTestServer(t)

	// Create
	code, body := s.postJSON("/api/v1/loras", map[string]any{
		"name":                 "Detail Enhance V2",
		"filename":             "detail_enhance_v2.safetensors",
		"category":             "detail",
		"recommended_strength": 0.6,
		"content_rating":       "sfw",
		"source_url":           "https://civitai.com/example",
		"compatible_models":    `["flux2","sdxl"]`,
	})
	if code != 201 {
		t.Fatalf("create lora: status %d, body: %s", code, body)
	}
	var created struct {
		ID       string  `json:"id"`
		Name     string  `json:"name"`
		Category string  `json:"category"`
		Strength float64 `json:"recommended_strength"`
	}
	s.decode(body, &created)
	if created.Name != "Detail Enhance V2" {
		t.Errorf("name: got %q", created.Name)
	}
	if created.Strength != 0.6 {
		t.Errorf("strength: got %v", created.Strength)
	}

	// List
	code, body = s.get("/api/v1/loras")
	if code != 200 {
		t.Fatalf("list loras: status %d", code)
	}
	var loras []struct{ ID string `json:"id"` }
	s.decode(body, &loras)
	if len(loras) != 1 {
		t.Fatalf("expected 1 lora, got %d", len(loras))
	}

	// List with filter
	code, body = s.get("/api/v1/loras?category=style")
	s.decode(body, &loras)
	if len(loras) != 0 {
		t.Errorf("expected 0 loras for category=style, got %d", len(loras))
	}

	code, body = s.get("/api/v1/loras?category=detail")
	s.decode(body, &loras)
	if len(loras) != 1 {
		t.Errorf("expected 1 lora for category=detail, got %d", len(loras))
	}

	// Update
	code, _ = s.patchJSON("/api/v1/loras/"+created.ID, map[string]any{
		"name":                 "Detail Enhance V3",
		"recommended_strength": 0.8,
	})
	if code != 200 {
		t.Fatalf("update lora: status %d", code)
	}

	// Delete
	code, _ = s.delete("/api/v1/loras/" + created.ID)
	if code != 200 {
		t.Fatalf("delete lora: status %d", code)
	}

	// Verify deleted
	code, body = s.get("/api/v1/loras")
	s.decode(body, &loras)
	if len(loras) != 0 {
		t.Errorf("expected 0 loras after delete, got %d", len(loras))
	}
}

func TestLoRARequiredFields(t *testing.T) {
	s := newTestServer(t)

	// Missing name
	code, _ := s.postJSON("/api/v1/loras", map[string]any{
		"filename": "test.safetensors",
	})
	if code != 400 {
		t.Errorf("missing name: got %d, want 400", code)
	}

	// Missing filename
	code, _ = s.postJSON("/api/v1/loras", map[string]any{
		"name": "Test LoRA",
	})
	if code != 400 {
		t.Errorf("missing filename: got %d, want 400", code)
	}
}

// --- Pose Set ---

func TestPoseSetStatus(t *testing.T) {
	s := newTestServer(t)

	charID := s.createCharacter("PoseTest", "PoseTest", "development")

	// Get the auto-created Standard era
	code, body := s.get("/api/v1/characters/" + charID)
	if code != 200 {
		t.Fatalf("get character: status %d", code)
	}
	var charResp struct {
		Eras []struct {
			ID    string `json:"id"`
			Label string `json:"label"`
		} `json:"eras"`
	}
	s.decode(body, &charResp)
	if len(charResp.Eras) == 0 {
		t.Fatal("expected auto-created Standard era")
	}
	eraID := charResp.Eras[0].ID

	// Get pose set status
	code, body = s.get(fmt.Sprintf("/api/v1/characters/%s/pose-set?era_id=%s", charID, eraID))
	if code != 200 {
		t.Fatalf("pose set status: status %d, body: %s", code, body)
	}
	var poseSet struct {
		Total     int `json:"total"`
		Generated int `json:"generated"`
		Accepted  int `json:"accepted"`
		Poses     []struct {
			PoseID   string  `json:"pose_id"`
			OutfitID string  `json:"outfit_id"`
			Status   string  `json:"status"`
			ImageID  *string `json:"image_id"`
		} `json:"poses"`
	}
	s.decode(body, &poseSet)

	if poseSet.Total != 26 {
		t.Errorf("total: got %d, want 26", poseSet.Total)
	}
	if poseSet.Generated != 0 {
		t.Errorf("generated: got %d, want 0", poseSet.Generated)
	}

	// All should be "missing"
	for _, p := range poseSet.Poses {
		if p.Status != "missing" {
			t.Errorf("pose %s/%s: got status %q, want missing", p.PoseID, p.OutfitID, p.Status)
		}
	}
}

func TestPoseSetUpdate(t *testing.T) {
	s := newTestServer(t)

	charID := s.createCharacter("PoseUpdate", "PoseUpdate", "development")

	// Get the auto-created era
	code, body := s.get("/api/v1/characters/" + charID)
	var charResp struct {
		Eras []struct{ ID string `json:"id"` } `json:"eras"`
	}
	s.decode(body, &charResp)
	eraID := charResp.Eras[0].ID

	// Ingest an image to use as a pose set image
	imgID := s.ingestImage(charID, 42)

	// Set the front_headshot/nude slot
	code, _ = s.postJSON(fmt.Sprintf("/api/v1/characters/%s/pose-set", charID), map[string]any{
		"era_id":    eraID,
		"pose_id":   "front_headshot",
		"outfit_id": "nude",
		"image_id":  imgID,
		"status":    "generated",
	})
	if code != 200 {
		t.Fatalf("update pose set: status %d", code)
	}

	// Verify it shows up
	code, body = s.get(fmt.Sprintf("/api/v1/characters/%s/pose-set?era_id=%s", charID, eraID))
	var poseSet struct {
		Generated int `json:"generated"`
		Poses     []struct {
			PoseID   string  `json:"pose_id"`
			OutfitID string  `json:"outfit_id"`
			Status   string  `json:"status"`
			ImageID  *string `json:"image_id"`
		} `json:"poses"`
	}
	s.decode(body, &poseSet)

	if poseSet.Generated != 1 {
		t.Errorf("generated: got %d, want 1", poseSet.Generated)
	}

	// Find the specific slot
	found := false
	for _, p := range poseSet.Poses {
		if p.PoseID == "front_headshot" && p.OutfitID == "nude" {
			found = true
			if p.Status != "generated" {
				t.Errorf("status: got %q, want generated", p.Status)
			}
			if p.ImageID == nil || *p.ImageID != imgID {
				t.Errorf("image_id: got %v, want %s", p.ImageID, imgID)
			}
		}
	}
	if !found {
		t.Error("front_headshot/nude slot not found in pose set")
	}

	// Accept it
	code, _ = s.postJSON(fmt.Sprintf("/api/v1/characters/%s/pose-set", charID), map[string]any{
		"era_id":    eraID,
		"pose_id":   "front_headshot",
		"outfit_id": "nude",
		"status":    "accepted",
	})
	if code != 200 {
		t.Fatalf("accept pose: status %d", code)
	}

	// Verify accepted count
	code, body = s.get(fmt.Sprintf("/api/v1/characters/%s/pose-set?era_id=%s", charID, eraID))
	var updated struct {
		Accepted int `json:"accepted"`
	}
	s.decode(body, &updated)
	if updated.Accepted != 1 {
		t.Errorf("accepted: got %d, want 1", updated.Accepted)
	}
}

func TestStandardPosesAndOutfits(t *testing.T) {
	s := newTestServer(t)

	// Standard poses
	code, body := s.get("/api/v1/standard-poses")
	if code != 200 {
		t.Fatalf("standard poses: status %d", code)
	}
	var poses []struct {
		ID       string `json:"id"`
		Category string `json:"category"`
	}
	s.decode(body, &poses)

	categories := map[string]int{}
	for _, p := range poses {
		categories[p.Category]++
	}
	if categories["sfw_standard"] != 6 {
		t.Errorf("sfw_standard: got %d, want 6", categories["sfw_standard"])
	}
	if categories["nsfw_standard"] != 4 {
		t.Errorf("nsfw_standard: got %d, want 4", categories["nsfw_standard"])
	}
	if categories["anatomical_detail"] != 4 {
		t.Errorf("anatomical_detail: got %d, want 4", categories["anatomical_detail"])
	}

	// Standard outfits
	code, body = s.get("/api/v1/standard-outfits")
	if code != 200 {
		t.Fatalf("standard outfits: status %d", code)
	}
	var outfits []struct {
		ID string `json:"id"`
	}
	s.decode(body, &outfits)
	if len(outfits) != 3 {
		t.Errorf("outfits: got %d, want 3", len(outfits))
	}
}

// --- Forward-Only Status ---

func TestForwardOnlyStatusTransitions(t *testing.T) {
	s := newTestServer(t)

	// Create a prospect
	charID := s.createCharacter("ForwardOnly", "ForwardOnly", "prospect")

	// prospect → development: OK
	code, _ := s.patchJSON("/api/v1/characters/"+charID, map[string]string{"status": "development"})
	if code != 200 {
		t.Fatalf("prospect → development: got %d, want 200", code)
	}

	// development → cast: OK
	code, _ = s.patchJSON("/api/v1/characters/"+charID, map[string]string{"status": "cast"})
	if code != 200 {
		t.Fatalf("development → cast: got %d, want 200", code)
	}

	// cast → development: REJECTED
	code, _ = s.patchJSON("/api/v1/characters/"+charID, map[string]string{"status": "development"})
	if code != 400 {
		t.Fatalf("cast → development: got %d, want 400", code)
	}

	// cast → prospect: REJECTED
	code, _ = s.patchJSON("/api/v1/characters/"+charID, map[string]string{"status": "prospect"})
	if code != 400 {
		t.Fatalf("cast → prospect: got %d, want 400", code)
	}

	// cast → cast: OK (idempotent)
	code, _ = s.patchJSON("/api/v1/characters/"+charID, map[string]string{"status": "cast"})
	if code != 200 {
		t.Fatalf("cast → cast: got %d, want 200", code)
	}
}

func TestForwardOnlySkipStage(t *testing.T) {
	s := newTestServer(t)

	// prospect → cast directly: OK (skipping development is allowed)
	charID := s.createCharacter("SkipDev", "SkipDev", "prospect")
	code, _ := s.patchJSON("/api/v1/characters/"+charID, map[string]string{"status": "cast"})
	if code != 200 {
		t.Fatalf("prospect → cast: got %d, want 200", code)
	}
}

// --- Auto Standard Era ---

func TestAutoStandardEra(t *testing.T) {
	s := newTestServer(t)

	charID := s.createCharacter("AutoEra", "AutoEra", "prospect")

	code, body := s.get("/api/v1/characters/" + charID)
	if code != 200 {
		t.Fatalf("get character: status %d", code)
	}
	var resp struct {
		Eras []struct {
			Label    string `json:"label"`
			AgeRange string `json:"age_range"`
		} `json:"eras"`
	}
	s.decode(body, &resp)

	if len(resp.Eras) != 1 {
		t.Fatalf("expected 1 auto-created era, got %d", len(resp.Eras))
	}
	if resp.Eras[0].Label != "Standard" {
		t.Errorf("era label: got %q, want Standard", resp.Eras[0].Label)
	}
	if resp.Eras[0].AgeRange != "20" {
		t.Errorf("era age_range: got %q, want 20", resp.Eras[0].AgeRange)
	}
}
