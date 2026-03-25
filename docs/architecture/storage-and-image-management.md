# Storage Architecture and Image Management

## Principles

1. **Frame manages the filesystem.** Users never need to manually move or rename files on the drive. The database is the source of truth; the filesystem is just storage.
2. **Import copies, never moves.** Source files are untouched. Frame copies into its managed directory.
3. **No duplicates on disk.** SHA-256 hash dedup. If the same image is imported twice, the file exists once and is linked to multiple contexts via the database.
4. **One image, many contexts.** A single image file can belong to multiple shoots, characters, datasets, and eras through database junction tables. No file duplication required.
5. **Flat storage per entity.** No nested subdirectories for eras, shoots, or stages. All images for a character live in one `images/` directory. Organizational structure is in the database, not the filesystem.
6. **Consistent naming.** Stored files are named by their image ID: `{image_id}.{format}`. Original filenames are preserved in metadata only.

---

## Directory Structure

```
/drive-root/
  frame.toml                    # App config
  frame.db                      # SQLite database
  frame                         # Binary (optional, can be on host)
  assets/
    characters/
      esme-a7f3b2c/             # {display_name}-{7char_id}
        images/                 # All originals, flat, named by image ID
          a1b2c3d4e5f67890.png
          f9e8d7c6b5a43210.jpg
        thumbs/                 # All thumbnails (300px, jpg)
          a1b2c3d4e5f67890.jpg
          f9e8d7c6b5a43210.jpg
      luke-char_lu/
        images/
        thumbs/
    references/                 # Non-character reference images
      images/
      thumbs/
    exports/                    # Dataset exports (generated on demand)
      eleanor-lora-v1-20260325/
```

### Why Flat Per Character

Previous structure had `staging/original/`, `eras/{era_id}/original/` — images physically separated by era and stage. This is wrong because:
- Moving an image between eras requires a file move + path update
- Same image in two eras means a file copy (wasted disk space)
- Removing from an era means deleting a file that might be needed elsewhere
- The filesystem encodes state that belongs in the database

With flat storage:
- Reassigning an image to a different era = one DB update, zero file operations
- Same image in multiple contexts = one file, multiple DB links
- No filesystem reorg ever needed

---

## Image Lifecycle

### Ingestion (Import or Generate)

1. Image data arrives (file upload, directory import, or Bifrost generation result)
2. SHA-256 hash computed
3. **Dedup check:** if hash exists in DB → link existing image to new context, return existing ID
4. **New image:**
   - Assign new 16-char hex image ID
   - Detect format, dimensions
   - Copy to `assets/characters/{slug}/images/{id}.{format}` (or `assets/references/images/` for non-character)
   - Generate 300px thumbnail to `thumbs/{id}.jpg`
   - Insert `images` DB record
   - Insert `character_images` DB record (if character context) with initial set_type=staging, triage_status=pending
5. Return image ID and metadata

### Context Assignment

A single image can be linked to:
- **One or more characters** (via `character_images` junction — same image, different characters)
- **One or more shoots** (via `shoot_images` junction)
- **One or more datasets** (via `dataset_images` junction)
- **An era** (via `character_images.era_id` — nullable)
- **Favorites** (via `character_images.is_favorited`)

Changing any of these is a DB operation only. No files move.

### Deduplication Across Characters

If you import the same image for two different characters:
- One file on disk
- Two `character_images` records pointing to the same `images.id`
- Each character can independently tag, rate, and assign the image to eras

---

## Non-Character Reference Images

Single reference images not tied to any character: style refs, pose refs, textures, body area references for training.

### Storage
```
assets/references/images/{id}.{format}
assets/references/thumbs/{id}.jpg
```

### Database
- `images` table record with normal metadata
- No `character_images` record
- Can have tags (via `image_tags`)
- Can be added to datasets (via `dataset_images`)
- Findable via Image Search with `has_character=false` filter

### Bulk Import and Tagging

**Job: I have a folder of 50 reference images (body close-ups, pose references, etc.) and I need to import them all and tag them consistently.**

**Workflow:**
1. Open Import screen (or drag folder onto it)
2. Select source directory
3. Leave character empty (standalone/reference images)
4. Apply initial tags: e.g., `body-area:chest`, `quality:high`
5. Execute Import → all 50 images ingested to `assets/references/`, all tagged
6. Images immediately available in Image Search filtered by those tags
7. Can be added to datasets for training

**Bulk tagging after import:**
1. Open Image Search
2. Filter: `has_character=false` + date range (to find the batch just imported)
3. Select all results
4. Apply additional tags via bulk tag action

The import screen already supports initial tags. The Image Search already supports `has_character` filter and bulk tag. The gap is that Image Search bulk actions need to be wired to the API.

---

## Image Generation

When Frame generates via Bifrost (from Studio, Quick Generate, or Remix):

1. Generation request sent to Bifrost with prompt + references
2. Result image bytes received
3. Ingested through the normal pipeline (hash, store, thumbnail, DB record)
4. Stored in the character's `images/` directory
5. `character_images` record created with `source: comfyui`
6. If generated during a shoot session, linked to that shoot
7. Generation metadata stored: prompt, seed, template used, reference images used

### Quick Generate (Ad-Hoc Generation)

A reusable generation component available from multiple contexts:
- Character detail / prospect profile → generates for that character
- Era workspace → generates for that character + era
- Dataset detail → generates to fill gaps in the dataset
- Any context where you're viewing an image → "Remix" opens Quick Generate with that image as source

**Component behavior:**
- Lightweight modal or slide-in panel (not a full page)
- Prompt field with template selector
- Optional character context (pre-selected from current page)
- Optional source image (for remix/img2img)
- Reference images from the character's lookbook/favorites
- Generate button → results appear in a strip
- Keep/discard per result → kept images ingested for the character

---

## Dataset Exports

When a dataset is exported for training:

```
assets/exports/
  eleanor-lora-v1-20260325/
    1_character/              # Kohya repeats directory
      image_001.png           # Copied from character images
      image_001.txt           # Caption file
      image_002.png
      image_002.txt
    dataset.json              # Export manifest
```

Export creates a **copy** of the dataset images in the export directory, formatted for the target pipeline (Kohya, etc.). The export is a snapshot — changes to the dataset after export don't affect the exported files.

---

## Migration from Current Structure

Current code stores images at:
```
assets/characters/{slug}/staging/original/{id}.{format}
assets/characters/{slug}/eras/{era_id}/original/{id}.{format}
```

Migration to flat structure:
```
assets/characters/{slug}/images/{id}.{format}
assets/characters/{slug}/thumbs/{id}.jpg
```

This requires:
1. Update `Ingester.imagePath()` to use flat `images/` and `thumbs/` directories
2. Update `OriginalPath()` and `ThumbnailPath()` methods
3. Update image serving in the API to use new paths
4. Migration script to move existing files (if any exist on disk)
5. Update any tests that assert on file paths

---

## Summary of Gaps to Close

| Gap | Status |
|-----|--------|
| Flat storage migration | Needs implementation |
| Reference images (`assets/references/`) | Partially exists as `assets/features/` — rename and simplify |
| Bulk import + tag for reference images | Import supports tags, needs UI for standalone images |
| Image Search bulk actions wired to API | UI exists but actions are dead |
| Quick Generate component | Not built |
| Dataset export to filesystem | Not built |
| Dataset image selection flow | Needs design — add from search, era workspace, or generation |
