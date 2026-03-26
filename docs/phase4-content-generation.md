# Phase 4 — Content Generation

This is the content-specific work that requires prompt engineering, image review, LoRA curation, and seed character creation. The infrastructure from phases 1-3 supports all of these workflows.

> **Note:** Claude Code can build pipeline infrastructure but cannot assist with prompt engineering, image review, or content-specific workflow tuning for NSFW/anatomical content. The creative content must be authored by the user.

---

## 1. Prompt Templates for Standard Poses

Each standard pose needs a prompt template that produces consistent, high-quality results. These are stored in Frame's prompt template system (`/api/v1/templates`).

### SFW Standard Poses

| Pose | Framing hints (from DB) | Prompt template needed |
|------|------------------------|----------------------|
| `front_headshot` | head and shoulders, front facing, neutral expression, studio lighting | Character-specific face description + framing |
| `three_quarter_portrait` | head and shoulders, three-quarter angle, studio lighting | Same, rotated |
| `profile_portrait` | head and shoulders, side profile view, studio lighting | Same, profile |
| `front_full` | full body, front facing, standing, neutral pose, studio lighting | Full body description + proportions |
| `back_full` | full body, from behind, standing, looking over shoulder, studio lighting | Back view, hair detail |
| `three_quarter_full` | full body, three-quarter angle, standing, studio lighting | Overall silhouette |

Each pose × outfit (nude/standard_outfit/swimsuit) = distinct prompt.

### NSFW Standard Poses

| Pose | Template needed |
|------|----------------|
| `bent_over_rear` | Full body, rear view, bent forward — anatomy-specific prompting |
| `supine_spread` | Full body, on back, legs spread — anatomy-specific prompting |
| `kneeling_front` | Full body, kneeling, front facing — anatomy-specific prompting |
| `seated_spread` | Full body, seated, legs open — anatomy-specific prompting |

### Anatomical Detail Poses

| Pose | Template needed |
|------|----------------|
| `breast_detail` | Close-up chest/torso — breast shape, size, nipple detail |
| `vulva_detail` | Close-up genital area — anatomical accuracy |
| `pubic_hair_natural` | Close-up lower abdomen — natural hair growth pattern |
| `pubic_hair_groomed` | Close-up lower abdomen — groomed/shaved variant |

### Template Structure

Use the existing prompt template system. Each template should include:
- `prompt_body` — the main generation prompt with `[SUBJECT]` placeholder
- `negative_prompt` — what to exclude (deformities, artifacts, etc.)
- `style_prompt` — consistent lighting/quality guidance
- `parameters` — JSON with recommended width, height, steps, tier
- `facet_tags` — tags for categorization (e.g., `pose:front_headshot`, `outfit:nude`)

### API for template creation

```bash
curl -X POST http://localhost:7890/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Front Headshot — Nude",
    "prompt_body": "[SUBJECT], head and shoulders portrait, front facing, ...",
    "negative_prompt": "deformed, blurry, low quality, ...",
    "style_prompt": "studio photography, soft directional lighting, neutral gray background",
    "parameters": "{\"width\":768,\"height\":1024,\"steps\":30,\"tier\":\"complex\",\"content_rating\":\"nsfw\"}",
    "facet_tags": "pose:front_headshot,outfit:nude"
  }'
```

---

## 2. LoRA Curation

Register LoRAs from CivitAI that improve generation quality for specific workflows.

### Categories to source

| Category | Purpose | Examples to find |
|----------|---------|-----------------|
| `detail` | Anatomical accuracy, skin texture | Detail enhancers, skin texture LoRAs |
| `pose` | Pose accuracy and consistency | Pose-specific LoRAs |
| `nsfw` | NSFW content quality | Anatomical detail LoRAs, NSFW quality boosters |
| `quality` | General quality improvement | Upscale, sharpness, anti-artifact |
| `style` | Visual style consistency | Film grain, lighting style, editorial look |

### Registration API

```bash
curl -X POST http://localhost:7890/api/v1/loras \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Detail Enhance V2",
    "filename": "detail_enhance_v2.safetensors",
    "source_url": "https://civitai.com/models/...",
    "description": "Improves fine anatomical detail and skin texture",
    "category": "detail",
    "tags": "[\"anatomy\",\"skin\",\"detail\"]",
    "recommended_strength": 0.6,
    "content_rating": "sfw",
    "compatible_models": "[\"flux2\",\"sdxl\"]"
  }'
```

### LoRA files

LoRA `.safetensors` files need to be placed where the ComfyUI/Bifrost provider can access them. The `filename` field in the registry must match the filename on the provider's filesystem.

---

## 3. Seed Character Creation

Goal: Create 2-3 characters with complete 26-image reference sets.

### Workflow per character

1. **Create character** in Frame (UI or API)
   - Standard era (age 20) auto-created
   - Set status to `development`

2. **Bootstrap face reference** (the chicken-and-egg problem)
   - Use `txt2img` workflow with detailed face/body prompt
   - Generate 4-8 candidates at `complex` tier
   - Mark the best as `face_ref` and `body_ref` in the era
   - These become the reference package for all subsequent generation

3. **Generate SFW standard poses**
   - Switch to `multi_ref` workflow (uses the reference package)
   - Generate each pose × outfit combination
   - Review and accept/reject in the pose set dashboard
   - Regenerate rejects until satisfied

4. **Generate NSFW standard poses**
   - Same `multi_ref` workflow, `content_rating: nsfw`
   - Routes to NSFW-safe providers (Klein 4B, Lustify)

5. **Generate anatomical details**
   - `img2img` workflow using accepted full-body nude as source
   - Or `multi_ref` with close-up framing prompts
   - Apply detail-specific LoRAs for anatomical accuracy
   - Refine individual features iteratively

6. **Import existing images** (if you have ComfyUI output)
   ```bash
   curl -X POST http://localhost:7890/api/v1/import/directory \
     -H "Content-Type: application/json" \
     -d '{
       "path": "/Users/tela/dev/ComfyUI/output",
       "character_id": "CHARACTER_ID",
       "era_id": "ERA_ID",
       "source": "comfyui"
     }'
   ```
   Then tag imported images with pose_id/outfit_id via the pose set endpoint.

### Recommended generation order

For each character:
1. Face reference candidates (txt2img, 8 images)
2. Body reference candidates (txt2img, 4 images)
3. Curate refs → mark face_ref + body_ref
4. Front headshot × 3 outfits (multi_ref, 3 images)
5. 3/4 portrait × 3 outfits (3 images)
6. Profile × 3 outfits (3 images)
7. Front full body × 3 outfits (3 images)
8. Back full body × 3 outfits (3 images)
9. 3/4 full body × 3 outfits (3 images)
10. NSFW poses × nude (4 images)
11. Anatomical details (4 images, with detail LoRAs)

Total: ~26 accepted images + 12+ reference candidates = ~40 generations minimum per character (more if rejects).

---

## 4. Useful API Endpoints Reference

| Action | Method | Endpoint |
|--------|--------|----------|
| Create character | POST | `/api/v1/characters` |
| Get character + eras | GET | `/api/v1/characters/{id}` |
| Generate images | POST | `/api/v1/generate` |
| Import from directory | POST | `/api/v1/import/directory` |
| Ingest single image | POST | `/api/v1/characters/{id}/images` |
| Mark face/body ref | PATCH | `/api/v1/characters/{id}/images/{imageId}` |
| Get pose set status | GET | `/api/v1/characters/{id}/pose-set?era_id={eraId}` |
| Update pose set slot | POST | `/api/v1/characters/{id}/pose-set` |
| Register LoRA | POST | `/api/v1/loras` |
| List LoRAs | GET | `/api/v1/loras` |
| Create prompt template | POST | `/api/v1/templates` |
| List standard poses | GET | `/api/v1/standard-poses` |
| List standard outfits | GET | `/api/v1/standard-outfits` |
| Bifrost status | GET | `/api/v1/bifrost/status` |
| Publish to Fig | POST | `/api/v1/characters/{id}/publish` |

---

## 5. Provider Selection Guide

| Workflow | Content Rating | Recommended Provider | Tier |
|----------|---------------|---------------------|------|
| Quick concept sketches | SFW | Flux.1 | cheap |
| Reference building | SFW | Flux.2 | complex |
| Multi-ref consistent gen | SFW | Flux.2 | complex |
| Multi-ref consistent gen | NSFW | Flux.2 Klein 4B | complex |
| FaceID portrait | SFW | SDXL (IP-Adapter) | complex |
| Pose transfer | Any | SDXL (DWPose+ControlNet) | complex |
| Anatomical detail | NSFW | Flux.2 Klein 4B or SDXL Lustify | complex |
| img2img refinement | Any | Flux.2 or SDXL | complex |
| Quality upscale | Any | SDXL (RealESRGAN) | complex |
| Batch dataset fill | Any | Any available | cheap |
