# Fig Claude Code Prompt: Frame Integration

> **Run in `/dev/fig`**

## Background

Frame (`/dev/frame`) is a new application in the ecosystem that serves as a talent agency / modeling agency for character visual identity. It runs as a Go binary from an encrypted removable drive, serving a web UI and REST API on `localhost:7890`.

**Frame's role:** Own all character media (images, thumbnails, reference packages), manage visual identity curation, drive image generation for cast characters, and assemble training datasets for LoRA/IPAdapter pipelines.

**Fig's role:** Own narrative identity, production metadata, sessions, wardrobe/props/locations catalog metadata.

**The integration:** Characters can now be created in either system. Frame creates characters starting from images (visual-first), Fig creates characters starting from narrative (story-first). Both systems share the same 16-char hex IDs and need bidirectional awareness.

Read `/dev/frame/ARCHITECTURE.md` and `/dev/frame/docs/jobs/08-character-lifecycle-integration.md` for the full architecture and lifecycle design.

## Character Lifecycle (Two-Way)

```
Frame                              Fig
─────                              ───
prospect                           (doesn't exist yet)
    │
    ▼
development ──── publish ────────→ pending (NEW STATUS)
    │                                │
    │                                ▼
    │                             development (accepted)
    │                                │
    ▼                                ▼
cast ←──── cast notification ────── cast
```

Characters created in Fig follow the existing flow: scouted → development → cast. Characters created in Frame follow: prospect → development → cast. When Frame publishes a character to Fig, it arrives as `pending` — a new stage that Fig needs to support.

## Required Changes in Fig

### 1. New Character Stage: `pending`

Fig's `Character` struct has a `Stage` field (string: "cast" or "development"). Add `"pending"` as a valid stage.

**In `pkg/character/types.go`:**
- Document that `pending` means "received from Frame, awaiting producer review"
- Pending characters appear in a dedicated section of the casting UI (not mixed with scouted or development characters)

**Behavior:**
- Pending characters are read-only in Fig until accepted
- The user can view the character's images (served from Frame) and visual description
- The user can accept (transitions to development) or reject (removes from Fig)

### 2. Accept Character Registration from Frame

**New endpoint: `POST /api/v1/characters/register`**

```json
{
  "id": "a7f3b2c1d9e04f6a",
  "name": "Esme Thornton",
  "display_name": "Esme",
  "source": "frame",
  "visual_description": "early 20s, dark wavy hair, angular features, pale complexion",
  "frame_url": "http://localhost:7890",
  "avatar_url": "http://localhost:7890/api/v1/characters/a7f3b2c1d9e04f6a/avatar"
}
```

This creates a Character in Fig with:
- `ID` = the provided ID (must not conflict with existing)
- `Name` = provided name
- `Stage` = `"pending"`
- `Version` = `"0.1-pending"`
- `Physical.Description` = provided visual_description
- `Physical.ImageBrief` = provided visual_description (used for display)

Store the `frame_url` and `avatar_url` so Fig can display the character's images from Frame.

### 3. Frame-Aware Character Display

**Pending characters in the casting UI:**
- Show a "Pending from Frame" section or badge
- Display the character's avatar (fetched from Frame's API via `avatar_url`)
- Show the visual description
- Actions: "Accept" (transitions to development), "Dismiss" (removes)

**All Frame-originated characters:**
- Show a "Frame" source indicator
- Link to open the character in Frame's UI: `{frame_url}/characters/{id}`
- Images are served from Frame, not from Fig's content directory

### 4. Frame Client in Fig

**New package: `pkg/frame`**

A client for Frame's REST API. Used for:
- Health check polling (existing design from ARCHITECTURE.md)
- Fetching character avatars for the in-memory cache
- Future: pushing images to Frame during Fig development workflow

**Config:**
- `FRAME_URL` environment variable or `--frame` CLI flag
- Default: `http://localhost:7890`

**Health check:**
- Poll `GET {frame_url}/health` every 5 seconds
- Three states: available, unavailable, disconnected
- On available: pre-fetch avatars into in-memory cache
- On disconnect: purge in-memory image cache, enter degraded mode

**In-memory caching (from ARCHITECTURE.md):**
- All image caching is in-memory only — never write Frame images to host disk
- On startup when Frame available: cache primary avatars for all characters
- Cache-on-use for everything else
- On Frame disconnect: purge entire cache immediately

### 5. Character Acceptance Flow

When the user accepts a pending character:
1. Fig transitions the character to `development` stage
2. Fig creates a Character file (`.character`) with the provided data
3. Fig creates a Card (`.card`) with the avatar from Frame
4. The character appears in the development workspace
5. Fig can now develop narrative identity (backstory, personality, etc.)

### 6. Notify Frame of Cast

When Fig casts a character (development → cast):
- Fig should notify Frame: `PATCH {frame_url}/api/v1/characters/{id}` with `{"status": "cast"}`
- This activates era management and full curation tools in Frame
- Fig also defines eras: `POST {frame_url}/api/v1/characters/{id}/eras`

### 7. DisplayName Field

Fig's Character struct needs a `DisplayName` field if it doesn't already have one:
- `DisplayName string` — short display name (e.g., "Esme")
- The existing `Name` field is the full canonical name (e.g., "Esme Thornton")
- Neither is unique — multiple characters can share names

### 8. ID Compatibility

Fig already uses 16-char hex IDs via `scout.NewID()` in `pkg/scout/id.go`. No changes needed to ID generation. Frame uses the same format. When Frame publishes a character, it sends an ID that Fig stores as-is.

**Important:** The `/register` endpoint must check for ID conflicts and reject if a character with that ID already exists.

## Summary of Changes

| Area | Change |
|------|--------|
| `pkg/character/types.go` | Add `DisplayName` field, document `pending` stage |
| `pkg/studioapi/` | New `POST /api/v1/characters/register` handler |
| `pkg/studioapi/` | Pending character acceptance/dismissal handlers |
| `pkg/frame/` | New package: Frame client with health check, avatar cache |
| `cmd/studio/main.go` | Wire Frame client, add `--frame` / `FRAME_URL` config |
| Frontend | Pending characters section in casting UI, Frame source badge, "Open in Frame" link |
| Frontend | Frame availability indicator (connected/disconnected) |
