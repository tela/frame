# Studio

## Job

Generate and refine images for a cast character at a specific era. This is Frame's photo studio — the user directs image creation using prompt templates, text prompts, and source images. Results flow into the triage queue.

The studio supports two modes:
1. **Generate** — create new images from text prompts and reference packages
2. **Refine** — improve existing images via img2img, detail enhancement, or remix

## Who Uses This

The user, when a character's visual identity needs more images — filling gaps in the catalog, exploring new poses/expressions, or improving the quality of existing reference images.

## What It Shows

### Context Header
- Character name + era label
- Current reference package summary (face ref count, body ref count, package status)
- Visual description (read-only, links to Era Workspace to edit)

### Generate Mode

**Prompt Composition:**
- **Era prompt prefix** — shown as a locked/read-only prefix that will be prepended to the user's prompt. Editable in Era Workspace, not here.
- **Template selector** — pick from prompt template library. Selecting a template populates the prompt body and sets relevant generation parameters.
- **Prompt body** — free-text area for the user's additions/modifications to the template prompt.
- **Negative prompt** — pre-populated from template, editable.
- **Full prompt preview** — shows the assembled prompt (prefix + template + user additions) as it will be sent.

**Generation Parameters:**
- Number of images to generate (1-8)
- Seed (random, or specify for reproducibility)
- Steps, CFG, sampler — pre-populated from era pipeline settings, adjustable
- Checkpoint — pre-populated from era pipeline settings
- IPAdapter weight — pre-populated, adjustable
- Image dimensions — pre-populated, adjustable

**Reference Images:**
- Show current face refs and body refs from the era's reference package
- Toggle which refs to include in this generation
- Option to add additional reference images (e.g., a wardrobe item from Frame's media library)

**Action: Generate**
- Sends request to Bifrost
- Shows progress indicator
- Results appear in a results strip below the generation controls

### Refine Mode

Entered from Era Workspace or Triage Queue by selecting an existing image to refine.

**Source Image:**
- The image being refined, displayed prominently
- Original metadata (prompt, seed, settings if available)

**Refinement Options:**
- **img2img refinement** — adjust the image with a modified prompt. Denoise strength control (subtle → significant).
- **Detail enhancement** — hand detailing, face restoration, general quality improvement. Runs targeted enhancement workflows.
- **Upscale** — increase resolution.
- **Remix** — re-generate with similar parameters but different seed, or same seed with prompt tweaks.

**Prompt for Refinement:**
- Text prompt (pre-populated from original if available)
- Source image is automatically included
- Denoise strength slider (for img2img)

**Action: Refine**
- Sends to Bifrost with appropriate workflow (img2img, hand detailer, quality postprocess)
- Results appear alongside the original for comparison

### Results Strip

Both modes show generated/refined images in a results area:
- Thumbnail strip of all results from this session
- Click to view full-size
- Quick actions per result: **Keep** (sends to triage queue as pending), **Delete** (discard, don't store), **Refine** (open in refine mode), **Favorite** (keep and mark as high priority for triage)
- Batch keep/delete: select multiple and act on all

### Session History

Persistent within the studio session:
- All prompts and parameters used
- All results generated
- Allows re-running a previous prompt or tweaking it

## Actions

- Generate images from prompt + template
- Refine existing images (img2img, detail, upscale, remix)
- Keep/delete/refine results
- Navigate to Triage Queue to process kept images
- Navigate to Prompt Template Library to create/edit templates

## Data Requirements

- Character and era data (for prompt prefix, pipeline settings, reference package)
- Prompt template library: list, get by ID
- Bifrost API: image generation endpoint, img2img endpoint
- Image ingest: kept results are POSTed to Frame's ingest endpoint
- ComfyUI workflow selection: Frame needs to know which workflows to use for each operation (generate, img2img, hand detail, upscale)

## Integration: Bifrost

Frame talks to Bifrost directly for generation:
- `POST /v1/images/generate` — text-to-image with reference images
- Bifrost routes to the appropriate provider (local ComfyUI, RunPod, etc.)
- Frame passes the character's reference images as part of the request
- Frame receives generated images back and offers them for keep/delete/refine

For refinement workflows (img2img, hand detailing):
- These are specific ComfyUI workflows, not generic Bifrost image generation
- Frame may need to submit ComfyUI workflow JSON directly, or Bifrost needs to support these as named pipelines

## Notes

- The studio should feel responsive even though generation takes time (seconds to minutes). Show clear progress, allow the user to continue reviewing previous results while waiting.
- Seed tracking is important — if the user finds a good seed, they should be able to lock it and generate variations.
- The prompt template selector should show a preview of what the template produces (if example images exist).
- Consider a "recipe" concept: a saved combination of template + parameter overrides that the user can re-use across characters.
