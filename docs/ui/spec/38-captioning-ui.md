# 38 — Captioning UI

## Job

Write and manage captions for character images. Captions are the text descriptions that accompany images when exported for LoRA training (as `.txt` sidecar files). The user needs to write captions efficiently — individually for important images and in bulk using templates for large batches. Good captions are critical for training quality.

This spec describes a captioning view accessible from the era workspace, operating on all images in an era. It also covers caption editing inline on the dataset detail page for per-dataset caption overrides.

## Who Uses This

The user preparing a dataset for LoRA training. They've already generated and triaged images. Now they need to describe each image before export. This is typically done in batches of 20-100 images.

## What It Shows

### Route: `/characters/{characterId}/eras/{eraId}/captions`

Accessible from the era workspace filter bar (alongside Triage, Studio, Ref Builder). Full-width layout with horizontal padding matching era workspace (48px).

### Header

A horizontal row, 80px vertical padding:

**Left side:**
- Title: "Captions" — Newsreader font, 48px, `#5F5E5E`, italic
- Subtitle: character name + era label — 13px, `#8C8C8A`

**Right side:**
- Caption stats: "42 of 67 captioned" — 13px, `#8C8C8A`, tabular-nums
- Progress bar below stats: thin (3px), full width of the stats text, `#F3F4F3` background, `#2F3333` fill proportional to captioned count

### Template Bar

Below header, 24px bottom margin. A horizontal row with `#F3F4F3` background, 16px padding, 2px radius.

**Left side:**
- Label: "Template" — 11px uppercase, tracked, `#8C8C8A`, font-bold
- Template select dropdown:
  - Options: "None", "Basic Identity", "Detailed", "LoRA Training", "Custom..."
  - Styling: transparent background, 1px border `#EDEEED`, 13px, 8px vertical / 12px horizontal padding

**Right side:**
- "Apply to Uncaptioned" button — 1px border `#5F5E5E`, `#5F5E5E` text, 11px uppercase, font-bold, 8px vertical / 16px horizontal padding. Hover: `#5F5E5E` background, `#FAF9F8` text. Only enabled when a template is selected and uncaptioned images exist.
- "Apply to All" button — same styling but lighter border `#EDEEED`. Overwrites existing captions. Shows confirmation tooltip on click: "This will overwrite X existing captions. Click again to confirm."

### Caption Templates

Templates are text patterns with variable substitution. Variables are injected from the character's identity and era physical attributes (the same data the prompt compose system uses).

**Built-in templates:**

**Basic Identity:**
```
{gender} {ethnicity} person, {hair_length} {hair_color} hair, {eye_color} eyes
```

**Detailed:**
```
{gender} {ethnicity} person, age {age_range}, {build} build, {height}cm tall, {hair_length} {hair_texture} {hair_color} hair, {eye_shape} {eye_color} eyes, {skin_tone} skin, {distinguishing_features}
```

**LoRA Training:**
```
photo of sks {gender}, {ethnicity}, {hair_length} {hair_color} hair, {eye_color} eyes, {skin_tone} skin, {build} build
```

**Custom:** Opens a text input where the user can write their own template with `{variable}` tokens. The same variable set as the prompt compose system (see prompt-catalog.md variable reference).

### Image Caption List

Below template bar. A vertical list of images with their captions, one per row. Not a grid — each row shows the image thumbnail alongside a full-width text editor.

Each row:
- Fixed height when not editing: 80px
- 1px bottom border `#F3F4F3`
- Hover: `#F3F4F3` background

**Left (thumbnail):** 64px × 64px square, `object-cover`, 2px radius, 1px border `#EDEEED`. Click opens lightbox.

**Center (caption area):** Flex-1, occupying the remaining width.
- **When not editing:** Caption text displayed as 13px, `#2F3333`, single line truncated with ellipsis. If no caption: "No caption" in `#8C8C8A` italic.
- **When editing (click to enter):** A `<textarea>` replaces the text. 13px, `#2F3333`, `#FFFFFF` background, 1px border `#5F5E5E`, 8px padding. Auto-grows to fit content (min 2 rows, max 6). Focus ring: 1px `#5F5E5E`.
- **Save:** On blur or Enter (with Shift+Enter for newlines). Calls `PATCH /api/v1/characters/{id}/images/{imageId}` with `{ "caption": text }`.
- **Cancel:** Escape reverts to previous value.

**Right (metadata):** 120px width, right-aligned.
- Image dimensions: "1024×1024" — 10px, `#8C8C8A`, tabular-nums
- Source badge: "Generated" or source name — 9px uppercase, `#8C8C8A`
- Character count of caption: "42 chars" — 10px, `#8C8C8A`, tabular-nums. Changes color based on length: <20 red (`#9F403D`), 20-100 default, >200 amber (`#D97706`)

### Filter / Sort Controls

Above the list, 16px bottom margin. Horizontal row.

**Left:**
- Filter buttons: "All" / "Captioned" / "Uncaptioned" — 11px uppercase, tracked, font-bold. Active: `#2F3333` bg, `#FAF9F8` text. Inactive: `#8C8C8A` text, transparent bg, hover: `#5F5E5E` text.

**Right:**
- Sort: "Newest" / "Oldest" / "Filename" — same button style as filter

### Bulk Selection Mode

Clicking the checkbox area (left of thumbnail) enters selection mode. Same pattern as era workspace:
- Checkbox appears on hover, stays visible when selected
- Floating bottom bar appears with count + actions:
  - "Apply Template" — applies current template to selected
  - "Clear Captions" — removes captions from selected
  - "Copy First Caption" — copies the first selected image's caption to all other selected (useful for similar images)
  - Close button to deselect all

## Actions

- Write or edit a caption for a single image (click to edit, blur to save)
- Select a caption template from presets or write a custom one
- Apply template to uncaptioned images only
- Apply template to all images (with overwrite confirmation)
- Filter list by captioned/uncaptioned status
- Sort list by date or filename
- Bulk select images and apply template or clear captions
- Copy one image's caption to multiple selected images

## Data

### Endpoints Used

- `GET /api/v1/characters/{id}/images?era_id={eraId}` — image list with captions
- `PATCH /api/v1/characters/{id}/images/{imageId}` — update caption (`{ "caption": "..." }`)
- `PUT /api/v1/characters/{id}/images/bulk` — bulk update captions (`{ "image_ids": [...], "update": { "caption": "..." } }`)
- `GET /api/v1/characters/{id}` — character data for template variable injection
- `POST /api/v1/prompts/compose` — could be used to build identity string for templates (reuse existing compose infrastructure)

### Template Variable Resolution

Templates use the same `{variable}` tokens as the prompt catalog. The captioning UI resolves them client-side from the character and era data already loaded. Variables with no value are omitted (not rendered as "{undefined}").

## Notes

- Captions live on `character_images.caption`. When an image is added to a dataset, the dataset can override the caption via `dataset_images.caption`. This spec covers the character-level captions (the defaults).
- The export system already writes `.txt` sidecars from captions. No backend changes needed for export.
- Caption quality matters more than quantity. A good 20-image dataset with precise captions beats a 100-image dataset with generic ones. The template system should produce a reasonable starting point that the user then refines per-image.
- The "LoRA Training" template includes `sks` as the trigger token. This is a convention — the user may want to customize the trigger word. Consider making it a character-level setting in the future.
- Character count indicators help the user gauge caption verbosity. Very short captions (<20 chars) are likely too generic. Very long captions (>200 chars) may dilute training signal.
