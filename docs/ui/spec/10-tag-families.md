# Tag Families (Tag Manager Enhancement)

## Job

Organize tags into domain-separated families so that different concerns — character identity, NSFW content, technical quality, training suitability — don't collide. When working on visual identity curation, NSFW tags are out of the way. When preparing training data for intimate content, NSFW tags are front and center.

Families are not just UI grouping — they are **domain boundaries** that control which tags appear in which workflows.

## Data Model

### Tag Family
| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT (16-char hex) | Primary key |
| `name` | TEXT | e.g., "Character Identity", "NSFW", "Technical", "Training" |
| `description` | TEXT | What this family covers |
| `color` | TEXT | Optional accent color for visual distinction in UI |
| `sort_order` | INTEGER | Display ordering |
| `created_at` | TEXT | |

### Tag (updated)
Existing `image_tags` table gains a `family_id` column:
| Field | Type | Notes |
|-------|------|-------|
| `family_id` | TEXT FK → tag_families | Every tag belongs to exactly one family |

A tag's full identity becomes: `family → namespace → value`.

### Default Families (seeded on first run)
- **Character Identity** — pose, expression, angle, lighting, clothing, style, setting
- **NSFW** — body-area, clothing-state, intimacy-level, content-type
- **Technical** — quality, resolution, artifacts, format
- **Training** — suitability, crop-status, duplicate-status

## What the Updated Tag Manager Shows

### Family Selector
Top-level tabs or sidebar sections, one per family. Selecting a family filters the entire tag list to tags within that family. The active family is visually distinct (color accent from the family's color field).

### Within a Family
Same two-column layout as current Tag Manager:
- Left: searchable tag list filtered to this family's namespaces/values
- Right: tag detail pane (usage stats, synonyms, merge, delete)

### Family Management
- Create new families
- Edit family name, description, color, sort order
- Delete a family (must reassign or delete its tags first)
- Reorder families via drag or sort_order editing

## How Families Affect Other Screens

### Triage Queue
Quick-tag bar shows tags grouped by family. Toggle between families (e.g., press `F` to cycle families, then number keys to apply tags within the active family). This keeps the triage flow fast without overwhelming the user with every tag in the system.

### Image Search
Filter sidebar groups tags by family. "Show NSFW tags" is a family toggle, not a per-tag setting.

### Era Workspace
Tag display on image overlays can be configured to show/hide families. When curating visual identity, hide NSFW tags. When reviewing intimate content, show them.

### Dataset Builder
Filter candidates by family-scoped tags: "NSFW body-area:intimate AND Training suitability:lora-ready".

## Actions

- Create, edit, delete tag families
- Assign/reassign tags to families
- Filter all tag views by family
- Cycle families in triage quick-tag context

## API Endpoints

```
GET    /api/v1/tag-families                  — list all families
POST   /api/v1/tag-families                  — create family
PATCH  /api/v1/tag-families/{id}             — update family
DELETE /api/v1/tag-families/{id}             — delete family
GET    /api/v1/tags?family={id}              — list tags filtered by family
POST   /api/v1/tags                          — create tag (with family_id)
PATCH  /api/v1/tags/{id}                     — update tag (reassign family, rename, etc.)
DELETE /api/v1/tags/{id}                     — delete tag
POST   /api/v1/images/{id}/tags              — add tag to image
DELETE /api/v1/images/{id}/tags/{tag_id}     — remove tag from image
POST   /api/v1/images/bulk-tag               — add/remove tags from multiple images
```
