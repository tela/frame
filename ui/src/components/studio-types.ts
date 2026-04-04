import type { Character, EraWithStats, Workflow, Tier, ContentRating } from '@/lib/types'
export type { Workflow, Tier, ContentRating }

export type StudioMode = 'generate' | 'refine' | 'process' | 'video'
export type StudioIntent = 'headshot' | 'consistent' | 'portrait' | 'full_body' | 'full_body_nude' | 'remix' | 'upscale' | 'clothing_swap'

export interface IntentConfig {
  mode: StudioMode
  workflow: Workflow
  contentRating: ContentRating
  includeRefs: boolean
  promptSuffix: string
  needsSource: boolean
  denoise?: number
}

export interface GeneratedImage {
  id: string
  url: string
  seed: number
  prompt: string
  timestamp: string
  status: 'generating' | 'complete'
  isVideo?: boolean
}

// Job category → Studio mode mapping
export const JOB_MODE_MAP: Record<string, StudioMode> = {
  identity: 'generate',
  physicality: 'generate',
  outfit: 'generate',
  detail: 'generate',
  wardrobe: 'refine',
  refine: 'refine',
  video: 'generate',
  artistic: 'process',
}

export const JOB_CATEGORY_LABELS: Record<string, string> = {
  identity: 'Identity',
  physicality: 'Physicality',
  outfit: 'Standard Outfits',
  detail: 'Detail Shots',
  wardrobe: 'Wardrobe',
  refine: 'Refinement',
  video: 'Video',
  artistic: 'Artistic',
}

export const JOB_CATEGORY_ORDER = ['identity', 'physicality', 'outfit', 'detail', 'wardrobe', 'refine', 'video', 'artistic']

export const WORKFLOWS: { value: Workflow; label: string; description: string }[] = [
  { value: 'text-to-image', label: 'Flux Text-to-Image', description: 'Fast SFW headshots via Flux (~3s)' },
  { value: 'sdxl_text2img', label: 'SDXL Text-to-Image', description: 'SFW/NSFW from prompt (~45s)' },
  { value: 'sdxl_character_gen', label: 'Character Gen (single ref)', description: 'Consistent character from one reference (~108s)' },
  { value: 'sdxl_multi_ref', label: 'Character Gen (multi ref)', description: 'Consistent character from multiple refs (~94s)' },
  { value: 'sdxl_clothing_swap', label: 'Clothing Swap', description: 'Undress or swap clothing (~213s)' },
  { value: 'sdxl_pose_transfer', label: 'Pose Transfer', description: 'Apply pose to character (~114s)' },
  { value: 'sdxl_img2img', label: 'Image Refinement', description: 'Refine an existing image (~63s)' },
  { value: 'sdxl_quality_postprocess', label: 'Quality Upscale', description: 'Upscale + enhance detail (~648s)' },
  { value: 'kontext', label: 'Flux Kontext', description: 'Prompt-based image editing (~3s)' },
  { value: 'video_img2vid', label: 'Image to Video', description: 'Generate video clip from image (~30-60s)' },
]

export const TIERS: { value: Tier; label: string }[] = [
  { value: 'cheap', label: 'Lo' },
  { value: 'complex', label: 'Mid' },
  { value: 'frontier', label: 'Hi' },
]

export const DIMENSIONS: { label: string; w: number; h: number }[] = [
  { label: 'Portrait', w: 768, h: 1024 },
  { label: 'Square', w: 1024, h: 1024 },
  { label: 'Landscape', w: 1024, h: 768 },
]

export const BATCH_SIZES = [1, 2, 4, 8]

export const GENERATE_WORKFLOWS: Workflow[] = ['text-to-image', 'sdxl_text2img', 'sdxl_character_gen', 'sdxl_multi_ref', 'sdxl_pose_transfer']
export const REFINE_WORKFLOWS: Workflow[] = ['sdxl_img2img', 'sdxl_clothing_swap', 'kontext']
export const PROCESS_WORKFLOWS: Workflow[] = ['sdxl_quality_postprocess']
export const VIDEO_WORKFLOWS: Workflow[] = ['video_img2vid']

export const CAMERA_MOTIONS = [
  { value: 'static', label: 'Static' },
  { value: 'pan_left', label: 'Slow Pan Left' },
  { value: 'pan_right', label: 'Slow Pan Right' },
  { value: 'dolly_in', label: 'Dolly In' },
  { value: 'dolly_out', label: 'Dolly Out' },
  { value: 'orbit', label: 'Orbit' },
  { value: 'drift', label: 'Gentle Drift' },
]

export const VIDEO_DURATIONS = ['3s', '4s', '5s']

export function defaultWorkflowForMode(mode: StudioMode): Workflow {
  if (mode === 'video') return 'video_img2vid'
  if (mode === 'refine') return 'sdxl_img2img'
  if (mode === 'process') return 'sdxl_quality_postprocess'
  return 'text-to-image'
}

export function workflowsForMode(mode: StudioMode) {
  const allowed = mode === 'video' ? VIDEO_WORKFLOWS : mode === 'refine' ? REFINE_WORKFLOWS : mode === 'process' ? PROCESS_WORKFLOWS : GENERATE_WORKFLOWS
  return WORKFLOWS.filter(w => allowed.includes(w.value))
}

export const INTENT_CONFIGS: Record<StudioIntent, IntentConfig> = {
  headshot: {
    mode: 'generate',
    workflow: 'text-to-image',
    contentRating: 'sfw',
    includeRefs: false,
    promptSuffix: ', front-facing headshot, neutral expression, studio lighting, portrait photography',
    needsSource: false,
  },
  consistent: {
    mode: 'generate',
    workflow: 'sdxl_character_gen',
    contentRating: 'sfw',
    includeRefs: true,
    promptSuffix: '',
    needsSource: false,
  },
  portrait: {
    mode: 'generate',
    workflow: 'sdxl_character_gen',
    contentRating: 'sfw',
    includeRefs: true,
    promptSuffix: ', three-quarter portrait, soft natural lighting, elegant',
    needsSource: false,
  },
  full_body: {
    mode: 'generate',
    workflow: 'sdxl_character_gen',
    contentRating: 'sfw',
    includeRefs: true,
    promptSuffix: ', full body standing pose, clean studio background, professional photography',
    needsSource: false,
  },
  full_body_nude: {
    mode: 'generate',
    workflow: 'sdxl_character_gen',
    contentRating: 'nsfw',
    includeRefs: true,
    promptSuffix: ', full body nude standing, clean studio background, professional photography',
    needsSource: false,
  },
  remix: {
    mode: 'refine',
    workflow: 'sdxl_img2img',
    contentRating: 'sfw',
    includeRefs: true,
    promptSuffix: '',
    needsSource: true,
    denoise: 0.35,
  },
  upscale: {
    mode: 'process',
    workflow: 'sdxl_quality_postprocess',
    contentRating: 'sfw',
    includeRefs: false,
    promptSuffix: '',
    needsSource: true,
  },
  clothing_swap: {
    mode: 'refine',
    workflow: 'sdxl_clothing_swap',
    contentRating: 'nsfw',
    includeRefs: true,
    promptSuffix: '',
    needsSource: true,
  },
}

// Intent → job name mapping for compose endpoint
export const INTENT_JOB_MAP: Record<string, string> = {
  headshot: 'headshot_neutral',
  portrait: 'three_quarter_portrait',
  full_body: 'full_body_standing',
  full_body_nude: 'nude_front_standing',
  remix: 'refine_subtle',
  clothing_swap: 'refine_undress',
}

// Fallback identity prompt when compose endpoint isn't used
export function buildIdentityFallback(character: Character & { eras?: EraWithStats[] }, era?: EraWithStats): string {
  const parts: string[] = []
  if (character.gender) parts.push(character.gender)
  if (character.ethnicity) parts.push(character.ethnicity)
  parts.push('person')
  if (era?.age_range) parts.push(`age ${era.age_range}`)
  if (character.eye_color) parts.push(`${character.eye_color} eyes`)
  const hairColor = era?.hair_color || character.natural_hair_color
  const hairTexture = character.natural_hair_texture
  const hairLength = era?.hair_length
  const hairParts: string[] = []
  if (hairLength) hairParts.push(hairLength)
  if (hairTexture && hairTexture !== 'shaven') hairParts.push(hairTexture)
  if (hairColor) hairParts.push(hairColor)
  if (hairParts.length > 0) parts.push(`${hairParts.join(' ')} hair`)
  if (hairTexture === 'shaven') parts.push('shaved head')
  if (character.skin_tone) parts.push(`${character.skin_tone} skin`)
  if (character.distinguishing_features) parts.push(character.distinguishing_features)
  return parts.join(', ')
}
