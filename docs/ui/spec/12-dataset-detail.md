# Dataset Detail

## Job

View and curate the contents of a specific dataset. Add and remove images, reorder them, write per-image captions, toggle images in/out without deleting them, and preview what the export will look like. This is the hands-on workspace for fine-tuning a training set.

## Who Uses This

The user, when actively building or refining a dataset for a training run. They may be:
- Reviewing images pulled from a search, removing ones that don't fit
- Reordering images (some training pipelines are order-sensitive)
- Writing captions for captioned LoRA training
- Toggling images in/out to compare training runs with different subsets
- Checking coverage: "do I have enough variety in pose/angle/expression?"

## What It Shows

### Header
- Dataset name (editable inline)
- Type badge (LoRA, IPAdapter, reference, style)
- Character/era scope (if set)
- Image count (total / included)
- Description (editable)
- Actions: Fork, Export, Delete

### Source Query (if set)
A read-only display of the tag-based filter that defined the candidate pool. Link to re-run the query in Image Search (to find more candidates).

### Image Grid
All images in the dataset, displayed as a sortable grid.

**Each image shows:**
- Thumbnail
- Sort position number
- Caption preview (if set)
- Included/excluded state (excluded images are visually dimmed)
- Source indicator: original or derivative (with link to original)
- Tags (from the image's tags, grouped by family)

**Actions per image:**
- Toggle included/excluded
- Edit caption (inline or modal)
- Remove from dataset
- Open in Image Preprocessor (create a derivative, then swap the dataset reference to the derivative)
- View original (if this is a derivative)

**Bulk actions (multi-select):**
- Remove selected from dataset
- Toggle included/excluded for selected
- Apply caption template to selected (e.g., "a photo of [character] in [pose]")
- Send selected to preprocessor (batch crop/resize)

### Reordering
Drag-and-drop reordering of images within the grid. Sort position is persisted.

### Coverage Analysis
A summary panel showing tag distribution within the dataset:
- How many images per pose, expression, angle, body-area
- Warnings for gaps: "no profile shots", "only 2 close-ups"
- Helps ensure training data has sufficient variety

### Export Preview
A panel or modal showing what the exported directory will look like:
- File listing with names and captions
- Target resolution and format
- Total size estimate
- "Export" button to write to disk

## Actions

- Edit name, description
- Add images (opens Image Search scoped to add-to-dataset mode)
- Remove images
- Reorder images
- Edit per-image captions
- Toggle included/excluded
- Fork dataset
- Export dataset
- Open image in preprocessor

## Data Requirements

- `GET /api/v1/datasets/{id}` — dataset with all images, captions, sort order, included state
- `PATCH /api/v1/datasets/{id}/images/{img_id}` — update caption, sort_order, included
- `POST /api/v1/datasets/{id}/images` — add images
- `DELETE /api/v1/datasets/{id}/images/{img_id}` — remove image
- `POST /api/v1/datasets/{id}/export` — trigger export
- Tag data for coverage analysis

## Notes

- Caption editing is critical for captioned LoRA training (Kohya format). The UI should make it fast to write and review captions across many images.
- The included/excluded toggle lets the user experiment without losing their curation work. "Try without these 5 images" is a common workflow.
- Derivatives in a dataset should display their preprocessing history (cropped from X, resized to Y) so the user knows what transformations were applied.
