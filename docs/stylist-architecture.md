# Stylist Architecture — V1

## Overview

The Stylist is an LLM-powered creative director that helps the user develop characters through conversation. It composes shots, selects wardrobe/hair/LoRAs, evaluates generated images, and manages the creative pipeline. V1 uses a standalone persona (not character-driven). V2 may assign the stylist role to a character with personality from Fig.

## LLM Backend

- **Model:** HauhauCS/Qwen3.5-9B-Uncensored-HauhauCS-Aggressive (local)
- **Provider:** Registered with Bifrost as an LLM provider
- **Capabilities:** Text generation, vision (image evaluation), tool use
- **Content:** Uncensored — required for NSFW direction, body evaluation, and intimate pose composition

## System Prompt Skeleton

The system prompt has these sections (content to be authored with the uncensored model):

```
[ROLE]
You are a creative director and stylist working in a digital character development studio.
{persona_description — tone, aesthetic voice, how opinionated to be}

[KNOWLEDGE]
You work within Frame, a character asset manager. You have access to:
- Character profiles with physical attributes (identity, body, face, intimate anatomy)
- Era-specific variations (age ranges, developmental stages)
- A wardrobe catalog of garments
- A hairstyle catalog
- A library of LoRA style adapters
- A prompt composition engine that builds generation prompts from structured data
- Image generation via multiple workflows (SDXL, Flux, pose transfer)

[TASTE]
{taste_profile — the stylist's own aesthetic preferences}
{user_taste_profile — learned from accepted/rejected suggestions}

[TOOLS]
You have access to the following tools. Use them to act on the user's requests.
Always compose shots using the compose_shot tool rather than writing raw prompts.
When evaluating images, use the evaluate_image tool with specific criteria.
{tool_definitions}

[CONVERSATION STYLE]
{how to converse — when to suggest vs ask, how to handle creative disagreement,
how to escalate from SFW to NSFW naturally, how to describe bodies and poses}
```

## Shot Composition DSL

The `compose_shot` tool accepts a structured creative brief. Every field is optional — the stylist fills in what's relevant and the system applies defaults for the rest.

### Schema

```typescript
interface ShotComposition {
  // Subject
  character_id: string              // required — who
  era_id?: string                   // which age/developmental stage

  // Framing
  framing: 'extreme_closeup' | 'closeup' | 'headshot' | 'bust' | 'half_body' | 'three_quarter' | 'full_body' | 'wide'
  camera_angle: 'eye_level' | 'slightly_above' | 'slightly_below' | 'high_angle' | 'low_angle' | 'birds_eye' | 'worms_eye'
  camera_lens?: string              // "85mm f/1.8", "35mm wide", "macro"
  crop_focus?: string               // "face", "torso", "full figure", "hands", "detail"

  // Expression & Gaze
  expression: string                // "neutral with subtle warmth", "confident smirk", "vulnerable", "laughing candidly"
  eye_direction: 'camera' | 'away_left' | 'away_right' | 'down' | 'up' | 'closed'
  mouth?: string                    // "slightly parted", "closed smile", "open laugh", "biting lower lip"
  brow?: string                     // "relaxed", "raised", "furrowed", "one raised"
  head_tilt?: string                // "slight left", "chin down", "looking over shoulder"

  // Body & Pose
  pose: string                      // natural language: "standing with weight on left leg, right hand on hip"
  body_tension?: string             // "relaxed", "tense", "languid", "athletic"
  hand_position?: string            // "at sides", "in hair", "on hip", "touching face", "behind back"
  leg_position?: string             // "together", "crossed", "one forward", "spread shoulder-width"
  spine?: string                    // "straight", "slight S-curve", "arched", "curved forward"

  // NSFW Posing & Action
  // These fields are only used when content_rating is 'nsfw'
  intimate_action?: string          // explicit pose/action direction (authored with uncensored model)
  intimate_focus?: string           // what the composition emphasizes anatomically
  clothing_state?: string           // "fully clothed", "partially undressed", "nude", "specific garment removal"
  body_display?: string             // how the body is presented: "natural", "presented", "artistic", "explicit"

  // Wardrobe
  outfit?: {
    garment_ids?: string[]          // specific garments from wardrobe catalog
    description?: string            // or free-text: "white linen sundress, sandals"
    fit?: string                    // "loose", "fitted", "tight", "oversized"
    state?: string                  // "pristine", "rumpled", "wet", "partially removed"
  }

  // Hair & Makeup
  hairstyle_id?: string             // from hairstyle catalog
  hair_description?: string         // or free-text: "loose waves, tucked behind left ear"
  makeup?: string                   // "bare faced", "editorial smoky eye", "natural dewy", "bold red lip"

  // Scene & Environment
  setting: string                   // "studio, clean white cyclorama" or "rainy Paris street at night"
  lighting: string                  // "soft directional from 45°", "dramatic rim light", "golden hour backlight"
  atmosphere?: string               // "intimate", "clinical", "dreamy", "harsh", "moody"
  props?: string                    // "vintage armchair", "sheer curtain", "mirror"
  color_palette?: string            // "warm neutrals", "high contrast B&W", "desaturated teal"

  // Style & Technical
  lora?: {
    id?: string                     // existing LoRA from catalog
    name?: string                   // for reference if ID unknown
    strength?: number               // 0.0-1.5, default 0.7
  }
  aesthetic?: string                // "editorial", "fine art", "street", "fashion", "cinematic", "intimate"
  film_reference?: string           // "Peter Lindbergh", "Helmut Newton", "soft 35mm Kodak Portra"

  // Mood & Intent
  mood: string                      // the emotional quality: "quiet confidence", "raw vulnerability", "playful seduction"
  narrative?: string                // what story this image tells: "she just received unexpected news"

  // Content
  content_rating: 'sfw' | 'nsfw'

  // Generation Parameters
  workflow?: string                 // override: specific Bifrost workflow
  batch_size?: number               // how many variations to generate
}
```

### Example Compositions

**Editorial Headshot:**
```json
{
  "character_id": "elowen",
  "framing": "headshot",
  "camera_angle": "slightly_above",
  "camera_lens": "85mm f/1.8",
  "expression": "confident, self-assured, slight knowing smile",
  "eye_direction": "camera",
  "head_tilt": "slight right, chin slightly down",
  "setting": "studio, dark gradient background",
  "lighting": "single key light from camera left, strong rim from behind",
  "mood": "editorial power",
  "aesthetic": "fashion magazine cover",
  "lora": { "name": "film_grain_editorial", "strength": 0.5 },
  "content_rating": "sfw"
}
```

**Character in Wardrobe:**
```json
{
  "character_id": "elowen",
  "framing": "full_body",
  "camera_angle": "eye_level",
  "expression": "relaxed, natural, caught mid-stride",
  "eye_direction": "away_left",
  "pose": "walking, natural stride, one foot forward",
  "outfit": {
    "garment_ids": ["g_tailored_blazer", "g_silk_camisole"],
    "description": "tailored black blazer over ivory silk camisole, dark slim jeans, ankle boots",
    "fit": "fitted"
  },
  "hair_description": "loose waves, wind-caught",
  "makeup": "minimal, natural skin, subtle mascara",
  "setting": "cobblestone street, European city, late afternoon",
  "lighting": "golden hour side light, long shadows",
  "mood": "effortless sophistication",
  "content_rating": "sfw"
}
```

**Intimate/NSFW Direction:**
(Content to be authored with uncensored model — structure shown, not content)
```json
{
  "character_id": "elowen",
  "framing": "three_quarter",
  "camera_angle": "slightly_below",
  "expression": "...",
  "eye_direction": "camera",
  "pose": "...",
  "intimate_action": "...",
  "intimate_focus": "...",
  "clothing_state": "...",
  "body_display": "...",
  "setting": "...",
  "lighting": "soft diffused, warm",
  "mood": "...",
  "content_rating": "nsfw",
  "batch_size": 4
}
```

## Tool Definitions

### Character & Image Tools

| Tool | Input | Output | Purpose |
|------|-------|--------|---------|
| `get_character` | character_id | Character + Era data | Read physical attributes for shot planning |
| `get_images` | character_id, filters | Image list | Browse existing images to reference or evaluate |
| `evaluate_image` | image_id, criteria[] | Assessment per criterion | Vision-based image quality evaluation |
| `compare_images` | image_id_a, image_id_b, criteria | Winner + reasoning | Pick the better image for a purpose |
| `set_rating` | image_id, rating | Confirmation | Rate an image 1-5 |
| `set_ref_type` | image_id, ref_type | Confirmation | Promote to face/body/etc. reference |

### Creative Tools

| Tool | Input | Output | Purpose |
|------|-------|--------|---------|
| `compose_shot` | ShotComposition | Composed prompt + params | The main creative tool — structured shot → generation |
| `browse_wardrobe` | filters (category, aesthetic, etc.) | Garment list | Find outfit options |
| `browse_hairstyles` | filters (length, texture, etc.) | Hairstyle list | Find hair options |
| `browse_loras` | filters (category, style) | LoRA list | Find style options |

### Pipeline Tools

| Tool | Input | Output | Purpose |
|------|-------|--------|---------|
| `generate` | composed shot | Generation result (image IDs) | Trigger image generation |
| `define_lora_need` | name, description, reference_images, priority | LoRA request record | Log a needed LoRA that doesn't exist |
| `search_training_images` | tags, rating, character | Image list | Find images for LoRA training |
| `create_dataset` | name, image_ids, type | Dataset record | Build a training dataset |

### Evaluation Criteria

The `evaluate_image` tool accepts criteria from this vocabulary:

| Criterion | What It Assesses |
|-----------|-----------------|
| `identity_consistency` | Does the face match the character's references? |
| `attribute_accuracy` | Do physical attributes match the character sheet? |
| `pose_accuracy` | Does the pose match what was requested? |
| `expression_accuracy` | Does the expression match the brief? |
| `anatomical_correctness` | Proportions, hands, symmetry, physics |
| `lighting_quality` | Is the lighting as directed? Natural? Flattering? |
| `composition` | Framing, rule of thirds, visual weight |
| `outfit_accuracy` | Does the outfit match what was specified? |
| `skin_quality` | Texture, tone consistency, artifacts |
| `hair_accuracy` | Does the hair match the brief? Natural physics? |
| `mood_adherence` | Does the image feel like the requested mood? |
| `nsfw_accuracy` | Do intimate attributes match the character sheet? |
| `overall_quality` | Holistic assessment — would this go in the portfolio? |

Each criterion returns a 1-5 score with reasoning.

## Conversation Patterns

### Pattern 1: Creative Brief → Generation
```
User: "I want to see Elowen in something editorial"
Stylist: [get_character] → reads her attributes
Stylist: [browse_wardrobe] → finds editorial-appropriate garments
Stylist: "I'm thinking a tailored look — the black blazer over the silk cami,
         shot at three-quarter with strong directional lighting. She has the
         bone structure for dramatic side light. What's the mood — powerful
         or contemplative?"
User: "Powerful. Magazine cover energy."
Stylist: [compose_shot] → builds the brief
Stylist: [generate] → triggers generation
Stylist: "Generating 4 variations. The rim light should catch her jaw line
         beautifully with that angular definition."
```

### Pattern 2: Image Evaluation
```
User: "What do you think of these?" [shares 4 generated images]
Stylist: [evaluate_image] on each, criteria: identity, composition, mood
Stylist: "Image 2 is the strongest — the lighting is doing exactly what we
         wanted on her cheekbones, and her expression reads as confident
         without being aggressive. Image 4 has a hand artifact. Images 1
         and 3 are fine technically but the expression is too neutral for
         'magazine cover energy.' I'd rate #2 a 5 and promote it to a
         face reference. Want me to?"
```

### Pattern 3: NSFW Direction
```
User: "Let's develop her nude reference set"
Stylist: [get_character] → reads NSFW physical attributes
Stylist: "Based on her build and proportions, I'd start with [...]"
(Authored with uncensored model — the stylist discusses anatomy,
 poses, and composition naturally and professionally)
```

### Pattern 4: LoRA Discovery
```
Stylist: "I keep wanting a soft grain look for Elowen's editorial work
         but none of the existing LoRAs quite nail it. The closest is
         film_grain but it's too heavy. Want me to flag a new LoRA need?"
User: "Yeah, do it"
Stylist: [define_lora_need] → logs the request with reference images
Stylist: [search_training_images] → "I found 12 images that have the
         quality we're after. Want me to build a training dataset?"
```

## What Needs Authoring with the Uncensored Model

1. **System prompt persona** — the stylist's voice, creative philosophy, how she talks about bodies and aesthetics
2. **Taste profile** — specific aesthetic preferences (lighting styles, color palettes, composition preferences, what she finds beautiful)
3. **NSFW vocabulary** — how the stylist directs intimate poses, discusses anatomy, evaluates NSFW images. Professional but not clinical — creative director language, not medical language.
4. **`intimate_action` examples** — the vocabulary for the ShotComposition DSL's NSFW fields
5. **Evaluation language** — how the stylist describes what's working and what isn't in an image, including NSFW content
6. **Conversation tone** — how opinionated, how the stylist pushes back on ideas she disagrees with, how she introduces her own suggestions

## Integration Points

### Frame ↔ Stylist
- Stylist sessions stored in `pkg/stylist/` (file-based, already exists)
- Messages include tool calls and results
- Stylist UI is the drawer component (already exists at `ui/src/components/stylist-drawer.tsx`)

### Stylist ↔ Bifrost
- LLM calls via Bifrost's LLM provider (Qwen endpoint)
- Image generation via Bifrost's image providers
- Vision evaluation via the LLM's vision capability

### Stylist ↔ Prompts Package
- `compose_shot` maps to `prompts.ComposeForJob()` for the structured parts
- Free-text fields (expression, pose description, intimate_action) become action block content
- LoRA selection maps to the style block
