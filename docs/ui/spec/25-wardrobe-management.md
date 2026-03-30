# 25 — Wardrobe Management

## Job

Browse, curate, and manage the full garment catalog. Wardrobe is a character-coupled asset — Frame owns the catalog (images, classification, character affinity) while Fig retains production-specific overlays (pins, wearing history per experience). The wardrobe manager replaces the basic media library grid with a purpose-built interface for working with garments at scale: faceted search, structured taxonomy, collection from external sources, and character affinity assignment.

## Who Uses This

The user, when:
- Browsing garments to assign to characters or compose into go-see looks
- Reviewing newly collected garments from external sources (Shopify, search, generation)
- Curating the catalog: classifying garments, assigning character affinity, setting status
- Collecting new garments from product URLs or image search
- Finding garments by style attributes (era, aesthetic, occasion, signal)

Accessed from the main sidebar navigation. Replaces the "Wardrobe" tab within the current Media Library.

## What It Shows

### Top Bar
```
Wardrobe                                   [Collect] [+ New Garment]
428 garments · 12 ingested · 3 characters
```

Count summary updates reactively as filters change. "12 ingested" links to the ingested status filter.

### Filter Sidebar (left, collapsible)

Faceted filters with counts. Each filter shows the number of matching garments in parentheses. Multiple filters AND together. Selecting a value within a facet group ORs within that group.

- **Status**: ingested (12) · reviewed (34) · available (380) · reference_only (2)
- **Category**: top (89) · bottom (67) · dress (142) · lingerie (98) · outerwear (23) · footwear (15) · accessory (44)
- **Occasion**: intimate (156) · casual (89) · formal (67) · provocative (43) · loungewear (38) · athletic (35)
- **Era**: contemporary (210) · timeless (88) · vintage (45) · y2k (32) · 90s (28) · 80s (15) · 70s (10)
- **Aesthetic**: minimalist · maximalist · dark_romantic · cottagecore · (all clusters)
- **Signal**: power · vulnerability · comfort · provocation · elegance · rebellion · softness
- **Material**: silk · cotton · lace · leather · mesh · satin · (all materials)
- **Character**: (character names from affinity tags, with counts)
- **Source**: shopify · camofox · crawled · imported · searched · generated

Full-text search bar above the facets. Searches name, description, material, color, category, and tags via FTS5.

### Garment Grid (main area)

Responsive grid (3-5 columns depending on viewport). Each card:
- Primary image thumbnail (aspect-ratio preserved, object-fit cover)
- Name (one line, truncated)
- Category pill (e.g., `dress`)
- Status indicator: colored dot (amber = ingested, blue = reviewed, green = available)
- Character affinity count (e.g., "2 characters") if any assigned

Cards are selectable (checkbox on hover, persistent when selected). Selected cards enable the bulk action bar.

Pagination: infinite scroll or "Load More" button. Default page size 50.

Sort options (dropdown in grid header): newest first, name A-Z, category, occasion.

### Bulk Action Bar (appears when items selected)

```
3 selected                    [Status ▾] [Affinity ▾] [Delete]  [×]
```

- **Status** — dropdown to set status on all selected (ingested → reviewed → available)
- **Affinity** — dropdown listing characters; toggle affinity on/off for selected garments
- **Delete** — confirmation dialog, then remove selected garments

### Garment Detail (sheet/panel, opens on card click)

Right-sliding sheet (same Radix Sheet as other Frame panels). Shows full garment details with inline editing.

#### Image Section
- Primary image (large)
- Additional images (thumbnail strip below, click to swap primary view)
- Dropzone: drag image files onto the sheet to add images
- "Set as Primary" action on each thumbnail

#### Classification Fields (inline editable)
Each field shows current value as a pill/tag. Click to open a dropdown or picker.
- Name (text input)
- Category (single-select dropdown)
- Occasion Energy (single-select dropdown)
- Era (single-select dropdown)
- Aesthetic Cluster (single-select dropdown)
- Dominant Signal (single-select dropdown)
- Recessive Signal (single-select dropdown, must differ from dominant)
- Material (single-select dropdown)
- Color (text input)
- Tags (multi-value tag input, freeform)
- Description (textarea)

#### Character Affinity
List of characters this garment is assigned to, each with avatar thumbnail and name. "Add Character" button opens a character picker. Remove via × on each character.

#### Provenance
Read-only section:
- Source (shopify, crawled, imported, etc.)
- Source URL (clickable link to original product page)
- Source Site (domain)
- Collector Job ID (if applicable)
- Created at / Updated at

#### Actions
- "Delete Garment" in danger zone at bottom

## Collect Flow

The `[Collect]` button in the top bar opens a dialog for ingesting garments from external sources.

### Collect Dialog
- **URL input** — paste a product page URL (Shopify, any supported site)
- **Character Affinity** — optional pre-assignment (character picker, multi-select)
- **Auto-Approve** — toggle: if on, garments land as "available" instead of "ingested"
- **[Collect]** button — starts the collection job

The collection job runs asynchronously. A toast notification appears when complete with item count. Newly collected garments appear in the grid with "ingested" status (or "available" if auto-approved).

### Manual Creation
The `[+ New Garment]` button opens a minimal dialog:
- Name (required)
- Category (required)
- Image upload (at least one, required)

Creates the garment with status "ingested" and opens the detail sheet for further classification.

## Actions

- Browse with faceted search and full-text search
- Filter by any combination of taxonomy fields, character, source
- View garment detail in side sheet
- Edit classification fields inline
- Add/remove images, set primary image
- Assign/remove character affinity
- Bulk update status across selected garments
- Bulk assign/remove character affinity
- Collect garments from external URLs
- Create garments manually
- Delete garments (single and bulk)

## Data

### API Endpoints

- `GET /api/v1/wardrobe` — list garments with filtering, pagination, sorting
  - Query params: `q` (search), `category`, `occasion_energy`, `era`, `aesthetic_cluster`, `dominant_signal`, `material`, `provenance`, `character` (affinity filter), `status` (default "available"), `sort`, `order`, `limit`, `offset`
- `GET /api/v1/wardrobe/facets` — faceted counts for current filter set
  - Same query params as list; returns counts per facet value
- `GET /api/v1/wardrobe/{id}` — garment detail with images and affinity
- `POST /api/v1/wardrobe` — create garment
- `PATCH /api/v1/wardrobe/{id}` — update garment fields
- `DELETE /api/v1/wardrobe/{id}` — delete garment
- `POST /api/v1/wardrobe/{id}/images` — add image (multipart)
- `PATCH /api/v1/wardrobe/{id}/primary-image` — set primary image
- `PUT /api/v1/wardrobe/bulk-status` — bulk status update
- `PUT /api/v1/wardrobe/bulk-affinity` — bulk affinity update
- `POST /api/v1/wardrobe/collect` — collect from URL (async job)
- `GET /api/v1/characters` — for character picker (existing endpoint)

### Data Model

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT (16-char hex) | Primary key |
| `name` | TEXT | Display name |
| `category` | TEXT | top, bottom, dress, lingerie, outerwear, footwear, accessory |
| `occasion_energy` | TEXT | intimate, casual, formal, provocative, loungewear, athletic |
| `era` | TEXT | 70s, 80s, 90s, y2k, contemporary, vintage, timeless |
| `aesthetic_cluster` | TEXT | minimalist, maximalist, dark_romantic, cottagecore, etc. |
| `dominant_signal` | TEXT | power, vulnerability, comfort, provocation, elegance, rebellion, softness |
| `recessive_signal` | TEXT | Same enum as dominant, must differ |
| `material` | TEXT | silk, cotton, lace, leather, mesh, satin, etc. |
| `color` | TEXT | Primary color or pattern description |
| `tags` | TEXT (JSON array) | Freeform searchable tags |
| `description` | TEXT | Long-form description |
| `character_affinity` | (junction table) | garment_id × character_id |
| `source` | TEXT | downloaded, custom |
| `provenance` | TEXT | shopify, camofox, crawled, imported, searched, generated |
| `source_url` | TEXT | Original product page URL |
| `source_site` | TEXT | Domain name |
| `status` | TEXT | ingested, reviewed, available, reference_only |
| `primary_image_id` | TEXT | FK to images table |

Image storage: Frame's existing image pipeline. Garment images stored on the encrypted drive under `assets/wardrobe/{id[0:2]}/{id}/` using 2-char hex sharding.

### LoRA Provenance

The `source` field distinguishes:
- **downloaded** — LoRAs and garments fetched from external sources (CivitAI, Shopify, etc.). Stored in ComfyUI's `models/loras/` directly.
- **custom** — user-created assets. Stored on Frame's encrypted drive and symlinked into ComfyUI.

This same pattern applies to both garments and LoRAs in Frame's registry.

## Notes

- This replaces the wardrobe tab in the existing Media Library (spec 09). Props and locations remain in the Media Library since they stay in Fig's ownership.
- The garment data model migrates from Fig's catalog. Fig retains only production overlays: `wardrobe_pins` (per-scene assignments) and per-experience `wearing_history`.
- Facet counts must update reactively as filters change — don't require a separate button press.
- The collect flow reuses Fig's existing collector adapters (Shopify API, CamoFox, HTML fetch). These need to be ported to Frame or called via Fig's API during migration.
- Character affinity is the primary mechanism for scoping garments to characters. The go-see looks feature (spec 21) composes garments from the character's affinity-filtered wardrobe view.
- FTS5 search should feel instant on catalogs under 10K items. Index on all text fields.
- Keyboard shortcuts: arrow keys to navigate grid, Enter to open detail sheet, Escape to close.
