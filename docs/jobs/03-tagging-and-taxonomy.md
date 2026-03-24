# Job Stories: Tagging and Taxonomy

## Context

Tags are the language of Frame. Every query, every dataset filter, every generation template relies on consistent, structured tags. The tagging system needs to be rigorous — not freeform text dumping, but a managed taxonomy with validation, naming conventions, and family-based organization.

---

### When I'm setting up Frame's tag system, I need to define a taxonomy for each tag family so that tags are consistent and meaningful across all images.

**Acceptance:**
- Each tag family (Character Identity, NSFW, Technical, Training) has its own taxonomy
- A taxonomy defines: namespaces within the family, allowed values per namespace, and descriptions
- I can create, edit, and delete namespaces within a family
- I can create, edit, and delete allowed values within a namespace
- I can see the full taxonomy tree: family → namespace → values
- New tags must conform to the taxonomy (validated on creation)

---

### When I'm tagging images, I need to create new tags that follow the taxonomy rules so the tag system stays consistent as it grows.

**Acceptance:**
- When adding a tag, I pick a family, then a namespace, then either select an existing value or create a new one
- New tag values are validated against a configurable format pattern per namespace
- I can't create duplicate tags or tags that violate the naming convention
- Quick-tag during triage lets me apply tags from a predefined set (the taxonomy) without typing

---

### When I need a trigger word for a LoRA or IPAdapter, I need it to follow a strict naming convention so it doesn't collide with other trigger words and works reliably in prompts.

**Acceptance:**
- LoRA/IPAdapter trigger words follow the pattern: `[physical-feature]_[primary-descriptor]_[secondary-descriptor]_[descriptor]_[version]`
- Example: `face_angular_highcheekbones_female_v2`
- The pattern is configurable per physical feature type (face, body, hands, etc.)
- Validation enforces: lowercase, underscore-separated, required segments, version suffix
- Uniqueness is checked across all datasets
- The trigger word config is editable (so I can evolve the convention)

---

### When I'm captioning images for training, I need to write structured descriptions that combine the character's identity with scene-specific details.

**Acceptance:**
- Every image can have a caption (separate from tags — captions are natural language descriptions)
- Captions can be auto-generated from the image's tags + character prompt prefix (template-based)
- Captions can be manually edited per image
- In dataset context, captions are used for export (Kohya caption files)
- Bulk captioning: apply a caption template to all images in a selection
- Caption template variables: `[character]`, `[era]`, `[pose]`, `[expression]`, `[clothing]`, etc.

---

### When I look at my tag system, I need to understand coverage and health so I can identify inconsistencies, gaps, and cleanup opportunities.

**Acceptance:**
- Per-family dashboard: total tags, total usages, most/least used tags
- Orphaned tags (tags used by zero images) are flagged
- Duplicate or near-duplicate tags are surfaced (via synonym management)
- I can merge two tags (all usages of tag A become tag B, tag A is deleted)
- I can rename a tag value across all images
- I can delete a tag value (strips it from all images)

---

### When I'm working in different contexts (visual identity vs training data vs NSFW content), I need the tag system to show me only the relevant tags for that context.

**Acceptance:**
- Tag families control which tags are visible in each workflow
- Triage shows tags from the relevant family (switchable via keyboard)
- Image search filters are organized by family
- Era workspace can show/hide tag families on image overlays
- NSFW tags are only visible when explicitly toggled on

---

## What's Missing in Current Implementation

- No taxonomy management (can't define namespaces and allowed values per family)
- No tag creation workflow (no way to add a new tag from the UI — tags only exist when applied via API)
- No format validation on tag values
- No captioning system at all
- No trigger word convention or validation
- No tag coverage/health dashboard
- No auto-caption from tags
- Tag manager shows existing tags but can't create new ones through a structured flow
