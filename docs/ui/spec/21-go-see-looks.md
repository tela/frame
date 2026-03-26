# 21 — Go-See Looks

## Location
Embedded within the Character Detail page, between the Pose Set Dashboard and the Datasets section. Visible for characters in `development` or `cast` status.

## Concept
A "Go-See Look" is a named outfit composition — a set of garments that the character wears together. Every character can have multiple looks (e.g., "Casting Day", "Swimwear", "Evening"). One look is marked as the default go-see outfit.

Looks are composed from garments in Frame's media library (wardrobe items). Each look generates try-on images: the character wearing the outfit in standard poses on a neutral gray studio background.

## Layout

### Section Header
```
Go-See Looks                                           [+ New Look]
1 default · 3 total
```

### Look Cards (horizontal scroll, same pattern as era cards)
Each look card shows:
- Look name (display font, e.g., "Casting Day")
- Garment count (e.g., "3 garments")
- Try-on image count (e.g., "4 of 6 generated")
- Default badge (small "DEFAULT" pill on the default look)
- Thumbnail: the first generated try-on image, or a placeholder grid showing garment thumbnails

Card dimensions: same as era cards (~280-400px min-width, aspect-video top area).

### Add Look Card
Dashed border placeholder at the end of the scroll, same pattern as "Initialize New Era."

## Look Detail (inline expand or dialog)
When a look card is clicked, expand inline or open a panel showing:

### Garment List
Vertical list of garments in the look, each showing:
- Garment thumbnail (from media library)
- Garment name
- Category badge (lingerie, dress, top, outerwear, etc.)
- Remove button (x)

Below the list:
- "Add Garment" button → opens a garment picker (similar to image picker modal, but browsing wardrobe media items)

### Try-On Grid
Matrix: rows are standard SFW poses (6), column is this look.
Each cell: generated try-on image or empty "+" placeholder.
Same status indicators as pose set dashboard (green dot = accepted, amber = pending).

### Actions
- "Set as Default" button (if not already default)
- "Generate All" button (generates try-on images for all standard SFW poses)
- "Delete Look" in danger zone

## Create Look Dialog
- Name input
- "Set as default" checkbox
- Garment picker (multi-select from wardrobe items, showing thumbnails + names + categories)

## Garment Picker Modal
Reusable modal for selecting wardrobe items:
- Grid of wardrobe items from media library (filtered to content_type=wardrobe)
- Search by name
- Category filter pills (lingerie, dress, top, bottom, outerwear, accessory)
- Each item: thumbnail, name, category badge
- Multi-select with checkmarks
- "Confirm Selection" button

## Data
- `GET /api/v1/characters/{id}/looks` — list looks with garment details and try-on image counts
- `POST /api/v1/characters/{id}/looks` — create look
- `PATCH /api/v1/looks/{id}` — update look (name, garments, is_default)
- `DELETE /api/v1/looks/{id}` — delete look
- `POST /api/v1/looks/{id}/generate` — generate try-on images for all standard poses
- `GET /api/v1/looks/{id}/try-on` — get try-on image status grid
- `GET /api/v1/media/wardrobe` — list garments for picker

## Interaction Flow
1. User clicks "+ New Look"
2. Dialog: enter name, optionally set as default
3. Look created (empty)
4. User clicks look card → expands
5. User clicks "Add Garment" → garment picker opens
6. Selects lingerie + dress + heels → confirms
7. Garment list shows 3 items with thumbnails and categories
8. User clicks "Generate All" → generates 6 try-on images (one per SFW standard pose)
9. Try-on grid populates as images complete
10. User accepts/rejects each try-on image
