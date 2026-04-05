package bifrost

// ImageGenRequest is the request body for POST /v1/images/generate.
type ImageGenRequest struct {
	Prompt           string           `json:"prompt"`
	NegativePrompt   string           `json:"negative_prompt,omitempty"`
	Model            string           `json:"model,omitempty"`
	Width            int              `json:"width,omitempty"`
	Height           int              `json:"height,omitempty"`
	Steps            int              `json:"steps,omitempty"`
	StylePrompt      string           `json:"style_prompt,omitempty"`
	ReferenceImages  []ReferenceImage `json:"reference_images,omitempty"`
	LoraAdapter      string           `json:"lora_adapter,omitempty"`
	LoraStrength     float64          `json:"lora_strength,omitempty"`
	DenoiseStrength  float64          `json:"denoise_strength,omitempty"`  // for img2img (0.0-1.0)
	WorkflowTemplate string          `json:"workflow,omitempty"` // e.g., txt2img, img2img, multi_ref
	Meta             RequestMeta     `json:"meta"`
}

// ReferenceImage is a reference image for guided generation.
type ReferenceImage struct {
	Path  string `json:"path,omitempty"`  // absolute local file path (on Bifrost's host)
	URL   string `json:"url,omitempty"`   // remote URL (Bifrost downloads it)
	Type  string `json:"type,omitempty"`  // face_ref, body_ref, garment_ref, pose_ref, location_ref
	Label string `json:"label,omitempty"` // e.g., "front face", "3/4 angle"
}

// RequestMeta controls routing and caching behavior.
type RequestMeta struct {
	Tier          string            `json:"tier,omitempty"`           // free, cheap, budget, complex, frontier, strong, fast
	ProviderName  string            `json:"provider_name,omitempty"`  // target specific provider
	Private       bool              `json:"private,omitempty"`        // skip caching
	ContentRating string            `json:"content_rating,omitempty"` // sfw, nsfw
	Metadata      map[string]string `json:"metadata,omitempty"`
}

// ImageGenResponse is the response from POST /v1/images/generate.
type ImageGenResponse struct {
	Images []GeneratedImage `json:"images"`
	Model  string           `json:"model"`
}

// GeneratedImage is a single generated image.
type GeneratedImage struct {
	Base64      string `json:"base64,omitempty"`
	ContentType string `json:"content_type,omitempty"` // e.g., "image/png"
	URL         string `json:"url,omitempty"`
}

// ErrorResponse is the error format from Bifrost.
type ErrorResponse struct {
	Error struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error"`
}

// ProviderInfo is a provider entry from GET /v1/providers.
type ProviderInfo struct {
	Name       string   `json:"name"`
	Tiers      []string `json:"tiers"`
	Modalities []string `json:"modalities"`
	Tasks      []string `json:"tasks"`
	Models     []string `json:"models"`
	NsfwSafe   bool     `json:"nsfw_safe"`
	State      string   `json:"state"` // cold, warming, hot, cooling
	Healthy    bool     `json:"healthy"`
}

// Reference image type constants.
const (
	RefTypeFace     = "face_ref"
	RefTypeBody     = "body_ref"
	RefTypeBreasts  = "breasts_ref"
	RefTypeVagina   = "vagina_ref"
	RefTypeGarment  = "garment_ref"
	RefTypePose     = "pose_ref"
	RefTypeLocation = "location_ref"
)

// Tier constants.
const (
	TierCheap    = "cheap"
	TierComplex  = "complex"
	TierFrontier = "frontier"
	TierFast     = "fast"
)

// Content rating constants.
const (
	ContentSFW  = "sfw"
	ContentNSFW = "nsfw"
)

// ===== Chat / LLM Types =====

// ChatRequest is the request body for POST /v1/chat/completions.
type ChatRequest struct {
	Model       string        `json:"model,omitempty"`
	Messages    []ChatMessage `json:"messages"`
	Tools       []Tool        `json:"tools,omitempty"`
	MaxTokens   int           `json:"max_tokens,omitempty"`
	Temperature *float64      `json:"temperature,omitempty"`
	Stream      bool          `json:"stream,omitempty"`
	Meta        RequestMeta   `json:"meta,omitempty"`
}

// ChatMessage is a single message in a chat conversation.
type ChatMessage struct {
	Role       string     `json:"role"`                  // system, user, assistant, tool
	Content    string     `json:"content,omitempty"`
	ToolCalls  []ToolCall `json:"tool_calls,omitempty"`
	ToolCallID string     `json:"tool_call_id,omitempty"`
}

// ToolCall is a tool invocation requested by the model.
type ToolCall struct {
	ID       string       `json:"id"`
	Type     string       `json:"type"` // "function"
	Function FunctionCall `json:"function"`
}

// FunctionCall is the function name and arguments from a tool call.
type FunctionCall struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"` // JSON string
}

// Tool defines a tool the model can call.
type Tool struct {
	Type     string       `json:"type"` // "function"
	Function ToolFunction `json:"function"`
}

// ToolFunction defines a function tool.
type ToolFunction struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Parameters  interface{} `json:"parameters"` // JSON Schema
}

// ChatResponse is the response from POST /v1/chat/completions.
type ChatResponse struct {
	ID      string       `json:"id"`
	Object  string       `json:"object"` // "chat.completion"
	Model   string       `json:"model"`
	Choices []ChatChoice `json:"choices"`
	Usage   ChatUsage    `json:"usage"`
}

// ChatChoice is a single completion choice.
type ChatChoice struct {
	Index        int         `json:"index"`
	Message      ChatMessage `json:"message"`
	FinishReason string      `json:"finish_reason"` // stop, tool_calls, length
}

// ChatUsage tracks token usage.
type ChatUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}
