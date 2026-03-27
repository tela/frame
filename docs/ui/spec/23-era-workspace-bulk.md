# 23 — Era Workspace Bulk Actions (Enhancement)

Enhances spec 03 (Era Workspace) with bulk operations using the new `PUT /characters/{id}/images/bulk` endpoint.

## Current State
The era workspace has multi-select with bulk buttons for Set Type, Approve, Reject, and Tag. Each operation currently makes N individual PATCH calls.

## Changes

### Bulk Action Bar Enhancement
Replace individual PATCH calls with single bulk endpoint call. Add new actions:

```
{N} selected  [Set Type ▾]  [Approve]  [Reject]  [Tag]  [Mark Face Ref]  [Mark Body Ref]  [Move to Shoot ▾]
```

New buttons:
- **Mark Face Ref** — bulk set `is_face_ref: true` on selected images
- **Mark Body Ref** — bulk set `is_body_ref: true` on selected images
- **Move to Shoot** — dropdown to assign selected images to a shoot (spec 22)

### Ref Rank Assignment
When marking face/body refs, show a follow-up prompt:
- "Set ref rank for {N} images: [1] [2] [3] [Auto]"
- Auto assigns sequential ranks based on selection order
- Uses bulk endpoint with `ref_rank` field

### Implementation
All bulk actions use `useBulkUpdateCharacterImages()` hook:

```typescript
bulkUpdate.mutate({
  characterId,
  imageIds: selectedImageIds,
  update: { is_face_ref: true, ref_rank: 1 }
})
```

Single API call replaces N individual PATCH calls.

## Data
- `PUT /api/v1/characters/{id}/images/bulk` — bulk update
- `PUT /api/v1/shoots/{shootId}/images/bulk` — bulk shoot assign

## Hooks Available
- `useBulkUpdateCharacterImages()` — bulk image metadata update
- `useBulkAddShootImages()` — bulk shoot assignment
