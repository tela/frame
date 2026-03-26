# Image Preprocessor

## Job

Prepare images for training pipelines through non-destructive editing. Crop, resize, upscale, and adjust images — creating derivatives that preserve the original while producing training-ready versions. Every operation is tracked so the user knows exactly what was done to each image.

## Core Principle: Non-Destructive

Originals are never modified. Every preprocessing operation creates a **derivative** — a new image file linked to its source. The derivative has a complete operation history recording every transformation applied. Derivatives can themselves be further processed, creating a chain.

## Data Model

### Image Derivative
| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT (16-char hex) | Primary key — this is a full image record |
| `source_image_id` | TEXT FK → images | The original (or parent derivative) this was created from |
| `operations` | TEXT (JSON) | Ordered list of operations applied |
| `created_at` | TEXT | |

The derivative also exists in the `images` table (it has its own hash, dimensions, file size, format). The `image_derivatives` table adds the lineage and operation history.

### Operation Record
Each operation in the `operations` JSON array:

```json
[
  {
    "type": "crop",
    "params": { "x": 100, "y": 50, "width": 512, "height": 512 },
    "timestamp": "2026-03-24T10:30:00Z"
  },
  {
    "type": "resize",
    "params": { "width": 768, "height": 768, "method": "lanczos" },
    "timestamp": "2026-03-24T10:30:01Z"
  },
  {
    "type": "upscale",
    "params": { "scale": 2, "method": "esrgan", "model": "4x-UltraSharp" },
    "timestamp": "2026-03-24T10:32:15Z"
  }
]
```

### Supported Operations

| Operation | Parameters | Notes |
|-----------|-----------|-------|
| `crop` | x, y, width, height | Visual crop tool, pixel coordinates |
| `resize` | width, height, method (lanczos/nearest/bilinear) | Target dimensions |
| `upscale` | scale (2x, 4x), method (lanczos/esrgan), model | Lanczos for simple upscale, ESRGAN via Bifrost for AI upscale |
| `rotate` | degrees (90, 180, 270), or EXIF auto | Lossless rotation |
| `pad` | target_width, target_height, fill (color/reflect/blur) | Pad to target aspect ratio |
| `format_convert` | target_format (png, jpg, webp) | Format conversion |

### Upscaling

Two paths:
- **Simple upscale** (Lanczos) — fast, local, no external dependency. Good for modest 2x upscaling.
- **AI upscale** (ESRGAN/similar) — requires Bifrost/ComfyUI. Higher quality, especially for 4x. Frame sends the image to Bifrost with an upscale workflow request and ingests the result as a derivative.

The UI should present both options with a quality/speed tradeoff indicator.

## What the Preprocessor Shows

### Single Image Mode

Entered from: Era Workspace image detail, Dataset Detail, Image Search result.

**Left panel: Canvas**
- The image displayed at appropriate zoom
- Visual crop overlay (draggable/resizable rectangle)
- Zoom controls
- Pan (when zoomed in)

**Right panel: Operations**
- **Crop** — enter dimensions or use visual tool, aspect ratio lock options (1:1, 3:4, 16:9, free)
- **Resize** — target dimensions, maintain aspect ratio toggle, interpolation method
- **Upscale** — scale factor (2x, 4x), method selector (Lanczos / AI), AI model selector (if Bifrost available)
- **Rotate** — 90° CW, 90° CCW, 180°, auto-EXIF
- **Pad** — target dimensions, fill method (solid color, edge reflect, blur)

**Operation History (visible on right panel)**
- Ordered list of operations that will be applied
- Can reorder or remove operations before committing
- Preview updates live as operations are added/modified

**Actions:**
- **Preview** — show the result without saving
- **Save Derivative** — apply all operations, create new derivative image, store in Frame
- **Save & Add to Dataset** — save derivative and add to a selected dataset
- **Cancel** — discard changes

### Batch Mode

Entered from: multi-select in Era Workspace, Dataset Detail, or Image Search.

**Preset Application:**
- Select a preset: "Square Center Crop 768", "Resize to 512x512", "Upscale 2x Lanczos"
- Or configure a custom operation chain
- Preview grid: show before/after thumbnails for each image
- Commit: creates one derivative per source image

**Built-in Presets:**
- Square Center Crop (512/768/1024)
- Resize to Training Resolution (512x512, 768x768, 1024x1024)
- Upscale 2x (Lanczos)
- Upscale 4x (AI, requires Bifrost)
- EXIF Auto-Rotate

**Custom Presets:**
- Save any operation chain as a named preset for reuse

### Derivative History View

Accessible from any image's detail panel:
- Show the lineage: original → derivative 1 → derivative 2
- Each node shows the operations applied
- Click any node to view that version
- Visual diff between versions (side by side or overlay)

## Actions

- Apply crop, resize, upscale, rotate, pad operations
- Preview result before saving
- Save as derivative
- Save and add to dataset
- Apply preset to batch of images
- Create/manage custom presets
- View derivative lineage/history

## API Endpoints

```
POST /api/v1/images/{id}/preprocess
  body: {
    "operations": [
      { "type": "crop", "params": { "x": 100, "y": 50, "width": 512, "height": 512 } },
      { "type": "resize", "params": { "width": 768, "height": 768 } }
    ],
    "dataset_id": "optional-add-to-dataset"
  }
  response: { "derivative_id": "...", "width": 768, "height": 768, "format": "png" }

POST /api/v1/images/{id}/upscale
  body: { "scale": 2, "method": "esrgan", "model": "4x-UltraSharp" }
  response: { "derivative_id": "...", "width": 2048, "height": 2048 }
  (async if AI upscale — returns job_id, poll for result)

GET  /api/v1/images/{id}/derivatives
  response: [ { "id": "...", "operations": [...], "width": ..., "height": ..., "created_at": "..." } ]

GET  /api/v1/images/{id}/lineage
  response: { "original": "...", "chain": [ { "id": "...", "operations": [...] }, ... ] }

POST /api/v1/preprocess/batch
  body: {
    "image_ids": ["...", "..."],
    "operations": [{ "type": "resize", "params": { "width": 768, "height": 768 } }],
    "dataset_id": "optional"
  }
  response: { "job_id": "...", "total": 25 }

GET  /api/v1/preprocess/{job_id}/status
  response: { "status": "running", "completed": 12, "total": 25 }

GET  /api/v1/preprocess/presets
POST /api/v1/preprocess/presets
  body: { "name": "Square 768", "operations": [...] }
```

## Notes

- The crop tool is the most-used operation. It needs to feel fast and precise — visual rectangle with dimension readout, snap to common aspect ratios.
- Upscaling via Bifrost is async and may take seconds to minutes. The UI should handle this gracefully (progress indicator, notification on completion).
- Operation history is permanent metadata on the derivative. This is important for reproducibility: if a LoRA trains well, the user needs to know exactly what preprocessing was done.
- Presets should be shareable — export as JSON for reuse across Frame instances.
- Batch mode should show a review step before committing. "Here are 25 derivatives that will be created" with thumbnails.
