package integration_test

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestCompose_HeadshotNeutral(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Compose Test", "Compose Test", "prospect")

	// Update character with physical attributes
	s.patchJSON("/api/v1/characters/"+charID, map[string]string{
		"gender":    "female",
		"ethnicity": "East Asian",
		"eye_color": "brown",
		"skin_tone": "fair",
	})

	code, body := s.postJSON("/api/v1/prompts/compose", map[string]string{
		"character_id":   charID,
		"job_name":       "headshot_neutral",
		"content_rating": "sfw",
	})
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", code, body)
	}

	var result struct {
		Prompt   string            `json:"prompt"`
		Negative string            `json:"negative"`
		Blocks   map[string]string `json:"blocks"`
		Job      struct {
			Name        string `json:"name"`
			DisplayName string `json:"display_name"`
			Category    string `json:"category"`
			Workflow    string `json:"workflow"`
		} `json:"job"`
	}
	s.decode(body, &result)

	// Identity block should contain character attributes
	if !strings.Contains(result.Prompt, "female") {
		t.Errorf("prompt missing gender, got: %s", result.Prompt)
	}
	if !strings.Contains(result.Prompt, "East Asian") {
		t.Errorf("prompt missing ethnicity, got: %s", result.Prompt)
	}
	if !strings.Contains(result.Prompt, "brown eyes") {
		t.Errorf("prompt missing eye color, got: %s", result.Prompt)
	}

	// Action block should contain headshot framing
	if !strings.Contains(result.Prompt, "headshot") {
		t.Errorf("prompt missing headshot action, got: %s", result.Prompt)
	}

	// Negative should exist
	if result.Negative == "" {
		t.Error("expected non-empty negative prompt")
	}

	// Job metadata
	if result.Job.Name != "headshot_neutral" {
		t.Errorf("expected job name headshot_neutral, got %s", result.Job.Name)
	}
	if result.Job.Category != "identity" {
		t.Errorf("expected category identity, got %s", result.Job.Category)
	}

	// Blocks should be populated
	if result.Blocks["identity"] == "" {
		t.Error("expected non-empty identity block")
	}
	if result.Blocks["action"] == "" {
		t.Error("expected non-empty action block")
	}
}

func TestCompose_NSFWIncludesPhysicality(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("NSFW Compose", "NSFW Compose", "prospect")
	eraID := s.createEra(charID, "Standard")

	// Set NSFW physical attributes on the era
	s.patchJSON("/api/v1/eras/"+eraID, map[string]any{
		"breast_size":      "medium",
		"pubic_hair_style": "trimmed",
		"build":            "athletic",
	})

	code, body := s.postJSON("/api/v1/prompts/compose", map[string]string{
		"character_id":   charID,
		"era_id":         eraID,
		"job_name":       "nude_front_standing",
		"content_rating": "nsfw",
	})
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", code, body)
	}

	var result struct {
		Prompt string            `json:"prompt"`
		Blocks map[string]string `json:"blocks"`
	}
	s.decode(body, &result)

	// NSFW physicality should include breast and pubic descriptors
	if !strings.Contains(result.Prompt, "medium breasts") {
		t.Errorf("NSFW prompt missing breast descriptor, got: %s", result.Prompt)
	}
	if !strings.Contains(result.Prompt, "trimmed pubic hair") {
		t.Errorf("NSFW prompt missing pubic hair descriptor, got: %s", result.Prompt)
	}
	if !strings.Contains(result.Prompt, "athletic build") {
		t.Errorf("prompt missing build, got: %s", result.Prompt)
	}
}

func TestCompose_SFWDoesNotLeakNSFW(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("SFW Leak Test", "SFW Leak Test", "prospect")
	eraID := s.createEra(charID, "Standard")

	s.patchJSON("/api/v1/eras/"+eraID, map[string]any{
		"breast_size":      "large",
		"pubic_hair_style": "natural",
	})

	code, body := s.postJSON("/api/v1/prompts/compose", map[string]string{
		"character_id":   charID,
		"era_id":         eraID,
		"job_name":       "headshot_neutral",
		"content_rating": "sfw",
	})
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", code, body)
	}

	var result struct{ Prompt string `json:"prompt"` }
	s.decode(body, &result)

	if strings.Contains(result.Prompt, "breasts") {
		t.Errorf("SFW prompt should not contain breast descriptors, got: %s", result.Prompt)
	}
	if strings.Contains(result.Prompt, "pubic") {
		t.Errorf("SFW prompt should not contain pubic descriptors, got: %s", result.Prompt)
	}
}

func TestCompose_UnknownJobReturns400(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Bad Job", "Bad Job", "prospect")

	code, _ := s.postJSON("/api/v1/prompts/compose", map[string]string{
		"character_id": charID,
		"job_name":     "nonexistent_job",
	})
	if code != http.StatusBadRequest {
		t.Fatalf("expected 400 for unknown job, got %d", code)
	}
}

func TestCompose_MissingCharacterReturns404(t *testing.T) {
	s := newTestServer(t)

	code, _ := s.postJSON("/api/v1/prompts/compose", map[string]string{
		"character_id": "nonexistent",
		"job_name":     "headshot_neutral",
	})
	if code != http.StatusNotFound {
		t.Fatalf("expected 404 for missing character, got %d", code)
	}
}

func TestCompose_MissingFieldsReturn400(t *testing.T) {
	s := newTestServer(t)

	// Missing character_id
	code, _ := s.postJSON("/api/v1/prompts/compose", map[string]string{
		"job_name": "headshot_neutral",
	})
	if code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing character_id, got %d", code)
	}

	// Missing job_name
	code, _ = s.postJSON("/api/v1/prompts/compose", map[string]string{
		"character_id": "anything",
	})
	if code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing job_name, got %d", code)
	}
}

func TestListJobs_ReturnsJobs(t *testing.T) {
	s := newTestServer(t)

	code, body := s.get("/api/v1/prompts/jobs")
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}

	var result struct {
		Jobs []struct {
			Name          string `json:"name"`
			DisplayName   string `json:"display_name"`
			Category      string `json:"category"`
			ContentRating string `json:"content_rating"`
			Workflow      string `json:"workflow"`
		} `json:"jobs"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		t.Fatalf("decode: %v", err)
	}

	if len(result.Jobs) == 0 {
		t.Fatal("expected at least one job")
	}

	// Verify headshot_neutral exists
	found := false
	for _, j := range result.Jobs {
		if j.Name == "headshot_neutral" {
			found = true
			if j.Category != "identity" {
				t.Errorf("headshot_neutral category: expected identity, got %s", j.Category)
			}
			if j.Workflow != "text-to-image" {
				t.Errorf("headshot_neutral workflow: expected text-to-image, got %s", j.Workflow)
			}
			break
		}
	}
	if !found {
		t.Error("headshot_neutral not found in jobs list")
	}
}
