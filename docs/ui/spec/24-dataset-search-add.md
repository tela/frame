# 24 — Dataset Search-Add (Enhancement)

Enhances spec 12 (Dataset Detail) with the ability to add images from search results and create datasets from search queries.

## Current State
Dataset detail has an "Add from Image Search" button that is a dead placeholder. No way to search and add images to a dataset from the UI.

## Changes

### "Add Images" Button → Search Modal
Replace the placeholder with a working flow:

1. Click "Add Images" in dataset detail
2. Opens a modal with embedded search interface:
   - Same filter controls as Image Search screen (character, tags, rating, source, set_type)
   - Compact grid of search results with multi-select checkmarks
   - Result count + pagination
   - "Add {N} Selected" primary button
3. On confirm, calls `useAddDatasetImages()` with selected IDs
4. Modal closes, dataset refreshes

### Search Modal Layout
```
┌──────────────────────────────────────────────────────┐
│ Add Images to Dataset                          [✕]   │
├──────────────────────────────────────────────────────┤
│ [Character ▾] [Tags...] [Rating ≥ ▾] [Source ▾]     │
│                                                      │
│ 48 results                                           │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│ │ ☑  │ │    │ │ ☑  │ │    │ │ ☑  │ │    │          │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘          │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│ │    │ │    │ │ ☑  │ │    │ │    │ │    │          │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘          │
│                                                      │
│                        [Cancel]  [Add 4 Selected]    │
└──────────────────────────────────────────────────────┘
```

### "Create from Search" on Dataset Manager
On the dataset list screen (spec 11), add a "Create from Search" button next to "New Dataset":

1. Click "Create from Search"
2. Dialog: name input + search filters
3. On confirm, calls `useCreateDatasetFromSearch()` with name + search params
4. Creates dataset with all matching images, navigates to dataset detail

## Data
- `POST /api/v1/datasets/{id}/images` — add images (existing)
- `POST /api/v1/datasets/from-search` — create dataset from search query
- `GET /api/v1/images/search` — search images

## Hooks Available
- `useAddDatasetImages()` — add image IDs to dataset
- `useCreateDatasetFromSearch()` — create dataset from search
- `useImageSearch()` — search with filters
