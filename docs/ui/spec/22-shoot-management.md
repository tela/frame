# 22 — Shoot Management

## Location
Within Character Detail, between the era cards and the Pose Set Dashboard. Also accessible from Era Workspace as a filter/grouping mechanism.

## Concept
A shoot is a named group of images from a single generation session, import batch, or photo set. Shoots organize a character's raw images before they enter the curation pipeline (triage, ref marking, dataset assignment).

## Character Detail — Shoot Section

### Layout
Horizontal scrollable cards (same pattern as era cards).

```
Shoots                                          [+ New Shoot]
3 shoots · 47 images total

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌ ─ ─ ─ ─ ─ ─ ─ ┐
│  [grid of 4     │ │  [grid of 4     │ │  [grid of 4     │ │               │
│   thumbnails]   │ │   thumbnails]   │ │   thumbnails]   │ │    + New      │
│                 │ │                 │ │                 │ │    Shoot      │
│ Studio Session  │ │ ComfyUI Import  │ │ Reference Refs  │ │               │
│ 18 images       │ │ 22 images       │ │ 7 images        │ └ ─ ─ ─ ─ ─ ─ ─ ┘
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Shoot Card
- 2x2 thumbnail grid from the shoot's first 4 images (or placeholders)
- Shoot name (display font)
- Image count
- Click → navigates to Era Workspace with shoot filter applied

### Create Shoot Dialog
- Name input (auto-suggest: "{date} Shoot", "{date} Import")
- Optional: assign to specific era

## Era Workspace — Shoot Integration

### Shoot Filter
Add a shoot filter dropdown above the image grid, alongside existing filters:

```
[All Shoots ▾]  [All Set Types ▾]  [All Triage ▾]  [Search tags...]
```

When a shoot is selected, the grid shows only images in that shoot.

### Bulk Assign to Shoot
When images are selected in the grid, add "Move to Shoot" to the bulk action bar:

```
3 selected   [Set Type ▾]  [Approve]  [Reject]  [Tag]  [Move to Shoot ▾]
```

The "Move to Shoot" dropdown lists existing shoots + "New Shoot..." option. Uses `PUT /shoots/{shootId}/images/bulk`.

### Shoot Badge on Images
When viewing "All Shoots", each image thumbnail shows a small shoot name badge in the corner so the user can see which shoot each image belongs to.

## Import Screen — Shoot Assignment

### Existing Import Screen Enhancement
The import screen (`/import`) should show:
- Shoot selector dropdown: "Assign to shoot" with existing shoots + "Create new shoot" option
- When "Create new shoot" is selected, inline name input appears
- Import uses `shoot_id` parameter to auto-assign

## Data
- `GET /api/v1/characters/{id}/shoots` — list shoots with image counts
- `POST /api/v1/characters/{id}/shoots` — create shoot
- `DELETE /api/v1/shoots/{shootId}` — delete shoot
- `GET /api/v1/shoots/{shootId}/images` — list image IDs
- `PUT /api/v1/shoots/{shootId}/images/bulk` — bulk add images
- `POST /api/v1/import/directory` — accepts `shoot_id` parameter

## Hooks Available
- `useShoots(characterId)` — list shoots
- `useCreateShoot()` — create
- `useBulkAddShootImages()` — bulk add images to shoot
- `useImportDirectory()` — import with shoot_id
