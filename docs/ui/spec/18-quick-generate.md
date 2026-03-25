# Quick Generate Component

## Job

Generate images for a character from anywhere in the app without navigating to the full Studio page. This is the primary way to create new images during prospect development, era curation, or when remixing an existing image.

## Where It Appears

- **Prospect profile** — "Generate" button opens Quick Generate for that character
- **Era workspace** — generate new images for a specific era
- **Any image card** — "Remix" action opens Quick Generate with that image as the source
- **Dataset detail** — generate to fill gaps in a dataset
- **Keyboard shortcut** — global `G` key (when not in a text input)

## Component: QuickGeneratePanel

A slide-in panel from the right side of the screen (not a modal that blocks the background — you should still see the context you came from).

### Panel Layout

**Header:**
- "Generate" or "Remix" title (depending on mode)
- Character name + era (if context is set)
- Close button (X or Escape)

**Mode: Generate (new image)**
- Prompt template selector (dropdown of saved templates)
- Prompt text area (pre-populated from template, editable)
- Era prompt prefix shown as read-only context (if era is set)
- Reference images strip — auto-populated from character's lookbook/favorites, toggleable
- "Generate" button

**Mode: Remix (from existing image)**
- Source image shown prominently (the image being remixed)
- Prompt text area (pre-populated from the source image's generation metadata if available)
- Denoise strength slider (0.2 = subtle tweak, 0.7 = significant change)
- "Remix" button

**Results Area (bottom of panel):**
- Generated images appear as a horizontal strip
- Each result has: Keep (heart/checkmark), Discard (X), Remix Again
- Kept images are immediately ingested for the current character
- Panel stays open so you can generate more

### Sizing

- Panel width: ~400px (same as Studio config panel)
- Full height of the viewport
- Pushes or overlays the main content (user preference, but overlay is simpler)

## Data Flow

1. User triggers Quick Generate from any context
2. Panel opens with character/era/image pre-populated from context
3. User writes or selects prompt, adjusts refs
4. "Generate" sends request to Frame API → Bifrost → ComfyUI
5. Result appears in the panel
6. "Keep" ingests the image for the character (or into the dataset if triggered from dataset context)
7. Panel can be closed or more images generated

## Design Notes

- The panel should feel lightweight and fast — not a heavy page load
- Pre-populate as much as possible from context (character, era, refs, template)
- The results strip should scroll if many images are generated in a session
- Keep the panel open between generations — the user is in a creative flow
- Escape closes the panel, losing unsaved results (kept results are already saved)
- The panel should work even when Bifrost is unavailable — show a disabled state with explanation
