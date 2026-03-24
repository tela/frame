# Job Stories: Training Data Pipeline

## Context

These jobs are about preparing image collections for LoRA training and IPAdapter reference. The quality and consistency of training data directly determines model quality. This requires rigorous tagging, careful curation, preprocessing, and structured export.

---

### When I'm training a LoRA for a character, I need to assemble a dataset of consistently tagged, properly preprocessed images so the model learns the right features.

**Acceptance:**
- I can create a dataset scoped to a character (required for LoRA and IPAdapter types)
- I can search across the character's images by tags and add matching ones to the dataset
- I can review the dataset's tag coverage (which poses, expressions, angles are represented)
- I can identify and fill gaps (e.g., "no profile shots in this set")
- I can write per-image captions for captioned LoRA training
- I can toggle individual images in/out of the active set without removing them (for A/B experimentation)
- I can fork a dataset to try a different image combination
- I can export the dataset in Kohya format with proper directory structure and captions

---

### When I'm preparing a LoRA dataset, each image needs a trigger word that is unique and follows a consistent naming pattern so the model activates correctly.

**Acceptance:**
- LoRA and IPAdapter datasets have a configurable trigger word / naming pattern
- The naming pattern follows a defined convention: `[physical-feature]_[primary-descriptor]_[secondary-descriptor]_[descriptor]_[version]`
- The system validates trigger words against the pattern (format validation)
- The system checks trigger word uniqueness across all datasets
- I can configure the naming hierarchy per physical feature type
- Trigger words are included in dataset export captions

---

### When I have images that need preprocessing before they're suitable for training, I need to crop, resize, or upscale them without destroying the originals.

**Acceptance:**
- I can open any image in a preprocessor view
- Crop: visual crop tool with aspect ratio locks (1:1, 4:3, 16:9, free)
- Resize: target dimensions with quality interpolation
- Upscale: 2x/4x via Lanczos (local) or AI upscale (via Bifrost when available)
- Every operation creates a derivative — original is never modified
- The derivative records exactly what operations were applied (full history)
- I can use the derivative in a dataset instead of the original
- I can batch-preprocess: apply a preset (e.g., "Square 768") to many images at once

---

### When I'm building an IPAdapter reference set for a character, I need a curated collection of face and body reference images that represent the character's identity.

**Acceptance:**
- I can create an IPAdapter dataset for a character
- I can select face reference images and score them by quality
- I can select body reference images and score them
- The reference set is served via API as a structured package (image URLs, scores, ranks)
- ComfyUI workflows can consume this package directly

---

### When I need images of specific body areas for training, I need to find, tag, crop, and assemble them into a dataset regardless of which character they came from.

**Acceptance:**
- I can search across all characters (and standalone images) by NSFW body-area tags
- I can filter by quality, resolution, and other technical tags
- I can add results to a cross-character dataset
- I can crop images to isolate the specific body area (non-destructive)
- The resulting dataset has consistent dimensions and quality

---

## What's Missing in Current Implementation

- No trigger word / naming pattern system
- No format validation on tags or trigger words
- No captioning capability (per-image captions for training)
- Image preprocessor is visual-only — crop/resize operations don't actually execute yet
- Dataset export doesn't produce actual files yet
- Image search doesn't connect to the dataset "add" flow
- Tag taxonomy per family not visible or manageable
