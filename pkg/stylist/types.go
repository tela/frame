package stylist

import "time"

// Session represents a conversation with the Stylist agent.
type Session struct {
	ID        string          `json:"id"`
	Context   SessionContext  `json:"context"`
	Messages  []Message       `json:"messages"`
	StartedAt time.Time       `json:"started_at"`
	EndedAt   *time.Time      `json:"ended_at,omitempty"`
}

// SessionContext captures what the user is looking at when the session starts.
type SessionContext struct {
	Screen      string `json:"screen,omitempty"`
	CharacterID string `json:"character_id,omitempty"`
	EraID       string `json:"era_id,omitempty"`
	// Studio state — populated when user is on the Studio page
	StudioPrompt        string `json:"studio_prompt,omitempty"`
	StudioNegative      string `json:"studio_negative,omitempty"`
	StudioWorkflow      string `json:"studio_workflow,omitempty"`
	StudioJob           string `json:"studio_job,omitempty"`
	StudioContentRating string `json:"studio_content_rating,omitempty"`
}

// Message is a single turn in the conversation.
type Message struct {
	ID           string        `json:"id"`
	Role         MessageRole   `json:"role"`
	Content      string        `json:"content"`
	Images       []MessageImage `json:"images,omitempty"`
	ToolActivity string        `json:"tool_activity,omitempty"`
	SentAt       time.Time     `json:"sent_at"`
}

// MessageRole identifies who sent the message.
type MessageRole string

const (
	RoleUser    MessageRole = "user"
	RoleStylist MessageRole = "stylist"
)

// MessageImage is an inline image result in a stylist message.
type MessageImage struct {
	ID       string `json:"id"`
	ThumbURL string `json:"thumb_url"`
	FullURL  string `json:"full_url"`
}

// IsActive returns true if the session has not been ended.
func (s *Session) IsActive() bool {
	return s.EndedAt == nil
}
