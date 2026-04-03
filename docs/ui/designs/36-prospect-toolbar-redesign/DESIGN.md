# Design System: Editorial Archive (Light Mode)

## 1. Overview & Creative North Star
**The Creative North Star: "The Curated Monolith"**

This design system is built to evoke the tactile, authoritative feel of a physical boutique archive. It moves beyond the standard "digital dashboard" by treating every screen as a high-end editorial spread. We break the "template" look through **intentional white space, dramatic typographic scale shifts, and an obsession with tonal depth.** 

The goal is to feel "expensive" yet accessible. By using a strict warm-neutral palette and classical serif headings contrasted against precise Swiss-style UI, we create an environment where the content is the artifact and the interface is the gallery wall.

---

## 2. Colors & Surface Architecture
The palette is rooted in warmth and high-contrast legibility. We avoid pure whites to reduce eye strain and provide a "paper-like" quality.

### Primary Palette
- **Background (`#FAF9F8`):** The primary canvas. A soft, warm off-white that feels like heavy-weight cardstock.
- **On-Surface (`#2F3333`):** Our "Ink Black." High-contrast for readability, used for primary body copy and critical UI.
- **Primary / Primary-Dim (`#5F5E5E` / `#535252`):** Sophisticated mid-tones for interactive states.
- **Muted Metadata (`#8C8C8A`):** Used for tertiary information, timestamps, and secondary labels.

### The "No-Line" Rule
To maintain a high-end aesthetic, **do not use 1px solid borders for sectioning.** Structural boundaries must be defined through:
1.  **Tonal Transitions:** Moving from `surface` to `surface-container-low` (`#F3F4F3`).
2.  **Vertical Whitespace:** Utilizing the `20` (7rem) or `24` (8.5rem) spacing tokens to create breathing room between conceptual blocks.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. 
- **Base:** `surface` (#FAF9F8)
- **Secondary Containers:** `surface-container` (#EDEEED)
- **Interactive Elevated Elements:** `surface-container-lowest` (#FFFFFF) – This creates a "pop" effect against the warm background without needing a drop shadow.

---

## 3. Typography
The system uses a "Serif for Soul, Sans for Utility" approach.

### Display & Headlines (Newsreader)
*Newsreader provides the editorial "voice." Use it for storytelling elements.*
- **Display-LG (3.5rem):** Reserved for hero entry points.
- **Headline-MD (1.75rem):** Used for article titles and major section headers. Use tight letter-spacing (-0.02em) for a more modern, compact feel.

### UI & Body (Instrument Sans / Inter)
*Instrument Sans/Inter provides the precision. It is used for functional navigation and data.*
- **Title-SM (1rem):** Used for card titles and navigation links.
- **Body-MD (0.875rem):** The workhorse for all long-form reading.
- **Label-SM (0.6875rem):** Used for metadata, capitalized for a "technical" archive aesthetic.

---

## 4. Elevation & Depth
We eschew traditional material shadows in favor of **Tonal Layering** and **Ambient Light.**

- **The Layering Principle:** Depth is achieved by stacking tiers. A "Card" should be `surface-container-lowest` (#FFFFFF) sitting on a `surface` background.
- **Ambient Shadows:** If an element must float (e.g., a modal or dropdown), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(47, 51, 51, 0.04)`. The shadow must be a tint of the `on-surface` color, never pure gray.
- **Glassmorphism:** For top navigation or floating action bars, use `surface-bright` at 80% opacity with a `backdrop-blur: 12px`. This prevents the UI from feeling like a heavy "sticker" on top of the content.

---

## 5. Components

### Buttons
- **Primary:** High-contrast `on-surface` background with `inverse-primary` text. 2px radius. No border.
- **Secondary:** `surface-container-highest` background. Subtle, low-friction.
- **Tertiary:** Text-only with a 1px "Ghost Border" (10% opacity `outline`) that appears only on hover.

### Inputs & Fields
- **Styling:** Use `surface-container-low` backgrounds. 
- **The Ghost Border:** Instead of a 1px solid line, use a 1px line of `outline-variant` at 20% opacity. 
- **Interaction:** On focus, the background transitions to `surface-container-lowest` (#FFFFFF) with a 1px `on-surface` stroke.

### Cards & Lists
- **Rule:** Absolute prohibition of divider lines between items.
- **Separation:** Use `8` (2.75rem) spacing or a `surface-container-lowest` card wrapper.
- **Image Treatment:** All images in cards should have a 2px radius and a subtle 1px internal "inner glow" or border (using `outline-variant` at 10%) to define the edge against the warm background.

### Archive Chips
- **Selection Chips:** Small, `label-sm` text. 2px radius. Background: `primary-container`. No border.

---

## 6. Do's and Don'ts

### Do
- **Do** use asymmetrical layouts (e.g., a large headline on the left, empty space on the right, and metadata tucked into the far right).
- **Do** prioritize "Over-Spacing." If a section feels crowded, double the padding using the `16` (5.5rem) token.
- **Do** use `Newsreader` in italics for secondary pull-quotes to add visual texture.

### Don'ts
- **Don't** use 100% black (#000). Always use the `on-surface` (#2F3333) or the user's defined primary (#111111) for deep contrast.
- **Don't** use standard "drop shadows." If it doesn't look like natural light hitting paper, it’s too heavy.
- **Don't** use 0.5px or 1px dividers to separate list items. Use the `surface-container-low` background shift instead.