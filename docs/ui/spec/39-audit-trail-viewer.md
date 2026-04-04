# 39 — Audit Trail Viewer

## Job

Browse the history of changes made to characters, images, datasets, and other entities in Frame. The audit trail lets the user understand what happened, when, and to what — critical for reproducing good training results ("what did the dataset look like when that LoRA trained well?") and debugging unexpected state.

The audit log is already being collected server-side. This spec adds a UI to view it.

## Who Uses This

The user reviewing their work history — after a training run, after a batch of curation, or when investigating why an image has a certain state. Also useful for understanding the timeline of a character's development.

## What It Shows

### Route: `/audit`

Accessible from the sidebar navigation. Full-width layout.

### Header

Horizontal row, 80px vertical padding:

**Left side:**
- Title: "Audit Trail" — Newsreader font, 48px, `#5F5E5E`, italic
- Subtitle: "Activity history across all entities" — 13px, `#8C8C8A`

**Right side:**
- Total event count — 13px, `#8C8C8A`, tabular-nums

### Filter Bar

Below header, 24px bottom margin. Horizontal row with `#F3F4F3` background, 16px padding.

**Filters:**

- **Entity Type** — dropdown select: "All Types", "Character", "Image", "Dataset", "LoRA", "Look", "Hairstyle", "Media", "Pose Set". Maps to `entity_type` query param.
- **Action** — dropdown select: "All Actions", "Created", "Updated", "Deleted", "Rating Changed", "Triage Approved", "Triage Rejected", "Ref Promoted", "Exported", "Preprocessed". Free text since actions are open-ended.
- **Date Range** — two date inputs (From / To) for filtering by time window. Optional.
- **Search** — text input for searching entity IDs. Useful when the user has a specific image or character ID.

All filters are optional and applied as AND logic.

### Event List

Below filter bar. A vertical timeline-style list. Each event is a row.

Each event row:
- 1px bottom border `#F3F4F3`
- 12px vertical padding
- Hover: `#F3F4F3` background

**Layout (horizontal):**

**Icon (40px):** A circle with an icon representing the entity type:
- Character: `person` icon
- Image: `image` icon
- Dataset: `folder` icon
- LoRA: `model_training` icon
- Others: `history` icon
- Circle: 32px, `#F3F4F3` background, `#5F5E5E` icon color

**Content (flex-1):**
- **Primary line:** Action description — 13px, `#2F3333`. Format: "{action} on {entity_type} {entity_id_short}"
  - Example: "Rating changed on image a7f3b2c1"
  - Example: "Created character Elowen Vance"
  - Example: "Triage approved on image fe65176e"
- **Detail line (if field change):** "{field}: {old_value} → {new_value}" — 12px, `#8C8C8A`
  - Example: "rating: 3 → 5"
  - Example: "triage_status: pending → approved"
  - Example: "set_type: staging → reference"
- **Context chips (if context exists):** Small chips showing context key-value pairs — 10px, `#8C8C8A`, `#F3F4F3` background, 4px padding
  - Example: "character_id: a7f3b2c1"

**Timestamp (right-aligned, 120px):**
- Relative time: "2 hours ago", "Yesterday", "Mar 15" — 11px, `#8C8C8A`
- Full timestamp on hover (title attribute)

### Pagination

Below the list. Same pattern as image search: "Previous / 1 / 2 / 3 / ... / Next" — 13px, `#8C8C8A`, active page `#2F3333` with underline.

50 events per page.

### Entity Detail Link

Clicking an event row navigates to the entity:
- Character → `/characters/{characterId}`
- Image → lightbox or image detail
- Dataset → `/datasets/{datasetId}`
- Others → no navigation (just highlight)

## Actions

- Filter audit events by entity type, action, date range, or entity ID
- Browse paginated event history
- Click an event to navigate to the related entity
- See field-level change details (old → new value)

## Data

### Endpoints Used

- `GET /api/v1/audit?entity_type={type}&entity_id={id}&limit={n}&offset={n}` — paginated event query

### Backend Gaps

The current `Query` method only filters by `entity_type` and `entity_id`. For the full filter set, it needs:
- `action` filter (WHERE action = ? or action LIKE ?)
- `date_from` / `date_to` filters (WHERE created_at >= ? AND created_at <= ?)
- Text search on entity_id (WHERE entity_id LIKE ?)

These are small additions to `pkg/audit/store.go`.

## Notes

- The audit log is append-only. Events are never edited or deleted.
- Events are already being logged from 15+ API handlers (character CRUD, image curation, dataset operations, LoRA management, etc.).
- The timeline should show most recent first (DESC by created_at).
- For character-related events, the context often includes `character_id` which can be used to link back to the character page.
- This view is intentionally read-only. The user doesn't modify audit data — they browse it for insight.
