package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/tela/frame/pkg/bifrost"
	"github.com/tela/frame/pkg/stylist"
)

// Default system prompt — will be replaced with the engineered prompt.
const defaultStylistPrompt = `You are a creative director and stylist working in Frame, a digital character development studio. You help the user develop characters through conversation — composing shots, selecting wardrobe and hairstyles, evaluating images, and managing the creative pipeline.

You have access to character data including physical attributes, eras, and reference images. When the user asks you to generate images, compose shots, or evaluate work, respond with specific creative direction.

Be direct, opinionated, and professional. You discuss bodies, poses, and aesthetics with the confidence of someone who does this for a living.`

func (a *API) listStylistSessions(w http.ResponseWriter, r *http.Request) {
	sessions := a.Stylist.List()
	writeJSON(w, http.StatusOK, sessions)
}

func (a *API) getStylistSession(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	sess := a.Stylist.Get(id)
	if sess == nil {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}
	writeJSON(w, http.StatusOK, sess)
}

func (a *API) getActiveStylistSession(w http.ResponseWriter, r *http.Request) {
	sess := a.Stylist.Active()
	if sess == nil {
		writeJSON(w, http.StatusOK, nil)
		return
	}
	writeJSON(w, http.StatusOK, sess)
}

func (a *API) startStylistSession(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Context stylist.SessionContext `json:"context"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	sess := a.Stylist.Start(req.Context)
	writeJSON(w, http.StatusCreated, sess)
}

func (a *API) endStylistSession(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := a.Stylist.End(id); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) sendStylistMessage(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("id")

	var req struct {
		Content string                  `json:"content"`
		Context *stylist.SessionContext  `json:"context,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.Content == "" {
		writeError(w, http.StatusBadRequest, "content is required")
		return
	}

	// Update session context if provided (tracks user's current location)
	if req.Context != nil {
		a.Stylist.UpdateContext(sessionID, *req.Context)
	}

	msg, err := a.Stylist.SendMessage(sessionID, req.Content)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Trigger LLM response in background
	if a.Bifrost != nil {
		go a.stylistAgentLoop(sessionID)
	}

	writeJSON(w, http.StatusCreated, msg)
}

// stylistAgentLoop calls the LLM via Bifrost and appends the response.
func (a *API) stylistAgentLoop(sessionID string) {
	sess := a.Stylist.Get(sessionID)
	if sess == nil {
		return
	}

	// Build message history for the LLM
	messages := []bifrost.ChatMessage{
		{Role: "system", Content: a.buildSystemPrompt(sess)},
	}
	for _, msg := range sess.Messages {
		role := "user"
		if msg.Role == stylist.RoleStylist {
			role = "assistant"
		}
		messages = append(messages, bifrost.ChatMessage{
			Role:    role,
			Content: msg.Content,
		})
	}

	chatReq := &bifrost.ChatRequest{
		Model:     "qwen3.5-9b-uncensored-hauhaucs-aggressive",
		Messages:  messages,
		MaxTokens: 2048,
		Meta: bifrost.RequestMeta{
			ProviderName:  "local-lmstudio",
			ContentRating: bifrost.ContentNSFW,
			Private:       true,
		},
	}

	resp, err := a.Bifrost.Chat(chatReq)
	if err != nil {
		log.Printf("stylist agent error: %v", err)
		a.Stylist.AddStylistMessage(sessionID, "The stylist is offline — the LLM provider isn't available right now. Check that LM Studio is running with a model loaded.", nil)
		return
	}

	if len(resp.Choices) == 0 {
		a.Stylist.AddStylistMessage(sessionID, "I didn't get a response. Try again?", nil)
		return
	}

	content := resp.Choices[0].Message.Content
	if content == "" {
		content = "(empty response)"
	}

	a.Stylist.AddStylistMessage(sessionID, content, nil)
}

// buildSystemPrompt constructs the system prompt with session context.
func (a *API) buildSystemPrompt(sess *stylist.Session) string {
	prompt := defaultStylistPrompt

	// Inject character context if available
	if sess.Context.CharacterID != "" {
		char, err := a.Characters.Get(sess.Context.CharacterID)
		if err == nil && char != nil {
			prompt += fmt.Sprintf("\n\nYou are currently working with character: %s (%s).", char.DisplayName, char.Name)
			prompt += fmt.Sprintf("\nStatus: %s", char.Status)
			if char.Gender != "" {
				prompt += fmt.Sprintf("\nGender: %s", char.Gender)
			}
			if char.Ethnicity != "" {
				prompt += fmt.Sprintf("\nEthnicity: %s", char.Ethnicity)
			}
			if char.EyeColor != "" {
				prompt += fmt.Sprintf("\nEyes: %s %s", char.EyeShape, char.EyeColor)
			}
			if char.NaturalHairColor != "" {
				prompt += fmt.Sprintf("\nHair: %s %s", char.NaturalHairTexture, char.NaturalHairColor)
			}
			if char.SkinTone != "" {
				prompt += fmt.Sprintf("\nSkin: %s", char.SkinTone)
			}
			if char.DistinguishingFeatures != "" {
				prompt += fmt.Sprintf("\nDistinguishing features: %s", char.DistinguishingFeatures)
			}
		}
	}

	if sess.Context.Screen != "" {
		prompt += fmt.Sprintf("\n\nThe user is currently viewing the %s screen.", sess.Context.Screen)
	}

	return prompt
}
