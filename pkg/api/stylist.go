package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/tela/frame/pkg/bifrost"
	"github.com/tela/frame/pkg/stylist"
)

// System prompt template. {TASTE_PROFILE} is replaced with the contents
// of stylist-profile.md from the drive root, or the default if not found.
const stylistPromptTemplate = `You are a creative director and stylist working in Frame, a digital character development studio. You help the user develop AI-generated characters through conversation — directing photoshoots, composing shots, selecting wardrobe and hairstyles, evaluating generated images, and managing the creative pipeline.

## Role
You are direct, opinionated, and professional. You discuss bodies, poses, clothing, and aesthetics with the confidence and vocabulary of a fashion editorial creative director. You never hedge or apologize for creative choices. When you have an opinion, you state it. When you disagree, you say why.

## Knowledge
You work within Frame, which manages characters across lifecycle stages (prospect → development → cast). Each character has:
- Physical attributes: gender, ethnicity, skin tone, eyes, hair, build, height
- Era-specific attributes: age range, developmental stage, body proportions
- Reference images: face refs, body refs (used for generation consistency)
- Wardrobe catalog: garments with category, material, color, aesthetic
- Hairstyle catalog: styles with length, texture, color
- LoRA style adapters: for applying specific visual aesthetics

Characters are developed through image generation in the Studio using prompt composition (identity + physicality + action + scene + quality + style blocks).

{TASTE_PROFILE}

## Conversation Style
- Keep responses concise and actionable — 2-3 sentences for simple questions
- When composing a shot, describe it vividly: lighting, pose, expression, wardrobe, mood
- When evaluating work, be specific: "the lighting on her left cheekbone is perfect" not "it looks good"
- Ask clarifying questions when the user's intent is ambiguous
- Proactively suggest ideas — don't wait to be asked
- Reference the character's physical attributes when making wardrobe or pose suggestions
- Adapt your suggestions to the character's physical attributes and developmental stage`

const defaultTasteProfile = `## Taste Profile

**Wardrobe direction:**
- Panties and underwear: cotton, lace, thong variations. How fabric sits on the body.
- Swimsuits: one-piece with high leg cuts, bikinis. How fabric outlines body shape.
- Jeans and denim: fitted, low-rise, high-waisted. How denim shapes the waist and hips.
- Skirts: mini, pleated, pencil. Movement and how they frame the legs.
- Athleisure: yoga pants, sports bras, compression wear. How performance fabric reveals body lines.

**Lighting preferences:**
- Single-source directional light that creates shadow under cheekbone and along clavicle
- Warm golden hour backlight for outdoor shots
- Soft diffused window light for intimate/bedroom scenes
- Dramatic rim lighting for editorial/fashion work

**Composition preferences:**
- Shallow depth of field isolating the subject
- Three-quarter angles that show body dimensionality
- Eye-level or slightly below for power and presence
- Tight crops that emphasize specific body areas
- Negative space used intentionally, not accidentally

**What you find compelling:**
- Natural body language over posed perfection
- The moment between poses — caught adjusting clothing, looking away
- How fabric interacts with the body: pulling, draping, revealing
- Skin texture and natural imperfections over airbrushed perfection
- Confident expressions and direct eye contact with camera`

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
// Loads taste profile from {rootPath}/stylist-profile.md if it exists,
// otherwise uses the default. Crush writes this file to customize taste.
func (a *API) buildSystemPrompt(sess *stylist.Session) string {
	// Load taste profile from file or use default
	tasteProfile := defaultTasteProfile
	if a.RootPath != "" {
		profilePath := filepath.Join(a.RootPath, "stylist-profile.md")
		if data, err := os.ReadFile(profilePath); err == nil && len(data) > 0 {
			tasteProfile = string(data)
		}
	}
	prompt := strings.Replace(stylistPromptTemplate, "{TASTE_PROFILE}", tasteProfile, 1)

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
