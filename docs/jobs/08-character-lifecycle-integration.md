# Character Lifecycle: Frame ↔ Fig Integration

## Mental Model

**Frame** is a talent agency / modeling agency. It scouts, develops, and manages the visual roster. Characters start as prospects — images that look promising. When a prospect shows enough potential, they go into development: the agency invests in building out a full portfolio (standard outfits, nudes, expressions, angles). When the portfolio is ready, the character is published to Fig.

**Fig** is the production company. It receives characters from Frame's roster, develops their narrative identity (personality, backstory, relationships), and casts them into productions.

## Status Lifecycle

```
Frame                              Fig
─────                              ───
prospect ──────────────────────    (doesn't exist yet)
    │
    ▼
development ──── publish ────────→ pending
    │                                │
    │                                ▼
    │                             development (accepted)
    │                                │
    ▼                                ▼
cast ←──── cast notification ────── cast
```

### Frame Statuses

**prospect** — The starting point in Frame. One or more uploaded or generated images. The agency is evaluating the look. Minimal record: name, display name, images. No eras, no pipeline work.

**development** — The agency has committed to this character. Transitioning to development triggers:
- Standard character image pipeline kicks off (if Bifrost available):
  - Standard catalog images in each defined outfit
  - Nude reference set
  - Expression series
  - Standard poses (front-facing, three-quarter, profile, full-body)
- Character is published to Fig as `pending`
- Fig link becomes visible on the character card

**cast** — Visual identity is fully defined with eras and reference packages. This status is set when Fig casts the character.

### Fig Statuses

**pending** — Received from Frame, awaiting producer review. The producer (user) can see the images and visual description. They decide whether to accept into development.

**development** — Fig develops the narrative: personality, backstory, sexuality, model bindings. Existing Fig workflow.

**cast** — Character enters production. Fig notifies Frame, which activates era management and full curation tools.

## Character Creation in Frame

### Job: I see a set of images and want to explore them as a character

**Acceptance:**
- I can create a new character from the Frame UI
- I provide: name, display name
- I can immediately upload/import images
- The character starts as `prospect`
- No eras, no pipeline work — just a container for images
- I can browse my prospects and decide which to develop

### Job: I've decided this prospect has potential and I want to invest in developing them

**Acceptance:**
- I can transition a prospect to `development`
- This triggers the standard image generation pipeline (when Bifrost is available)
- The character is published to Fig as `pending`
- I can see "Published to Fig" on the character card
- I can click a link to open the character in Fig
- Fig receives the character with: ID, name, display name, visual description (from images/tags), source: "frame"

## Standard Image Pipeline (Development Trigger)

When a character moves to development, Frame should automatically queue generation of:

1. **Standard portrait series** — front-facing, three-quarter, profile in neutral studio lighting
2. **Expression series** — neutral, smile, serious, playful (same pose, varied expression)
3. **Standard outfit catalog** — the character in each era-standard outfit (defined in standard catalog config)
4. **Nude reference set** — full body nude references for body consistency
5. **Full body poses** — standing, seated in standard settings

This requires:
- Bifrost to be available with a working image provider
- Prompt templates to exist for each of these categories
- The character to have enough reference images (at least face refs) to guide generation

If Bifrost isn't available, the pipeline is skipped and the user generates manually later.

## Fig Client

Frame needs a client to push data to Fig:

```
fig_url = "http://localhost:7700"  # in frame.toml
```

**Endpoints Frame calls on Fig:**
```
POST /api/v1/characters/register
{
  "id": "a7f3b2c1d9e04f6a",
  "name": "Esme Thornton",
  "display_name": "Esme",
  "source": "frame",
  "visual_description": "early 20s, dark wavy hair, angular features, pale complexion",
  "avatar_url": "http://localhost:7890/api/v1/characters/a7f3b2c1d9e04f6a/avatar"
}
→ Fig creates Character with stage "pending"
```

**Endpoints Fig calls on Frame (already exist):**
```
POST /api/v1/characters          — register character
PATCH /api/v1/characters/{id}    — status transitions (e.g., cast)
POST /api/v1/characters/{id}/eras — define eras
POST /api/v1/characters/{id}/images — push images
```

## Data Model Changes

### Characters table
- Rename `scouted` status to `prospect` (or add `prospect` and keep `scouted` as alias)
- Add `fig_published` boolean — whether the character has been published to Fig
- Add `fig_url` text — URL to open the character in Fig (set after publish)

### Config
- Add `fig_url` to frame.toml for Fig integration

## What to Build Now vs Later

**Now:**
- Update character status to include `prospect`
- Character creation in Frame UI
- "Publish to Fig" concept (UI indicator, even if Fig client isn't built yet)

**When Fig is ready to accept:**
- Fig client package
- Actual publish flow (API call to Fig)
- Fig accept/reject flow
- Bidirectional status sync

**When Bifrost is ready:**
- Standard image pipeline trigger on development transition
