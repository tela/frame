# Job Stories: Import and Media Management

## Context

Frame needs images to flow in from multiple sources — Fig sessions, ComfyUI outputs, existing directories, manual uploads. Media items (wardrobe, props, locations) also need to be managed as visual assets. Import is a primary entry point.

---

### When I have existing character images on disk, I need to bulk-import them into Frame with the right metadata so they're immediately useful.

**Acceptance:**
- I can point Frame at a directory and import all images in it
- I can drag and drop files into the import screen or onto an era workspace
- During import, I assign: character (optional), era (optional), source origin, initial tags
- Duplicate images are detected by content hash and skipped
- Import shows progress and a summary (imported, skipped, failed)
- Imported images go through the normal ingest pipeline (hash, thumbnails, DB records)

---

### When I add images to a character era, I need to be able to drag and drop them directly into the workspace, not navigate to a separate import screen.

**Acceptance:**
- Era workspace content area is a drop zone
- Dropping image files immediately ingests them for that character + era
- Upload progress and status shown as a toast notification
- Works for single files or multi-file drops

---

### When I'm managing wardrobe items, I need to see the garment images and manage them as reusable visual assets.

**Acceptance:**
- I can browse wardrobe, props, and locations in the Media Library
- I can click a media item to see its detail (images, metadata)
- I can add images to a media item
- I can set a primary image for a media item
- Media items are available as references in generation (e.g., clothing swap workflows)

---

### When I create images through Fig sessions or productions, they need to land in Frame for archival and potential use in training.

**Acceptance:**
- Fig pushes images to Frame via API with character and context metadata
- Images arrive in Frame with their source properly tagged
- Production images from Fig sessions carry the session ID for provenance

---

## What's Missing in Current Implementation

- Browse Files button now works (just fixed)
- Media item detail view is minimal (expand in card, no full detail page)
- No way to add images to a media item from the UI
- Drag-and-drop on Era Workspace just added but needs testing with real images
- No Fig → Frame push flow implemented yet (API exists but Fig isn't sending)
