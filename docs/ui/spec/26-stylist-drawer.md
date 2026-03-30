# 26 — Stylist Drawer

## Job

Collaborative styling with an AI agent. The Stylist helps develop character looks, select wardrobe, research LoRAs, and generate images — all through conversation. The agent knows what workflows exist, what LoRAs are available, and can execute generation runs and present results for triage.

## Who Uses This

The user, from any screen in Frame. The Stylist is context-aware — it knows which character, era, or screen you're looking at when you open the drawer.

Most commonly opened from:
- Character detail (styling a specific character)
- Era workspace (refining a visual identity)
- Studio (getting help with generation parameters)
- Wardrobe management (finding the right garment for a character)

## What It Shows

### Trigger Button

A persistent button in the sidebar navigation or top bar. Shows the Stylist's availability state:
- **Available** — ready for conversation
- **In Session** — active conversation, shows truncated last message

Clicking opens the drawer. If a session is already active, it resumes.

### Drawer (right-sliding sheet)

Same Radix Sheet pattern as Fig's ProducerDrawer. 380-420px wide. Overlays content, does not push layout.

#### Header
- Stylist label (small, uppercase, tracked — `STYLIST`)
- Context indicator: current character name and era, derived from route (e.g., "Elara · Young Adult")
- Close button
- Session controls: "New Session" to start fresh, "End Session" to close

#### Conversation Thread
Scrollable message history. Auto-scrolls to bottom on new messages. Smart stick-to-bottom (doesn't force scroll if user scrolled up).

**User messages:** Right-aligned, surface-container background.

**Stylist messages:** Left-aligned, surface background. May include:
- Text responses (markdown rendered)
- Image results (inline thumbnails from generation, clickable to expand)
- Workflow selection rationale ("I'm using character_gen_multiref because...")
- LoRA recommendations with metadata (name, source, strength)
- Action confirmations ("Generated 4 images, sent to triage")

**Tool activity indicators:** When the Stylist is executing tools (searching wardrobe, generating images), show a subtle activity line:
- "Searching wardrobe..."
- "Generating with Klein 9B..."
- "Checking available LoRAs..."

These are transient — they appear during tool execution and collapse when the response arrives.

#### Message Input
- Textarea (auto-grows, max 4 lines before scroll)
- Send button (or Enter to send, Shift+Enter for newline)
- Disabled while Stylist is responding

#### Generation Results (inline)
When the Stylist generates images, results appear inline in the conversation as a horizontal thumbnail strip. Each thumbnail:
- Click to open in Frame's standard image lightbox
- Small triage actions: checkmark (approve), X (reject)
- Approved images flow into the character's triage queue automatically

### Context Derivation

The drawer reads the current TanStack Router route to determine context:

| Route | Context passed to Stylist |
|-------|--------------------------|
| `/characters/{id}` | character ID |
| `/characters/{id}/eras/{eraId}` | character ID + era ID |
| `/characters/{id}/eras/{eraId}/studio` | character ID + era ID + "studio" screen |
| `/wardrobe` | no character, wardrobe browsing context |
| `/wardrobe` with character filter active | character ID from filter |

Context is sent with every message so the Stylist knows what you're looking at without being told.

## Actions

- Open/close drawer from any screen
- Send messages to Stylist
- View conversation history (persisted across drawer open/close)
- Start new session (clears history, new context)
- Approve/reject generated images inline
- Click image thumbnails to open in lightbox
- End session

## Data

### API Endpoints

- `GET /api/v1/stylist/sessions` — list sessions
- `POST /api/v1/stylist/sessions` — start new session (with context)
- `GET /api/v1/stylist/sessions/{id}` — get session with message history
- `POST /api/v1/stylist/sessions/{id}/messages` — send message
- `PATCH /api/v1/stylist/sessions/{id}` — end session

### Message Format

```json
{
  "id": "msg-1234567890",
  "role": "user" | "stylist",
  "content": "text content",
  "images": [{"id": "img-abc", "url": "/api/v1/images/img-abc/thumb"}],
  "tool_activity": "Searching wardrobe...",
  "sent_at": "2026-03-29T10:30:00Z"
}
```

### Session Context

```json
{
  "screen": "era_workspace",
  "character_id": "a1b2c3d4e5f60718",
  "era_id": "f8e7d6c5b4a30291"
}
```

## Notes

- The Stylist is MVP: system prompt + tool use. No personality, no avatar, no voice. It's a helpful assistant that happens to know your workflows and wardrobe.
- Polling for responses (React Query, same pattern as Fig's ProducerDrawer). Not WebSocket.
- Session persistence is file-backed on the encrypted drive, same pattern as Fig's producer sessions.
- Generated images go through Frame's standard ingestion pipeline and appear in triage with `source: comfyui`.
- The drawer should feel fast to open. Session load should be instant (local file, not network).
- Keyboard: Escape closes drawer. Cmd+K or equivalent opens it (TBD based on existing shortcuts).
