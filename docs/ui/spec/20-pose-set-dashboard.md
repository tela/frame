# 20 — Pose Set Dashboard

## Location
Embedded within the Character Detail page, below the eras section. Visible for characters in `development` or `cast` status. Shows the standard reference image set for the selected era.

## Layout
Matrix grid. Rows are poses, columns are outfits.

### Structure
```
┌─────────────────────────────────────────────────────────────────┐
│ Reference Set — Standard Era (20)                    [Generate All Missing] │
│ 8 of 26 complete                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ SFW STANDARD                                                    │
│ ┌──────────────┬──────────┬──────────────────┬─────────┐       │
│ │              │  Nude    │ Standard Outfit  │ Swimsuit │       │
│ ├──────────────┼──────────┼──────────────────┼─────────┤       │
│ │ Front Head   │  [img]   │     [empty]      │ [empty]  │       │
│ │ 3/4 Portrait │  [img]   │     [empty]      │ [empty]  │       │
│ │ Profile      │  [img]   │     [empty]      │ [empty]  │       │
│ │ Front Full   │  [img]   │     [img]        │ [empty]  │       │
│ │ Back Full    │  [img]   │     [empty]      │ [empty]  │       │
│ │ 3/4 Full     │  [img]   │     [empty]      │ [empty]  │       │
│ └──────────────┴──────────┴──────────────────┴─────────┘       │
│                                                                 │
│ NSFW STANDARD                                                   │
│ ┌──────────────┬──────────┐                                     │
│ │              │  Nude    │                                      │
│ ├──────────────┼──────────┤                                      │
│ │ Bent Over    │  [img]   │                                      │
│ │ Supine       │  [empty] │                                      │
│ │ Kneeling     │  [empty] │                                      │
│ │ Seated       │  [empty] │                                      │
│ └──────────────┴──────────┘                                     │
│                                                                 │
│ ANATOMICAL DETAIL                                               │
│ ┌──────────────┬──────────┐                                     │
│ │              │  Detail  │                                      │
│ │ Breast       │  [empty] │                                      │
│ │ Vulva        │  [empty] │                                      │
│ │ Pubic Natural│  [empty] │                                      │
│ │ Pubic Groomed│  [empty] │                                      │
│ └──────────────┴──────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Cell States

### Empty (missing)
- Light dashed border
- Small "+" icon centered
- Clicking opens the Studio pre-filled with this pose's prompt hints and outfit context

### Generated (pending review)
- Thumbnail image fills the cell
- Yellow dot indicator (top-right corner)
- Hover reveals accept/reject buttons

### Accepted
- Thumbnail image fills the cell
- Green dot indicator
- Hover reveals "Replace" action

### Rejected
- Thumbnail image with reduced opacity
- Red dot indicator
- Hover reveals "Regenerate" action

## Cell Size
- Each cell: ~120x160px (3:4 aspect ratio, matching character image proportions)
- Row labels: 140px wide column on the left
- Column headers: centered above each outfit column

## Interactions
- **Click empty cell** → navigates to Studio with pose_id and outfit_id pre-set
- **Accept button** → PATCH pose set status to "accepted", marks image as face/body ref if applicable
- **Reject button** → PATCH pose set status to "rejected"
- **"Generate All Missing" button** → batch generates all empty cells (sequential, shows progress)

## Header
- Section title: "Reference Set"
- Era selector dropdown (if character has multiple eras)
- Progress: "8 of 26 complete" with thin progress bar
- "Generate All Missing" primary action button

## Data
- `GET /api/v1/characters/{id}/pose-set?era_id={eraId}` returns the full grid state
- `GET /api/v1/standard-poses` and `GET /api/v1/standard-outfits` for catalog
- `POST /api/v1/characters/{id}/pose-set` to update individual cells

## Category Sections
Three collapsible sections, each with its own sub-grid:
1. **SFW Standard** (6 poses × 3 outfits = 18 cells)
2. **NSFW Standard** (4 poses × 1 outfit = 4 cells)
3. **Anatomical Detail** (4 poses × 1 outfit = 4 cells)

NSFW and Anatomical sections have a subtle label indicating content rating.
