# 36 — Prospect Toolbar Redesign

## Job

Clean up the cluttered toolbar on the prospect/development character page. Currently the area between the hero section and the image grid crams 7 elements into a single row: 2 tabs (Lookbook/Scrapbook), 3 studio links (Headshot/Full Body/Studio), an Import button, and a Develop Character button. There is no visual hierarchy — everything competes for attention at the same level.

This spec separates navigation from actions, groups related controls, and establishes a clear visual hierarchy. The redesign also accommodates future actions (more generation intents, batch operations) without the toolbar growing horizontally.

## Who Uses This

The user managing a character in `prospect` or `development` status. They visit this page to review images, generate new ones, and curate the character's look.

## What It Shows

### Route: `/characters/{characterId}`

This spec covers only the **toolbar area** between the character hero section and the image grid. Everything above (hero, breadcrumbs) and below (image grid, drop zone) is unchanged from spec 34.

### Layout: Two Rows

The toolbar is split into two distinct horizontal rows separated by 16px vertical space.

**Row 1: Navigation Tabs** — what am I looking at?
**Row 2: Action Bar** — what can I do?

This separation means tabs never compete with buttons. Each row has a single job.

---

### Row 1: Navigation Tabs

A horizontal row of tab buttons sitting on a 1px bottom border (`#F3F4F3`). 32px bottom margin to Row 2.

Two tabs:
- **Lookbook** — favorited/curated images
- **Scrapbook** — all images

Each tab button:
- Text: tab name + count in parentheses, e.g., "Lookbook (3)" / "Scrapbook (12)"
- Styling: 13px uppercase, tracked 0.1em, font-medium, 12px bottom padding
- Active tab: `#5F5E5E` text, 2px bottom border `#5F5E5E`
- Inactive tab: `#8C8C8A` text, transparent bottom border, hover: `#5F5E5E` text
- Tabs are left-aligned. No elements on the right side of this row.

This is identical to the current tab design (spec 34) — it stays as-is but without any action buttons sharing the row.

---

### Row 2: Action Bar

A horizontal row with `justify-between` layout. 24px bottom margin to the image grid.

**Left group — Generation actions:**

A single row of buttons with no gap between them (visually grouped like a segmented control). Each button:
- Background: `#2F3333` (on-surface)
- Text: `#FAF9F8` (background), 11px uppercase, tracked 0.1em, font-bold
- Padding: 10px vertical, 16px horizontal
- First button gets 2px top-left and bottom-left radius. Last button gets 2px top-right and bottom-right radius. Middle buttons: 0 radius.
- Between buttons: 1px vertical divider in `rgba(250, 249, 248, 0.2)` (background color at 20% opacity)
- Hover: `#535252` (primary-dim) background

Buttons in order:
1. **Headshot** — icon: Material Symbols "portrait" (16px), 6px gap, text "Headshot". Links to `/characters/{characterId}/eras/{eraId}/studio?intent=headshot`
2. **Full Body** — icon: Material Symbols "person" (16px), 6px gap, text "Full Body". Links to `/characters/{characterId}/eras/{eraId}/studio?intent=full_body`
3. **Studio** — icon: Material Symbols "auto_awesome" (16px), 6px gap, text "Studio". Links to `/characters/{characterId}/eras/{eraId}/studio` (no intent — opens with custom prompt)

All three are `<Link>` elements (TanStack Router), not buttons. `eraId` is the default era's actual ID.

**Right group — Secondary actions:**

A row of buttons with 12px gap between them.

1. **Import** — outlined style: 1px border `#EDEEED` (surface-container), transparent background, `#5F5E5E` text, 11px uppercase, tracked, font-medium. Padding: 8px vertical, 16px horizontal. 2px radius. Hover: `#F3F4F3` background. Icon: Material Symbols "upload" (16px), 6px gap, text "Import". On click: opens import modal.

2. **Develop Character** (only when status is `prospect`) — outlined style matching Import button but with stronger border: 1px border `#5F5E5E`, `#5F5E5E` text. Hover: `#5F5E5E` background, `#FAF9F8` text, transition 150ms. Icon: Material Symbols "arrow_forward" (16px), 6px gap, text "Develop". On click: opens confirmation dialog (unchanged from spec 34).

---

### Responsive Behavior

**Desktop (lg+):** Both rows full-width. Row 2 is `flex-row`, left group and right group on opposite sides.

**Tablet (md):** Same as desktop but buttons may wrap. Left group remains segmented. Right group stacks below if needed (`flex-wrap`).

**Mobile (below md):** Row 2 stacks vertically. Left group (generation buttons) is full-width. Right group is full-width below, 12px top margin. Buttons within each group maintain their layout.

---

### State Variations

**No images exist:**
- Generation buttons are always enabled (you can generate without existing images)
- Import button always enabled
- The image grid below shows the empty state (spec 34)

**Character in `development` status:**
- "Develop" button is hidden (already developed)
- Generation buttons and Import remain

**Bifrost unavailable:**
- Generation buttons are visually disabled: `opacity: 0.5`, `cursor: not-allowed`, `pointer-events: none`
- A small warning appears below the generation group: "Generation unavailable — Bifrost offline" — 11px, `#D97706` (amber), with Material Symbols "warning" icon (14px)

---

## Actions

- Navigate to Studio with specific intent (Headshot, Full Body, or Custom)
- Open import modal
- Transition character to development status (with confirmation dialog)
- Switch between Lookbook and Scrapbook tabs

## Data

No new endpoints required. Uses the same data as spec 34.

## Notes

- The segmented button group for generation actions is intentionally compact. It reads as one unit: "these are the ways to generate images." Future intents (e.g., Portrait, Nude, Pose) can be added as additional segments without disrupting the layout — the group just gets wider.
- Import and Develop are separated because they're different categories of action: Import is content management, Develop is lifecycle management. Neither is generation.
- The generation group uses filled dark buttons to draw the eye. These are the primary actions on this page — the user is here to build the character's image set.
- If the generation group eventually needs more than 5-6 options, it should collapse into a dropdown. For now, 3 buttons is fine.
