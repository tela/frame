# Frame Generation Pipeline

Spec for character image generation workflows in Frame. Covers the full pipeline from concept exploration through production-ready reference sets, including NSFW routing, LoRA management, standard pose sets, and anatomical detail refinement.

---

## 1. Default Era

Every character gets a **Late Teen** era (age **18-20**) as their baseline when created. All initial reference image generation uses this era. Additional eras (younger, older) can be added later with adjusted prompts and era-specific physical attributes.

When a character is created without an explicit era, Frame auto-creates the Late Teen era:
```json
{
  "label": "Late Teen",
  "age_range": "18-20",
  "time_period": "Present day",
  "description": "Baseline visual identity",
  "sort_order": 0
}
```

See [Era Presets](./era-presets.md) for the full preset system (12 options from Young Child to Elder).

---

## 2. Standard Reference Pose Set

Every character gets a standardized set of reference images that establish their visual identity — the equivalent of a modeling comp card. This is a defined data structure in Frame, not ad-hoc generation.

### 2.1 SFW Standard Poses

| Pose ID | Name | Framing | Purpose |
|---------|------|---------|---------|
| `front_headshot` | Front Headshot | Head/shoulders, front facing | Face reference, avatar |
| `three_quarter_portrait` | 3/4 Portrait | Head/shoulders, 3/4 angle | Face reference, secondary angle |
| `profile_portrait` | Profile | Head/shoulders, side profile | Face shape, nose, jaw reference |
| `front_full` | Front Full Body | Full body, front facing | Body proportion reference |
| `back_full` | Back Full Body | Full body, from behind | Back, hair length, posture |
| `three_quarter_full` | 3/4 Full Body | Full body, 3/4 angle | Overall silhouette |

### 2.2 Outfit Variants

Each SFW pose is generated in three outfit variants:

| Outfit ID | Name | Content Rating | Notes |
|-----------|------|---------------|-------|
| `nude` | Nude | NSFW | Anatomical baseline — no clothing obscuring proportions |
| `standard_outfit` | Standard Outfit | SFW | Character's signature casual look (defined per character) |
| `swimsuit` | Swimsuit | SFW | Body shape with minimal coverage |

6 poses x 3 outfits = **18 SFW/baseline images**.

### 2.3 NSFW Standard Poses (nude only)

> **Note: Claude Code cannot assist with prompt engineering, image review, or workflow tuning for NSFW pose generation. The data structures, routing, and pipeline infrastructure are supported. The creative content (prompts, refinement, curation) must be done by the user or another tool.**

| Pose ID | Name | Framing |
|---------|------|---------|
| `bent_over_rear` | Bent Over (Rear) | Full body, from behind, bent forward |
| `supine_spread` | Supine Spread | Full body, on back, legs spread |
| `kneeling_front` | Kneeling Front | Full body, kneeling, front facing |
| `seated_spread` | Seated Spread | Full body, seated, legs open |

4 NSFW poses, nude only = **4 additional images**.

### 2.4 Anatomical Detail Shots

> **Note: Claude Code cannot assist with prompt engineering, image review, or workflow tuning for anatomical detail generation. The data structures and pipeline infrastructure are supported.**

| Detail ID | Name | Framing |
|-----------|------|---------|
| `breast_detail` | Breast Detail | Close-up chest/torso |
| `vulva_detail` | Vulva Detail | Close-up genital area |
| `pubic_hair_natural` | Pubic Hair (Natural) | Close-up lower abdomen — natural growth pattern |
| `pubic_hair_groomed` | Pubic Hair (Groomed) | Close-up lower abdomen — groomed/shaved variant |

4 anatomical detail images = **4 additional images**.

### 2.5 Total Per Character

| Category | Count |
|----------|-------|
| SFW poses x 3 outfits | 18 |
| NSFW poses (nude) | 4 |
| Anatomical details | 4 |
| **Total** | **26** |

### 2.6 Data Model

Standard poses are defined as a catalog in Frame. Each pose definition includes:

```go
type StandardPose struct {
    ID            string // e.g., "front_headshot"
    Name          string // e.g., "Front Headshot"
    Category      string // "sfw_standard", "nsfw_standard", "anatomical_detail"
    Framing       string // "headshot", "portrait", "full_body", "detail"
    ContentRating string // "sfw" or "nsfw"
    PromptHints   string // framing/composition guidance (not the full prompt)
    SortOrder     int
}

type StandardOutfit struct {
    ID            string // e.g., "nude", "standard_outfit", "swimsuit"
    Name          string
    ContentRating string
    SortOrder     int
}
```

A **PoseSet** tracks which standard images have been generated for a character:

```go
type PoseSetImage struct {
    CharacterID string
    EraID       string
    PoseID      string
    OutfitID    string // empty for NSFW/detail poses (always nude)
    ImageID     string // FK to images table
    Status      string // "pending", "generated", "accepted", "rejected"
    CreatedAt   time.Time
}
```

This lets the UI show a grid of "what's been generated" vs "what's still needed" for a character's reference set.

---

## 3. Generation Workflows

### 3.1 Concept Exploration

| Aspect | Value |
|--------|-------|
| Stage | Prospect / early development |
| Workflow | txt2img |
| Provider | Cheap tier (Flux.1) |
| References | None |
| Batch size | 4-8 |
| Content rating | User-selected (SFW or NSFW) |
| Purpose | Quick visual exploration |

### 3.2 Reference Building

| Aspect | Value |
|--------|-------|
| Stage | Development |
| Workflow | txt2img (high quality) |
| Provider | Complex tier (Flux.2) |
| References | None initially, then bootstrap from accepted results |
| Batch size | 1-4 |
| Content rating | NSFW for nude baseline, SFW for outfit variants |
| Purpose | Establishing face/body reference images |

Results are curated → marked as `face_ref` / `body_ref` → build the reference package.

### 3.3 Consistent Generation (Multi-Reference)

| Aspect | Value |
|--------|-------|
| Stage | Development / cast |
| Workflow | Multi-reference (Flux.2) |
| Provider | Complex tier |
| References | Face + body refs from reference package |
| Batch size | 1-4 |
| Content rating | Per-request |
| Purpose | Generating new images consistent with established identity |

### 3.4 Pose/Composition Control

| Aspect | Value |
|--------|-------|
| Stage | Development / cast |
| Workflow | Pose transfer (SDXL, DWPose + ControlNet) |
| Provider | Complex tier |
| References | Face ref + pose source image |
| Purpose | Training datasets needing pose variety |

### 3.5 Outfit/Wardrobe Try-On

| Aspect | Value |
|--------|-------|
| Stage | Development / cast |
| Workflow | Garment inpainting (SDXL, CLIPSeg) or garment_ref (Flux.2) |
| Provider | Complex tier |
| References | Character face/body refs + garment image from wardrobe catalog |
| Purpose | Visualizing character in specific outfits |

### 3.6 Image Refinement

| Aspect | Value |
|--------|-------|
| Stage | Any |
| Workflow | img2img with denoise control |
| Provider | Complex tier (Flux.2 or SDXL) |
| References | Source image (the image being refined) |
| Purpose | Improving an existing generation |

### 3.7 Quality Upscale

| Aspect | Value |
|--------|-------|
| Stage | Any |
| Workflow | sdxl_quality_postprocess (RealESRGAN) |
| Provider | Complex tier (SDXL) |
| References | Source image |
| Purpose | Upscaling hero shots to higher resolution |

### 3.8 Training Dataset Fill

| Aspect | Value |
|--------|-------|
| Stage | Cast |
| Workflow | Multi-reference with prompt variation |
| Provider | Any tier (batch economics) |
| References | Full reference package |
| Batch size | Large (10-50) |
| Content rating | Per-dataset requirements |
| Purpose | Filling gaps in LoRA/IPAdapter training datasets |

### 3.9 NSFW Content Generation

> **Note: Claude Code can build the routing infrastructure and provider selection for NSFW generation but cannot assist with prompt engineering, image review, or content-specific workflow tuning for explicit content.**

| Aspect | Value |
|--------|-------|
| Stage | Any |
| Workflow | Same as above workflows, but routed to NSFW-safe providers |
| Provider | NSFW-safe only (Klein 4B, Lustify SDXL) |
| Content rating | `nsfw` — Bifrost filters to `nsfw_safe=true` providers |
| Purpose | Character reference, anatomical detail, scene content |

### 3.10 Anatomical Detail Refinement

> **Note: Claude Code can build the pipeline infrastructure (img2img refinement loop, detail region selection, LoRA application) but cannot assist with prompt engineering or image review for anatomical detail content.**

| Aspect | Value |
|--------|-------|
| Stage | Development / cast |
| Workflow | img2img refinement or inpainting on specific regions |
| Provider | NSFW-safe, complex tier |
| References | Existing full-body image as source |
| LoRA | Detail-specific LoRAs (selected by user) |
| Purpose | Refining individual anatomical features for character consistency |

---

## 4. NSFW Routing

### 4.1 Content Rating Selection

The generation UI must expose content rating as an explicit choice, not a hidden default.

| Rating | Providers | Use case |
|--------|-----------|----------|
| `sfw` | All providers | Standard outfit poses, headshots, production scenes |
| `nsfw` | Only `nsfw_safe=true` providers | Nude reference, anatomical detail, explicit poses |

### 4.2 Provider Selection Logic

```
1. User selects content_rating (sfw/nsfw)
2. Frame sets RequestMeta.ContentRating
3. Bifrost filters providers to those matching content rating
4. Within filtered set, Bifrost selects by tier + availability
5. If no provider available for rating → return error with explanation
```

### 4.3 Bifrost Status Enhancement

Frame's `GET /api/v1/bifrost/status` should return provider capabilities so the UI can:
- Show which content ratings are available
- Disable NSFW generation if no NSFW-safe provider is online
- Show provider names and their capabilities

---

## 5. LoRA Management

### 5.1 LoRA Registry

Frame maintains a registry of available LoRA adapters:

```go
type LoRA struct {
    ID                  string
    Name                string
    Filename            string    // filename on the ComfyUI/provider side
    SourceURL           string    // e.g., CivitAI URL
    Description         string
    Category            string    // "style", "character", "pose", "detail", "nsfw", "quality"
    Tags                []string
    RecommendedStrength float64   // e.g., 0.7
    ContentRating       string    // "sfw" or "nsfw"
    CompatibleModels    []string  // e.g., ["flux2", "sdxl"]
    CreatedAt           time.Time
}
```

### 5.2 LoRA Selection in Generation

- **Single LoRA per request** (current Bifrost limitation)
- **LoRA picker** in Studio UI: searchable by name/tag/category, filterable by content rating and compatible model
- **Per-workflow suggestions**: certain workflows benefit from specific LoRAs (e.g., detail LoRAs for anatomical shots, pose LoRAs for accuracy)
- **Strength override**: default to `recommended_strength` but allow user adjustment (0.0-1.5 slider)

### 5.3 Future: LoRA Stacking

If Bifrost/ComfyUI workflows are extended to support multiple LoRAs per request, the API should accept an array:

```json
{
  "loras": [
    { "adapter": "detail_enhance_v2", "strength": 0.6 },
    { "adapter": "pose_accuracy", "strength": 0.4 }
  ]
}
```

This is a Bifrost enhancement, not a Frame change. Frame's API should accept the array now (forward-compatible) and pass the first entry to Bifrost until stacking is supported.

---

## 6. Generation API Changes

### 6.1 Enhanced Generate Endpoint

`POST /api/v1/generate` additions:

```json
{
  "character_id": "...",
  "era_id": "...",
  "prompt": "...",
  "negative_prompt": "...",
  "style_prompt": "...",
  "width": 1024,
  "height": 1024,
  "steps": 30,
  "batch_size": 4,
  "seed": 0,
  "content_rating": "nsfw",
  "tier": "complex",
  "provider_name": "",
  "workflow": "txt2img",
  "include_refs": true,
  "ref_image_ids": [],
  "lora_adapter": "detail_enhance_v2",
  "lora_strength": 0.7,
  "source_image_id": "",
  "denoise_strength": 0.6,
  "pose_id": "front_full",
  "outfit_id": "nude"
}
```

New fields:
- `tier` — routing tier (cheap/complex/frontier), default: complex
- `workflow` — workflow type (txt2img/img2img/multi_ref/pose_transfer/inpaint/upscale)
- `source_image_id` — for img2img/refinement workflows
- `denoise_strength` — for img2img (0.0-1.0)
- `pose_id` / `outfit_id` — for standard pose set tracking

### 6.2 Standard Pose Set Endpoint

`POST /api/v1/characters/{id}/pose-set/generate`:

Triggers generation of the full standard pose set (or missing poses). Accepts:
```json
{
  "era_id": "...",
  "categories": ["sfw_standard", "nsfw_standard", "anatomical_detail"],
  "outfits": ["nude", "standard_outfit", "swimsuit"]
}
```

Returns the pose set status with generated/pending counts.

`GET /api/v1/characters/{id}/pose-set`:

Returns the current state of the standard pose set for a character/era:
```json
{
  "character_id": "...",
  "era_id": "...",
  "total": 26,
  "generated": 12,
  "accepted": 8,
  "poses": [
    {
      "pose_id": "front_headshot",
      "outfit_id": "nude",
      "status": "accepted",
      "image_id": "..."
    },
    {
      "pose_id": "front_headshot",
      "outfit_id": "standard_outfit",
      "status": "pending",
      "image_id": null
    }
  ]
}
```

### 6.3 LoRA Registry Endpoints

- `GET /api/v1/loras` — list all registered LoRAs (filterable by category, content_rating, compatible_models)
- `POST /api/v1/loras` — register a new LoRA
- `PATCH /api/v1/loras/{id}` — update LoRA metadata
- `DELETE /api/v1/loras/{id}` — remove LoRA from registry

---

## 7. Studio UI Enhancements

### 7.1 Workflow Selector

Replace the current style template dropdown with a workflow selector:

| Workflow | Label | Parameters shown |
|----------|-------|-----------------|
| `txt2img` | Text to Image | Prompt, negative, style, dimensions, steps, seed, batch |
| `multi_ref` | Multi-Reference | Same + reference package toggle + custom refs |
| `img2img` | Image Refinement | Source image picker + denoise slider |
| `pose_transfer` | Pose Transfer | Face ref + pose source image |
| `upscale` | Quality Upscale | Source image picker |

### 7.2 Content Rating Toggle

Prominent SFW/NSFW toggle in the generation panel. When NSFW:
- UI shows warning if no NSFW-safe provider available
- Routes to NSFW-safe providers only

### 7.3 Tier Selector

Simple selector: Quick (cheap), Standard (complex), Premium (frontier). Affects cost/quality tradeoff.

### 7.4 LoRA Picker

- Searchable dropdown with category filters
- Shows recommended strength, compatible models
- Strength slider (0.0-1.5)
- Content rating badge per LoRA

### 7.5 Pose Set Dashboard

New view within character detail showing the 26-image grid:
- Rows: poses
- Columns: outfits
- Each cell: generated image thumbnail, or empty placeholder with "Generate" button
- Bulk generate: "Generate all missing" button
- Accept/reject per image

### 7.6 Batch Controls

- Batch size selector (1, 2, 4, 8)
- Dimensions presets: Portrait (768x1024), Square (1024x1024), Landscape (1024x768)

---

## 8. Database Changes

### 8.1 New Tables

```sql
-- Standard pose definitions (seeded, not user-created)
CREATE TABLE standard_poses (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    category      TEXT NOT NULL, -- sfw_standard, nsfw_standard, anatomical_detail
    framing       TEXT NOT NULL, -- headshot, portrait, full_body, detail
    content_rating TEXT NOT NULL DEFAULT 'sfw',
    prompt_hints  TEXT NOT NULL DEFAULT '',
    sort_order    INTEGER NOT NULL DEFAULT 0
);

-- Standard outfit definitions (seeded)
CREATE TABLE standard_outfits (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    content_rating TEXT NOT NULL DEFAULT 'sfw',
    sort_order     INTEGER NOT NULL DEFAULT 0
);

-- Tracks generated pose set images per character/era
CREATE TABLE pose_set_images (
    character_id TEXT NOT NULL,
    era_id       TEXT NOT NULL,
    pose_id      TEXT NOT NULL REFERENCES standard_poses(id),
    outfit_id    TEXT NOT NULL DEFAULT '',
    image_id     TEXT REFERENCES images(id),
    status       TEXT NOT NULL DEFAULT 'pending',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (character_id, era_id, pose_id, outfit_id)
);

-- LoRA adapter registry
CREATE TABLE loras (
    id                   TEXT PRIMARY KEY,
    name                 TEXT NOT NULL,
    filename             TEXT NOT NULL,
    source_url           TEXT NOT NULL DEFAULT '',
    description          TEXT NOT NULL DEFAULT '',
    category             TEXT NOT NULL DEFAULT 'style',
    tags                 TEXT NOT NULL DEFAULT '[]', -- JSON array
    recommended_strength REAL NOT NULL DEFAULT 0.7,
    content_rating       TEXT NOT NULL DEFAULT 'sfw',
    compatible_models    TEXT NOT NULL DEFAULT '[]', -- JSON array
    created_at           TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 8.2 Seed Data

Standard poses and outfits seeded in migration:

```sql
-- SFW Standard Poses
INSERT INTO standard_poses VALUES ('front_headshot', 'Front Headshot', 'sfw_standard', 'headshot', 'sfw', 'head and shoulders, front facing, neutral expression, studio lighting', 0);
INSERT INTO standard_poses VALUES ('three_quarter_portrait', '3/4 Portrait', 'sfw_standard', 'portrait', 'sfw', 'head and shoulders, three-quarter angle, studio lighting', 1);
INSERT INTO standard_poses VALUES ('profile_portrait', 'Profile', 'sfw_standard', 'portrait', 'sfw', 'head and shoulders, side profile view, studio lighting', 2);
INSERT INTO standard_poses VALUES ('front_full', 'Front Full Body', 'sfw_standard', 'full_body', 'sfw', 'full body, front facing, standing, neutral pose, studio lighting', 3);
INSERT INTO standard_poses VALUES ('back_full', 'Back Full Body', 'sfw_standard', 'full_body', 'sfw', 'full body, from behind, standing, looking over shoulder, studio lighting', 4);
INSERT INTO standard_poses VALUES ('three_quarter_full', '3/4 Full Body', 'sfw_standard', 'full_body', 'sfw', 'full body, three-quarter angle, standing, studio lighting', 5);

-- NSFW Standard Poses
INSERT INTO standard_poses VALUES ('bent_over_rear', 'Bent Over (Rear)', 'nsfw_standard', 'full_body', 'nsfw', '', 10);
INSERT INTO standard_poses VALUES ('supine_spread', 'Supine Spread', 'nsfw_standard', 'full_body', 'nsfw', '', 11);
INSERT INTO standard_poses VALUES ('kneeling_front', 'Kneeling Front', 'nsfw_standard', 'full_body', 'nsfw', '', 12);
INSERT INTO standard_poses VALUES ('seated_spread', 'Seated Spread', 'nsfw_standard', 'full_body', 'nsfw', '', 13);

-- Anatomical Detail Poses
INSERT INTO standard_poses VALUES ('breast_detail', 'Breast Detail', 'anatomical_detail', 'detail', 'nsfw', '', 20);
INSERT INTO standard_poses VALUES ('vulva_detail', 'Vulva Detail', 'anatomical_detail', 'detail', 'nsfw', '', 21);
INSERT INTO standard_poses VALUES ('pubic_hair_natural', 'Pubic Hair (Natural)', 'anatomical_detail', 'detail', 'nsfw', '', 22);
INSERT INTO standard_poses VALUES ('pubic_hair_groomed', 'Pubic Hair (Groomed)', 'anatomical_detail', 'detail', 'nsfw', '', 23);

-- Standard Outfits
INSERT INTO standard_outfits VALUES ('nude', 'Nude', 'nsfw', 0);
INSERT INTO standard_outfits VALUES ('standard_outfit', 'Standard Outfit', 'sfw', 1);
INSERT INTO standard_outfits VALUES ('swimsuit', 'Swimsuit', 'sfw', 2);
```

---

## 9. Implementation Order

### Phase 1: Infrastructure (Claude Code can fully support)
1. Migration: standard_poses, standard_outfits, pose_set_images, loras tables
2. Auto-create Standard era (age 20) on character creation
3. LoRA registry CRUD endpoints
4. Enhanced generate endpoint (tier, workflow, content_rating, source_image_id, denoise)
5. Pose set status endpoint
6. Bifrost status enhancement (provider capabilities)

### Phase 2: Studio UI (Claude Code can fully support)
7. Workflow selector replacing template dropdown
8. Content rating toggle (SFW/NSFW)
9. Tier selector
10. LoRA picker with search/filter
11. Batch size and dimension controls
12. img2img source image picker + denoise slider

### Phase 3: Pose Set UI (Claude Code can support structure, not NSFW content)
13. Pose set dashboard grid in character detail
14. Pose set generation trigger (bulk "generate missing")
15. Accept/reject per pose image

### Phase 4: Content-specific work (Claude Code limitations apply)
> Items 16-19 require prompt engineering, image review, and content-specific workflow tuning that Claude Code cannot assist with. The infrastructure from phases 1-3 supports these workflows — the creative content must be authored by the user.

16. NSFW pose prompt templates
17. Anatomical detail prompt templates and refinement workflows
18. LoRA curation (selecting and registering specific CivitAI LoRAs)
19. Seed character generation (producing the actual 26-image sets)

---

## 10. Seed Data Goal

For initial development, create 2-3 characters with complete image sets (26 images each). This requires:
- Characters created in Frame with Standard era
- Images generated externally (ComfyUI) or via Bifrost
- Images imported via `POST /api/v1/import/directory` or individual ingest
- Images tagged with pose_id/outfit_id in pose_set_images table
- Face/body refs marked in character_images

The import tooling and tagging infrastructure (phases 1-3) must be in place first. The actual image generation and curation (phase 4) is done by the user.
