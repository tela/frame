# Era Workspace

## Job

Manage all images and visual identity data for a specific era of a character. This is where curation happens — organizing images into sets, selecting and scoring reference images, editing the visual description and prompt prefix, and reviewing pipeline settings.

## Who Uses This

The user, when actively curating a character's visual identity for a specific era. This is the primary work surface for cast characters.

## What It Shows

### Era Header
- Character name + era label (e.g., "Sarah — Young Adult")
- Visual description (editable)
- Prompt prefix (editable, auto-generated from visual description or manually set)
- Pipeline settings summary (checkpoint, IPAdapter weight, sampler — editable)

### Reference Package Panel
The core deliverable of curation. Shows:
- **Face references**: ordered list of face ref images with scores and ranks. User can reorder, add/remove, adjust scores.
- **Body references**: same pattern.
- **Package status**: ready / not ready. Ready means at least N face refs are scored and ranked.
- Action: preview reference package JSON (what ComfyUI would receive)

### Image Grid
All images assigned to this era, displayed as a filterable, sortable grid.

**View modes:**
- Grid (thumbnails)
- List (thumbnails + metadata)

**Filtering:**
- By set type: staging, reference, curated, training, archive
- By triage status: pending, approved, rejected, archived
- By tags: filter by any tag namespace/value combination
- By source: fig, comfyui, frame studio, manual
- By rating: 1-5

**Sorting:**
- Ingestion date
- Rating
- Ref score

**Bulk actions (multi-select):**
- Apply tags to selected images
- Change set type for selected images
- Change triage status for selected images
- Set rating for selected images
- Mark as face ref / body ref

### Image Detail (Lightbox / Side Panel)
When an image is selected:
- Full-size image view
- All metadata: source, ingestion date, dimensions, file size, hash
- Tags (editable — add/remove tags)
- Set type and triage status (editable)
- Rating (editable)
- Face ref / body ref toggles with score and rank
- Generation metadata (if from Frame studio): prompt used, template, seed, pipeline settings
- Actions: open in Studio for refinement (img2img), delete (mark as rejected)

## Actions

- Edit visual description, prompt prefix, pipeline settings
- Manage reference package (reorder, score, promote/demote refs)
- Bulk tag, bulk set type, bulk triage
- Open Studio to generate more images for this era
- Navigate to Triage Queue (filtered to this era's pending images)

## Data Requirements

- `GET /api/v1/characters/{id}` for character info
- Era data from character response or `GET /api/v1/characters/{id}/eras`
- Images: need a query endpoint that supports filtering by era, set type, triage status, tags, source, rating
- Reference package: `GET /api/v1/characters/{id}/eras/{era}/reference-package`
- Tag operations: endpoints for adding/removing tags from images
- Bulk operations: endpoint for batch-updating image metadata

## Notes

- This screen does heavy lifting. It needs to feel fast even with hundreds of images per era.
- Tag application must be efficient — keyboard shortcuts for frequently-used tags.
- The reference package panel should update in real-time as the user promotes/demotes face and body refs.
