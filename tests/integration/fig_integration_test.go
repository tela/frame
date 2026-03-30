package integration_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/tela/frame/pkg/api"
	"github.com/tela/frame/pkg/audit"
	"github.com/tela/frame/pkg/character"
	"github.com/tela/frame/pkg/database"
	"github.com/tela/frame/pkg/dataset"
	"github.com/tela/frame/pkg/fig"
	"github.com/tela/frame/pkg/garment"
	"github.com/tela/frame/pkg/hairstyle"
	"github.com/tela/frame/pkg/stylist"
	"github.com/tela/frame/pkg/image"
	"github.com/tela/frame/pkg/look"
	"github.com/tela/frame/pkg/lora"
	"github.com/tela/frame/pkg/media"
	"github.com/tela/frame/pkg/poseset"
	"github.com/tela/frame/pkg/preprocess"
	"github.com/tela/frame/pkg/server"
	"github.com/tela/frame/pkg/shoot"
	"github.com/tela/frame/pkg/tag"
	"github.com/tela/frame/pkg/template"
)

// mockFig records requests that Frame sends to Fig.
type mockFig struct {
	mu       sync.Mutex
	requests []mockFigRequest
	mux      *http.ServeMux
}

type mockFigRequest struct {
	Method string
	Path   string
	Body   map[string]any
}

func newMockFig() *mockFig {
	m := &mockFig{
		mux: http.NewServeMux(),
	}

	// Status endpoint (health check)
	m.mux.HandleFunc("GET /api/v1/status", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// Character register
	m.mux.HandleFunc("POST /api/v1/characters/register", func(w http.ResponseWriter, r *http.Request) {
		m.record(r)
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"status": "registered"})
	})

	// Character status update
	m.mux.HandleFunc("PUT /api/v1/characters/{id}/status", func(w http.ResponseWriter, r *http.Request) {
		m.record(r)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
	})

	// Era push
	m.mux.HandleFunc("POST /api/v1/characters/{id}/eras", func(w http.ResponseWriter, r *http.Request) {
		m.record(r)
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"status": "created"})
	})

	// Media registration endpoints
	for _, path := range []string{
		"POST /api/v1/wardrobe/garments",
		"POST /api/v1/props",
		"POST /api/v1/locations",
	} {
		m.mux.HandleFunc(path, func(w http.ResponseWriter, r *http.Request) {
			m.record(r)
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]string{"status": "created"})
		})
	}

	return m
}

func (m *mockFig) record(r *http.Request) {
	var body map[string]any
	json.NewDecoder(r.Body).Decode(&body)
	m.mu.Lock()
	m.requests = append(m.requests, mockFigRequest{
		Method: r.Method,
		Path:   r.URL.Path,
		Body:   body,
	})
	m.mu.Unlock()
}

func (m *mockFig) getRequests() []mockFigRequest {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]mockFigRequest, len(m.requests))
	copy(out, m.requests)
	return out
}

// newTestServerWithFig creates a test server wired to a mock Fig instance.
func newTestServerWithFig(t *testing.T, mock *mockFig) *testServer {
	t.Helper()
	rootDir := t.TempDir()

	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	// Start mock Fig HTTP server
	figServer := httptest.NewServer(mock.mux)
	t.Cleanup(figServer.Close)

	// Create Fig client pointing to mock
	figClient := fig.New(figServer.URL, "")
	figClient.Start(100 * time.Millisecond)
	t.Cleanup(figClient.Stop)

	// Wait for health check to mark available
	time.Sleep(200 * time.Millisecond)

	charStore := character.NewStore(db.DB)
	imgStore := image.NewStore(db.DB)
	mediaStore := media.NewStore(db.DB)
	tagStore := tag.NewStore(db.DB)
	datasetStore := dataset.NewStore(db.DB)
	preprocessStore := preprocess.NewStore(db.DB)
	templateStore := template.NewStore(db.DB)
	shootStore := shoot.NewStore(db.DB)
	auditStore := audit.NewStore(db.DB)
	lookStore := look.NewStore(db.DB)
	loraStore := lora.NewStore(db.DB)
	poseSetStore := poseset.NewStore(db.DB)
	garmentStore := garment.NewStore(db.DB)
	hairstyleStore := hairstyle.NewStore(db.DB)
	stylistStore := stylist.NewSessionStore(rootDir)
	ingester := image.NewIngester(imgStore, rootDir)

	srv := server.New(db, "test")
	a := &api.API{
		Characters: charStore,
		Images:     imgStore,
		Ingester:   ingester,
		Media:      mediaStore,
		Tags:       tagStore,
		Datasets:   datasetStore,
		Preprocess: preprocessStore,
		Templates:  templateStore,
		Shoots:     shootStore,
		Audit:      auditStore,
		Looks:      lookStore,
		Loras:      loraStore,
		PoseSet:    poseSetStore,
		Garments:   garmentStore,
		Hairstyles: hairstyleStore,
		Stylist:    stylistStore,
		Fig:        figClient,
		RootPath:   rootDir,
		Port:       0,
	}
	a.Register(srv.Mux())

	ts := httptest.NewServer(srv.Mux())
	t.Cleanup(ts.Close)

	return &testServer{server: ts, rootDir: rootDir, t: t}
}

func TestPublishToFig(t *testing.T) {
	mock := newMockFig()
	s := newTestServerWithFig(t, mock)

	// Create a prospect character
	charID := s.createCharacter("Nyx", "Nyx", "prospect")

	// Create an era for the character
	s.createEra(charID, "Young Adult")

	// Publish to Fig
	code, body := s.postJSON("/api/v1/characters/"+charID+"/publish", nil)
	if code != 200 {
		t.Fatalf("publish: status %d, body: %s", code, body)
	}

	// Verify Fig received the registration
	time.Sleep(50 * time.Millisecond) // fire-and-forget needs a moment
	reqs := mock.getRequests()

	var regReq *mockFigRequest
	for i := range reqs {
		if reqs[i].Path == "/api/v1/characters/register" {
			regReq = &reqs[i]
			break
		}
	}
	if regReq == nil {
		t.Fatal("expected registration request to Fig")
	}
	if regReq.Body["id"] != charID {
		t.Errorf("id: got %v, want %s", regReq.Body["id"], charID)
	}
	if regReq.Body["source"] != "frame" {
		t.Errorf("source: got %v, want frame", regReq.Body["source"])
	}
	if regReq.Body["status"] != "prospect" {
		t.Errorf("status: got %v, want prospect", regReq.Body["status"])
	}
	// Check eras array is present (Standard auto-era + manually created "Young Adult")
	eras, ok := regReq.Body["eras"].([]any)
	if !ok || len(eras) != 2 {
		t.Errorf("expected 2 eras in registration (Standard + Young Adult), got %v", regReq.Body["eras"])
	}

	// Verify character is marked as published
	code, body = s.get("/api/v1/characters/" + charID)
	if code != 200 {
		t.Fatalf("get character: status %d", code)
	}
	var charResp struct {
		FigPublished bool `json:"fig_published"`
	}
	s.decode(body, &charResp)
	if !charResp.FigPublished {
		t.Error("expected fig_published=true after publish")
	}
}

func TestPublishToFigAlreadyPublished(t *testing.T) {
	mock := newMockFig()
	s := newTestServerWithFig(t, mock)

	charID := s.createCharacter("Nyx", "Nyx", "prospect")

	// First publish succeeds
	code, _ := s.postJSON("/api/v1/characters/"+charID+"/publish", nil)
	if code != 200 {
		t.Fatalf("first publish: status %d", code)
	}

	// Second publish returns 409
	code, _ = s.postJSON("/api/v1/characters/"+charID+"/publish", nil)
	if code != 409 {
		t.Fatalf("second publish: got %d, want 409", code)
	}
}

func TestPublishToFigNotAvailable(t *testing.T) {
	s := newTestServer(t) // no Fig client

	charID := s.createCharacter("Nyx", "Nyx", "prospect")

	code, _ := s.postJSON("/api/v1/characters/"+charID+"/publish", nil)
	if code != 503 {
		t.Fatalf("publish without Fig: got %d, want 503", code)
	}
}

func TestStatusSyncToFig(t *testing.T) {
	mock := newMockFig()
	s := newTestServerWithFig(t, mock)

	// Create and publish
	charID := s.createCharacter("Nyx", "Nyx", "prospect")
	s.postJSON("/api/v1/characters/"+charID+"/publish", nil)

	// Advance to development
	code, _ := s.patchJSON("/api/v1/characters/"+charID, map[string]string{"status": "development"})
	if code != 200 {
		t.Fatalf("update status: status %d", code)
	}

	// Wait for fire-and-forget
	time.Sleep(100 * time.Millisecond)

	reqs := mock.getRequests()
	var statusReq *mockFigRequest
	for i := range reqs {
		if reqs[i].Path == "/api/v1/characters/"+charID+"/status" {
			statusReq = &reqs[i]
			break
		}
	}
	if statusReq == nil {
		t.Fatal("expected status sync request to Fig")
	}
	if statusReq.Body["status"] != "development" {
		t.Errorf("synced status: got %v, want development", statusReq.Body["status"])
	}
}

func TestMediaSyncToFig(t *testing.T) {
	mock := newMockFig()
	s := newTestServerWithFig(t, mock)

	// Create a wardrobe item
	code, _ := s.postJSON("/api/v1/media/wardrobe", map[string]string{
		"id": "abcdef0123456789", "name": "Red Gown",
	})
	if code != 201 {
		t.Fatalf("create media: status %d", code)
	}

	// Wait for fire-and-forget
	time.Sleep(100 * time.Millisecond)

	reqs := mock.getRequests()
	var mediaReq *mockFigRequest
	for i := range reqs {
		if reqs[i].Path == "/api/v1/wardrobe/garments" {
			mediaReq = &reqs[i]
			break
		}
	}
	if mediaReq == nil {
		t.Fatal("expected media sync request to Fig")
	}
	if mediaReq.Body["id"] != "abcdef0123456789" {
		t.Errorf("media id: got %v", mediaReq.Body["id"])
	}
	if mediaReq.Body["name"] != "Red Gown" {
		t.Errorf("media name: got %v", mediaReq.Body["name"])
	}
	if mediaReq.Body["source"] != "frame" {
		t.Errorf("media source: got %v, want frame", mediaReq.Body["source"])
	}
}

func TestFigStatus(t *testing.T) {
	mock := newMockFig()
	s := newTestServerWithFig(t, mock)

	code, body := s.get("/api/v1/fig/status")
	if code != 200 {
		t.Fatalf("fig status: status %d", code)
	}
	var status struct {
		Available bool   `json:"available"`
		State     string `json:"state"`
	}
	s.decode(body, &status)
	if !status.Available {
		t.Error("expected Fig to be available")
	}
	if status.State != "available" {
		t.Errorf("state: got %q, want available", status.State)
	}
}

func TestFigStatusNotConfigured(t *testing.T) {
	s := newTestServer(t) // no Fig client

	code, body := s.get("/api/v1/fig/status")
	if code != 200 {
		t.Fatalf("fig status: status %d", code)
	}
	var status struct {
		Available bool   `json:"available"`
		Reason    string `json:"reason"`
	}
	s.decode(body, &status)
	if status.Available {
		t.Error("expected Fig to be unavailable")
	}
	if status.Reason != "not configured" {
		t.Errorf("reason: got %q", status.Reason)
	}
}

func TestHarmonizedLifecycle(t *testing.T) {
	s := newTestServer(t)

	// Valid statuses: prospect, development, cast
	for _, status := range []string{"prospect", "development", "cast"} {
		charID := s.createCharacter("Test-"+status, "Test", status)
		code, body := s.get("/api/v1/characters/" + charID)
		if code != 200 {
			t.Fatalf("get %s character: status %d", status, code)
		}
		var c struct {
			Status string `json:"status"`
		}
		s.decode(body, &c)
		if c.Status != status {
			t.Errorf("status: got %q, want %q", c.Status, status)
		}
	}

	// Default status should be prospect
	code, body := s.postJSON("/api/v1/characters", map[string]string{"name": "DefaultStatus"})
	if code != 201 {
		t.Fatalf("create default: status %d, body: %s", code, body)
	}
	var c struct {
		Status string `json:"status"`
	}
	s.decode(body, &c)
	if c.Status != "prospect" {
		t.Errorf("default status: got %q, want prospect", c.Status)
	}
}

func TestEraSyncToFig(t *testing.T) {
	mock := newMockFig()
	s := newTestServerWithFig(t, mock)

	// Create and publish a character
	charID := s.createCharacter("Esme", "Esme", "development")
	s.postJSON("/api/v1/characters/"+charID+"/publish", nil)

	// Create an era — should sync to Fig since character is published
	code, body := s.postJSON("/api/v1/characters/"+charID+"/eras", map[string]any{
		"label":      "Young Adult",
		"age_range":  "18-24",
		"time_period": "Present day",
		"sort_order":  1,
	})
	if code != 201 {
		t.Fatalf("create era: status %d, body: %s", code, body)
	}

	// Wait for fire-and-forget
	time.Sleep(100 * time.Millisecond)

	reqs := mock.getRequests()
	var eraReq *mockFigRequest
	for i := range reqs {
		if reqs[i].Method == "POST" && reqs[i].Path == "/api/v1/characters/"+charID+"/eras" {
			eraReq = &reqs[i]
			break
		}
	}
	if eraReq == nil {
		t.Fatal("expected era sync request to Fig")
	}
	if eraReq.Body["label"] != "Young Adult" {
		t.Errorf("era label: got %v, want Young Adult", eraReq.Body["label"])
	}
	if eraReq.Body["age_range"] != "18-24" {
		t.Errorf("era age_range: got %v, want 18-24", eraReq.Body["age_range"])
	}
}

func TestEraSyncSkippedWhenNotPublished(t *testing.T) {
	mock := newMockFig()
	s := newTestServerWithFig(t, mock)

	// Create character but DON'T publish
	charID := s.createCharacter("Private", "Private", "prospect")

	// Create an era — should NOT sync to Fig
	code, _ := s.postJSON("/api/v1/characters/"+charID+"/eras", map[string]any{
		"label": "Early Years",
	})
	if code != 201 {
		t.Fatalf("create era: status %d", code)
	}

	time.Sleep(100 * time.Millisecond)

	// Only the health check should have been recorded, no era push
	reqs := mock.getRequests()
	for _, r := range reqs {
		if r.Path == "/api/v1/characters/"+charID+"/eras" {
			t.Error("expected no era sync for unpublished character")
		}
	}
}
