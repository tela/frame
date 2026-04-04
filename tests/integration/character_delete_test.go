package integration_test

import (
	"net/http"
	"testing"
)

func TestCharacter_DeleteProspect(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Delete Me", "Delete Me", "prospect")
	_ = s.ingestImage(charID, 10)
	_ = s.ingestImage(charID, 20)

	code, _ := s.delete("/api/v1/characters/" + charID)
	if code != http.StatusNoContent {
		t.Fatalf("delete prospect: expected 204, got %d", code)
	}

	// Character should be gone
	code, _ = s.get("/api/v1/characters/" + charID)
	if code != http.StatusNotFound {
		t.Fatalf("get deleted: expected 404, got %d", code)
	}
}

func TestCharacter_DeleteDevelopmentReturns409(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("No Delete", "No Delete", "development")

	code, _ := s.delete("/api/v1/characters/" + charID)
	if code != http.StatusConflict {
		t.Fatalf("delete development: expected 409, got %d", code)
	}

	// Character should still exist
	code, _ = s.get("/api/v1/characters/" + charID)
	if code != http.StatusOK {
		t.Fatalf("get after failed delete: expected 200, got %d", code)
	}
}

func TestCharacter_DeleteCastReturns409(t *testing.T) {
	s := newTestServer(t)
	charID := s.createCharacter("Cast No Delete", "Cast No Delete", "cast")

	code, _ := s.delete("/api/v1/characters/" + charID)
	if code != http.StatusConflict {
		t.Fatalf("delete cast: expected 409, got %d", code)
	}
}

func TestCharacter_ArchiveFromAnyStatus(t *testing.T) {
	s := newTestServer(t)

	// Archive from prospect
	c1 := s.createCharacter("Archive Prospect", "AP", "prospect")
	code, _ := s.patchJSON("/api/v1/characters/"+c1, map[string]string{"status": "archived"})
	if code != http.StatusOK {
		t.Fatalf("archive prospect: expected 200, got %d", code)
	}

	// Archive from development
	c2 := s.createCharacter("Archive Dev", "AD", "development")
	code, _ = s.patchJSON("/api/v1/characters/"+c2, map[string]string{"status": "archived"})
	if code != http.StatusOK {
		t.Fatalf("archive development: expected 200, got %d", code)
	}

	// Archive from cast
	c3 := s.createCharacter("Archive Cast", "AC", "cast")
	code, _ = s.patchJSON("/api/v1/characters/"+c3, map[string]string{"status": "archived"})
	if code != http.StatusOK {
		t.Fatalf("archive cast: expected 200, got %d", code)
	}

	// Verify all are archived
	for _, id := range []string{c1, c2, c3} {
		code, body := s.get("/api/v1/characters/" + id)
		if code != http.StatusOK {
			t.Fatalf("get archived: expected 200, got %d", code)
		}
		var char struct{ Status string `json:"status"` }
		s.decode(body, &char)
		if char.Status != "archived" {
			t.Errorf("character %s status = %s, want archived", id, char.Status)
		}
	}
}

func TestCharacter_DeleteNonexistentReturns404(t *testing.T) {
	s := newTestServer(t)
	code, _ := s.delete("/api/v1/characters/nonexistent")
	if code != http.StatusNotFound {
		t.Fatalf("delete nonexistent: expected 404, got %d", code)
	}
}
