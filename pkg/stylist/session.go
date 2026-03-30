package stylist

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// SessionStore manages stylist conversation sessions with file-backed persistence.
type SessionStore struct {
	mu       sync.RWMutex
	sessions map[string]*Session
	dataDir  string
}

// NewSessionStore creates a session store and loads any persisted sessions from disk.
func NewSessionStore(dataDir string) *SessionStore {
	s := &SessionStore{
		sessions: make(map[string]*Session),
		dataDir:  filepath.Join(dataDir, "stylist-sessions"),
	}
	s.loadFromDisk()
	return s
}

// Get returns a session by ID, or nil if not found.
func (s *SessionStore) Get(id string) *Session {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sess := s.sessions[id]
	if sess == nil {
		return nil
	}
	// Return a copy to prevent mutation.
	cp := *sess
	cp.Messages = make([]Message, len(sess.Messages))
	copy(cp.Messages, sess.Messages)
	return &cp
}

// List returns all sessions, newest first.
func (s *SessionStore) List() []Session {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]Session, 0, len(s.sessions))
	for _, sess := range s.sessions {
		cp := *sess
		cp.Messages = nil // Don't include messages in list view.
		out = append(out, cp)
	}

	// Sort newest first.
	for i := 0; i < len(out); i++ {
		for j := i + 1; j < len(out); j++ {
			if out[j].StartedAt.After(out[i].StartedAt) {
				out[i], out[j] = out[j], out[i]
			}
		}
	}
	return out
}

// Active returns the most recent active session, or nil.
func (s *SessionStore) Active() *Session {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var latest *Session
	for _, sess := range s.sessions {
		if sess.IsActive() {
			if latest == nil || sess.StartedAt.After(latest.StartedAt) {
				latest = sess
			}
		}
	}
	if latest == nil {
		return nil
	}
	cp := *latest
	cp.Messages = make([]Message, len(latest.Messages))
	copy(cp.Messages, latest.Messages)
	return &cp
}

// Start creates a new session. If there's an active session, it's ended first.
func (s *SessionStore) Start(ctx SessionContext) *Session {
	s.mu.Lock()
	defer s.mu.Unlock()

	// End any active session.
	for _, sess := range s.sessions {
		if sess.IsActive() {
			now := time.Now().UTC()
			sess.EndedAt = &now
			s.persist(sess)
		}
	}

	sess := &Session{
		ID:        fmt.Sprintf("ss-%d", time.Now().UnixNano()),
		Context:   ctx,
		Messages:  []Message{},
		StartedAt: time.Now().UTC(),
	}
	s.sessions[sess.ID] = sess
	s.persist(sess)
	return sess
}

// End marks a session as ended.
func (s *SessionStore) End(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess, ok := s.sessions[id]
	if !ok {
		return fmt.Errorf("session not found: %s", id)
	}
	if sess.EndedAt != nil {
		return nil // Already ended.
	}
	now := time.Now().UTC()
	sess.EndedAt = &now
	s.persist(sess)
	return nil
}

// SendMessage adds a user message to the session.
func (s *SessionStore) SendMessage(sessionID, content string) (*Message, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess, ok := s.sessions[sessionID]
	if !ok {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}
	if sess.EndedAt != nil {
		return nil, fmt.Errorf("session is ended")
	}

	msg := Message{
		ID:     fmt.Sprintf("msg-%d", time.Now().UnixNano()),
		Role:   RoleUser,
		Content: content,
		SentAt: time.Now().UTC(),
	}
	sess.Messages = append(sess.Messages, msg)
	s.persist(sess)
	return &msg, nil
}

// AddStylistMessage adds a stylist response to the session. Used by the agent loop.
func (s *SessionStore) AddStylistMessage(sessionID, content string, images []MessageImage) (*Message, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	sess, ok := s.sessions[sessionID]
	if !ok {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}

	msg := Message{
		ID:      fmt.Sprintf("msg-%d", time.Now().UnixNano()),
		Role:    RoleStylist,
		Content: content,
		Images:  images,
		SentAt:  time.Now().UTC(),
	}
	sess.Messages = append(sess.Messages, msg)
	s.persist(sess)
	return &msg, nil
}

// persist writes a session to disk as JSON.
func (s *SessionStore) persist(sess *Session) {
	if err := os.MkdirAll(s.dataDir, 0o700); err != nil {
		return
	}
	data, err := json.MarshalIndent(sess, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile(filepath.Join(s.dataDir, sess.ID+".json"), data, 0o600)
}

// loadFromDisk reads persisted sessions from the data directory.
func (s *SessionStore) loadFromDisk() {
	entries, err := os.ReadDir(s.dataDir)
	if err != nil {
		return
	}
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}
		data, err := os.ReadFile(filepath.Join(s.dataDir, entry.Name()))
		if err != nil {
			continue
		}
		var sess Session
		if err := json.Unmarshal(data, &sess); err != nil {
			continue
		}
		s.sessions[sess.ID] = &sess
	}
}
