# Frame — Architecture & Integration Strategy

## 1. What Frame Is

Frame is a portable, single-user digital asset manager for AI-generated character visual assets. It runs as a self-contained Go binary serving a local web UI from an encrypted removable drive. All images, the SQLite database, and the binary live on the drive. No internet required at runtime.

Frame is the **secure media backbone** for a creative production ecosystem that includes:

- **Fig** — Experience production application (character creation, development, sessions, wardrobe/props/locations management)
- **Bifrost** — Multimodal AI model router (routes generation requests to local ComfyUI, RunPod, cloud providers)
- **ComfyUI** — Image generation engine (character generation, clothing swap, expression series, quality post-processing)

Frame's role in this ecosystem: **own all media, own cast character visual identity, serve images to all consumers, manage the refinement loop for visual identity.**

---

## 2. Ownership Boundaries

### Fig Owns
- Character creation (scouting, direct creation)
- Character development (iterative image generation, creative direction, keep/discard decisions)
- Narrative identity (personality, backstory, sexuality config)
- Production metadata (sessions, model bindings for expression/voice)
- Wardrobe/props/locations catalog metadata (occasion_energy, wearing_history, spatial_tier, scene_roles, etc.)
- Era definition (deciding when a character enters a new era)
- Casting decision (promoting a character from development to cast)

### Frame Owns
- **All media storage** — character images, wardrobe images, prop images, location images, thumbnails
- **Cast character visual identity** — visual description per era, prompt prefixes, reference packages
- **Post-cast triage** — classifying new images as discard/archive/tag-for-use
- **Curation** — organizing images into era sets, selecting and scoring face/body refs
- **Reference package assembly** — scored face refs, body refs, pipeline settings per era
- **Training dataset assembly** — LoRA sets, IPAdapter reference sets
- **Serving media** — HTTP API serving images and reference packages to Fig, ComfyUI, and other consumers
- **ID authority** — enforces unique IDs for all visual entities; harmonized hash IDs shared across Fig, Frame, and ComfyUI

### The Boundary
- **Fig owns everything up to casting.** Scouting, development, creative iteration, keep/discard during generation.
- **Frame owns everything after casting.** Triage of new images, curation, visual identity refinement, reference package management.
- **Era is the immutable visual identity boundary.** Fig defines that an era exists and provides an initial visual description. Frame owns the visual content for that era from that point forward. Significant character changes = new era (defined in Fig), not updates to existing eras.

---

## 3. Character Lifecycle

### Status Model

```
scouted → development → cast
               ↑
       (direct creation skips scouted)
```

**Scouted** — Speculative character from Fig's scout mission. Single initial image. Minimal record in Frame (ID, name, one image). Frame is passive storage. May be promoted to development or remain indefinitely.

**Development** — Actively exploring this character. Fig drives image generation through Bifrost/ComfyUI. Images that pass Fig's creative review are pushed to Frame for storage. Frame is an archive during this phase — no triage, no curation. Both scouted-then-promoted and directly-created characters enter here.

**Cast** — Visual identity is crystallized. Eras are defined. Frame's triage and curation tools activate. New images arriving for a cast character enter Frame's triage queue: discard, archive, or tag for use in generation/training. This is Frame's core workflow.

### Post-Cast Refinement Loop

```
Frame serves reference package
  → ComfyUI generates new images using refs
    → images pushed to Frame
      → Frame triage UI: discard / archive / promote
        → if promoted: reference package updated
          → cycle continues, visual identity refines
```

This is Frame's primary value — the ongoing refinement of a cast character's visual identity through iterative generation and curation.

---

## 4. Data Model — Entities

### Characters

Frame stores a character record that is intentionally thinner than Fig's model. Frame does not store narrative identity, personality, model bindings for expression/voice, or production metadata.

| Field | Source | Notes |
|-------|--------|-------|
| `id` | Generated, harmonized across systems | Short alphanumeric hash, e.g., `a7f3b2c1d9e04f6a` |
| `name` | Fig provides | Full canonical name, e.g., `Sarah Mitchell`. NOT unique. |
| `display_name` | Fig provides | Short display name, e.g., `Sarah`. NOT unique. |
| `status` | Fig controls transitions | `scouted`, `development`, `cast` |
| `created_at` | Frame records on registration | |

Names are labels for human display. The `id` is the only identifier. Multiple characters may share the same name or display name.

### Eras

Eras exist only for cast characters. Fig defines the era; Frame owns its visual content.

| Field | Source | Notes |
|-------|--------|-------|
| `id` | Generated | Short alphanumeric hash, e.g., `e4c9d1f28b3a7e50` |
| `character_id` | FK to character | |
| `label` | Fig provides | Display name, e.g., `Young Adult` |
| `visual_description` | Seeded by Fig, owned by Frame | Extended/refined in Frame |
| `prompt_prefix` | Frame | Generated from refined visual description |
| `pipeline_settings` | Frame | Checkpoint, IP-Adapter weights, sampler config |
| `sort_order` | Fig or Frame | Chronological ordering |

Cross-system reference uses the hash IDs: `{character_id}/{era_id}` (e.g., `a7f3b2c1d9e04f6a/e4c9d1f28b3a7e50`).

### Images

All images across all content types (characters, wardrobe, props, locations).

| Field | Notes |
|-------|-------|
| `id` | Unique image ID |
| `hash` | SHA-256 of file content (dedup) |
| `original_filename` | Preserved from ingest |
| `format` | jpeg, png, webp — stored as-is, no conversion |
| `width`, `height` | Pixels |
| `file_size` | Bytes |
| `ingested_at` | Timestamp |
| `source` | `fig`, `comfyui`, `manual` |

Image format policy: **originals are stored as-is.** No JPEG→PNG conversion on ingest. Thumbnails are generated in a consistent format. Dataset export handles format conversion based on target pipeline requirements. This can be revisited if needed.

### Character Images (junction)

Links images to characters, with character-specific metadata.

| Field | Notes |
|-------|-------|
| `image_id` | FK to images |
| `character_id` | FK to characters |
| `era_id` | FK to eras (nullable — null during scouted/development) |
| `set_type` | `staging`, `reference`, `curated`, `training`, `archive` |
| `triage_status` | `pending`, `approved`, `rejected`, `archived` |
| `rating` | 1-5 or similar |
| `is_face_ref` | Boolean |
| `is_body_ref` | Boolean |
| `ref_score` | Quality score for reference images |
| `ref_rank` | Rank within reference set |

### Image Tags

| Field | Notes |
|-------|-------|
| `image_id` | FK to images |
| `tag_namespace` | e.g., `style`, `pose`, `expression`, `quality` |
| `tag_value` | e.g., `3d`, `front-facing`, `smile`, `high` |
| `source` | `manual`, `auto` (future auto-tagger) |

### Wardrobe / Props / Locations (Media Only)

Frame stores the **images** for these content types. Fig retains the rich catalog metadata.

| Field | Notes |
|-------|-------|
| `id` | Short alphanumeric hash, harmonized with Fig's catalog IDs |
| `content_type` | `wardrobe`, `prop`, `location` |
| `name` | Display name (not unique) |
| `images` | One-to-many relationship to images table |
| `primary_image_id` | FK to images (the main reference image) |

Frame does not replicate Fig's wardrobe metadata (occasion_energy, aesthetic_cluster, etc.). It stores and serves the images. Fig queries Frame for image URLs and handles its own catalog logic.

---

## 5. Integration Architecture

### Harmonized IDs

All entities across Frame, Fig, and ComfyUI share a common ID format: **16-character hex IDs** (e.g., `a7f3b2c1d9e04f6a`). These are short enough to be human-usable in URLs, file paths, and workflow configs, while being unique at single-user scale.

**ID generation:** 16-char hex strings generated via `crypto/rand` (8 random bytes → hex encoded). This matches Fig's existing `scout.NewID()` pattern exactly — **no migration needed on the Fig side.**

Fig generates IDs for characters (at creation) and eras (when defined), and passes them to Frame at registration. Frame generates IDs for images (on ingest). The key constraint is that a given entity has the **same ID everywhere** — Fig, Frame, and ComfyUI reference packages all use `a7f3b2c1d9e04f6a` for the same character.

**Current state requiring migration:**
- ComfyUI-Workflows uses name-based directories (`characters/blondy/`) with no formal ID field in character packages. These need an `id` field added.
- Fig's `.character` file storage already uses hex IDs in filenames (`{id}.character`). No format change needed.

**File paths on disk (Frame):** `assets/characters/{id}/eras/{era_id}/original/`

**Who generates which IDs:**
- Character ID → Fig generates at creation, passes to Frame at registration
- Era ID → Fig generates when defining an era, passes to Frame
- Image ID → Frame generates on ingest
- Wardrobe/prop/location ID → Fig generates, passes to Frame when registering media

### Service Discovery

Frame binds to a configurable port (default `localhost:7890`, set in `frame.toml`). Exposes `GET /health` returning basic status.

Fig's config has a `frame_url` field (default `http://localhost:7890`). Fig polls `/health` on a short interval (~5 seconds). Three states:

- **Available** — health check passes, Fig operates normally, warms cache
- **Unavailable** — health check fails, Fig enters degraded mode (503 for media, non-media features still work)
- **Disconnected** — was available, health check starts failing, Fig purges in-memory cache immediately

If the drive is removed, Frame's process dies, health check fails, Fig degrades and purges. Clean and automatic.

### Caching Strategy (Fig Side)

All caching is **in-memory only** in Fig. No media written to host disk.

**On Frame availability:**
1. Pre-fetch primary avatars for all characters
2. Pre-fetch full image sets for favorited characters
3. Everything else: cache-on-use (first request hits Frame, subsequent from memory)

**On Frame disconnect:**
- Entire cache purged immediately
- Fig restart also clears cache (it's just memory)

### API Patterns

#### Fig → Frame (Push)

**Character registration:**
```
POST /api/v1/characters
{ "id": "a7f3b2c1d9e04f6a", "name": "Sarah Mitchell", "display_name": "Sarah", "status": "scouted" }
```

**Status transition:**
```
PATCH /api/v1/characters/a7f3b2c1d9e04f6a
{ "status": "cast" }
```

**Era creation (on cast or later):**
```
POST /api/v1/characters/a7f3b2c1d9e04f6a/eras
{
  "id": "e4c9d1f28b3a7e50",
  "label": "Young Adult",
  "preliminary_description": "early 20s, wavy shoulder-length blonde hair..."
}
```

**Image ingest (during development — Fig pushes kept images):**
```
POST /api/v1/characters/a7f3b2c1d9e04f6a/images
Content-Type: multipart/form-data
file: <image data>
source: fig
context: development
```

**Wardrobe/prop/location media registration:**
```
POST /api/v1/media/{content_type}
{ "id": "b3e8f1a92c5d7046", "name": "Red Sundress" }

POST /api/v1/media/wardrobe/b3e8f1a92c5d7046/images
Content-Type: multipart/form-data
file: <image data>
```

#### Frame → Fig (Query)

**Character visual summary (what Fig needs for display):**
```
GET /api/v1/characters/a7f3b2c1d9e04f6a
→ {
    "id": "a7f3b2c1d9e04f6a",
    "name": "Sarah Mitchell",
    "display_name": "Sarah",
    "status": "cast",
    "avatar_url": "/api/v1/characters/a7f3b2c1d9e04f6a/avatar",
    "eras": [
      {
        "id": "e4c9d1f28b3a7e50",
        "label": "Young Adult",
        "avatar_url": "...",
        "image_count": 47,
        "reference_package_ready": true,
        "profile_complete": true
      }
    ]
  }
```

**Image serving:**
```
GET /api/v1/images/{image_id}                    # Full image
GET /api/v1/images/{image_id}/thumb              # Thumbnail (300px)
GET /api/v1/characters/{id}/avatar               # Character avatar
GET /api/v1/characters/{id}/eras/{era}/avatar    # Era-specific avatar
```

#### Frame → ComfyUI (Reference Packages)

**Reference package for generation workflows:**
```
GET /api/v1/characters/a7f3b2c1d9e04f6a/eras/e4c9d1f28b3a7e50/reference-package
→ {
    "character_id": "a7f3b2c1d9e04f6a",
    "era_id": "e4c9d1f28b3a7e50",
    "character_name": "Sarah Mitchell",
    "era_label": "Young Adult",
    "visual_description": "...",
    "prompt_prefix": "a young woman in her early 20s with wavy...",
    "face_refs": [
      { "image_url": "...", "score": 93.4, "rank": 1 },
      { "image_url": "...", "score": 92.5, "rank": 2 }
    ],
    "body_refs": [...],
    "pipeline_settings": {
      "checkpoint": "lustifySDXLNSFW_oltFixedTextures.safetensors",
      "ipadapter_weight": 0.85,
      "sampler": "euler_ancestral",
      "steps": 30
    }
  }
```

#### ComfyUI → Frame (Post-Cast Ingest)

**New images from generation workflows for triage:**
```
POST /api/v1/characters/a7f3b2c1d9e04f6a/eras/e4c9d1f28b3a7e50/ingest
Content-Type: multipart/form-data
file: <image data>
source: comfyui
workflow: fig_character_gen
prompt: "the prompt used"
seed: 12345
```

---

## 6. Encrypted Drive Lifecycle

### Mount
1. User plugs in encrypted drive, unlocks it
2. Drive mounts at arbitrary path (e.g., `/Volumes/FRAME/`)
3. User runs `./frame` from the drive (or specifies `--root /path/to/drive`)
4. Frame detects `frame.toml` and `frame.db`, starts serving on configured port
5. Fig's health check detects Frame, begins cache warm-up

### Unmount
1. User ejects drive (or it's physically removed)
2. Frame process terminates (filesystem gone)
3. Fig's health check fails within ~5 seconds
4. Fig purges entire in-memory image cache
5. Fig enters degraded mode — production features that don't need images continue to work
6. No character images persist on host machine

### Security Properties
- All character images exist only on the encrypted drive
- Fig never writes images to host disk (in-memory cache only)
- Drive removal = immediate data unavailability
- No ambient image data on the host machine between sessions

---

## 7. Technology Choices

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Backend | Go | Single binary, embed support, matches Fig/Bifrost ecosystem |
| Database | SQLite via `modernc.org/sqlite` (pure Go, no CGO) | Portable, no C toolchain needed, matches Fig ecosystem |
| Frontend | React + TanStack (Router, Query) | Keyboard-driven triage UI, complex curation views |
| Frontend build | Vite, committed to `ui/dist/`, embedded in binary | Offline, no build step at runtime |
| Image processing | `disintegration/imaging` | Thumbnail generation (300px), format detection |
| Thumbnails | Generated on ingest, stored alongside originals | Eager generation, served from drive |
| Image format | Stored as-is (no conversion on ingest) | Preserves originals; export handles target format |
| Config | TOML (`frame.toml`) | Simple, human-editable, lives on drive |
| Platforms | macOS arm64/amd64, Linux amd64/arm64 | No Windows required |

---

## 8. Cross-System Integration Prompts

These are prompts to be run in the respective repos to align them with Frame's architecture.

### Fig Integration Prompt

> **Run in `/dev/fig`**
>
> Frame is a new portable media server that will own all character images, wardrobe/prop/location images, and cast character visual identity. Fig needs to be updated to integrate with Frame as a client. Read `/dev/frame/ARCHITECTURE.md` for the full architecture.
>
> **ID model changes:**
> - Fig's existing 16-char hex IDs via `scout.NewID()` in `pkg/scout/id.go` are the ecosystem standard. **No change needed to ID generation.** Frame and ComfyUI-Workflows will adopt the same format.
> - Add a `DisplayName` field to the `Character` struct in `pkg/character/types.go`. The existing `Name` field becomes the full canonical name. `DisplayName` is a shorter label for UI use. Neither is unique.
> - Add a `DisplayName` field to `ScoutCard` in `pkg/scout/types.go` similarly.
>
> **Character struct changes (`pkg/character/types.go`):**
> - Add `DisplayName string` field
> - The `Physical.Description` and `Physical.ImageBrief` fields are the preliminary visual identity that will be passed to Frame at registration. No structural change needed, but note these will be sent to Frame's API.
>
> **Frame client integration:**
> - Add a `pkg/frame` package that is a client for Frame's HTTP API (see ARCHITECTURE.md section 5 for endpoints).
> - Frame URL should be configurable (default `http://localhost:7890`), read from environment variable `FRAME_URL` or CLI flag.
> - Implement health check polling (~5 second interval). Three states: available, unavailable, disconnected.
> - On available: pre-fetch character avatars into in-memory cache. Pre-fetch full image sets for favorited characters. Cache-on-use for everything else.
> - On disconnect: purge entire in-memory image cache immediately. Enter degraded mode.
> - **No images written to disk.** All caching is in-memory only.
>
> **Image serving migration:**
> - `ServeCharacterAsset`, `ServeCatalogImage`, `ServePoolImage` handlers in `pkg/studioapi/` currently serve from local filesystem. These need to proxy through the Frame client when Frame is available, and return 503 when unavailable.
> - Gallery images, wardrobe images, prop images, location images — all served from Frame.
>
> **Character registration flow:**
> - When a character is created (scout promotion in `pkg/studioapi/scout.go` or direct creation), POST to Frame's `/api/v1/characters` with the character ID, name, display_name, and status.
> - When character status changes (development → cast), PATCH to Frame.
> - When images are kept during development, POST image to Frame's `/api/v1/characters/{id}/images`.
> - When eras are defined (new feature — Fig doesn't have eras yet), POST to Frame's `/api/v1/characters/{id}/eras`.
>
> **Wardrobe/props/locations:**
> - Catalog metadata stays in Fig's SQLite catalogs.
> - Images move to Frame. When a garment/prop/location is created with images, register the media in Frame via `/api/v1/media/{content_type}` and push images.
> - Update `image_path` references in catalog schemas to store Frame media IDs instead of local paths. Serve via Frame client.
>
> **Era support (new feature):**
> - Add era concept to Character model. An era has an `id` (16-char hex), `label`, and `sort_order`.
> - Eras are only meaningful for cast characters.
> - Fig defines eras and pushes them to Frame. Frame owns the visual content per era.

### ComfyUI-Workflows Integration Prompt

> **Run in `/dev/ComfyUI-Workflows`**
>
> Frame is a new portable media server that will own all character and wardrobe reference images. ComfyUI workflows need to be updated to consume reference packages from Frame's API instead of local file-based character packages. Read `/dev/frame/ARCHITECTURE.md` for the full architecture.
>
> **Character package changes:**
> - Character packages currently use name-based directories (`characters/blondy/`) with no formal ID field.
> - Add an `"id"` field (16-char hex ID) to each character's `package.json`. This ID must match the character's ID in Fig and Frame.
> - The `"name"` field remains for human readability but is no longer the identifier.
> - Directory structure can remain name-based for human navigation, but all programmatic references should use the ID.
>
> **Wardrobe package changes:**
> - Wardrobe packages already have an `"id"` field. Ensure these are updated to 16-char hex IDs harmonized with Fig and Frame.
>
> **Script updates:**
> - `scripts/create_character_package.py`: Accept `--id` parameter (or generate one). Store as `"id"` in package.json. If Frame is available, register the character and push reference images.
> - `scripts/create_wardrobe_package.py`: Same pattern — accept/generate ID, store it, optionally push to Frame.
> - `scripts/score_face_references.py`: No ID changes needed, but output should reference the character ID.
>
> **SKILL.md updates:**
> - Update any skill documents that reference character packages to note that characters are identified by their 16-char hex ID, and that Frame's API serves reference packages.
> - When building workflows that use IP-Adapter with character references, the character ID should be used to fetch the reference package from Frame: `GET http://localhost:7890/api/v1/characters/{id}/eras/{era_id}/reference-package`
> - Face reference images can be fetched by URL from the reference package response rather than loaded from local paths.
>
> **Future state:**
> - Post-cast image generation workflows should POST output images to Frame for triage: `POST http://localhost:7890/api/v1/characters/{id}/eras/{era_id}/ingest`
> - This replaces writing to `ComfyUI/output/` as the primary archival path. ComfyUI still writes locally, but a post-workflow step pushes to Frame.

---

## 9. Open Items for Planning

1. **Migration system** — Embed SQL migrations in binary, run on startup. Schema versioning strategy.
2. **ComfyUI reference package format** — Exact fields needed by current workflows. May need to look at how `package.json` is consumed.
3. **Auto-tagging hook** — The `source` field in image tags is pre-designed for external taggers. HTTP client integration TBD.
4. **Batch tag operations** — UI and API for applying tags to many images at once.
5. **LoRA set assembly UX** — Cross-character, multi-filter, bulk-add. Most complex UI surface.
6. **Dataset export formats** — Exact layout for Kohya LoRA training and IPAdapter manifests.
7. **Fig integration implementation** — Execute the Fig integration prompt (section 8) to add Frame client, migrate image serving, update ID format.
8. **ComfyUI-Workflows integration** — Execute the ComfyUI-Workflows prompt (section 8) to add IDs to packages and update skills.
9. **Data migration** — One-time migration to harmonize IDs across Fig and ComfyUI-Workflows. Move existing images from Fig's content directory to Frame.
10. **Build & deployment** — Makefile, cross-compilation, drive deployment script.
