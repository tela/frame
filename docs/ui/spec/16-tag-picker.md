# Tag Picker Component

## Job

Apply tags to images during triage or curation, using the structured taxonomy. The picker respects tag families and namespaces, shows allowed values, and makes it fast to tag images consistently.

## Where It Appears

- **Triage Queue** — when the user presses T, the tag overlay opens with this picker
- **Era Workspace** — as a panel or popover when tagging selected images
- **Image detail** — when viewing/editing a single image's tags

## Component: TagPicker

**Layout:** Modal or popover with three levels:

### Level 1: Family Selector
- Horizontal tabs or pills showing tag families (Character Identity, NSFW, Technical, Training)
- Active family is highlighted
- Keyboard: number keys (1-4) to switch families, or Tab to cycle

### Level 2: Namespace List
- Within the selected family, show all namespaces as a vertical list
- Each namespace shows its name and count of allowed values
- Click or keyboard to select a namespace

### Level 3: Value Grid
- Within the selected namespace, show allowed values as clickable pills/chips
- Already-applied tags are highlighted (filled/checked)
- Clicking a value toggles it on/off for the current image(s)
- If the namespace has no defined values (open namespace), show a text input to type a custom value

### Quick Search
- Search input at the top filters across all levels (families, namespaces, values)
- Typing "front" would show "pose > front-facing" as a result
- Select from filtered results to apply directly

### Recently Used
- Below the search, show the last 5-10 tags the user applied (cross-session, stored in localStorage)
- One-click to re-apply

## Keyboard Flow (Triage Context)

1. Press `T` → tag overlay opens
2. Family tabs visible, default to last-used family
3. Type to search, or click a namespace → see values
4. Click values to toggle, or use arrow keys + Enter
5. Press Escape or Enter to close overlay
6. Tags are applied immediately (no separate save step)

## Bulk Tagging (Era Workspace Context)

When multiple images are selected in the era workspace:
- Open tag picker
- Applying a tag applies it to ALL selected images
- Removing a tag removes it from ALL selected images
- Show indicator: "Applying to N images"

## Data Requirements

- `GET /api/v1/tag-families/{id}/taxonomy` — full family tree (namespaces + values)
- `POST /api/v1/images/{id}/tags` — add tag to image
- `DELETE /api/v1/images/{id}/tags` — remove tag from image
- `POST /api/v1/images/bulk-tag` — add/remove tag from multiple images

## Design Notes

- The picker should feel fast — no loading spinners between levels
- Pre-fetch all taxonomies on mount (they're small)
- The search is the fastest path for experienced users who know their tags
- For new users, the family → namespace → value drill-down teaches the taxonomy structure
- Visual language: pills/chips for values, matching the design system's tag style (bg-surface, border, hover:border-primary)
