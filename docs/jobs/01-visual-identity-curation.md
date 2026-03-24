# Job Stories: Visual Identity Curation

## Context

These jobs are about establishing and refining the visual identity of a cast character. This is Frame's core mission — owning what characters look like across eras, and providing the structured data that generation pipelines consume.

---

### When I cast a new character, I need to establish their visual identity baseline so that all future image generation produces consistent results.

**Acceptance:**
- I can define eras for the character (each era represents a distinct visual phase)
- For each era, I can set a visual description and prompt prefix
- I can import existing reference images (from Fig, ComfyUI, or disk)
- I can score and rank face references and body references
- The era's reference package is available to generation pipelines

---

### When I receive new images of a cast character, I need to quickly decide which ones are worth keeping and what they're useful for, so I don't waste time on poor results.

**Acceptance:**
- Images arriving for a cast character enter a triage queue
- I can rapidly classify each: approve (keep for curation), reject (mark as poor), archive (keep but not active)
- Classification is keyboard-driven — I should be able to process 50+ images in a session without touching the mouse
- I can rate images 1-5 during triage
- I can apply quick-tags during triage (without leaving the triage flow)
- I can undo the last action if I misclick/miskey

---

### When I'm curating an era's image set, I need to organize images by their purpose so I can find the right image for the right job.

**Acceptance:**
- Images can be in sets: staging (unsorted), reference (for generation), curated (reviewed and categorized), training (for LoRA/IPAdapter), archive (kept but inactive)
- I can move images between sets
- I can filter the era workspace by set, tag, rating, source
- I can bulk-select images and change their set assignment
- I can see at a glance which images are face refs, body refs, and their quality scores

---

### When I'm building a character's prompt prefix for an era, I need it to accurately describe the character's appearance so that generation produces on-model results.

**Acceptance:**
- I can edit the visual description and prompt prefix per era
- I can preview how the prompt prefix will combine with a generation template
- The prompt prefix is served as part of the reference package

---

## What's Missing in Current Implementation

- Triage queue has no images to triage (needs real content flowing in)
- Era workspace shows no images (the image grid isn't connected to the API)
- No way to promote images to face/body ref status from the UI
- No way to reorder or score reference images from the UI
- Reference package preview not accessible from the UI
