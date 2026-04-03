# 36 — Studio V2: Creative Cockpit

## Vision

Studio becomes Frame's unified creative cockpit. Everything that creates, transforms, or refines visual content flows through Studio. The Stylist sits alongside as a creative director — able to set prompts, choose workflows, adjust settings via conversation. Studio is intent-driven: the user expresses what they want to do, and Studio configures itself.

## Architecture Principles

1. **Intent-driven entry.** Every path into Studio carries intent (remix, headshot, upscale, consistent portrait, undress, pose). Studio auto-configures workflow, refs, source, content rating, and prompt from that intent.
2. **Mode-based operation.** Three modes: Generate (create new images), Refine (iterate on existing images via img2img), Process (non-creative transforms like upscale, hand-fix). Video mode added as a fourth when image capabilities are mature.
3. **Character-aware prompting.** Prompts compose from identity (character physical data) + action (pose/scene) + style (template/LoRA). The user steers the action and style; the identity is automatic.
4. **Stylist integration.** The Stylist LLM can read and write Studio state — setting prompts, choosing workflows, recommending LoRAs, adjusting parameters. It acts as a creative collaborator, not just a chatbot.

## PR Plan

### PR 1: Intent System + Full Image Display

**No designs needed. Wiring + layout.**

- Add search param presets: `?intent=remix&source=X`, `?intent=headshot`, `?intent=consistent`, `?intent=upscale&source=X`
- Intent-to-settings mapping:

  | Intent | Workflow | Refs | Source | Content | Prompt |
  |--------|----------|------|--------|---------|--------|
  | headshot | text-to-image | none | none | sfw | character desc + "front-facing headshot, neutral expression, studio lighting" |
  | consistent | sdxl_character_gen | face ref | none | sfw | character desc + editable |
  | portrait | sdxl_character_gen | face ref | none | sfw | character desc + "three-quarter portrait" |
  | full_body | sdxl_character_gen | face+body ref | none | sfw | character desc + "full body standing" |
  | full_body_nude | sdxl_character_gen | face+body ref | none | nsfw | character desc + "full body nude standing" |
  | remix | sdxl_img2img | none | source image | inherit | editable, pre-filled from original |
  | upscale | sdxl_quality_postprocess | none | source image | inherit | none needed |
  | clothing_swap | sdxl_clothing_swap | body ref | source image | nsfw | auto |

- Session results display **full-size images** instead of thumbnails
- Batch generation results shown in a comparison grid (generate 4 → 2x2 grid)
- Click any result to view it large / enter refine mode for that image

### PR 2: Studio Mode Switcher

**Needs design spec + Stitch design.**

- Mode selector in Studio header: **Generate** | **Refine** | **Process**
- Generate = text-to-image, character_gen, multi_ref workflows. Creates new images from prompts + refs.
- Refine = img2img, clothing_swap, pose_transfer. Iterates on an existing image with prompt steering and denoise control. Side-by-side comparison with source.
- Process = quality_postprocess (upscale), hand detailing, face restore. Non-creative transforms — no prompt needed, just the operation.
- Mode switch preserves character context. Clicking a generated result can transition to Refine mode for that image.
- **Architecture leaves room for Video mode** as a future fourth tab.

### PR 3: Image Action Intents from Character Page

**No separate designs — uses existing image hover patterns.**

- Image hover actions become intent-driven:
  - Remix → Studio(intent=remix, source=imageId)
  - Upscale → Studio(intent=upscale, source=imageId)
  - Generate Similar → Studio(intent=consistent) with face ref from this image
- Prospect action bar quick actions:
  - "Generate Headshot" → Studio(intent=headshot)
  - "Generate Full Body" → Studio(intent=full_body)
  - "Generate Nude" → Studio(intent=full_body_nude)
- Each action navigates to Studio pre-configured for the intent

### PR 4: Body Shape, Silhouette, and Pose Catalog

**May need design for pose catalog UI.**

- Body shape and silhouette control via the Physicality tab fields (build, hip shape, breast size, waist-hip ratio, body proportions). These feed into prompt composition for full-body generation.
- Expand standard poses beyond the current 14 to a larger catalog. The user can favorite poses and build a personal set.
- Pose catalog UI: browseable grid of standard poses with prompt hints. Click a pose → generates that pose for the current character with their refs.
- Pose favorites: user can star poses they use frequently, creating a personalized quick-access set.
- Standard pose generation workflow: select poses from catalog → batch generate → results flow into the character's scrapbook for triage.

### PR 5: Stylist → Studio Integration

**Needs design spec for interaction model.**

- Connect Stylist to an NSFW-capable LLM via Bifrost `/v1/chat/completions`
- Stylist can read current Studio state (workflow, prompt, refs, settings, session results)
- Stylist can write Studio state:
  - Set/modify the prompt ("make her look more confident")
  - Change workflow ("switch to character gen")
  - Adjust parameters (denoise, steps, dimensions)
  - Recommend and apply LoRAs ("use the skin texture LoRA at 0.5")
  - Trigger generation ("generate 4 variations")
- Shared state between Stylist and Studio via React context or a lightweight store
- Stylist messages can include inline image results from generation it triggered
- The camera and pen icons in the Stylist drawer get wired:
  - Camera: share a generated image with the Stylist for feedback/direction
  - Pen: describe what you want and the Stylist translates to Studio settings

### PR 6: Prompt Strategy + Templates

**Needs user to define prompt templates through testing.**

- Prompt composition architecture:
  ```
  [identity prefix]     — auto from character + era physical data
  [action/pose prompt]  — from template or user input
  [style modifiers]     — from LoRA, template style hints
  [negative prompt]     — from template defaults
  ```
- Identity prefix built from: gender, ethnicity, age, eye color, hair, build, height, face shape, skin tone, distinguishing features. Already implemented in `buildCharacterPrompt`.
- Action templates per intent: headshot, portrait, full body, editorial, nude poses, specific standard poses.
- Template editor: create/edit/test templates. Each template specifies action prompt, negative prompt, recommended workflow, dimensions, and LoRA suggestions.
- User tests prompts in Studio against real generation, iterates, then saves as templates.

### PR 7: Video Studio Mode

**Deferred until image capabilities are mature.**

- Fourth mode tab in Studio: **Video**
- Video generation from a source image (image-to-video)
- Video generation from prompt (text-to-video)
- Video workflows routed through Bifrost to video-capable providers
- Frame-by-frame preview, timeline scrubbing
- Generated videos stored alongside images in the character's collection
- The exact capabilities depend on which video models are available via Bifrost — this spec will be written when the image pipeline is stable and video providers are integrated.

## Key Dependencies

- PR 1 is independent — start immediately
- PR 2 needs a design (spec the mode switcher layout, write for Stitch)
- PR 3 depends on PR 1 (uses the intent system)
- PR 4 partially independent (pose catalog), partially depends on PR 1 (generation intents)
- PR 5 depends on PR 2 (needs Studio state to be structured as a readable/writable store)
- PR 6 depends on PR 1 (intent system) + user testing prompts against real generation
- PR 7 deferred — no dependency on any current PR

## Non-Goals for V2

- Training pipeline integration (dataset export, LoRA training) — separate workstream
- Multi-character scenes — one character per Studio session for now
- Real-time preview / streaming generation — poll-based is fine
- Collaborative editing — single user, local tool
