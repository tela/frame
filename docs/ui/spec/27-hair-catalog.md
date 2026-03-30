# 27 — Hair Catalog

## Job

Browse and manage hairstyles as character-coupled assets. Hair is part of the talent's visual identity — the Frame Stylist uses this catalog to try different hairstyles on characters during look development. Same editorial archive aesthetic as wardrobe management.

## Who Uses This

The user, when:
- Browsing available hairstyles for character look development
- Adding new hairstyle references (from research, generation, or import)
- Assigning hairstyles to characters (character affinity)
- Working with the Stylist agent on hair and makeup

Accessed from the main sidebar navigation, as a peer to Wardrobe.

## What It Shows

### Top Bar
```
Hair                                              [+ New Style]
142 styles · 3 characters
```

### Filter Sidebar (left, collapsible)

Faceted filters with counts:
- **Status**: ingested · reviewed · available
- **Length**: pixie · short · medium · long · very_long
- **Texture**: straight · wavy · curly · coily · kinky
- **Style**: updo · down · half_up · ponytail · braids · bun · loose · structured
- **Color**: natural tones + fashion colors (free text, not enum)
- **Character**: character names from affinity tags

Full-text search bar above facets.

### Style Grid (main area)

Responsive grid (3-5 columns). Each card:
- Primary image thumbnail (aspect 3:4, same as wardrobe cards)
- Style name
- Length + texture pills (e.g., `long` `wavy`)
- Status indicator dot
- Character affinity count

### Style Detail (right-sliding sheet)

Same sheet pattern as wardrobe detail:

#### Image Section
- Hero image (aspect 4:5)
- Thumbnail strip for additional angles
- Dropzone for adding images

#### Classification Fields
- Name (text input)
- Length (single-select)
- Texture (single-select)
- Style (single-select)
- Color (text input — "honey blonde", "jet black with auburn highlights")
- Tags (multi-value freeform)
- Description (textarea — styling notes, maintenance, occasion suitability)

#### Character Affinity
Same pattern as wardrobe: circular character avatars with add/remove.

#### Provenance
Same pattern as wardrobe: source, source URL, created at.

#### Actions
- Save Changes (primary)
- Archive (secondary)

## Actions

- Browse with faceted search
- Filter by length, texture, style, character
- View style detail in side sheet
- Edit classification inline
- Add/remove images
- Assign character affinity
- Create new styles manually
- Bulk status updates (via multi-select + action bar)

## Data

### API Endpoints

- `GET /api/v1/hair` — list with filters, pagination, sort
- `GET /api/v1/hair/facets` — faceted counts
- `POST /api/v1/hair` — create style
- `GET /api/v1/hair/{id}` — detail with images and affinity
- `PATCH /api/v1/hair/{id}` — update fields
- `DELETE /api/v1/hair/{id}` — delete
- `POST /api/v1/hair/{id}/images` — add image
- `PATCH /api/v1/hair/{id}/primary-image` — set primary
- `POST /api/v1/hair/{id}/affinity` — add character affinity
- `DELETE /api/v1/hair/{id}/affinity/{charId}` — remove affinity

### Data Model

| Field | Type | Notes |
|-------|------|-------|
| `id` | TEXT (16-char hex) | Primary key |
| `name` | TEXT | Display name (e.g., "Victory Rolls", "Loose Beach Waves") |
| `length` | TEXT | pixie, short, medium, long, very_long |
| `texture` | TEXT | straight, wavy, curly, coily, kinky |
| `style` | TEXT | updo, down, half_up, ponytail, braids, bun, loose, structured |
| `color` | TEXT | Free text description |
| `tags` | TEXT (JSON array) | Freeform tags |
| `description` | TEXT | Styling notes |
| `primary_image_id` | TEXT | FK to images |
| `source` | TEXT | manual, downloaded, custom |
| `status` | TEXT | ingested, reviewed, available |

FTS5 on name, description, color, tags — same pattern as garments.
Character affinity via junction table — same pattern as garments.

## Notes

- Same design system as wardrobe (editorial archive). Same card dimensions, same sheet width, same typography.
- Hair and wardrobe are peers in the sidebar, not nested. They're both character-coupled assets but with different taxonomies.
- The Stylist agent has a `search_hair` tool that queries this catalog.
- Hair color is free text, not an enum — there are too many natural and fashion color combinations to enumerate.
- Try-on generation (character + hairstyle) uses the same generation pipeline as wardrobe try-on. The Stylist composes the prompt from the hairstyle description + character reference package.
- Future: LoRA-based hair generation for specific styles. The hair catalog could link to specific hair LoRAs.
