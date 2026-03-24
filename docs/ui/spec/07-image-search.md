# Image Search

## Job

Find images across all characters, eras, and sources using multi-faceted filtering. This is the primary tool for assembling LoRA training datasets, finding IPAdapter reference candidates, and answering questions like "show me all front-facing, high-quality images across all characters."

## Who Uses This

The user, when:
- Building a LoRA training dataset (needs specific tag combinations across characters)
- Finding reference image candidates for a new character based on existing images
- Auditing image quality or tag coverage across the collection
- Looking for a specific image they remember but can't locate by character/era

## What It Shows

### Search Controls

**Multi-faceted filter builder:**
- Character filter (one, many, or all)
- Era filter (one, many, or all — only for cast characters)
- Tag filters — combine multiple tag namespace:value pairs with AND/OR logic
  - e.g., `pose:front-facing AND quality:high AND clothing:nude`
  - e.g., `expression:smile OR expression:playful`
- Source filter (fig, comfyui, frame studio, manual)
- Set type filter (staging, reference, curated, training, archive)
- Triage status filter
- Rating filter (minimum rating, exact rating)
- Date range (ingested between X and Y)

**Saved searches:**
- Save a filter combination for re-use
- Named searches appear in a sidebar or dropdown

### Results Grid

- Thumbnail grid of matching images
- Show: thumbnail, character name, era label, key tags, rating
- Sort by: relevance, date, rating, character name
- Total count of matching images

### Selection and Bulk Actions

- Multi-select images from results
- **Add to dataset** — add selected images to an existing dataset, or create a new dataset from selection
- **Save as dataset** — create a new dataset from the current selection, with the active filter saved as `source_query`
- **Add to reference set** — promote to reference images for an era
- **Bulk tag** — apply tags to all selected (with family-aware tag picker)
- **Bulk rate** — set rating for all selected
- **Send to preprocessor** — open selected images in batch preprocessing mode
- **Export** — export selected images for external use (copy to a directory with chosen format/naming)

### Image Preview

- Click any result to see full-size image + metadata
- From preview: navigate to the image's Era Workspace, open in Studio for refinement

## Actions

- Build and execute multi-faceted searches
- Save/load searches
- Bulk operations on search results
- Export selected images
- Navigate to source context (era workspace, character detail)

## Data Requirements

- Image query endpoint supporting all filter dimensions (character, era, tags, source, set type, triage status, rating, date range)
- Tag-based filtering with AND/OR logic
- Pagination for large result sets
- Saved search persistence (stored in SQLite)

## Enhancements for Tag Families

- Filter sidebar organizes tags by family — collapsible sections per family
- "Show/hide family" toggles control which tag families are visible in filters
- NSFW family tags only visible when explicitly toggled on
- Tag pills in results show family color accent for visual grouping

## Enhancements for Standalone Images

- "No character" filter option — find images not assigned to any character
- "Has derivatives" filter — find images that have been preprocessed
- "In dataset" filter — find images already in a specific dataset (or any dataset)

## Notes

- Performance matters — the collection could have thousands of images. Pagination and lazy-loading thumbnails are essential.
- The filter builder should be composable and visible — the user needs to see exactly what filters are active and be able to toggle them.
- This screen is closely related to Tag Manager — searching by tags here and managing tags there are two sides of the same concern.
- LoRA training dataset assembly is the most important use case. The user needs to build a set of images with specific properties (consistent character, consistent quality, specific poses/angles for coverage). The selection-to-dataset flow should be streamlined.
- The "Save as dataset" flow should be one click: create dataset with name prompt, save the current filter as source_query, add all selected images.
