# Triage Queue

## Job

Rapidly classify incoming images for a cast character. Every new image that arrives for a cast character enters the triage queue. The user decides: **delete** (mark rejected — poor quality, wrong character, artifacts), **archive** (keep but not for active use), or **approve and tag** (good image, tag for its purpose).

This is the highest-throughput screen in Frame. The user may process dozens of images in a session.

## Who Uses This

The user, after a generation session (from Frame studio or ComfyUI) produces a batch of images, or after Fig pushes new images for a cast character.

## What It Shows

### Current Image (Large)
The image being triaged, displayed as large as possible. This is the focus of the screen — everything else is secondary.

### Image Metadata (Compact)
- Source (fig, comfyui, frame studio, manual)
- Dimensions, format
- Generation metadata if available: prompt, template name, seed
- Ingestion date

### Quick Actions (Keyboard-Driven)
- **Delete / Reject** — mark as rejected, move to next (e.g., `D` or `X`)
- **Archive** — keep but not for active use, move to next (e.g., `A`)
- **Approve** — mark as approved, stay on image for tagging (e.g., `Space` or `Enter`)
- **Skip** — move to next without deciding (e.g., `S` or arrow key)
- **Previous** — go back to last image (e.g., `Backspace` or left arrow)

### Tag Application (After Approve)
When an image is approved, the user applies tags before moving on:
- Quick-tag buttons for the most common tags in each namespace (bound to number/letter keys)
- Tag namespace selector (pose, expression, angle, lighting, clothing, quality, style)
- Free-text tag entry for new tags
- Recently-used tags shown for fast reapplication

### Rating
- 1-5 rating, assignable via number keys
- Optional — can skip rating during triage and add later in Era Workspace

### Progress
- Position in queue: "12 of 47"
- Count by decision: "8 approved, 3 rejected, 1 archived"

### Era Assignment
If the character has multiple eras and the image wasn't ingested with a specific era:
- Era selector to assign the image before/after triage
- Default to the most recently active era

## Navigation

- Queue can be entered from Character Detail (all pending) or Era Workspace (era-specific pending)
- Queue is filtered by character, optionally by era
- When queue is empty: show completion summary and navigate back

## Actions

- Reject, archive, approve, tag, rate — all keyboard-driven
- Undo last action (important for accidental rejects)
- Batch mode: select multiple thumbnails from a strip view and apply the same action to all

## Data Requirements

- List of pending images for a character (optionally filtered by era)
- Image serving: full image + metadata
- Update endpoints: triage status, tags, rating, era assignment
- Undo requires tracking the previous state of the last N actions (client-side)

## Notes

- Speed is everything. The transition between images should be instant — preload the next 2-3 images.
- The keyboard binding scheme should be configurable or at least documented and consistent.
- Consider a "filmstrip" view at the bottom showing upcoming images as small thumbnails, so the user can see what's coming and jump ahead.
