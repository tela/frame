package integration_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/tela/frame/pkg/api"
	"github.com/tela/frame/pkg/audit"
	"github.com/tela/frame/pkg/character"
	"github.com/tela/frame/pkg/database"
	"github.com/tela/frame/pkg/dataset"
	"github.com/tela/frame/pkg/image"
	"github.com/tela/frame/pkg/look"
	"github.com/tela/frame/pkg/lora"
	"github.com/tela/frame/pkg/garment"
	"github.com/tela/frame/pkg/hairstyle"
	"github.com/tela/frame/pkg/media"
	"github.com/tela/frame/pkg/stylist"
	"github.com/tela/frame/pkg/poseset"
	"github.com/tela/frame/pkg/preprocess"
	"github.com/tela/frame/pkg/server"
	"github.com/tela/frame/pkg/shoot"
	"github.com/tela/frame/pkg/tag"
	"github.com/tela/frame/pkg/template"
)

// testServer holds a fully wired Frame server for integration testing.
type testServer struct {
	server  *httptest.Server
	rootDir string
	t       *testing.T
}

func newTestServer(t *testing.T) *testServer {
	t.Helper()
	rootDir := t.TempDir()

	db, err := database.Open(":memory:")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { db.Close() })

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
		RootPath:   rootDir,
		Port:       0,
	}
	a.Register(srv.Mux())

	ts := httptest.NewServer(srv.Mux())
	t.Cleanup(ts.Close)

	return &testServer{server: ts, rootDir: rootDir, t: t}
}

func (s *testServer) url(path string) string {
	return s.server.URL + path
}

// HTTP helpers

func (s *testServer) get(path string) (int, []byte) {
	s.t.Helper()
	resp, err := http.Get(s.url(path))
	if err != nil {
		s.t.Fatalf("GET %s: %v", path, err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, body
}

func (s *testServer) postJSON(path string, v any) (int, []byte) {
	s.t.Helper()
	data, _ := json.Marshal(v)
	resp, err := http.Post(s.url(path), "application/json", bytes.NewReader(data))
	if err != nil {
		s.t.Fatalf("POST %s: %v", path, err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, body
}

func (s *testServer) putJSON(path string, v any) (int, []byte) {
	s.t.Helper()
	data, _ := json.Marshal(v)
	req, _ := http.NewRequest("PUT", s.url(path), bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		s.t.Fatalf("PUT %s: %v", path, err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, body
}

func (s *testServer) patchJSON(path string, v any) (int, []byte) {
	s.t.Helper()
	data, _ := json.Marshal(v)
	req, _ := http.NewRequest("PATCH", s.url(path), bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		s.t.Fatalf("PATCH %s: %v", path, err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, body
}

func (s *testServer) delete(path string) (int, []byte) {
	s.t.Helper()
	req, _ := http.NewRequest("DELETE", s.url(path), nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		s.t.Fatalf("DELETE %s: %v", path, err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, body
}

func (s *testServer) uploadFile(path string, fileData []byte, filename string, fields map[string]string) (int, []byte) {
	s.t.Helper()
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	part, _ := writer.CreateFormFile("file", filename)
	part.Write(fileData)
	for k, v := range fields {
		writer.WriteField(k, v)
	}
	writer.Close()

	resp, err := http.Post(s.url(path), writer.FormDataContentType(), &buf)
	if err != nil {
		s.t.Fatalf("UPLOAD %s: %v", path, err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, body
}

func (s *testServer) decode(body []byte, v any) {
	s.t.Helper()
	if err := json.Unmarshal(body, v); err != nil {
		s.t.Fatalf("decode: %v (body: %s)", err, string(body))
	}
}

// testPNG generates a valid 2x2 PNG with the given color.
func testPNG(r, g, b byte) []byte {
	// Minimal valid PNG — use Go's image/png to generate
	img := makeTestImage(r, g, b)
	return img
}

func makeTestImage(r, g, b byte) []byte {
	// Pre-baked valid 2x2 PNG with variable color in first pixel
	base := []byte{
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
		0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02, 0x08, 0x02, 0x00, 0x00, 0x00, 0xfd, 0xd4, 0x9a,
		0x73, 0x00, 0x00, 0x00, 0x1b, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0xfa, 0xcf, 0xc0, 0xc0,
		0xf0, 0x9f, 0x81, 0x89, 0x91, 0xe1, 0xff, 0x7f, 0x06, 0x06, 0x40, 0x00, 0x00, 0x00, 0xff, 0xff,
		0x1d, 0x21, 0x04, 0x02, 0x86, 0x74, 0xbd, 0x7b, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
		0xae, 0x42, 0x60, 0x82,
	}
	// Make each image unique by appending color bytes as a comment
	// This ensures different hashes for dedup testing
	return append(base, r, g, b)
}

// createCharacter is a helper that creates a character and returns its ID.
func (s *testServer) createCharacter(name, displayName, status string) string {
	s.t.Helper()
	code, body := s.postJSON("/api/v1/characters", map[string]string{
		"name": name, "display_name": displayName, "status": status,
	})
	if code != 201 {
		s.t.Fatalf("create character: status %d, body: %s", code, body)
	}
	var c struct{ ID string `json:"id"` }
	s.decode(body, &c)
	return c.ID
}

// createEra is a helper that creates an era and returns its ID.
func (s *testServer) createEra(charID, eraLabel string) string {
	s.t.Helper()
	code, body := s.postJSON(fmt.Sprintf("/api/v1/characters/%s/eras", charID), map[string]string{
		"label": eraLabel,
	})
	if code != 201 {
		s.t.Fatalf("create era: status %d, body: %s", code, body)
	}
	var e struct{ ID string `json:"id"` }
	s.decode(body, &e)
	return e.ID
}

// ingestImage uploads a test image for a character and returns the image ID.
func (s *testServer) ingestImage(charID string, color byte) string {
	s.t.Helper()
	png := testPNG(color, color, color)
	path := fmt.Sprintf("/api/v1/characters/%s/images", charID)
	code, body := s.uploadFile(path, png, fmt.Sprintf("test_%d.png", color), map[string]string{"source": "manual"})
	if code != 201 {
		s.t.Fatalf("ingest image: status %d, body: %s", code, body)
	}
	var r struct{ ImageID string `json:"image_id"` }
	s.decode(body, &r)
	return r.ImageID
}

// writeTestImages creates a temp directory with N test PNG files and returns the path.
func writeTestImages(t *testing.T, count int) string {
	t.Helper()
	dir := t.TempDir()
	for i := 0; i < count; i++ {
		png := testPNG(byte(i*10), byte(i*20), byte(i*30))
		os.WriteFile(fmt.Sprintf("%s/img_%03d.png", dir, i), png, 0644)
	}
	return dir
}
