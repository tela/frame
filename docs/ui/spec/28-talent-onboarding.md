# 28 — Talent Onboarding (Reference Builder)

## Job

Take a character that has imported reference images and build a working IP-Adapter reference set. Select the best face and body refs, rank them, test identity lock with a generated headshot, and refine until the refs are solid. Today this requires bouncing between Era Workspace (hover to mark refs), Studio (set up generation manually), and Triage (evaluate results). This spec consolidates the ref selection and testing workflow into a single focused screen.

Import is handled by the existing directory import flow (Import screen → select directory → assign to character). This spec picks up after images are imported.

## Who Uses This

The user, when:
- Selecting which images work best as IP-Adapter face and body references
- Ranking references (order matters — later refs have more influence in Klein's ReferenceLatent chain)
- Testing reference quality before committing to full generation
- Iterating on ref selection based on test results

Accessed from:
- Character Detail (button: "Build References")
- Era Workspace header (button: "Reference Builder")

## What It Shows

### Screen: `/characters/{id}/eras/{eraId}/refs`

Two-panel layout. Left panel is the image pool. Right panel is the reference set and test area.

### Header

```
← Elara · Standard Era                    3 face · 2 body · 23 total
```

Back arrow returns to character detail. Counts update live as refs are toggled.

### Left Panel: Image Pool

All images for this character/era. Toggle between `approved` only (default) and `all` (includes pending).

Each image card:
- Thumbnail (3:4 aspect, consistent with other grids)
- **Visible ref badge** — not hidden in hover. If marked as face ref: `F` badge with tinted border. If body ref: `B` badge. If neither: no badge.
- **Click action**: cycles `none → face_ref → body_ref → none`. Each click updates the image immediately.
- **Pending images** show a subtle muted overlay. Small approve button (checkmark) on the card — approving from here without needing the full triage queue. This means triage and ref selection can happen in one pass.

Supports multi-select (checkbox on hover) for bulk approve or bulk mark as face/body ref.

### Right Panel: Reference Set

#### Face Refs
Horizontal strip of selected face ref thumbnails, ordered by rank (rank 1 = most influence).
- Drag to reorder (updates ref_rank on each image)
- Click × to remove from refs (unsets is_face_ref)
- Count label: "3 face refs"

#### Body Refs
Same pattern. Separate strip below face refs.

#### Test Result
Empty initially. After "Test Refs" is clicked:
- Shows the generated test headshot (large, 4:5 aspect)
- If VL model is available via Bifrost: structured assessment below the image (identity match strength, quality notes, issues detected)
- If VL not available: just the image for manual evaluation
- Timestamp of when test was generated

Multiple test results can accumulate (scrollable) so the user can compare across ref changes.

#### Actions
- **"Test Refs"** — generates a standard front-facing headshot using current face and body refs via the `multi_ref` workflow. Blocks until complete, result appears in the test area. Can be clicked repeatedly as refs change.
- **"Lock Refs"** — signals that the reference set is complete. Soft concept — doesn't prevent changes, but marks the era as "refs ready" for downstream workflows. Navigates back to character detail.

### Bottom Bar: Quick Generate

Once refs exist, a prompt input allows generation without leaving the builder:

```
[prompt text field.................................] [Generate]
```

Auto-includes current refs. Uses the `multi_ref` workflow. Results appear in the test result area. Approved results flow into the character's image collection via standard triage.

This is optional for MVP — the Test Refs action is the critical path.

## Actions

- View all character/era images with visible ref status
- Toggle images between none/face_ref/body_ref with single click
- Approve pending images inline (skip triage queue)
- Drag to reorder ref ranking
- Remove refs
- Test refs (generates headshot)
- View VL assessment (when available)
- Lock refs (mark era as refs-ready)
- Quick generate with current refs

## Data

### New Endpoints

- `POST /api/v1/characters/{id}/eras/{eraId}/test-refs` — generate a test headshot using current refs. Returns the generated image ID and (if VL available) assessment.
- `POST /api/v1/characters/{id}/eras/{eraId}/evaluate` — send an image + face refs to VL model for identity assessment. Returns structured scoring.
- `PATCH /api/v1/characters/{id}/eras/{eraId}/lock-refs` — mark era as refs-ready (sets a flag, no behavioral change)

### Existing Endpoints Used

- `GET /api/v1/characters/{id}/images?era_id={eraId}` — image pool
- `PATCH /api/v1/characters/{id}/images/{imageId}` — toggle face_ref/body_ref, set ref_rank
- `PUT /api/v1/characters/{id}/images/bulk` — bulk approve, bulk mark refs
- `GET /api/v1/characters/{id}/eras/{eraId}/reference-package` — current ref set

## Notes

- The ref badges on image cards must be **always visible**, not hover-only. This is the core UX fix — you need to see at a glance which of your 50 images are selected as refs.
- Click-to-cycle (none → face → body → none) is faster than hover-and-click-a-button. One click per image, no menus.
- Ref rank matters for Klein workflows: later refs in the ReferenceLatent chain have more influence. Rank 1 = first in chain (least influence), highest rank = last (most influence). The drag-to-reorder UI should reflect this — the rightmost image in the strip has the most influence.
- Test generation uses `multi_ref` workflow with `include_refs: true`. The prompt is a standard headshot prompt (can be customized but defaults to the era's prompt_prefix + "front-facing headshot, neutral expression, studio lighting").
- VL evaluation calls Bifrost `/v1/chat/completions` with the test image + face ref images as multimodal content. The system prompt asks for structured JSON assessment. Falls back gracefully if no VL model is routed.
- "Lock Refs" could set a boolean field on the era (`refs_locked`) or simply update character status from `prospect`/`development` → `development`/`cast`. Exact semantics TBD.
- The era workspace ref hover buttons should remain as a secondary path for quick adjustments. The Reference Builder is the primary path for onboarding.
