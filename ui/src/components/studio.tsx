import { useParams, useSearch } from '@tanstack/react-router'
import { useCharacter, useGenerate, useBifrostStatus, useLoras, useDeleteCharacterImage, useToggleFavorite, useImageTags, thumbUrl, imageUrl } from '@/lib/api'
import type { LoRA } from '@/lib/api'
import { useState, useEffect, useRef } from 'react'
import { ImagePickerModal } from '@/components/image-picker-modal'
import { TagPicker } from '@/components/tag-picker'
import { Lightbox } from '@/components/lightbox'
import type { Character, EraWithStats } from '@/lib/types'

type Workflow = 'text-to-image' | 'sdxl_text2img' | 'sdxl_character_gen' | 'sdxl_multi_ref' | 'sdxl_clothing_swap' | 'sdxl_pose_transfer' | 'sdxl_img2img' | 'sdxl_quality_postprocess' | 'kontext'
type Tier = 'cheap' | 'complex' | 'frontier'
type ContentRating = 'sfw' | 'nsfw'

interface PromptTemplate {
  value: string
  label: string
  prompt: string
  negative: string
}

const TEMPLATES: PromptTemplate[] = [
  { value: '', label: 'Custom', prompt: '', negative: '' },
  {
    value: 'headshot',
    label: 'Headshot',
    prompt: 'professional headshot portrait, soft studio lighting, shallow depth of field, neutral background, sharp focus on eyes, natural expression',
    negative: 'full body, hands, deformed, blurry, low quality, watermark, text',
  },
  {
    value: 'headshot_editorial',
    label: 'Headshot — Editorial',
    prompt: 'editorial headshot portrait, dramatic side lighting, high contrast, moody atmosphere, confident expression, fashion magazine quality',
    negative: 'full body, hands, deformed, blurry, low quality, watermark, text, flat lighting',
  },
  {
    value: 'portrait_half',
    label: 'Half-Body Portrait',
    prompt: 'half-body portrait from waist up, natural lighting, clean composition, relaxed pose, detailed skin texture',
    negative: 'full body, legs, deformed, blurry, low quality, watermark, text',
  },
  {
    value: 'full_body',
    label: 'Full Body',
    prompt: 'full body portrait, standing pose, even studio lighting, full figure visible head to toe, clean background',
    negative: 'cropped, cut off, deformed, blurry, low quality, watermark, text',
  },
  {
    value: 'detail_face',
    label: 'Detail — Face Close-up',
    prompt: 'extreme close-up face portrait, macro detail, sharp focus on skin texture and eyes, soft diffused lighting',
    negative: 'full body, hands, deformed, blurry, low quality, watermark, text',
  },
]

const WORKFLOWS: { value: Workflow; label: string; description: string }[] = [
  { value: 'text-to-image', label: 'Flux Text-to-Image', description: 'Fast SFW headshots via Flux (~3s)' },
  { value: 'sdxl_text2img', label: 'SDXL Text-to-Image', description: 'SFW/NSFW from prompt (~45s)' },
  { value: 'sdxl_character_gen', label: 'Character Gen (single ref)', description: 'Consistent character from one reference (~108s)' },
  { value: 'sdxl_multi_ref', label: 'Character Gen (multi ref)', description: 'Consistent character from multiple refs (~94s)' },
  { value: 'sdxl_clothing_swap', label: 'Clothing Swap', description: 'Undress or swap clothing (~213s)' },
  { value: 'sdxl_pose_transfer', label: 'Pose Transfer', description: 'Apply pose to character (~114s)' },
  { value: 'sdxl_img2img', label: 'Image Refinement', description: 'Refine an existing image (~63s)' },
  { value: 'sdxl_quality_postprocess', label: 'Quality Upscale', description: 'Upscale + enhance detail (~648s)' },
  { value: 'kontext', label: 'Flux Kontext', description: 'Prompt-based image editing (~3s)' },
]

const TIERS: { value: Tier; label: string }[] = [
  { value: 'cheap', label: 'Lo' },
  { value: 'complex', label: 'Mid' },
  { value: 'frontier', label: 'Hi' },
]

const DIMENSIONS: { label: string; w: number; h: number }[] = [
  { label: 'Portrait', w: 768, h: 1024 },
  { label: 'Square', w: 1024, h: 1024 },
  { label: 'Landscape', w: 1024, h: 768 },
]

const BATCH_SIZES = [1, 2, 4, 8]

interface GeneratedImage {
  id: string
  url: string
  seed: number
  prompt: string
  timestamp: string
  status: 'generating' | 'complete'
}

function buildCharacterPrompt(character: Character & { eras?: EraWithStats[] }, era?: EraWithStats): string {
  const parts: string[] = []

  // Core identity
  if (character.gender) parts.push(character.gender)
  if (character.ethnicity) parts.push(character.ethnicity)
  parts.push('person')

  // Age from era
  if (era?.age_range) parts.push(`age ${era.age_range}`)

  // Eyes
  if (character.eye_color) parts.push(`${character.eye_color} eyes`)

  // Hair — prefer era-level color/length, fall back to character-level
  const hairColor = era?.hair_color || character.natural_hair_color
  const hairTexture = character.natural_hair_texture
  const hairLength = era?.hair_length
  const hairParts: string[] = []
  if (hairColor) hairParts.push(hairColor)
  if (hairLength) hairParts.push(hairLength)
  if (hairTexture && hairTexture !== 'shaven') hairParts.push(hairTexture)
  if (hairParts.length > 0) {
    parts.push(`${hairParts.join(' ')} hair`)
  }
  if (hairTexture === 'shaven') parts.push('shaved head')

  // Build / body
  if (era?.build) parts.push(`${era.build} build`)
  if (era?.height_cm) parts.push(`${era.height_cm}cm tall`)

  // Face details
  if (era?.face_shape) parts.push(`${era.face_shape} face`)
  if (era?.jaw_definition) parts.push(`${era.jaw_definition} jaw`)

  // Skin
  if (character.skin_tone) parts.push(`${character.skin_tone} skin`)
  if (era?.skin_texture) parts.push(`${era.skin_texture} skin texture`)

  // Distinguishing features
  if (character.distinguishing_features) parts.push(character.distinguishing_features)

  return parts.join(', ')
}

// Studio modes
type StudioMode = 'generate' | 'refine' | 'process'

// Intent presets map user actions to Studio configuration
type StudioIntent = 'headshot' | 'consistent' | 'portrait' | 'full_body' | 'full_body_nude' | 'remix' | 'upscale' | 'clothing_swap'

interface IntentConfig {
  mode: StudioMode
  workflow: Workflow
  contentRating: ContentRating
  includeRefs: boolean
  promptSuffix: string
  needsSource: boolean
  denoise?: number
}

const GENERATE_WORKFLOWS: Workflow[] = ['text-to-image', 'sdxl_text2img', 'sdxl_character_gen', 'sdxl_multi_ref']
const REFINE_WORKFLOWS: Workflow[] = ['sdxl_img2img', 'sdxl_clothing_swap', 'sdxl_pose_transfer', 'kontext']
const PROCESS_WORKFLOWS: Workflow[] = ['sdxl_quality_postprocess']


function defaultWorkflowForMode(mode: StudioMode): Workflow {
  if (mode === 'refine') return 'sdxl_img2img'
  if (mode === 'process') return 'sdxl_quality_postprocess'
  return 'text-to-image'
}

function workflowsForMode(mode: StudioMode) {
  const allowed = mode === 'refine' ? REFINE_WORKFLOWS : mode === 'process' ? PROCESS_WORKFLOWS : GENERATE_WORKFLOWS
  return WORKFLOWS.filter(w => allowed.includes(w.value))
}

const INTENT_CONFIGS: Record<StudioIntent, IntentConfig> = {
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

export function Studio() {
  const { characterId, eraId } = useParams({ from: '/characters/$characterId/eras/$eraId/studio' })
  const { intent: intentParam, source: sourceParam } = useSearch({ from: '/characters/$characterId/eras/$eraId/studio' })
  const { data: character } = useCharacter(characterId)
  const { data: bifrostStatus } = useBifrostStatus()
  const { data: loras } = useLoras()
  const generate = useGenerate()
  const deleteImage = useDeleteCharacterImage()
  const toggleFavorite = useToggleFavorite()

  const [mode, setMode] = useState<StudioMode>(sourceParam ? 'refine' : 'generate')
  const [template, setTemplate] = useState('')
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [workflow, setWorkflow] = useState<Workflow>(sourceParam ? 'sdxl_img2img' : 'text-to-image')
  const [tier, setTier] = useState<Tier>('cheap')
  const [contentRating, setContentRating] = useState<ContentRating>('sfw')
  const [dimensions, setDimensions] = useState(0) // index into DIMENSIONS
  const [batchSize, setBatchSize] = useState(1)
  const [steps, setSteps] = useState(30)
  const [selectedLora, setSelectedLora] = useState<string>('')
  const [loraStrength, setLoraStrength] = useState(0.7)
  const [denoiseStrength, setDenoiseStrength] = useState(0.6)
  const [showParams, setShowParams] = useState(false)
  const [sessionImages, setSessionImages] = useState<GeneratedImage[]>([])
  const [panelOpen, setPanelOpen] = useState(true)
  const [lightboxId, setLightboxId] = useState<string | null>(null)
  const [showRefPicker, setShowRefPicker] = useState(false)
  const [showSourcePicker, setShowSourcePicker] = useState(false)
  const [selectedRefs, setSelectedRefs] = useState<string[]>([])
  const [sourceImageId, setSourceImageId] = useState<string>(sourceParam || '')
  const [includeEraRefs, setIncludeEraRefs] = useState(true)
  const activeIntent = intentParam || ''

  const era = character?.eras.find((e) => e.id === eraId)
  const bifrostAvailable = bifrostStatus?.available ?? false
  const intentApplied = useRef(false)

  // Apply intent configuration on first load
  useEffect(() => {
    if (intentApplied.current || !character) return
    intentApplied.current = true

    const intent = intentParam as StudioIntent | undefined
    const config = intent ? INTENT_CONFIGS[intent] : undefined

    if (config) {
      setMode(config.mode)
      setWorkflow(config.workflow)
      setContentRating(config.contentRating)
      setIncludeEraRefs(config.includeRefs)
      if (config.denoise != null) setDenoiseStrength(config.denoise)
      if (sourceParam) setSourceImageId(sourceParam)

      // Build prompt from character + intent suffix
      const charPrompt = buildCharacterPrompt(character, era)
      setPrompt(charPrompt + config.promptSuffix)
    } else {
      // No intent — just populate character prompt
      setPrompt(buildCharacterPrompt(character, era))
      if (sourceParam) {
        setSourceImageId(sourceParam)
        setMode('refine')
        setWorkflow('sdxl_img2img')
      }
    }
  }, [character, era]) // eslint-disable-line react-hooks/exhaustive-deps
  const dim = DIMENSIONS[dimensions]
  const activeLora = (loras ?? []).find((l: LoRA) => l.id === selectedLora)
  const needsSource = mode === 'refine' || mode === 'process'
  const needsRefs = ['sdxl_multi_ref', 'sdxl_character_gen'].includes(workflow)
  const availableWorkflows = workflowsForMode(mode)

  const handleModeChange = (newMode: StudioMode) => {
    setMode(newMode)
    setWorkflow(defaultWorkflowForMode(newMode))
  }

  const handleRefineImage = (imageId: string) => {
    setMode('refine')
    setWorkflow('sdxl_img2img')
    setSourceImageId(imageId)
    setDenoiseStrength(0.6)
  }

  const handleGenerate = () => {
    if (!prompt.trim()) return

    const placeholders: GeneratedImage[] = Array.from({ length: batchSize }, () => ({
      id: crypto.randomUUID(),
      url: '',
      seed: Math.floor(Math.random() * 100000),
      prompt: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'generating' as const,
    }))
    setSessionImages((prev) => [...placeholders.reverse(), ...prev])

    generate.mutate(
      {
        character_id: characterId,
        era_id: eraId,
        prompt: prompt,
        negative_prompt: negativePrompt || undefined,
        workflow: workflow,
        include_refs: includeEraRefs && (workflow === 'sdxl_multi_ref' || workflow === 'sdxl_character_gen'),
        ref_image_ids: selectedRefs.length > 0 ? selectedRefs : undefined,
        batch_size: batchSize,
        width: dim.w,
        height: dim.h,
        steps: steps,
        content_rating: contentRating,
        lora_adapter: activeLora?.filename || undefined,
        lora_strength: activeLora ? loraStrength : undefined,
        source_image_id: needsSource ? sourceImageId || undefined : undefined,
        denoise_strength: workflow === 'sdxl_img2img' ? denoiseStrength : undefined,
      },
      {
        onSuccess: (data) => {
          setSessionImages((prev) => {
            const updated = [...prev]
            for (let i = 0; i < data.images.length; i++) {
              const placeholderIdx = updated.findIndex((img) => img.status === 'generating')
              if (placeholderIdx >= 0) {
                updated[placeholderIdx] = {
                  ...updated[placeholderIdx],
                  id: data.images[i].image_id,
                  url: imageUrl(data.images[i].image_id),
                  status: 'complete',
                }
              }
            }
            return updated
          })
        },
        onError: () => {
          setSessionImages((prev) => prev.filter((img) => img.status !== 'generating'))
        },
      }
    )
  }

  return (
    <div className="flex h-full">
      {/* Collapse Toggle */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="flex-shrink-0 w-12 border-r border-border-subtle bg-background flex flex-col items-center pt-6 gap-3 hover:bg-surface transition-colors"
          title="Show studio panel"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted [writing-mode:vertical-lr]">Studio</span>
        </button>
      )}

      {/* Configuration Panel (Left) */}
      <aside className={`w-[480px] flex-shrink-0 border-r border-border-subtle bg-background flex flex-col ${panelOpen ? '' : 'hidden'}`}>
        <div className="px-8 py-6 border-b border-border-subtle flex items-start justify-between">
          <div>
            <h2 className="font-display text-3xl tracking-display">Studio</h2>
            <p className="text-muted text-sm mt-1">
              {character?.display_name || character?.name}{era ? ` — ${era.label}` : ''}
            </p>
            {activeIntent && (
              <span className="inline-block mt-2 bg-on-surface text-background text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                {activeIntent.replace('_', ' ')}
              </span>
            )}
            {!bifrostAvailable && (
              <p className="text-accent text-xs mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">warning</span>
                Bifrost unavailable — generation disabled
              </p>
            )}
          </div>
          <button
            onClick={() => setPanelOpen(false)}
            className="text-muted hover:text-primary transition-colors mt-1"
            title="Collapse panel"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-border-subtle">
          {([
            { value: 'generate' as StudioMode, label: 'Generate', icon: 'auto_awesome' },
            { value: 'refine' as StudioMode, label: 'Refine', icon: 'tune' },
            { value: 'process' as StudioMode, label: 'Process', icon: 'construction' },
          ]).map((m) => (
            <button
              key={m.value}
              onClick={() => handleModeChange(m.value)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] uppercase tracking-widest font-bold transition-colors ${
                mode === m.value
                  ? 'text-on-surface border-b-2 border-on-surface'
                  : 'text-muted hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
          {/* Workflow Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted">Workflow</label>
            <div className="relative">
              <select
                value={workflow}
                onChange={(e) => setWorkflow(e.target.value as Workflow)}
                className="w-full appearance-none bg-transparent border border-border-subtle py-2.5 px-3 text-sm focus:outline-none focus:border-primary cursor-pointer"
              >
                {availableWorkflows.map((w) => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-[18px]">expand_more</span>
            </div>
            <p className="text-[11px] text-muted">{WORKFLOWS.find((w) => w.value === workflow)?.description}</p>
          </div>

          {/* Content Rating + Quality */}
          <div className="flex gap-4 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted">Content</label>
              <div className="flex">
                {(['sfw', 'nsfw'] as const).map((cr) => (
                  <button
                    key={cr}
                    onClick={() => setContentRating(cr)}
                    className={`w-16 py-2 text-[11px] uppercase font-bold tracking-[0.1em] border transition-colors ${
                      contentRating === cr
                        ? cr === 'nsfw' ? 'bg-accent text-white border-accent' : 'bg-on-surface text-background border-on-surface'
                        : 'bg-transparent text-muted border-border-subtle hover:border-on-surface'
                    }`}
                  >
                    {cr}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted">Quality</label>
              <div className="flex">
                {TIERS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTier(t.value)}
                    className={`w-14 py-2 text-[11px] uppercase font-bold tracking-[0.1em] border transition-colors ${
                      tier === t.value
                        ? 'bg-on-surface text-background border-on-surface'
                        : 'bg-transparent text-muted border-border-subtle hover:border-on-surface'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Template — Generate mode only */}
          {mode === 'generate' && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted">Template</label>
              <div className="relative">
                <select
                  value={template}
                  onChange={(e) => {
                    const t = TEMPLATES.find((t) => t.value === e.target.value)
                    setTemplate(e.target.value)
                    if (t && t.value) {
                      const prefix = era?.prompt_prefix ? `${era.prompt_prefix}, ` : ''
                      setPrompt(prefix + t.prompt)
                      setNegativePrompt(t.negative)
                    }
                  }}
                  className="w-full appearance-none bg-transparent border border-border-subtle py-2.5 px-3 text-sm focus:outline-none focus:border-primary cursor-pointer"
                >
                  {TEMPLATES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-[18px]">expand_more</span>
              </div>
            </div>
          )}

          {/* Source Image (for refine/process modes) */}
          {needsSource && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted">Source Image</label>
              {sourceImageId ? (
                <div className="relative w-20 h-20 border border-border-subtle overflow-hidden group">
                  <img src={thumbUrl(sourceImageId)} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setSourceImageId('')}
                    className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-white text-[14px]">close</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSourcePicker(true)}
                  className="border border-dashed border-border-subtle text-muted text-[12px] py-3 px-3 hover:border-primary hover:text-primary transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
                  Select source image
                </button>
              )}
              {workflow === 'sdxl_img2img' && (
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] text-muted">
                    <span>Denoise Strength</span>
                    <span className="tabular-nums">{denoiseStrength.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    value={denoiseStrength}
                    onChange={(e) => setDenoiseStrength(parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              )}
            </div>
          )}

          {/* Reference Images (generate mode with character_gen workflows) */}
          {mode === 'generate' && needsRefs && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted">References</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEraRefs}
                  onChange={(e) => setIncludeEraRefs(e.target.checked)}
                  className="rounded border-border-subtle text-primary focus:ring-primary"
                />
                <span className="text-muted text-[13px]">Include era reference package</span>
              </label>
              {selectedRefs.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedRefs.map((refId) => (
                    <div key={refId} className="relative w-10 h-10 border border-border-subtle overflow-hidden group">
                      <img src={thumbUrl(refId)} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setSelectedRefs((prev) => prev.filter((id) => id !== refId))}
                        className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-white text-[14px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowRefPicker(true)}
                className="border border-dashed border-border-subtle text-muted text-[12px] py-2 px-3 hover:border-primary hover:text-primary transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
                {selectedRefs.length > 0 ? `${selectedRefs.length} custom refs` : 'Select custom references'}
              </button>
            </div>
          )}

          {/* LoRA Selector — not in process mode */}
          {mode !== 'process' && (
            <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted">LoRA Adapter</label>
            <div className="relative">
              <select
                value={selectedLora}
                onChange={(e) => {
                  setSelectedLora(e.target.value)
                  const l = (loras ?? []).find((l: LoRA) => l.id === e.target.value)
                  if (l) setLoraStrength(l.recommended_strength)
                }}
                className="w-full appearance-none bg-transparent border border-border-subtle py-2.5 px-3 text-sm focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="">None</option>
                {(loras ?? []).filter((l: LoRA, i: number, arr: LoRA[]) => arr.findIndex(x => x.name === l.name) === i).map((l: LoRA) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.content_rating === 'nsfw' ? '(NSFW)' : ''}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-[18px]">expand_more</span>
            </div>
            {selectedLora && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] text-muted">
                  <span>Strength</span>
                  <span className="tabular-nums">{loraStrength.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={loraStrength}
                  onChange={(e) => setLoraStrength(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            )}
          </div>
          )}

          {/* Prompt + Negative — not in process mode */}
          {mode !== 'process' && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted flex justify-between">
                  Prompt
                  <span className="tracking-normal lowercase tabular-nums">{prompt.length}/1000</span>
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full h-[140px] resize-none bg-surface border border-border-subtle p-3 font-body text-sm leading-relaxed text-primary focus:outline-none focus:border-primary placeholder:text-muted/50"
                  placeholder="Describe the subject, environment, lighting..."
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted">Negative Prompt</label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  className="w-full h-[60px] resize-none bg-surface border border-border-subtle p-3 font-body text-sm leading-relaxed text-primary focus:outline-none focus:border-primary placeholder:text-muted/50"
                  placeholder="What to exclude..."
                />
              </div>
            </>
          )}

          {/* Process mode — simple operation description */}
          {mode === 'process' && (
            <div className="bg-surface-low p-4">
              <p className="text-sm text-primary-dim">
                Process mode applies non-creative transforms to an existing image. Select a source image above, then click Process to enhance.
              </p>
            </div>
          )}

          {/* Parameters */}
          <div className="border-t border-border-subtle pt-4">
            <button
              onClick={() => setShowParams(!showParams)}
              className="flex items-center justify-between w-full text-[11px] uppercase tracking-[0.1em] font-bold text-muted hover:text-primary transition-colors"
            >
              Parameters
              <span className={`material-symbols-outlined text-[18px] transition-transform ${showParams ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            {showParams && (
              <div className="mt-4 flex flex-col gap-4">
                {/* Dimensions */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] text-muted">Dimensions</span>
                  <div className="flex gap-2">
                    {DIMENSIONS.map((d, i) => (
                      <button
                        key={d.label}
                        onClick={() => setDimensions(i)}
                        className={`flex-1 py-1.5 text-[11px] uppercase font-bold border transition-colors ${
                          dimensions === i ? 'bg-on-surface text-background border-on-surface' : 'text-muted border-border-subtle hover:border-on-surface'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-muted tabular-nums">{dim.w} x {dim.h}</span>
                </div>

                {/* Batch Size */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] text-muted">Batch Size</span>
                  <div className="flex gap-2">
                    {BATCH_SIZES.map((bs) => (
                      <button
                        key={bs}
                        onClick={() => setBatchSize(bs)}
                        className={`w-10 py-1.5 text-[11px] font-bold border transition-colors ${
                          batchSize === bs ? 'bg-on-surface text-background border-on-surface' : 'text-muted border-border-subtle hover:border-on-surface'
                        }`}
                      >
                        {bs}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Steps */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] text-muted">
                    <span>Steps</span>
                    <span className="tabular-nums">{steps}</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={50}
                    step={5}
                    value={steps}
                    onChange={(e) => setSteps(parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Generate Button */}
        <div className="p-8 border-t border-border-subtle bg-surface/50">
          <button
            onClick={handleGenerate}
            disabled={!bifrostAvailable || (mode !== 'process' && !prompt.trim()) || generate.isPending || (needsSource && !sourceImageId) || (mode === 'generate' && needsRefs && !includeEraRefs && selectedRefs.length === 0)}
            className="w-full bg-accent text-white py-4 font-medium tracking-ui hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {mode === 'generate' ? 'auto_awesome' : mode === 'refine' ? 'tune' : 'construction'}
            </span>
            {generate.isPending ? 'Processing...' :
              mode === 'generate' ? `Generate${batchSize > 1 ? ` (${batchSize})` : ''}` :
              mode === 'refine' ? 'Refine' : 'Process'}
          </button>
        </div>
      </aside>

      {/* Preview & History Area (Right) */}
      <section className="flex-1 flex flex-col bg-surface overflow-hidden relative">
        <div className="h-[73px] border-b border-border-subtle bg-background flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Session History</span>
            <span className="text-xs text-muted bg-surface px-2 py-1 border border-border-subtle">
              {sessionImages.length} Items
            </span>
          </div>
          <button
            onClick={() => setSessionImages([])}
            className="text-[11px] uppercase tracking-[0.1em] font-bold border border-border-subtle px-4 py-2 hover:bg-surface transition-colors"
          >
            Clear Session
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {sessionImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted gap-4">
              <span className="material-symbols-outlined text-[48px]">auto_awesome</span>
              <p className="text-sm">Generated images will appear here</p>
            </div>
          ) : (
            <div className={`grid gap-6 ${
              sessionImages.length === 1 ? 'grid-cols-1 max-w-[500px] mx-auto' :
              sessionImages.length <= 4 ? 'grid-cols-2' :
              'grid-cols-2 xl:grid-cols-3'
            }`}>
              {sessionImages.map((img) => (
                <div key={img.id} className="aspect-[3/4] relative overflow-hidden border border-border-subtle group cursor-pointer bg-background">
                  {img.status === 'generating' ? (
                    <>
                      <div className="absolute inset-0 bg-muted/10 backdrop-blur-md" />
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-background overflow-hidden">
                        <div className="h-full w-full bg-accent" style={{ animation: 'progress 2s infinite linear' }} />
                      </div>
                      <div className="relative z-10 flex flex-col items-center justify-center h-full text-muted gap-3">
                        <span className="material-symbols-outlined text-[32px] animate-pulse">model_training</span>
                        <span className="text-xs uppercase tracking-[0.15em] animate-pulse">Processing...</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <img
                        alt="Generated image"
                        className="w-full h-full object-cover cursor-pointer"
                        src={img.url}
                        onClick={() => setLightboxId(img.id)}
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              deleteImage.mutate({ characterId, imageId: img.id })
                              setSessionImages(prev => prev.filter(s => s.id !== img.id))
                            }}
                            className="bg-background/90 text-primary p-1.5 hover:text-accent transition-colors"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                          <button
                            onClick={() => toggleFavorite.mutate({ characterId, imageId: img.id, favorited: true })}
                            className="bg-accent/90 text-white p-1.5 hover:bg-accent transition-colors"
                            title="Favorite"
                          >
                            <span className="material-symbols-outlined text-[18px]">favorite</span>
                          </button>
                          <SessionImageTagButton imageId={img.id} />
                        </div>
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleRefineImage(img.id)}
                            className="px-4 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-on-surface text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-colors"
                          >
                            Refine
                          </button>
                        </div>
                        <div className="text-white">
                          <div className="text-xs font-body opacity-80 mb-1">{img.timestamp} · Seed: {img.seed}</div>
                          <div className="text-sm line-clamp-2 leading-tight">{img.prompt}</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      <ImagePickerModal
        open={showRefPicker}
        onClose={() => setShowRefPicker(false)}
        onConfirm={setSelectedRefs}
        characterId={characterId}
        eraId={eraId}
        initialSelected={selectedRefs}
      />
      <ImagePickerModal
        open={showSourcePicker}
        onClose={() => setShowSourcePicker(false)}
        onConfirm={(ids) => { if (ids.length > 0) setSourceImageId(ids[0]); setShowSourcePicker(false) }}
        characterId={characterId}
        eraId={eraId}
        initialSelected={sourceImageId ? [sourceImageId] : []}
      />

      {/* Lightbox */}
      <Lightbox
        imageId={lightboxId}
        onClose={() => setLightboxId(null)}
        onPrev={(() => {
          const completedImages = sessionImages.filter(i => i.status === 'complete')
          const idx = completedImages.findIndex(i => i.id === lightboxId)
          return idx > 0 ? () => setLightboxId(completedImages[idx - 1].id) : undefined
        })()}
        onNext={(() => {
          const completedImages = sessionImages.filter(i => i.status === 'complete')
          const idx = completedImages.findIndex(i => i.id === lightboxId)
          return idx < completedImages.length - 1 ? () => setLightboxId(completedImages[idx + 1].id) : undefined
        })()}
      />

      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}

function SessionImageTagButton({ imageId }: { imageId: string }) {
  const [showTags, setShowTags] = useState(false)
  const { data: imageTags } = useImageTags(showTags ? imageId : '')
  return (
    <>
      <button
        onClick={() => setShowTags(true)}
        className="bg-background/90 text-primary p-1.5 hover:text-accent transition-colors"
        title="Tag"
      >
        <span className="material-symbols-outlined text-[18px]">label</span>
      </button>
      <TagPicker
        open={showTags}
        onClose={() => setShowTags(false)}
        imageIds={[imageId]}
        existingTags={(imageTags ?? []).map(t => ({ namespace: t.tag_namespace, value: t.tag_value }))}
      />
    </>
  )
}
