package integration_test

import (
	"fmt"
	"testing"
)

// ===== Wardrobe (Garment) =====

func TestWardrobe_CRUD(t *testing.T) {
	s := newTestServer(t)

	// Create
	code, body := s.postJSON("/api/v1/wardrobe", map[string]any{
		"name":            "Silk Slip Dress",
		"category":        "dress",
		"occasion_energy": "formal",
		"era":             "contemporary",
		"material":        "silk",
		"color":           "midnight navy",
	})
	if code != 201 {
		t.Fatalf("create garment: %d %s", code, body)
	}
	var created struct {
		ID       string `json:"id"`
		Name     string `json:"name"`
		Category string `json:"category"`
		Status   string `json:"status"`
	}
	s.decode(body, &created)
	if created.Name != "Silk Slip Dress" {
		t.Errorf("name = %q", created.Name)
	}
	if created.Status != "ingested" {
		t.Errorf("status = %q, want ingested", created.Status)
	}

	// Get detail
	code, body = s.get("/api/v1/wardrobe/" + created.ID)
	if code != 200 {
		t.Fatalf("get garment: %d", code)
	}
	var detail struct {
		Garment struct {
			ID       string `json:"id"`
			Category string `json:"category"`
			Material string `json:"material"`
		} `json:"garment"`
		Images   []any    `json:"images"`
		Affinity []string `json:"affinity"`
	}
	s.decode(body, &detail)
	if detail.Garment.Material != "silk" {
		t.Errorf("material = %q", detail.Garment.Material)
	}

	// Update
	code, _ = s.patchJSON("/api/v1/wardrobe/"+created.ID, map[string]any{
		"name":     "Updated Slip Dress",
		"category": "lingerie",
		"status":   "available",
	})
	if code != 200 {
		t.Fatalf("update garment: %d", code)
	}
	code, body = s.get("/api/v1/wardrobe/" + created.ID)
	s.decode(body, &detail)
	if detail.Garment.Category != "lingerie" {
		t.Errorf("category after update = %q", detail.Garment.Category)
	}

	// Delete
	code, _ = s.delete("/api/v1/wardrobe/" + created.ID)
	if code != 204 {
		t.Errorf("delete garment: %d", code)
	}
	code, _ = s.get("/api/v1/wardrobe/" + created.ID)
	if code != 404 {
		t.Errorf("get after delete: %d, want 404", code)
	}
}

func TestWardrobe_SearchAndFacets(t *testing.T) {
	s := newTestServer(t)

	// Create diverse garments
	garments := []map[string]any{
		{"name": "Red Cotton Dress", "category": "dress", "material": "cotton", "occasion_energy": "casual"},
		{"name": "Black Lace Bodysuit", "category": "lingerie", "material": "lace", "occasion_energy": "intimate"},
		{"name": "White Silk Blouse", "category": "top", "material": "silk", "occasion_energy": "formal"},
	}
	var ids []string
	for _, g := range garments {
		g["status"] = "available" // seed directly as available for search
		code, body := s.postJSON("/api/v1/wardrobe", g)
		if code != 201 {
			t.Fatalf("create: %d", code)
		}
		// Update to available
		var c struct{ ID string `json:"id"` }
		s.decode(body, &c)
		s.patchJSON("/api/v1/wardrobe/"+c.ID, map[string]any{"status": "available"})
		ids = append(ids, c.ID)
	}

	// FTS search
	code, body := s.get("/api/v1/wardrobe?q=silk")
	if code != 200 {
		t.Fatalf("search: %d", code)
	}
	var results []struct{ Name string `json:"name"` }
	s.decode(body, &results)
	if len(results) != 1 {
		t.Errorf("silk search: got %d, want 1", len(results))
	}

	// Category filter
	code, body = s.get("/api/v1/wardrobe?category=dress")
	s.decode(body, &results)
	if len(results) != 1 {
		t.Errorf("dress filter: got %d, want 1", len(results))
	}

	// Facets
	code, body = s.get("/api/v1/wardrobe/facets")
	if code != 200 {
		t.Fatalf("facets: %d", code)
	}
	var facets struct {
		Category map[string]int `json:"category"`
		Material map[string]int `json:"material"`
	}
	s.decode(body, &facets)
	if facets.Category["dress"] != 1 {
		t.Errorf("dress facet = %d", facets.Category["dress"])
	}
	if facets.Category["lingerie"] != 1 {
		t.Errorf("lingerie facet = %d", facets.Category["lingerie"])
	}
}

func TestWardrobe_Affinity(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Test Char", "Test", "cast")

	// Create garment
	code, body := s.postJSON("/api/v1/wardrobe", map[string]any{"name": "Test Garment", "category": "dress"})
	if code != 201 {
		t.Fatalf("create: %d", code)
	}
	var g struct{ ID string `json:"id"` }
	s.decode(body, &g)

	// Add affinity
	code, _ = s.postJSON(fmt.Sprintf("/api/v1/wardrobe/%s/affinity", g.ID), map[string]string{"character_id": charID})
	if code != 204 {
		t.Fatalf("add affinity: %d", code)
	}

	// List affinity
	code, body = s.get(fmt.Sprintf("/api/v1/wardrobe/%s/affinity", g.ID))
	var affinity []string
	s.decode(body, &affinity)
	if len(affinity) != 1 || affinity[0] != charID {
		t.Errorf("affinity = %v", affinity)
	}

	// Filter by character
	s.patchJSON("/api/v1/wardrobe/"+g.ID, map[string]any{"status": "available"})
	code, body = s.get("/api/v1/wardrobe?character=" + charID)
	var filtered []struct{ ID string `json:"id"` }
	s.decode(body, &filtered)
	if len(filtered) != 1 {
		t.Errorf("character filter: got %d, want 1", len(filtered))
	}

	// Remove affinity
	code, _ = s.delete(fmt.Sprintf("/api/v1/wardrobe/%s/affinity/%s", g.ID, charID))
	if code != 204 {
		t.Errorf("remove affinity: %d", code)
	}
	code, body = s.get(fmt.Sprintf("/api/v1/wardrobe/%s/affinity", g.ID))
	s.decode(body, &affinity)
	if len(affinity) != 0 {
		t.Errorf("affinity after remove: %v", affinity)
	}
}

func TestWardrobe_BulkStatus(t *testing.T) {
	s := newTestServer(t)

	var ids []string
	for i := 0; i < 3; i++ {
		code, body := s.postJSON("/api/v1/wardrobe", map[string]any{
			"name": fmt.Sprintf("Garment %d", i), "category": "top",
		})
		if code != 201 {
			t.Fatalf("create: %d", code)
		}
		var g struct{ ID string `json:"id"` }
		s.decode(body, &g)
		ids = append(ids, g.ID)
	}

	code, _ := s.putJSON("/api/v1/wardrobe/bulk-status", map[string]any{
		"ids": ids, "status": "available",
	})
	if code != 204 {
		t.Fatalf("bulk status: %d", code)
	}

	// Verify all are available
	for _, gid := range ids {
		code, body := s.get("/api/v1/wardrobe/" + gid)
		if code != 200 {
			t.Fatalf("get: %d", code)
		}
		var detail struct {
			Garment struct{ Status string `json:"status"` } `json:"garment"`
		}
		s.decode(body, &detail)
		if detail.Garment.Status != "available" {
			t.Errorf("garment %s status = %q", gid, detail.Garment.Status)
		}
	}
}

func TestWardrobe_ImageUpload(t *testing.T) {
	s := newTestServer(t)

	code, body := s.postJSON("/api/v1/wardrobe", map[string]any{"name": "Dress With Image", "category": "dress"})
	if code != 201 {
		t.Fatalf("create: %d", code)
	}
	var g struct{ ID string `json:"id"` }
	s.decode(body, &g)

	// Upload image
	png := testPNG(100, 150, 200)
	code, body = s.uploadFile(fmt.Sprintf("/api/v1/wardrobe/%s/images", g.ID), png, "test.png", nil)
	if code != 201 {
		t.Fatalf("upload image: %d %s", code, body)
	}
	var imgResult struct{ ImageID string `json:"image_id"` }
	s.decode(body, &imgResult)
	if imgResult.ImageID == "" {
		t.Fatal("no image_id returned")
	}

	// Verify garment now has primary image
	code, body = s.get("/api/v1/wardrobe/" + g.ID)
	var detail struct {
		Garment struct{ PrimaryImageID *string `json:"primary_image_id"` } `json:"garment"`
		Images  []struct{ ImageID string `json:"image_id"` }             `json:"images"`
	}
	s.decode(body, &detail)
	if detail.Garment.PrimaryImageID == nil {
		t.Error("primary_image_id is nil after upload")
	}
	if len(detail.Images) != 1 {
		t.Errorf("images count = %d", len(detail.Images))
	}
}

// ===== Hair =====

func TestHair_CRUD(t *testing.T) {
	s := newTestServer(t)

	// Create
	code, body := s.postJSON("/api/v1/hair", map[string]any{
		"name":    "Victory Rolls",
		"length":  "medium",
		"texture": "wavy",
		"style":   "structured",
		"color":   "honey blonde",
	})
	if code != 201 {
		t.Fatalf("create: %d %s", code, body)
	}
	var created struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		Length  string `json:"length"`
		Texture string `json:"texture"`
		Status  string `json:"status"`
	}
	s.decode(body, &created)
	if created.Name != "Victory Rolls" {
		t.Errorf("name = %q", created.Name)
	}
	if created.Status != "ingested" {
		t.Errorf("status = %q", created.Status)
	}

	// Get detail
	code, body = s.get("/api/v1/hair/" + created.ID)
	if code != 200 {
		t.Fatalf("get: %d", code)
	}
	var detail struct {
		Hairstyle struct {
			Length  string `json:"length"`
			Texture string `json:"texture"`
			Color   string `json:"color"`
		} `json:"hairstyle"`
		Images   []any    `json:"images"`
		Affinity []string `json:"affinity"`
	}
	s.decode(body, &detail)
	if detail.Hairstyle.Color != "honey blonde" {
		t.Errorf("color = %q", detail.Hairstyle.Color)
	}

	// Update
	code, _ = s.patchJSON("/api/v1/hair/"+created.ID, map[string]any{
		"name":   "Updated Rolls",
		"length": "long",
		"status": "available",
	})
	if code != 200 {
		t.Fatalf("update: %d", code)
	}

	// Delete
	code, _ = s.delete("/api/v1/hair/" + created.ID)
	if code != 204 {
		t.Errorf("delete: %d", code)
	}
	code, _ = s.get("/api/v1/hair/" + created.ID)
	if code != 404 {
		t.Errorf("get after delete: %d, want 404", code)
	}
}

func TestHair_SearchAndFacets(t *testing.T) {
	s := newTestServer(t)

	hairs := []map[string]any{
		{"name": "Loose Beach Waves", "length": "long", "texture": "wavy"},
		{"name": "Tight Braided Crown", "length": "medium", "texture": "curly", "style": "braids"},
		{"name": "Sleek Pixie Cut", "length": "pixie", "texture": "straight"},
	}
	for _, h := range hairs {
		code, body := s.postJSON("/api/v1/hair", h)
		if code != 201 {
			t.Fatalf("create: %d %s", code, body)
		}
		var c struct{ ID string `json:"id"` }
		s.decode(body, &c)
		s.patchJSON("/api/v1/hair/"+c.ID, map[string]any{"status": "available"})
	}

	// FTS search
	code, body := s.get("/api/v1/hair?q=beach")
	if code != 200 {
		t.Fatalf("search: %d", code)
	}
	var results []struct{ Name string `json:"name"` }
	s.decode(body, &results)
	if len(results) != 1 {
		t.Errorf("beach search: got %d, want 1", len(results))
	}

	// Texture filter
	code, body = s.get("/api/v1/hair?texture=wavy")
	s.decode(body, &results)
	if len(results) != 1 {
		t.Errorf("wavy filter: got %d, want 1", len(results))
	}

	// Facets
	code, body = s.get("/api/v1/hair/facets")
	var facets struct {
		Length  map[string]int `json:"length"`
		Texture map[string]int `json:"texture"`
	}
	s.decode(body, &facets)
	if facets.Texture["wavy"] != 1 {
		t.Errorf("wavy facet = %d", facets.Texture["wavy"])
	}
}

func TestHair_Affinity(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Hair Model", "Model", "cast")

	code, body := s.postJSON("/api/v1/hair", map[string]any{"name": "Test Style", "length": "long"})
	if code != 201 {
		t.Fatalf("create: %d", code)
	}
	var h struct{ ID string `json:"id"` }
	s.decode(body, &h)

	// Add
	code, _ = s.postJSON(fmt.Sprintf("/api/v1/hair/%s/affinity", h.ID), map[string]string{"character_id": charID})
	if code != 204 {
		t.Fatalf("add affinity: %d", code)
	}

	// Verify
	code, body = s.get(fmt.Sprintf("/api/v1/hair/%s/affinity", h.ID))
	var affinity []string
	s.decode(body, &affinity)
	if len(affinity) != 1 {
		t.Errorf("affinity count = %d", len(affinity))
	}

	// Remove
	s.delete(fmt.Sprintf("/api/v1/hair/%s/affinity/%s", h.ID, charID))
	code, body = s.get(fmt.Sprintf("/api/v1/hair/%s/affinity", h.ID))
	s.decode(body, &affinity)
	if len(affinity) != 0 {
		t.Errorf("affinity after remove = %d", len(affinity))
	}
}

// ===== Stylist =====

func TestStylist_SessionLifecycle(t *testing.T) {
	s := newTestServer(t)

	// No active session initially
	code, body := s.get("/api/v1/stylist/sessions/active")
	if code != 200 {
		t.Fatalf("active: %d", code)
	}

	// Start session
	charID := s.createCharacter("Styled Char", "Styled", "cast")
	code, body = s.postJSON("/api/v1/stylist/sessions", map[string]any{
		"context": map[string]string{
			"screen":       "era_workspace",
			"character_id": charID,
		},
	})
	if code != 201 {
		t.Fatalf("start session: %d %s", code, body)
	}
	var session struct {
		ID      string `json:"id"`
		Context struct {
			Screen      string `json:"screen"`
			CharacterID string `json:"character_id"`
		} `json:"context"`
		EndedAt *string `json:"ended_at"`
	}
	s.decode(body, &session)
	if session.ID == "" {
		t.Fatal("empty session ID")
	}
	if session.Context.CharacterID != charID {
		t.Errorf("context.character_id = %q", session.Context.CharacterID)
	}
	if session.EndedAt != nil {
		t.Error("session should not be ended")
	}

	// Active session
	code, body = s.get("/api/v1/stylist/sessions/active")
	if code != 200 {
		t.Fatalf("active: %d", code)
	}
	var active struct{ ID string `json:"id"` }
	s.decode(body, &active)
	if active.ID != session.ID {
		t.Errorf("active session ID = %q, want %q", active.ID, session.ID)
	}

	// Send message
	code, body = s.postJSON(fmt.Sprintf("/api/v1/stylist/sessions/%s/messages", session.ID), map[string]string{
		"content": "Style this character in a 1950s pin-up look",
	})
	if code != 201 {
		t.Fatalf("send message: %d %s", code, body)
	}
	var msg struct {
		ID      string `json:"id"`
		Role    string `json:"role"`
		Content string `json:"content"`
	}
	s.decode(body, &msg)
	if msg.Role != "user" {
		t.Errorf("role = %q", msg.Role)
	}

	// Get session with messages
	code, body = s.get(fmt.Sprintf("/api/v1/stylist/sessions/%s", session.ID))
	var fullSession struct {
		Messages []struct {
			ID      string `json:"id"`
			Content string `json:"content"`
		} `json:"messages"`
	}
	s.decode(body, &fullSession)
	if len(fullSession.Messages) != 1 {
		t.Errorf("messages count = %d, want 1", len(fullSession.Messages))
	}

	// End session
	code, _ = s.patchJSON(fmt.Sprintf("/api/v1/stylist/sessions/%s", session.ID), nil)
	if code != 204 {
		t.Errorf("end session: %d", code)
	}

	// Verify ended
	code, body = s.get(fmt.Sprintf("/api/v1/stylist/sessions/%s", session.ID))
	var ended struct{ EndedAt *string `json:"ended_at"` }
	s.decode(body, &ended)
	if ended.EndedAt == nil {
		t.Error("session should be ended")
	}

	// Can't send to ended session
	code, _ = s.postJSON(fmt.Sprintf("/api/v1/stylist/sessions/%s/messages", session.ID), map[string]string{
		"content": "this should fail",
	})
	if code != 400 {
		t.Errorf("send to ended: %d, want 400", code)
	}
}

func TestStylist_NewSessionEndsActive(t *testing.T) {
	s := newTestServer(t)

	// Start first session
	code, body := s.postJSON("/api/v1/stylist/sessions", map[string]any{
		"context": map[string]string{"screen": "library"},
	})
	if code != 201 {
		t.Fatalf("start 1: %d", code)
	}
	var sess1 struct{ ID string `json:"id"` }
	s.decode(body, &sess1)

	// Start second session — should end first
	code, body = s.postJSON("/api/v1/stylist/sessions", map[string]any{
		"context": map[string]string{"screen": "wardrobe"},
	})
	if code != 201 {
		t.Fatalf("start 2: %d", code)
	}
	var sess2 struct{ ID string `json:"id"` }
	s.decode(body, &sess2)

	// First should be ended
	code, body = s.get(fmt.Sprintf("/api/v1/stylist/sessions/%s", sess1.ID))
	var first struct{ EndedAt *string `json:"ended_at"` }
	s.decode(body, &first)
	if first.EndedAt == nil {
		t.Error("first session should be ended after starting second")
	}

	// List should show both
	code, body = s.get("/api/v1/stylist/sessions")
	var sessions []struct{ ID string `json:"id"` }
	s.decode(body, &sessions)
	if len(sessions) != 2 {
		t.Errorf("session count = %d, want 2", len(sessions))
	}
}

func TestStylist_EmptyMessage(t *testing.T) {
	s := newTestServer(t)

	code, body := s.postJSON("/api/v1/stylist/sessions", map[string]any{
		"context": map[string]string{},
	})
	if code != 201 {
		t.Fatalf("start: %d", code)
	}
	var sess struct{ ID string `json:"id"` }
	s.decode(body, &sess)

	// Empty content should be rejected
	code, _ = s.postJSON(fmt.Sprintf("/api/v1/stylist/sessions/%s/messages", sess.ID), map[string]string{
		"content": "",
	})
	if code != 400 {
		t.Errorf("empty message: %d, want 400", code)
	}
}
