// Package fig provides an HTTP client for Fig (production studio).
// Frame uses this client to register characters and media items in Fig
// for bidirectional sync. No image cache — Fig serves no images to Frame.
package fig

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"
)

// State represents the Fig connection state.
type State int

const (
	Unavailable State = iota
	Available
	Disconnected
)

func (s State) String() string {
	switch s {
	case Available:
		return "available"
	case Disconnected:
		return "disconnected"
	default:
		return "unavailable"
	}
}

// Client is an HTTP client for Fig's API with health polling.
type Client struct {
	baseURL    string
	secret     string // X-Frame-Secret for auth
	httpClient *http.Client

	mu    sync.RWMutex
	state State

	stopOnce sync.Once
	stop     chan struct{}
	done     chan struct{} // closed when pollLoop exits
}

// New creates a Fig client. Call Start() to begin health polling.
func New(baseURL, secret string) *Client {
	return &Client{
		baseURL: baseURL,
		secret:  secret,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
		state: Unavailable,
		stop:  make(chan struct{}),
		done:  make(chan struct{}),
	}
}

// Start begins background health polling at the given interval.
func (c *Client) Start(interval time.Duration) {
	go c.pollLoop(interval)
}

// Stop terminates the health polling goroutine and waits for it to exit.
func (c *Client) Stop() {
	c.stopOnce.Do(func() { close(c.stop) })
	<-c.done
}

// State returns the current connection state.
func (c *Client) GetState() State {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.state
}

// IsAvailable returns true if Fig is reachable.
func (c *Client) IsAvailable() bool {
	return c.GetState() == Available
}

// --- Health Polling ---

func (c *Client) pollLoop(interval time.Duration) {
	defer close(c.done)
	c.checkHealth()
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			c.checkHealth()
		case <-c.stop:
			return
		}
	}
}

func (c *Client) checkHealth() {
	resp, err := c.httpClient.Get(c.baseURL + "/api/v1/status")
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			resp.Body.Close()
		}
		c.mu.Lock()
		prev := c.state
		if prev == Available {
			c.state = Disconnected
			log.Printf("fig: disconnected")
		} else {
			c.state = Unavailable
		}
		c.mu.Unlock()
		return
	}
	resp.Body.Close()

	c.mu.Lock()
	prev := c.state
	c.state = Available
	c.mu.Unlock()

	if prev != Available {
		log.Printf("fig: available at %s", c.baseURL)
	}
}

// --- Character Registration ---

// CharacterRegistration is the payload for registering a character in Fig.
type CharacterRegistration struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	DisplayName       string `json:"display_name,omitempty"`
	Status            string `json:"status"`
	Source            string `json:"source"`
	VisualDescription string `json:"visual_description,omitempty"`
	FrameURL          string `json:"frame_url"`
	AvatarURL         string `json:"avatar_url,omitempty"`
	Eras              []Era  `json:"eras,omitempty"`
}

// Era is a character era included in registration.
type Era struct {
	ID                string `json:"id"`
	Label             string `json:"label"`
	AgeRange          string `json:"age_range,omitempty"`
	TimePeriod        string `json:"time_period,omitempty"`
	VisualDescription string `json:"visual_description,omitempty"`
	SortOrder         int    `json:"sort_order,omitempty"`
}

// RegisterCharacter registers a character in Fig as pending.
func (c *Client) RegisterCharacter(reg CharacterRegistration) error {
	return c.postJSON("/api/v1/characters/register", reg)
}

// UpdateCharacterStatus updates a character's status in Fig.
func (c *Client) UpdateCharacterStatus(id, status string) error {
	return c.putJSON("/api/v1/characters/"+id+"/status", map[string]string{"status": status})
}

// PushEra pushes a thin era record to Fig for a character.
func (c *Client) PushEra(characterID string, era Era) error {
	return c.postJSON("/api/v1/characters/"+characterID+"/eras", era)
}

// --- Media Registration ---

// RegisterMedia registers a media item (wardrobe/prop/location) in Fig.
func (c *Client) RegisterMedia(contentType, id, name string) error {
	endpoint := mediaEndpoint(contentType)
	if endpoint == "" {
		return fmt.Errorf("fig: unknown media content type: %s", contentType)
	}
	return c.postJSON(endpoint, map[string]string{
		"id":     id,
		"name":   name,
		"source": "frame",
	})
}

func mediaEndpoint(contentType string) string {
	switch contentType {
	case "wardrobe":
		return "/api/v1/wardrobe/garments"
	case "prop":
		return "/api/v1/props"
	case "location":
		return "/api/v1/locations"
	default:
		return ""
	}
}

// --- HTTP Helpers ---

func (c *Client) postJSON(path string, body interface{}) error {
	data, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("fig: marshal: %w", err)
	}
	req, err := http.NewRequest(http.MethodPost, c.baseURL+path, bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("fig: create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if c.secret != "" {
		req.Header.Set("X-Frame-Secret", c.secret)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("fig: POST %s: %w", path, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("fig: POST %s: status %d: %s", path, resp.StatusCode, respBody)
	}
	return nil
}

func (c *Client) putJSON(path string, body interface{}) error {
	data, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("fig: marshal: %w", err)
	}
	req, err := http.NewRequest(http.MethodPut, c.baseURL+path, bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("fig: create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if c.secret != "" {
		req.Header.Set("X-Frame-Secret", c.secret)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("fig: PUT %s: %w", path, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("fig: PUT %s: status %d: %s", path, resp.StatusCode, respBody)
	}
	return nil
}
