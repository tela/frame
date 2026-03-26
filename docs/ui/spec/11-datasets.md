# Dataset Manager

## Job

Build, manage, and export curated image collections for generative model training and reference. A dataset is an explicit list of images assembled for a specific purpose — LoRA training, IPAdapter reference, style reference, or any other pipeline that consumes a set of images.

Datasets exist independently of characters. A dataset may pull images from one character, multiple characters, or non-character sources. The user experiments with different image combinations across multiple training runs.

## Core Concepts

### Dataset
A named, versioned collection of images with a purpose.

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT (16-char hex) | Primary key |
| `name` | TEXT | e.g., "Eleanor LoRA v3", "Intimate Close-ups Set A" |
| `description` | TEXT | Purpose and notes |
| `type` | TEXT | `lora`, `ipadapter`, `reference`, `style`, `general` |
| `character_id` | TEXT FK (nullable) | For character-specific sets |
| `era_id` | TEXT FK (nullable) | For era-specific sets |
| `source_query` | TEXT (JSON) | Saved filter criteria that defines the candidate pool |
| `export_config` | TEXT (JSON) | Format, caption style, directory layout, target resolution |
| `created_at` | TEXT | |
| `updated_at` | TEXT | |

### Dataset Image (junction)
| Field | Type | Notes |
|-------|------|-------|
| `dataset_id` | TEXT FK | |
| `image_id` | TEXT FK | Can reference original or derivative images |
| `sort_order` | INTEGER | Position in the set |
| `caption` | TEXT (nullable) | Per-image caption override for training |
| `included` | INTEGER | 1=included, 0=excluded (soft toggle without removing) |
| `created_at` | TEXT | |

### Dataset as Experiment
The key workflow is experimentation:
1. Define a candidate pool via tags (e.g., NSFW body-area:chest, quality:high)
2. Pull a subset into a dataset
3. Export and train
4. Duplicate the dataset, swap some images, train again
5. Compare results

Duplication (forking) is a first-class operation. Fork creates a new dataset with the same images, allowing independent modification.

## What the Dataset Manager Shows

### Dataset List
- Grid or list of all datasets
- Each shows: name, type badge, image count, character name (if scoped), last updated
- Filter by type, character
- Sort by name, date, image count

### Create Dataset
- Name, description, type
- Optional character/era scope
- Optional source query (opens Image Search in filter mode — save the filter as the dataset's source query)
- Created empty or pre-populated from a search

### Dataset Detail (separate spec: 12-dataset-detail.md)

## Actions

- Create dataset
- Fork/duplicate dataset
- Delete dataset
- Export dataset (to directory with chosen format/layout)
- Quick-create from Image Search results ("Save selection as dataset")

## API Endpoints

```
GET    /api/v1/datasets                      — list all datasets
POST   /api/v1/datasets                      — create dataset
GET    /api/v1/datasets/{id}                 — get dataset with image list
PATCH  /api/v1/datasets/{id}                 — update name, description, config
DELETE /api/v1/datasets/{id}                 — delete dataset
POST   /api/v1/datasets/{id}/fork            — duplicate dataset
POST   /api/v1/datasets/{id}/images          — add images to dataset
DELETE /api/v1/datasets/{id}/images/{img_id} — remove image from dataset
PATCH  /api/v1/datasets/{id}/images/{img_id} — update caption, sort_order, included
POST   /api/v1/datasets/{id}/export          — export to filesystem
```

## Export Configuration

The `export_config` JSON controls how the dataset is written to disk:

```json
{
  "format": "kohya",
  "image_format": "png",
  "target_resolution": [768, 768],
  "caption_style": "filename",
  "directory_layout": "flat",
  "include_metadata": true
}
```

Supported layouts:
- `flat` — all images in one directory with caption files
- `kohya` — Kohya LoRA training directory structure
- `ipadapter` — reference image set with manifest JSON

## Notes

- Datasets reference images by ID. If an image has a derivative (cropped, resized), the derivative's ID can be used instead of the original.
- The `source_query` is informational — it records how the candidate pool was defined but doesn't auto-update the dataset contents. The dataset is an explicit list.
- Forking is cheap (copies the junction table rows, not the images).
