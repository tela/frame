# Character Creation & Prospect Profile

## The Prospect Concept

A prospect is a character whose look you're exploring. They don't have eras, narrative identity, or personality attributes — those come later in Fig. In Frame, a prospect is a lookbook: a primary headshot, a collection of images organized into shoots, and the tools to generate and remix more images to develop the look.

Think of Frame as the modeling agency. The prospect is a model who just walked in. You're evaluating their look, building their book, and deciding if they have what it takes.

---

## 15a. New Character Dialog

**Trigger:** "New Entry" button in Character Library or sidebar.

**Contents:**
- **Name** (required)
- **Display Name** (optional, defaults to first word of name)
- **Initial Images** — drag-and-drop zone or file picker (optional)
- **Create** → character created as `prospect`, navigate to prospect profile

Minimal. No description, no attributes, no personality. Just a name and optionally some images.

---

## 15b. Character Library Enhancement

- Status filter includes `prospect`
- "New Entry" button in the library header
- Prospect cards are visually distinct — lighter treatment, "Prospect" badge
- Show image count on prospect cards (no era count)

---

## 15c. Prospect Profile (Main Screen)

This is the primary screen for working with a prospect character. It replaces the character detail view when the character's status is `prospect`.

### Header

- **Display name** — large editorial display type
- **Status badge:** "Prospect"
- **Fig integration:**
  - If published: green dot + "Published to Fig" badge
  - "Open in Fig" link with external link icon
  - Character ID shown as subtext metadata near the Fig link: `ID: a7f3b2c1d9e04f6a`
- **Last updated** timestamp
- **Develop CTA** — prominent action to transition prospect → development

### Primary Headshot

Large featured image — the character's current avatar / hero shot. This is the face of the prospect. Clicking opens lightbox. Changed by favoriting a different image from any tab.

### Tabs

**Lookbook** (default)
- Grid of favorited images that represent the character's best shots
- This is the curated "portfolio" — the images that define the look
- Favoriting an image from any shoot puts it here
- This is what gets shown when the character is published to Fig

**Shoots**
- Organized sets of images from generation sessions or imports
- Each shoot is named (auto from date/template, or user-named)
- A shoot = images created or imported together in one session
- Grid view per shoot, can expand/collapse
- "New Shoot" action to create an empty shoot
- Drag images between shoots

**Scrapbook**
- Unorganized collection — quick dump for images that don't have a home yet
- Drop zone landing — dragging files anywhere defaults here
- Browse, search, favorite from here

**Looks**
- Outfit / styling variations
- Each look is named: "Casual", "Formal", "Swimwear", etc.
- Can link wardrobe items from the media library
- Images showing the character in each look
- "New Look" action

### Generation Actions

These are prominent CTAs, not buried in menus:

- **Generate** — opens Studio in the context of this character. No era context, just the character's lookbook images as references. Generates new images to explore the look further.
- **Remix** — available per-image (hover overlay action). Opens Studio in refine mode with that specific image as the source. For when an image is close but needs adjustment.

### Drop Zone

Entire content area is a drop zone. Dropped images go to the current context:
- On Lookbook tab → scrapbook (lookbook is curated, not a dumping ground)
- On Shoots tab → active shoot, or creates a new shoot
- On Scrapbook tab → scrapbook
- On Looks tab → scrapbook

### Favoriting

- Heart/star icon on each image across all tabs
- Favoriting puts the image in the Lookbook
- Unfavoriting removes it from the Lookbook
- The primary headshot is the first favorited image (or can be explicitly set)

---

## 15d. Development Status View

When a character transitions to development:

Same structure as prospect profile, plus:
- **"Published to Fig"** badge with green dot
- **"Open in Fig"** link → `{fig_url}/casting/cast/{characterId}`
- **Character ID** shown as metadata
- No pipeline progress, no personality attributes — those are Fig's domain
- Eras section appears below tabs when Fig defines them

---

## 15e. "Develop" Transition

When the user clicks "Develop" on a prospect:
- Confirmation: "This will move the character to development and publish to Fig. Continue?"
- Status changes to `development`
- Character published to Fig (when Fig client is built)
- Standard image pipeline triggered (when Bifrost is available)

---

## Data Model

### Characters table additions
- `prospect` added as valid status value
- `fig_published` boolean (default false)
- `fig_character_url` text (URL to open in Fig)
- `source` text: "frame" or "fig"

### Shoots
```sql
shoots (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL REFERENCES characters(id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)

shoot_images (
  shoot_id TEXT NOT NULL REFERENCES shoots(id) ON DELETE CASCADE,
  image_id TEXT NOT NULL REFERENCES images(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (shoot_id, image_id)
)
```

### Looks
```sql
character_looks (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL REFERENCES characters(id),
  name TEXT NOT NULL,
  wardrobe_item_ids TEXT NOT NULL DEFAULT '[]',  -- JSON array of media item IDs
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)

look_images (
  look_id TEXT NOT NULL REFERENCES character_looks(id) ON DELETE CASCADE,
  image_id TEXT NOT NULL REFERENCES images(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (look_id, image_id)
)
```

### Favorites
Favorited status on character_images: add `is_favorited` boolean column, or use a separate table. Recommend column:
```sql
ALTER TABLE character_images ADD COLUMN is_favorited INTEGER NOT NULL DEFAULT 0;
```

---

## What NOT to Show (from the original design)

The screenshot had elements that don't belong in Frame for prospects:
- ~~Pipeline Progress~~ — not a Frame concern
- ~~Core Attributes~~ — personality is Fig's domain
- ~~Auth Level / Vocal Model~~ — Fig production metadata
- ~~Era Empty state~~ — prospects don't have eras
- ~~Origin Data narrative~~ — Frame doesn't store narrative

## What to Keep

- Status badge + Published to Fig indicator
- Character ID as metadata near the Fig link
- Open in Fig external link
- Large primary headshot
- Clean editorial layout
- Last updated timestamp
- New Entry CTA
