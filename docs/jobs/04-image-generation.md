# Job Stories: Image Generation

## Context

Frame is a photo studio for cast characters. Generation is the creative loop: compose a prompt, generate images, review results, refine the good ones, discard the bad. The output feeds back into the curation pipeline.

---

### When I need more images of a character in a specific era, I need to generate them from Frame using the character's visual identity and reference images.

**Acceptance:**
- I can open the Studio for a character + era
- The era's prompt prefix is pre-loaded as context
- I can select a prompt template that defines the creative direction (pose, style, setting, etc.)
- I can compose a prompt (template + my additions)
- Reference images from the era's package are automatically included
- I can adjust generation parameters (steps, CFG, seed, dimensions, LoRA adapter)
- I click generate and results appear in the session
- Generated images are ingested into Frame with full metadata (prompt, seed, template used)

---

### When I see a good-but-not-perfect generated image, I need to refine it so I can improve quality without starting from scratch.

**Acceptance:**
- I can select a generated image and enter "refine" mode
- img2img refinement: adjust the image with a modified prompt and denoise strength
- Detail enhancement: fix hands, improve face, sharpen details (via specific ComfyUI workflows)
- Upscale: increase resolution
- Remix: same parameters, different seed (or same seed, tweaked prompt)
- Refined images appear alongside the original for comparison

---

### When I'm reviewing generated results, I need to quickly keep or discard them so good images enter the curation pipeline.

**Acceptance:**
- Each generated image has accept/reject actions
- Accepted images are ingested into Frame's triage queue (or directly into the era's staging set)
- Rejected images are discarded (not stored)
- I can see the prompt and seed that produced each image
- I can re-run a good prompt to generate more variations

---

### When I want consistent catalog images across all characters, I need reusable prompt templates organized by category, not by character.

**Acceptance:**
- Templates are organized by facets (pose, clothing, style, setting, intimacy)
- Templates contain prompt body, negative prompt, and default parameters
- Templates use variables ([SUBJECT], [ERA], [LIGHTING]) that get resolved at generation time
- I can create, edit, duplicate, and delete templates
- I can use any template with any character in any era
- Standard catalog templates define the baseline set every character should have

---

## What's Missing in Current Implementation

- Studio has no connection to Bifrost (generation button is dead — blocked on Bifrost image providers)
- No refine mode UI
- No prompt template CRUD (templates are hardcoded mock data)
- No prompt template persistence in the database
- Generated images don't flow into triage
- No seed tracking or re-run capability
