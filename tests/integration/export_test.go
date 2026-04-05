package integration_test

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"testing"
)

func TestExport_BasicExport(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Export Test", "Export Test", "development")
	eraID := s.createEra(charID, "Standard")
	img1 := s.ingestEraImage(charID, eraID, 10)
	img2 := s.ingestEraImage(charID, eraID, 20)

	// Create dataset and add images
	code, body := s.postJSON("/api/v1/datasets", map[string]string{
		"name": "Export Test DS", "character_id": charID,
	})
	if code != http.StatusCreated {
		t.Fatalf("create dataset: %d %s", code, body)
	}
	var ds struct{ ID string `json:"id"` }
	s.decode(body, &ds)

	s.postJSON("/api/v1/datasets/"+ds.ID+"/images", map[string]any{
		"image_ids": []string{img1, img2},
	})

	// Export
	outDir := s.testOutputDir()
	code, body = s.postJSON("/api/v1/datasets/"+ds.ID+"/export", map[string]string{
		"output_dir": outDir,
	})
	if code != http.StatusOK {
		t.Fatalf("export: %d %s", code, body)
	}

	var result struct {
		Exported int `json:"exported"`
		Skipped  int `json:"skipped"`
		Errors   int `json:"errors"`
	}
	s.decode(body, &result)
	if result.Exported != 2 {
		t.Errorf("exported = %d, want 2", result.Exported)
	}

	// Verify files on disk
	entries, _ := os.ReadDir(outDir)
	if len(entries) != 2 {
		t.Errorf("files on disk = %d, want 2", len(entries))
	}
}

func TestExport_CaptionSidecars(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Caption Export", "Caption Export", "development")
	eraID := s.createEra(charID, "Standard")
	img1 := s.ingestEraImage(charID, eraID, 30)

	// Create dataset
	code, body := s.postJSON("/api/v1/datasets", map[string]string{
		"name": "Caption DS", "character_id": charID,
	})
	if code != http.StatusCreated {
		t.Fatalf("create dataset: %d %s", code, body)
	}
	var ds struct{ ID string `json:"id"` }
	s.decode(body, &ds)

	s.postJSON("/api/v1/datasets/"+ds.ID+"/images", map[string]any{"image_ids": []string{img1}})

	// Set dataset-level caption
	s.patchJSON("/api/v1/datasets/"+ds.ID+"/images/"+img1, map[string]string{
		"caption": "a portrait photo of sks woman",
	})

	// Export
	outDir := s.testOutputDir()
	code, body = s.postJSON("/api/v1/datasets/"+ds.ID+"/export", map[string]string{
		"output_dir": outDir,
	})
	if code != http.StatusOK {
		t.Fatalf("export: %d %s", code, body)
	}

	var result struct {
		Captions int `json:"captions"`
	}
	s.decode(body, &result)
	if result.Captions != 1 {
		t.Errorf("captions = %d, want 1", result.Captions)
	}

	// Verify .txt sidecar exists and has content
	txtPath := filepath.Join(outDir, img1+".txt")
	data, err := os.ReadFile(txtPath)
	if err != nil {
		t.Fatalf("read caption: %v", err)
	}
	if string(data) != "a portrait photo of sks woman" {
		t.Errorf("caption content = %q, want 'a portrait photo of sks woman'", data)
	}
}

func TestExport_CharacterCaptionFallback(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Char Caption", "Char Caption", "development")
	eraID := s.createEra(charID, "Standard")
	img1 := s.ingestEraImage(charID, eraID, 40)

	// Set character-level caption (not dataset-level)
	s.patchJSON("/api/v1/characters/"+charID+"/images/"+img1, map[string]any{
		"caption": "character level caption",
	})

	// Create dataset and add image (no dataset caption)
	code, body := s.postJSON("/api/v1/datasets", map[string]string{
		"name": "Fallback DS", "character_id": charID,
	})
	if code != http.StatusCreated {
		t.Fatalf("create dataset: %d %s", code, body)
	}
	var ds struct{ ID string `json:"id"` }
	s.decode(body, &ds)
	s.postJSON("/api/v1/datasets/"+ds.ID+"/images", map[string]any{"image_ids": []string{img1}})

	// Export WITHOUT use_char_captions — should have 0 captions
	outDir1 := s.testOutputDir()
	code, body = s.postJSON("/api/v1/datasets/"+ds.ID+"/export", map[string]any{
		"output_dir": outDir1,
	})
	if code != http.StatusOK {
		t.Fatalf("export: %d %s", code, body)
	}
	var r1 struct{ Captions int `json:"captions"` }
	s.decode(body, &r1)
	if r1.Captions != 0 {
		t.Errorf("without fallback: captions = %d, want 0", r1.Captions)
	}

	// Export WITH use_char_captions — should inherit character caption
	outDir2 := s.testOutputDir()
	code, body = s.postJSON("/api/v1/datasets/"+ds.ID+"/export", map[string]any{
		"output_dir":         outDir2,
		"use_char_captions": true,
	})
	if code != http.StatusOK {
		t.Fatalf("export: %d %s", code, body)
	}
	var r2 struct{ Captions int `json:"captions"` }
	s.decode(body, &r2)
	if r2.Captions != 1 {
		t.Errorf("with fallback: captions = %d, want 1", r2.Captions)
	}

	// Verify caption content is from character
	data, _ := os.ReadFile(filepath.Join(outDir2, img1+".txt"))
	if string(data) != "character level caption" {
		t.Errorf("fallback caption = %q, want 'character level caption'", data)
	}
}

func TestExport_KohyaSubfolder(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Kohya Test", "Kohya Test", "development")
	eraID := s.createEra(charID, "Standard")
	img1 := s.ingestEraImage(charID, eraID, 50)

	code, body := s.postJSON("/api/v1/datasets", map[string]string{
		"name": "Kohya DS", "character_id": charID,
	})
	if code != http.StatusCreated {
		t.Fatalf("create dataset: %d %s", code, body)
	}
	var ds struct{ ID string `json:"id"` }
	s.decode(body, &ds)
	s.postJSON("/api/v1/datasets/"+ds.ID+"/images", map[string]any{"image_ids": []string{img1}})

	outDir := s.testOutputDir()
	code, body = s.postJSON("/api/v1/datasets/"+ds.ID+"/export", map[string]any{
		"output_dir":    outDir,
		"repeat_count":  10,
		"class_token":   "sks woman",
	})
	if code != http.StatusOK {
		t.Fatalf("export: %d %s", code, body)
	}

	var result struct{ OutputDir string `json:"output_dir"` }
	if err := json.Unmarshal(body, &result); err != nil {
		t.Fatalf("decode: %v", err)
	}

	// Should have created 10_sks woman subfolder
	expectedDir := filepath.Join(outDir, "10_sks woman")
	if result.OutputDir != expectedDir {
		t.Errorf("output_dir = %s, want %s", result.OutputDir, expectedDir)
	}

	entries, _ := os.ReadDir(expectedDir)
	if len(entries) != 1 {
		t.Errorf("files in Kohya dir = %d, want 1", len(entries))
	}
}

func TestExport_SequentialNaming(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Seq Name", "Seq Name", "development")
	eraID := s.createEra(charID, "Standard")
	s.ingestEraImage(charID, eraID, 60)
	s.ingestEraImage(charID, eraID, 70)

	code, body := s.postJSON("/api/v1/datasets", map[string]string{
		"name": "Seq DS", "character_id": charID,
	})
	if code != http.StatusCreated {
		t.Fatalf("create: %d %s", code, body)
	}
	var ds struct{ ID string `json:"id"` }
	s.decode(body, &ds)

	// Get the image IDs
	code, body = s.get("/api/v1/characters/" + charID + "/images?era_id=" + eraID)
	var imgs []struct{ ImageID string `json:"image_id"` }
	s.decode(body, &imgs)
	ids := []string{}
	for _, img := range imgs {
		ids = append(ids, img.ImageID)
	}
	s.postJSON("/api/v1/datasets/"+ds.ID+"/images", map[string]any{"image_ids": ids})

	outDir := s.testOutputDir()
	s.postJSON("/api/v1/datasets/"+ds.ID+"/export", map[string]any{
		"output_dir": outDir,
		"naming":     "sequential",
	})

	// Should have sequential names
	entries, _ := os.ReadDir(outDir)
	names := map[string]bool{}
	for _, e := range entries {
		names[e.Name()] = true
	}
	if !names["0001.png"] {
		t.Error("expected 0001.png in sequential export")
	}
	if !names["0002.png"] {
		t.Error("expected 0002.png in sequential export")
	}
}
