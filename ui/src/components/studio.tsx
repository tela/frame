import { useParams, useSearch } from '@tanstack/react-router'
import { useCharacter, useGenerate, useBifrostStatus, useLoras, useComposePrompt, usePromptJobs, thumbUrl, imageUrl } from '@/lib/api'
import type { LoRA, ComposeJobInfo } from '@/lib/api'
import { useState, useEffect, useRef } from 'react'
import { ImagePickerModal } from '@/components/image-picker-modal'
import { StudioGallery } from '@/components/studio-gallery'
import { studioState } from '@/lib/studio-state'
import type {
  Workflow, Tier, ContentRating, StudioMode, StudioIntent, GeneratedImage,
} from '@/components/studio-types'
import {
  JOB_MODE_MAP, JOB_CATEGORY_LABELS, JOB_CATEGORY_ORDER,
  WORKFLOWS, TIERS, DIMENSIONS, BATCH_SIZES, CAMERA_MOTIONS, VIDEO_DURATIONS,
  INTENT_CONFIGS, INTENT_JOB_MAP,
  defaultWorkflowForMode, workflowsForMode, buildIdentityFallback,
} from '@/components/studio-types'

export function Studio() {
  const { characterId, eraId } = useParams({ from: '/characters/$characterId/eras/$eraId/studio' })
  const { intent: intentParam, source: sourceParam } = useSearch({ from: '/characters/$characterId/eras/$eraId/studio' })
  const { data: character } = useCharacter(characterId)
  const { data: bifrostStatus } = useBifrostStatus()
  const { data: loras } = useLoras()
  const { data: jobsData } = usePromptJobs()
  const compose = useComposePrompt()
  const generate = useGenerate()

  const [mode, setMode] = useState<StudioMode>(sourceParam ? 'refine' : 'generate')
  const [selectedJob, setSelectedJob] = useState('')
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
  const [cameraMotion, setCameraMotion] = useState('static')
  const [videoDuration, setVideoDuration] = useState('3s')
  const [showParams, setShowParams] = useState(false)
  const [sessionImages, setSessionImages] = useState<GeneratedImage[]>([])
  const [panelOpen, setPanelOpen] = useState(true)
  const [showRefPicker, setShowRefPicker] = useState(false)
  const [showSourcePicker, setShowSourcePicker] = useState(false)
  const [showPosePicker, setShowPosePicker] = useState(false)
  const [selectedRefs, setSelectedRefs] = useState<string[]>([])
  const [sourceImageId, setSourceImageId] = useState<string>(sourceParam || '')
  const [poseImageId, setPoseImageId] = useState<string>('')
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

      const jobName = INTENT_JOB_MAP[intent!]
      if (jobName && eraId) {
        setSelectedJob(jobName)
        compose.mutate({
          character_id: characterId,
          era_id: eraId,
          job_name: jobName,
          content_rating: config.contentRating,
        }, {
          onSuccess: (result) => {
            setPrompt(result.prompt)
            setNegativePrompt(result.negative)
          },
        })
      } else {
        setPrompt(buildIdentityFallback(character, era) + config.promptSuffix)
      }
    } else {
      // No intent — just populate identity as starting prompt
      setPrompt(buildIdentityFallback(character, era))
      if (sourceParam) {
        setSourceImageId(sourceParam)
        setMode('refine')
        setWorkflow('sdxl_img2img')
      }
    }
  }, [character, era]) // eslint-disable-line react-hooks/exhaustive-deps

  // Publish Studio state for the stylist drawer
  useEffect(() => {
    studioState.set({
      prompt,
      negativePrompt,
      workflow,
      job: selectedJob,
      contentRating,
    })
    return () => studioState.clear()
  }, [prompt, negativePrompt, workflow, selectedJob, contentRating])

  const dim = DIMENSIONS[dimensions]
  const activeLora = (loras ?? []).find((l: LoRA) => l.id === selectedLora)
  const needsSource = mode === 'refine' || mode === 'process' || mode === 'video'
  const needsRefs = ['sdxl_multi_ref', 'sdxl_character_gen', 'sdxl_pose_transfer'].includes(workflow)
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

    const isVideoMode = mode === 'video'
    const placeholders: GeneratedImage[] = Array.from({ length: isVideoMode ? 1 : batchSize }, () => ({
      id: crypto.randomUUID(),
      url: '',
      seed: Math.floor(Math.random() * 100000),
      prompt: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'generating' as const,
      isVideo: isVideoMode,
    }))
    setSessionImages((prev) => [...placeholders.reverse(), ...prev])

    generate.mutate(
      {
        character_id: characterId,
        era_id: eraId,
        prompt: prompt,
        negative_prompt: negativePrompt || undefined,
        workflow: workflow,
        include_refs: includeEraRefs && (workflow === 'sdxl_multi_ref' || workflow === 'sdxl_character_gen' || workflow === 'sdxl_pose_transfer'),
        ref_image_ids: selectedRefs.length > 0 ? selectedRefs : undefined,
        batch_size: batchSize,
        width: dim.w,
        height: dim.h,
        steps: steps,
        content_rating: contentRating,
        lora_adapter: activeLora?.filename || undefined,
        lora_strength: activeLora ? loraStrength : undefined,
        source_image_id: needsSource ? sourceImageId || undefined : undefined,
        pose_image_id: workflow === 'sdxl_pose_transfer' ? poseImageId || undefined : undefined,
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
            { value: 'video' as StudioMode, label: 'Video', icon: 'movie' },
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

          {/* Job Selector */}
          {(
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted">Job</label>
              <div className="relative">
                <select
                  value={selectedJob}
                  onChange={(e) => {
                    const jobName = e.target.value
                    setSelectedJob(jobName)
                    if (jobName && character) {
                      const job = (jobsData?.jobs ?? []).find((j: ComposeJobInfo) => j.name === jobName)
                      if (job) {
                        const jobMode = JOB_MODE_MAP[job.category] || 'generate'
                        if (jobMode !== mode) setMode(jobMode)
                        setContentRating(job.content_rating as ContentRating)
                        setWorkflow(job.workflow as Workflow)
                      }
                      compose.mutate({
                        character_id: characterId,
                        era_id: eraId,
                        job_name: jobName,
                        content_rating: contentRating,
                        lora_trigger: activeLora?.name || undefined,
                      }, {
                        onSuccess: (result) => {
                          setPrompt(result.prompt)
                          setNegativePrompt(result.negative)
                        },
                      })
                    }
                  }}
                  className="w-full appearance-none bg-transparent border border-border-subtle py-2.5 px-3 text-sm focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">Custom</option>
                  {JOB_CATEGORY_ORDER
                    .filter((cat) => (jobsData?.jobs ?? []).some((j: ComposeJobInfo) => j.category === cat))
                    .map((cat) => (
                      <optgroup key={cat} label={JOB_CATEGORY_LABELS[cat] || cat}>
                        {(jobsData?.jobs ?? [])
                          .filter((j: ComposeJobInfo) => j.category === cat)
                          .sort((a: ComposeJobInfo, b: ComposeJobInfo) => a.display_name.localeCompare(b.display_name))
                          .map((j: ComposeJobInfo) => (
                            <option key={j.name} value={j.name}>
                              {j.display_name} {j.content_rating === 'nsfw' ? '(NSFW)' : ''}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-[18px]">expand_more</span>
              </div>
              {selectedJob && compose.data?.blocks && (
                <details className="text-[11px] text-muted">
                  <summary className="cursor-pointer hover:text-primary">Prompt blocks</summary>
                  <div className="mt-1 flex flex-col gap-1 pl-3 border-l border-border-subtle">
                    {Object.entries(compose.data.blocks).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k}>
                        <span className="font-bold uppercase tracking-wider">{k}:</span>{' '}
                        <span className="text-on-surface">{v}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Prompt / Motion — not in process mode */}
          {mode !== 'process' && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted flex justify-between">
                  {mode === 'video' ? 'Motion' : 'Prompt'}
                  <span className="tracking-normal lowercase tabular-nums">{prompt.length}/1000</span>
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className={`w-full resize-none bg-surface border border-border-subtle p-3 font-body text-sm leading-relaxed text-primary focus:outline-none focus:border-primary placeholder:text-muted/50 ${mode === 'video' ? 'h-[200px]' : 'h-[140px]'}`}
                  placeholder={mode === 'video'
                    ? "Describe the movement: slowly turns head toward camera, hair moves with the turn, subtle smile forms..."
                    : "Describe the subject, environment, lighting..."
                  }
                />
              </div>
              {mode !== 'video' && (
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted">Negative Prompt</label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    className="w-full h-[60px] resize-none bg-surface border border-border-subtle p-3 font-body text-sm leading-relaxed text-primary focus:outline-none focus:border-primary placeholder:text-muted/50"
                    placeholder="What to exclude..."
                  />
                </div>
              )}
            </>
          )}

          {/* Video-specific controls */}
          {mode === 'video' && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted">Camera</label>
                <div className="relative">
                  <select
                    value={cameraMotion}
                    onChange={(e) => setCameraMotion(e.target.value)}
                    className="w-full appearance-none bg-transparent border border-border-subtle py-2.5 px-3 text-sm focus:outline-none focus:border-primary cursor-pointer"
                  >
                    {CAMERA_MOTIONS.map(cm => (
                      <option key={cm.value} value={cm.value}>{cm.label}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-[18px]">expand_more</span>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted">Duration</label>
                  <div className="flex gap-1">
                    {VIDEO_DURATIONS.map(d => (
                      <button
                        key={d}
                        onClick={() => setVideoDuration(d)}
                        className={`flex-1 py-2 text-[11px] uppercase font-bold border transition-colors ${
                          videoDuration === d ? 'bg-on-surface text-background border-on-surface' : 'text-muted border-border-subtle hover:border-on-surface'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted">Quality</label>
                  <div className="flex gap-1">
                    {TIERS.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTier(t.value)}
                        className={`flex-1 py-2 text-[11px] uppercase font-bold border transition-colors ${
                          tier === t.value ? 'bg-on-surface text-background border-on-surface' : 'text-muted border-border-subtle hover:border-on-surface'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Source Image / Starting Frame */}
          {needsSource && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted">
                {mode === 'video' ? 'Starting Frame' : 'Source Image'}
              </label>
              {mode === 'video' && (
                <p className="text-[11px] text-muted -mt-1">Select the image to animate. The video will start from this frame.</p>
              )}
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

          {/* Pose Reference Image (for pose transfer workflow) */}
          {workflow === 'sdxl_pose_transfer' && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted">Pose Reference</label>
              <p className="text-[11px] text-muted">Select an image with the pose you want to apply. The character's face refs provide identity.</p>
              {poseImageId ? (
                <div className="relative w-20 h-20 border border-border-subtle overflow-hidden group">
                  <img src={thumbUrl(poseImageId)} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPoseImageId('')}
                    className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-white text-[14px]">close</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowPosePicker(true)}
                  className="border border-dashed border-border-subtle text-muted text-[12px] py-3 px-3 hover:border-primary hover:text-primary transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">accessibility_new</span>
                  Select pose image
                </button>
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
            disabled={!bifrostAvailable || (mode !== 'process' && !prompt.trim()) || generate.isPending || (needsSource && !sourceImageId) || (mode === 'generate' && needsRefs && !includeEraRefs && selectedRefs.length === 0) || (workflow === 'sdxl_pose_transfer' && !poseImageId)}
            className="w-full bg-accent text-white py-4 font-medium tracking-ui hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {mode === 'video' ? 'movie' : mode === 'generate' ? 'auto_awesome' : mode === 'refine' ? 'tune' : 'construction'}
            </span>
            {generate.isPending ? (mode === 'video' ? 'Generating video...' : 'Processing...') :
              mode === 'video' ? 'Generate Video' :
              mode === 'generate' ? `Generate${batchSize > 1 ? ` (${batchSize})` : ''}` :
              mode === 'refine' ? 'Refine' : 'Process'}
          </button>
        </div>
      </aside>

      {/* Preview & History Area (Right) */}
      <StudioGallery
        characterId={characterId}
        sessionImages={sessionImages}
        setSessionImages={setSessionImages}
        onRefineImage={handleRefineImage}
      />

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
      <ImagePickerModal
        open={showPosePicker}
        onClose={() => setShowPosePicker(false)}
        onConfirm={(ids) => { if (ids.length > 0) setPoseImageId(ids[0]); setShowPosePicker(false) }}
        characterId={characterId}
        eraId={eraId}
        initialSelected={poseImageId ? [poseImageId] : []}
      />

    </div>
  )
}
