package stylist

import (
	"testing"
)

func testStore(t *testing.T) *SessionStore {
	t.Helper()
	return NewSessionStore(t.TempDir())
}

func TestStartAndGet(t *testing.T) {
	s := testStore(t)

	sess := s.Start(SessionContext{
		Screen:      "era_workspace",
		CharacterID: "abc123",
		EraID:       "era456",
	})

	if sess.ID == "" {
		t.Fatal("expected non-empty session ID")
	}
	if !sess.IsActive() {
		t.Fatal("expected active session")
	}
	if sess.Context.CharacterID != "abc123" {
		t.Errorf("CharacterID = %q", sess.Context.CharacterID)
	}

	got := s.Get(sess.ID)
	if got == nil {
		t.Fatal("Get returned nil")
	}
	if got.ID != sess.ID {
		t.Errorf("ID mismatch")
	}
}

func TestGetNotFound(t *testing.T) {
	s := testStore(t)
	if s.Get("nonexistent") != nil {
		t.Error("expected nil for nonexistent session")
	}
}

func TestStartEndsActiveSession(t *testing.T) {
	s := testStore(t)

	sess1 := s.Start(SessionContext{})
	sess2 := s.Start(SessionContext{})

	// sess1 should be ended now.
	got := s.Get(sess1.ID)
	if got.IsActive() {
		t.Error("expected sess1 to be ended after starting sess2")
	}

	// sess2 should be active.
	got = s.Get(sess2.ID)
	if !got.IsActive() {
		t.Error("expected sess2 to be active")
	}
}

func TestActive(t *testing.T) {
	s := testStore(t)

	if s.Active() != nil {
		t.Error("expected no active session initially")
	}

	sess := s.Start(SessionContext{CharacterID: "x"})
	active := s.Active()
	if active == nil || active.ID != sess.ID {
		t.Error("Active() should return the session just started")
	}
}

func TestEnd(t *testing.T) {
	s := testStore(t)
	sess := s.Start(SessionContext{})

	if err := s.End(sess.ID); err != nil {
		t.Fatalf("End: %v", err)
	}

	got := s.Get(sess.ID)
	if got.IsActive() {
		t.Error("expected session to be ended")
	}

	// Ending again is idempotent.
	if err := s.End(sess.ID); err != nil {
		t.Fatalf("End idempotent: %v", err)
	}
}

func TestEndNotFound(t *testing.T) {
	s := testStore(t)
	if err := s.End("nonexistent"); err == nil {
		t.Error("expected error for nonexistent session")
	}
}

func TestSendMessage(t *testing.T) {
	s := testStore(t)
	sess := s.Start(SessionContext{})

	msg, err := s.SendMessage(sess.ID, "Style this character in a vintage look")
	if err != nil {
		t.Fatalf("SendMessage: %v", err)
	}
	if msg.Role != RoleUser {
		t.Errorf("Role = %q, want user", msg.Role)
	}
	if msg.Content != "Style this character in a vintage look" {
		t.Errorf("Content = %q", msg.Content)
	}

	got := s.Get(sess.ID)
	if len(got.Messages) != 1 {
		t.Fatalf("expected 1 message, got %d", len(got.Messages))
	}
}

func TestSendMessageToEndedSession(t *testing.T) {
	s := testStore(t)
	sess := s.Start(SessionContext{})
	s.End(sess.ID)

	_, err := s.SendMessage(sess.ID, "hello")
	if err == nil {
		t.Error("expected error when sending to ended session")
	}
}

func TestAddStylistMessage(t *testing.T) {
	s := testStore(t)
	sess := s.Start(SessionContext{})

	images := []MessageImage{
		{ID: "img1", ThumbURL: "/thumb/1", FullURL: "/full/1"},
		{ID: "img2", ThumbURL: "/thumb/2", FullURL: "/full/2"},
	}
	msg, err := s.AddStylistMessage(sess.ID, "Here are three options", images)
	if err != nil {
		t.Fatalf("AddStylistMessage: %v", err)
	}
	if msg.Role != RoleStylist {
		t.Errorf("Role = %q", msg.Role)
	}
	if len(msg.Images) != 2 {
		t.Errorf("Images count = %d", len(msg.Images))
	}

	got := s.Get(sess.ID)
	if len(got.Messages) != 1 {
		t.Fatalf("expected 1 message, got %d", len(got.Messages))
	}
	if len(got.Messages[0].Images) != 2 {
		t.Error("images not persisted")
	}
}

func TestList(t *testing.T) {
	s := testStore(t)
	s.Start(SessionContext{CharacterID: "a"})
	s.Start(SessionContext{CharacterID: "b"})

	list := s.List()
	if len(list) != 2 {
		t.Fatalf("expected 2 sessions, got %d", len(list))
	}
	// Newest first.
	if list[0].Context.CharacterID != "b" {
		t.Error("expected newest session first")
	}
	// Messages should not be included in list.
	if list[0].Messages != nil {
		t.Error("expected nil messages in list view")
	}
}

func TestPersistenceRoundTrip(t *testing.T) {
	dir := t.TempDir()

	// Create and populate.
	s1 := NewSessionStore(dir)
	sess := s1.Start(SessionContext{CharacterID: "persist-test"})
	s1.SendMessage(sess.ID, "hello")
	s1.AddStylistMessage(sess.ID, "hi there", nil)

	// Load from same directory.
	s2 := NewSessionStore(dir)
	got := s2.Get(sess.ID)
	if got == nil {
		t.Fatal("session not loaded from disk")
	}
	if got.Context.CharacterID != "persist-test" {
		t.Errorf("CharacterID = %q", got.Context.CharacterID)
	}
	if len(got.Messages) != 2 {
		t.Fatalf("expected 2 messages after reload, got %d", len(got.Messages))
	}
}

func TestGetReturnsCopy(t *testing.T) {
	s := testStore(t)
	sess := s.Start(SessionContext{})
	s.SendMessage(sess.ID, "original")

	got := s.Get(sess.ID)
	got.Messages = append(got.Messages, Message{Content: "injected"})

	// Original should be unaffected.
	got2 := s.Get(sess.ID)
	if len(got2.Messages) != 1 {
		t.Errorf("mutation leaked: got %d messages", len(got2.Messages))
	}
}
