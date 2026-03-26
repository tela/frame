# Dataset Image Selection

## Job

Add images to a dataset from multiple sources: browsing a character's images, searching across all images, or directly from generation results. The user needs to build a curated collection for training without friction.

## Entry Points

### From Dataset Detail
- "Add Images" button on the dataset detail page
- Opens a full-screen picker showing images filtered by the dataset's character (if scoped) or all images
- Multi-select, confirm adds to dataset

### From Era Workspace
- Select images → bulk action "Add to Dataset"
- Dropdown to choose which dataset (or create new)
- Selected images added immediately

### From Image Search
- Select images from search results → "Add to Dataset" action
- Same dropdown to choose dataset
- Also: "Save as Dataset" creates a new dataset from the current selection + saves the search filter as the source query

### From Quick Generate
- "Keep" action on generated results can optionally add to a dataset
- If Quick Generate was opened from dataset context, kept images auto-add to that dataset

## Component: DatasetImagePicker

A full-screen modal (like the Image Picker Modal but larger and with more filtering).

### Layout

**Left sidebar (280px): Filters**
- Character filter (dropdown, pre-set if dataset is character-scoped)
- Tag filters (family-aware, from taxonomy)
- Rating filter
- Source filter (fig, comfyui, manual)
- Set type filter
- "Already in dataset" toggle (to hide/show images already added)

**Main area: Image grid**
- Thumbnails with select checkboxes
- Already-in-dataset images shown with a badge or dimmed
- Character name and era label on hover
- Sort by: date, rating, character

**Bottom bar:**
- Count: "23 selected"
- "Add to Dataset" confirm button
- Cancel

### "Add to Dataset" Dropdown (from workspace/search)

When triggered from a context outside the dataset:
- Small dropdown menu listing the user's datasets
- Grouped by type (LoRA, IPAdapter, etc.)
- "Create New Dataset" option at the bottom
- Selecting a dataset adds the images immediately

## Design Notes

- The picker must feel fast even with thousands of images — lazy-load thumbnails, paginate
- "Already in dataset" filter is important to avoid accidentally adding duplicates
- The dropdown (from workspace/search) should be quick — one click to select dataset, done
- Creating a dataset from search results should pre-populate the source_query with the current filter
