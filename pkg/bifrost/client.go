package bifrost

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client talks to a Bifrost instance for image generation.
type Client struct {
	baseURL    string
	clientName string
	httpClient *http.Client
}

// NewClient creates a Bifrost client pointing at the given base URL.
func NewClient(baseURL string) *Client {
	return &Client{
		baseURL:    baseURL,
		clientName: "frame",
		httpClient: &http.Client{
			Timeout: 5 * time.Minute, // generation can take a while
		},
	}
}

// Health checks if Bifrost is reachable.
func (c *Client) Health() error {
	resp, err := c.httpClient.Get(c.baseURL + "/v1/health")
	if err != nil {
		return fmt.Errorf("bifrost health check: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bifrost unhealthy: status %d", resp.StatusCode)
	}
	return nil
}

// Available returns true if Bifrost is reachable and healthy.
func (c *Client) Available() bool {
	return c.Health() == nil
}

// GenerateImage sends an image generation request to Bifrost.
// Returns the response with base64-encoded images.
func (c *Client) GenerateImage(req *ImageGenRequest) (*ImageGenResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", c.baseURL+"/v1/images/generate", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Bifrost-Client", c.clientName)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("bifrost request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var errResp ErrorResponse
		if json.Unmarshal(respBody, &errResp) == nil && errResp.Error.Message != "" {
			return nil, fmt.Errorf("bifrost error: %s", errResp.Error.Message)
		}
		return nil, fmt.Errorf("bifrost error: status %d: %s", resp.StatusCode, string(respBody))
	}

	var genResp ImageGenResponse
	if err := json.Unmarshal(respBody, &genResp); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}

	return &genResp, nil
}

// GenerateImageBytes is a convenience method that generates an image and
// returns the first result as raw bytes along with its content type.
func (c *Client) GenerateImageBytes(req *ImageGenRequest) ([]byte, string, error) {
	resp, err := c.GenerateImage(req)
	if err != nil {
		return nil, "", err
	}

	if len(resp.Images) == 0 {
		return nil, "", fmt.Errorf("bifrost returned no images")
	}

	img := resp.Images[0]

	if img.Base64 != "" {
		data, err := base64.StdEncoding.DecodeString(img.Base64)
		if err != nil {
			return nil, "", fmt.Errorf("decode base64 image: %w", err)
		}
		ct := img.ContentType
		if ct == "" {
			ct = "image/png"
		}
		return data, ct, nil
	}

	if img.URL != "" {
		imgResp, err := c.httpClient.Get(img.URL)
		if err != nil {
			return nil, "", fmt.Errorf("fetch image URL: %w", err)
		}
		defer imgResp.Body.Close()
		data, err := io.ReadAll(imgResp.Body)
		if err != nil {
			return nil, "", fmt.Errorf("read image URL: %w", err)
		}
		ct := imgResp.Header.Get("Content-Type")
		if ct == "" {
			ct = "image/png"
		}
		return data, ct, nil
	}

	return nil, "", fmt.Errorf("bifrost image has no base64 or URL data")
}

// ListProviders returns all configured providers and their state.
func (c *Client) ListProviders() ([]ProviderInfo, error) {
	resp, err := c.httpClient.Get(c.baseURL + "/v1/providers")
	if err != nil {
		return nil, fmt.Errorf("list providers: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("list providers: status %d", resp.StatusCode)
	}

	var providers []ProviderInfo
	if err := json.NewDecoder(resp.Body).Decode(&providers); err != nil {
		return nil, fmt.Errorf("decode providers: %w", err)
	}
	return providers, nil
}

// WarmProvider starts a provider (e.g., a GPU pod).
func (c *Client) WarmProvider(name string) error {
	resp, err := c.httpClient.Post(c.baseURL+"/v1/providers/"+name+"/warm", "", nil)
	if err != nil {
		return fmt.Errorf("warm provider %s: %w", name, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("warm provider %s: status %d", name, resp.StatusCode)
	}
	return nil
}

// CoolProvider stops a provider (e.g., a GPU pod).
func (c *Client) CoolProvider(name string) error {
	resp, err := c.httpClient.Post(c.baseURL+"/v1/providers/"+name+"/cool", "", nil)
	if err != nil {
		return fmt.Errorf("cool provider %s: %w", name, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("cool provider %s: status %d", name, resp.StatusCode)
	}
	return nil
}
