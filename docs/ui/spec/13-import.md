# Import

## Job

Bring existing images into Frame in bulk — from directories on disk, from other systems, or via drag-and-drop. This is the primary migration path for existing character image libraries and the ongoing ingestion point for images produced outside Frame.

## Import Sources

- **Directory on host filesystem** — point Frame at a folder, it walks and ingests all images
- **Drag-and-drop** — drop files onto the import screen
- **Multi-file upload** — standard file picker for multiple files

## What It Shows

### Import Configuration

**Step 1: Select source**
- Directory path input (with browse button or paste)
- Or drag-and-drop zone
- Preview: show count of image files found, total size

**Step 2: Assign context**
- **Character** — assign all imported images to a character (optional). Dropdown of existing characters, or "No character" for standalone images.
- **Era** — if character is cast and has eras, assign to an era (optional)
- **Source** — tag the import source: `fig`, `comfyui`, `manual`, or custom
- **Initial tags** — apply tags to all imported images (optional). Tag picker with family awareness.
- **Dataset** — optionally add all imported images directly to a dataset

**Step 3: Review and confirm**
- Thumbnail preview of first N images to be imported
- Summary: X images, Y total size, assigned to character Z era W
- "Import" button

### Import Progress
- Progress bar with count: "Importing 47 / 312"
- Per-image status: imported, skipped (duplicate), failed
- Thumbnail strip of recently imported images
- Cancel button

### Import Complete
- Summary: X imported, Y duplicates skipped, Z errors
- Link to view imported images (filtered view in Image Search or character workspace)
- Option to start another import

## Standalone Images

Images imported without a character assignment need a home. They exist in the `images` table but have no entry in `character_images`. They're accessible via:
- Image Search (no character filter)
- Dataset builder (can be added to any dataset)
- Tag Manager (can be tagged like any image)

The UI should make standalone images findable — Image Search should have an explicit "No character" filter option.

## Deduplication

SHA-256 hash check on every image (already in the ingest pipeline). Duplicates are skipped and reported. The user sees which images were skipped and why.

## Actions

- Select import source (directory, files, drag-drop)
- Assign character, era, source, tags
- Start import
- Cancel in-progress import
- View results

## API Endpoints

```
POST /api/v1/import/directory
  body: { "path": "/path/to/images", "character_id": "...", "era_id": "...", "source": "manual", "tags": [...] }
  response: { "job_id": "...", "total_files": 312 }

GET  /api/v1/import/{job_id}/status
  response: { "status": "running", "imported": 47, "skipped": 3, "failed": 0, "total": 312 }

POST /api/v1/import/upload
  multipart form with multiple files + metadata fields
```

## Notes

- Directory import reads from the host filesystem. The path must be accessible to the Frame process. This is fine for local use (Frame runs on the same machine as the files).
- Large imports (1000+ images) should be non-blocking — the API starts the job and the UI polls for progress.
- Imported images go through the full ingest pipeline: hash, detect format/dimensions, generate thumbnails, insert DB records.
- Consider a "dry run" mode that reports what would be imported without actually doing it.
