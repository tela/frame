package integration_test

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestCharacter_CreateAndGet(t *testing.T) {
	s := newTestServer(t)

	code, body := s.postJSON("/api/v1/characters", map[string]string{
		"name":         "Test Character",
		"display_name": "Test Display",
		"status":       "prospect",
		"gender":       "female",
		"ethnicity":    "East Asian",
	})
	if code != http.StatusCreated {
		t.Fatalf("create: expected 201, got %d: %s", code, body)
	}

	var created struct {
		ID        string `json:"id"`
		Name      string `json:"name"`
		Gender    string `json:"gender"`
		Ethnicity string `json:"ethnicity"`
		Status    string `json:"status"`
	}
	s.decode(body, &created)

	if created.ID == "" {
		t.Fatal("expected non-empty ID")
	}
	if created.Gender != "female" {
		t.Errorf("expected gender=female, got %s", created.Gender)
	}

	// GET should return the same data
	code, body = s.get("/api/v1/characters/" + created.ID)
	if code != http.StatusOK {
		t.Fatalf("get: expected 200, got %d", code)
	}

	var fetched struct {
		ID        string `json:"id"`
		Name      string `json:"name"`
		Gender    string `json:"gender"`
		Ethnicity string `json:"ethnicity"`
	}
	s.decode(body, &fetched)
	if fetched.Gender != "female" {
		t.Errorf("get: expected gender=female, got %s", fetched.Gender)
	}
	if fetched.Ethnicity != "East Asian" {
		t.Errorf("get: expected ethnicity=East Asian, got %s", fetched.Ethnicity)
	}
}

func TestCharacter_UpdatePhysicalAttributes(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Phys Test", "Phys Test", "prospect")

	code, _ := s.patchJSON("/api/v1/characters/"+charID, map[string]string{
		"skin_tone":              "fair",
		"eye_color":              "green",
		"eye_shape":              "almond",
		"natural_hair_color":     "black",
		"natural_hair_texture":   "straight",
		"distinguishing_features": "small mole on left cheek",
	})
	if code != http.StatusOK {
		t.Fatalf("update: expected 200, got %d", code)
	}

	code, body := s.get("/api/v1/characters/" + charID)
	if code != http.StatusOK {
		t.Fatalf("get: expected 200, got %d", code)
	}

	var char struct {
		SkinTone              string `json:"skin_tone"`
		EyeColor              string `json:"eye_color"`
		EyeShape              string `json:"eye_shape"`
		NaturalHairColor      string `json:"natural_hair_color"`
		NaturalHairTexture    string `json:"natural_hair_texture"`
		DistinguishingFeatures string `json:"distinguishing_features"`
	}
	s.decode(body, &char)

	if char.SkinTone != "fair" {
		t.Errorf("expected skin_tone=fair, got %s", char.SkinTone)
	}
	if char.EyeColor != "green" {
		t.Errorf("expected eye_color=green, got %s", char.EyeColor)
	}
	if char.DistinguishingFeatures != "small mole on left cheek" {
		t.Errorf("expected distinguishing_features set, got %s", char.DistinguishingFeatures)
	}
}

func TestCharacter_StatusTransition(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Status Test", "Status Test", "prospect")

	// Prospect → Development
	code, _ := s.patchJSON("/api/v1/characters/"+charID, map[string]string{"status": "development"})
	if code != http.StatusOK {
		t.Fatalf("prospect→development: expected 200, got %d", code)
	}

	code, body := s.get("/api/v1/characters/" + charID)
	if code != http.StatusOK {
		t.Fatalf("get: expected 200, got %d", code)
	}
	var char struct{ Status string `json:"status"` }
	s.decode(body, &char)
	if char.Status != "development" {
		t.Errorf("expected status=development, got %s", char.Status)
	}

	// Development → Cast
	code, _ = s.patchJSON("/api/v1/characters/"+charID, map[string]string{"status": "cast"})
	if code != http.StatusOK {
		t.Fatalf("development→cast: expected 200, got %d", code)
	}
}

func TestCharacter_GetNonexistent(t *testing.T) {
	s := newTestServer(t)

	code, _ := s.get("/api/v1/characters/nonexistent-id")
	if code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", code)
	}
}

func TestCharacter_ListIncludesEras(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Era List Test", "Era List Test", "prospect")
	s.createEra(charID, "Young Adult")
	s.createEra(charID, "Prime")

	code, body := s.get("/api/v1/characters/" + charID)
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}

	var char struct {
		Eras []struct {
			Label string `json:"label"`
		} `json:"eras"`
	}
	s.decode(body, &char)

	// Should have the default era + 2 created = 3
	// (createCharacter creates a default era)
	if len(char.Eras) < 2 {
		t.Errorf("expected at least 2 eras, got %d", len(char.Eras))
	}
}

func TestEra_UpdatePhysicalAttributes(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Era Phys", "Era Phys", "prospect")
	eraID := s.createEra(charID, "Test Era")

	code, _ := s.patchJSON("/api/v1/eras/"+eraID, map[string]any{
		"build":         "athletic",
		"height_cm":     165,
		"breast_size":   "medium",
		"face_shape":    "oval",
		"jaw_definition": "soft",
		"hair_color":    "brown",
		"hair_length":   "shoulder",
	})
	if code != http.StatusOK {
		t.Fatalf("update era: expected 200, got %d", code)
	}

	// Verify via character GET (eras are embedded)
	code, body := s.get("/api/v1/characters/" + charID)
	if code != http.StatusOK {
		t.Fatalf("get: expected 200, got %d", code)
	}

	var char struct {
		Eras []struct {
			ID           string `json:"id"`
			Build        string `json:"build"`
			HeightCM     *int   `json:"height_cm"`
			BreastSize   string `json:"breast_size"`
			FaceShape    string `json:"face_shape"`
			HairColor    string `json:"hair_color"`
		} `json:"eras"`
	}
	if err := json.Unmarshal(body, &char); err != nil {
		t.Fatalf("decode: %v", err)
	}

	var era *struct {
		ID         string `json:"id"`
		Build      string `json:"build"`
		HeightCM   *int   `json:"height_cm"`
		BreastSize string `json:"breast_size"`
		FaceShape  string `json:"face_shape"`
		HairColor  string `json:"hair_color"`
	}
	for i := range char.Eras {
		if char.Eras[i].ID == eraID {
			era = &char.Eras[i]
			break
		}
	}
	if era == nil {
		t.Fatalf("era %s not found in character response", eraID)
	}
	if era.Build != "athletic" {
		t.Errorf("expected build=athletic, got %s", era.Build)
	}
	if era.HeightCM == nil || *era.HeightCM != 165 {
		t.Errorf("expected height_cm=165, got %v", era.HeightCM)
	}
	if era.BreastSize != "medium" {
		t.Errorf("expected breast_size=medium, got %s", era.BreastSize)
	}
}

func TestImage_DeleteRemovesFromList(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Delete Test", "Delete Test", "prospect")
	img1 := s.ingestImage(charID, 140)
	img2 := s.ingestImage(charID, 150)

	// Delete img1
	code, _ := s.delete("/api/v1/characters/" + charID + "/images/" + img1)
	if code != http.StatusOK && code != http.StatusNoContent {
		t.Fatalf("delete: expected 200, got %d", code)
	}

	// List should only have img2
	code, body := s.get("/api/v1/characters/" + charID + "/images")
	if code != http.StatusOK {
		t.Fatalf("list: expected 200, got %d", code)
	}
	var images []struct{ ImageID string `json:"image_id"` }
	s.decode(body, &images)
	if len(images) != 1 {
		t.Fatalf("expected 1 image after delete, got %d", len(images))
	}
	if images[0].ImageID != img2 {
		t.Errorf("expected remaining image to be %s, got %s", img2, images[0].ImageID)
	}
}
