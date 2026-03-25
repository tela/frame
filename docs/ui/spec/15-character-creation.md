# Character Creation & Prospect Management

## New Screens and Enhancements

### 15a. New Character Dialog

**Trigger:** "New Character" button in the Character Library header, or "Add to Roster" CTA in empty state.

**Job:** Create a new prospect character from a name and optional initial images.

**Dialog contents:**
- **Name** — full canonical name (text input, required)
- **Display Name** — short display name (text input, optional, defaults to first word of name)
- **Initial Images** — drag-and-drop zone or file picker (optional, can add later)
- **Create** button → creates character as `prospect`, navigates to character detail

**Design notes:**
- Minimal — don't ask for visual description yet, that comes from curation
- The drag-and-drop zone should accept multiple images
- After creation, the user lands on the character detail page where they can add more images

### 15b. Character Library Enhancement

**Changes to existing Character Library (spec 01):**

- **Status filter** should now include `prospect` as a status option
- **"New Character" button** in the header area (matching the design language — dark bg, uppercase, small text)
- **Prospect characters** should be visually distinct from development/cast:
  - Lighter card treatment or different border style
  - "Prospect" badge instead of status
  - No era count (prospects don't have eras)
  - Image count shown

### 15c. Character Detail Enhancement — Prospect View

**When viewing a prospect character:**

- Hero header shows name, display name, status as "Prospect"
- **No eras section** (prospects don't have eras yet)
- **Image gallery** — all images for this character in a grid (same as era workspace but without era context)
- **Drop zone** — the entire content area is a drop zone for adding images (same pattern as era workspace)
- **"Develop" button** — prominent CTA to transition prospect → development
  - Confirmation dialog: "Moving to development will publish this character to Fig and trigger the standard image pipeline. Continue?"
  - On confirm: status changes to development, publish to Fig initiated
- **"Discard" action** — secondary action to mark the prospect as rejected (doesn't delete images, just changes status)

### 15d. Character Detail Enhancement — Development View

**When viewing a development character:**

- Same as current, plus:
- **"Published to Fig" indicator** — badge or icon showing the character exists in Fig
- **"Open in Fig" link** — external link to `{fig_url}/casting/cast/{characterId}`
- **Pipeline status** — if standard image generation was triggered, show progress/completion
- **Era section** may or may not be present (Fig defines eras after accepting)

### 15e. Character Detail Enhancement — All Statuses

**For all characters regardless of status:**

- **Fig integration indicator** in the header:
  - Not published: no indicator
  - Published, Fig available: green dot + "In Fig" text + link
  - Published, Fig unavailable: gray dot + "Fig offline" text
- **Source indicator**: "Created in Frame" or "Created in Fig"

## Data Model Changes

### Characters table
- Add `prospect` as valid status (alongside `scouted`, `development`, `cast`)
- Add `fig_published` boolean column (default false)
- Add `fig_character_url` text column (URL to character in Fig, set after publish)
- Add `source` text column: "frame" or "fig" (where the character was created)

### Config
- Add `fig_url` to frame.toml (default: `http://localhost:7700`)

## API Changes

- `POST /api/v1/characters` — already exists, used for both Fig registration and Frame creation
- `PATCH /api/v1/characters/{id}` — add support for `fig_published` and `fig_character_url` fields
- New: `POST /api/v1/characters/{id}/publish` — publishes to Fig (calls Fig's register endpoint)

## Navigation

- Character Library → click "New Character" → creation dialog → character detail (prospect)
- Character detail (prospect) → click "Develop" → confirmation → character detail (development) + publish to Fig
- Character detail (development) → "Open in Fig" link → Fig's casting UI
