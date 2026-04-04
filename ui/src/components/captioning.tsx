import { Link, useParams } from '@tanstack/react-router'
import { useCharacter, useCharacterImages, useBulkUpdateCharacterImages, thumbUrl } from '@/lib/api'
import { useState, useCallback } from 'react'
import { Lightbox } from '@/components/lightbox'
import type { CharacterImage, EraWithStats } from '@/lib/types'

type CaptionFilter = 'all' | 'captioned' | 'uncaptioned'
type SortMode = 'newest' | 'oldest' | 'filename'

const CAPTION_TEMPLATES: { value: string; label: string; template: string }[] = [
  { value: '', label: 'None', template: '' },
  { value: 'basic', label: 'Basic Identity', template: '{gender} {ethnicity} person, {hair_length} {hair_color} hair, {eye_color} eyes' },
  { value: 'detailed', label: 'Detailed', template: '{gender} {ethnicity} person, age {age_range}, {build} build, {height}cm tall, {hair_length} {hair_texture} {hair_color} hair, {eye_shape} {eye_color} eyes, {skin_tone} skin, {distinguishing_features}' },
  { value: 'lora', label: 'LoRA Training', template: 'photo of sks {gender}, {ethnicity}, {hair_length} {hair_color} hair, {eye_color} eyes, {skin_tone} skin, {build} build' },
]

function resolveTemplate(template: string, character: { gender: string; ethnicity: string; eye_color: string; eye_shape: string; skin_tone: string; natural_hair_color: string; natural_hair_texture: string; distinguishing_features: string }, era?: EraWithStats): string {
  const vars: Record<string, string> = {
    gender: character.gender || '',
    ethnicity: character.ethnicity || '',
    eye_color: character.eye_color || '',
    eye_shape: character.eye_shape || '',
    skin_tone: character.skin_tone || '',
    hair_color: era?.hair_color || character.natural_hair_color || '',
    hair_texture: character.natural_hair_texture || '',
    hair_length: era?.hair_length || '',
    age_range: era?.age_range || '',
    build: era?.build || '',
    height: era?.height_cm ? String(era.height_cm) : '',
    distinguishing_features: character.distinguishing_features || '',
  }

  return template
    .replace(/\{(\w+)\}/g, (_, key) => vars[key] || '')
    .replace(/,\s*,/g, ',')        // collapse empty vars
    .replace(/,\s*$/g, '')         // trailing comma
    .replace(/^\s*,\s*/g, '')      // leading comma
    .replace(/\s+/g, ' ')         // collapse spaces
    .trim()
}

export function Captioning() {
  const { characterId, eraId } = useParams({ from: '/characters/$characterId/eras/$eraId/captions' })
  const { data: character } = useCharacter(characterId)
  const { data: eraImages } = useCharacterImages(characterId, eraId)
  const bulkUpdate = useBulkUpdateCharacterImages()

  const [filter, setFilter] = useState<CaptionFilter>('all')
  const [sort, setSort] = useState<SortMode>('newest')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [lightboxId, setLightboxId] = useState<string | null>(null)

  const era = character?.eras.find(e => e.id === eraId)
  const images = eraImages ?? []

  const captionedCount = images.filter(ci => ci.caption && ci.caption.trim()).length
  const totalCount = images.length

  const filtered = images
    .filter(ci => {
      if (filter === 'captioned') return ci.caption && ci.caption.trim()
      if (filter === 'uncaptioned') return !ci.caption || !ci.caption.trim()
      return true
    })
    .sort((a, b) => {
      if (sort === 'oldest') return a.created_at.localeCompare(b.created_at)
      if (sort === 'filename') return (a.image_id).localeCompare(b.image_id)
      return b.created_at.localeCompare(a.created_at) // newest
    })

  const toggleSelect = useCallback((imageId: string) => {
    setSelectedImages(prev => {
      const next = new Set(prev)
      if (next.has(imageId)) next.delete(imageId)
      else next.add(imageId)
      return next
    })
  }, [])

  const applyTemplate = (imageIds: string[]) => {
    if (!selectedTemplate || !character) return
    const tpl = CAPTION_TEMPLATES.find(t => t.value === selectedTemplate)
    if (!tpl) return
    const caption = resolveTemplate(tpl.template, character, era)
    bulkUpdate.mutate({
      characterId,
      imageIds,
      update: { caption }     })
  }

  const applyToUncaptioned = () => {
    const uncaptioned = images.filter(ci => !ci.caption || !ci.caption.trim()).map(ci => ci.image_id)
    if (uncaptioned.length > 0) applyTemplate(uncaptioned)
  }

  const applyToAll = () => {
    const all = images.map(ci => ci.image_id)
    if (all.length > 0) applyTemplate(all)
  }

  if (!character || !era) return null

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <section className="px-12 py-12">
        <Link
          to="/characters/$characterId/eras/$eraId"
          params={{ characterId, eraId }}
          className="flex items-center gap-2 text-muted hover:text-primary text-[10px] uppercase tracking-[0.2em] font-bold mb-8 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Era Workspace
        </Link>

        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-display text-5xl italic text-on-surface">
              {character.display_name || character.name}
            </h1>
            <p className="text-muted text-[13px] mt-1 italic">
              {era.label} · {era.age_range}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted text-[11px] uppercase tracking-widest font-bold mb-2">Completion Status</p>
            <p className="font-display text-4xl text-on-surface tabular-nums">
              {captionedCount} <span className="text-muted text-lg">of</span> {totalCount}
            </p>
            <div className="w-48 h-[3px] bg-surface-low mt-2 ml-auto">
              <div
                className="h-full bg-on-surface transition-all duration-500"
                style={{ width: totalCount > 0 ? `${(captionedCount / totalCount) * 100}%` : '0%' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Template Bar */}
      <section className="mx-12 mb-6 bg-surface-low p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted">Active Template</span>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="bg-transparent border border-border-subtle py-2 px-3 text-[13px] focus:border-on-surface focus:ring-0 focus:outline-none"
          >
            {CAPTION_TEMPLATES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={applyToUncaptioned}
          disabled={!selectedTemplate || captionedCount === totalCount}
          className="px-4 py-2 border border-primary text-on-surface text-[11px] uppercase font-bold tracking-widest hover:bg-on-surface hover:text-background transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Apply to Uncaptioned
        </button>
        <button
          onClick={applyToAll}
          disabled={!selectedTemplate || totalCount === 0}
          className="px-4 py-2 border border-border-subtle text-muted text-[11px] uppercase font-bold tracking-widest hover:bg-on-surface hover:text-background transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Apply to All
        </button>

        <div className="ml-auto flex items-center gap-2">
          {(['all', 'captioned', 'uncaptioned'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[11px] uppercase font-bold tracking-widest transition-colors ${
                filter === f
                  ? 'bg-on-surface text-background'
                  : 'text-muted hover:text-on-surface'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      {/* Sort */}
      <div className="mx-12 mb-4 flex justify-end gap-2">
        {(['newest', 'oldest', 'filename'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`text-[10px] uppercase tracking-widest font-bold transition-colors ${
              sort === s ? 'text-on-surface' : 'text-muted hover:text-on-surface'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Caption List */}
      <section className="mx-12 flex-1 pb-24">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <span className="material-symbols-outlined text-[48px] text-muted/30 mb-4 block">edit_note</span>
            <p className="text-muted text-[15px]">
              {filter === 'uncaptioned' ? 'All images have captions.' :
               filter === 'captioned' ? 'No captioned images yet.' :
               'No images in this era.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map(ci => (
              <CaptionRow
                key={ci.image_id}
                ci={ci}
                characterId={characterId}
                isSelected={selectedImages.has(ci.image_id)}
                onToggleSelect={() => toggleSelect(ci.image_id)}
                onImageClick={() => setLightboxId(ci.image_id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Bulk Action Bar */}
      {selectedImages.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-on-surface text-background px-6 py-3 shadow-2xl flex items-center gap-4 rounded-sm">
          <span className="text-[13px] font-bold tracking-[0.05em] uppercase">
            {selectedImages.size} Selected
          </span>
          <div className="w-px h-5 bg-background/20" />
          <button
            onClick={() => applyTemplate(Array.from(selectedImages))}
            disabled={!selectedTemplate}
            className="text-[11px] uppercase font-bold tracking-[0.1em] text-background/80 hover:text-background disabled:opacity-30 transition-colors"
          >
            Apply Template
          </button>
          <button
            onClick={() => {
              bulkUpdate.mutate({
                characterId,
                imageIds: Array.from(selectedImages),
                update: { caption: '' },
              })
              setSelectedImages(new Set())
            }}
            className="text-[11px] uppercase font-bold tracking-[0.1em] text-red-400 hover:text-red-300 transition-colors"
          >
            Clear Captions
          </button>
          <div className="w-px h-5 bg-background/20" />
          <button
            onClick={() => setSelectedImages(new Set())}
            className="text-background/60 hover:text-background transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      <Lightbox
        imageId={lightboxId}
        onClose={() => setLightboxId(null)}
      />
    </div>
  )
}

function CaptionRow({ ci, characterId, isSelected, onToggleSelect, onImageClick }: {
  ci: CharacterImage
  characterId: string
  isSelected: boolean
  onToggleSelect: () => void
  onImageClick: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(ci.caption ?? '')
  const bulkUpdate = useBulkUpdateCharacterImages()

  const saveCaption = () => {
    if (draft !== (ci.caption ?? '')) {
      bulkUpdate.mutate({
        characterId,
        imageIds: [ci.image_id],
        update: { caption: draft },
      })
    }
    setEditing(false)
  }

  const charCount = (ci.caption ?? '').length
  const charColor = charCount === 0 ? 'text-muted' :
    charCount < 20 ? 'text-red-500' :
    charCount > 200 ? 'text-amber-500' :
    'text-on-surface'

  return (
    <div className={`flex gap-4 py-5 border-b border-surface-low hover:bg-surface-low/50 transition-colors ${isSelected ? 'bg-surface-low' : ''}`}>
      {/* Checkbox */}
      <button
        onClick={onToggleSelect}
        className={`flex-shrink-0 w-6 h-6 rounded-sm flex items-center justify-center border mt-1 transition-all ${
          isSelected ? 'bg-accent border-accent text-white' : 'border-border-subtle text-transparent hover:text-muted hover:border-primary'
        }`}
      >
        <span className="material-symbols-outlined text-[16px]">check</span>
      </button>

      {/* Thumbnail */}
      <button onClick={onImageClick} className="flex-shrink-0 w-16 h-16 bg-surface-low overflow-hidden rounded-sm">
        <img
          src={thumbUrl(ci.image_id)}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </button>

      {/* Caption area */}
      <div className="flex-1 min-w-0">
        {/* Metadata row */}
        <div className="flex items-center gap-4 mb-2 text-[10px] text-muted uppercase tracking-widest">
          <span className="tabular-nums">ID: {ci.image_id.slice(0, 8)}</span>
          {ci.source && ci.source !== 'manual' && (
            <span>Source: {ci.source === 'comfyui' ? 'Generated' : ci.source}</span>
          )}
        </div>

        {/* Caption text/editor */}
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveCaption}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveCaption() }
              if (e.key === 'Escape') { setDraft(ci.caption ?? ''); setEditing(false) }
            }}
            className="w-full bg-white border border-on-surface p-3 text-[13px] text-on-surface leading-relaxed focus:outline-none focus:ring-0 resize-none min-h-[60px]"
            autoFocus
            rows={3}
          />
        ) : (
          <button
            onClick={() => { setDraft(ci.caption ?? ''); setEditing(true) }}
            className="text-left w-full"
          >
            {ci.caption && ci.caption.trim() ? (
              <p className="text-[13px] text-on-surface leading-relaxed">{ci.caption}</p>
            ) : (
              <p className="text-[13px] text-muted italic">No caption — click to add</p>
            )}
          </button>
        )}
      </div>

      {/* Character count */}
      <div className="flex-shrink-0 w-20 text-right">
        <span className={`text-[11px] tabular-nums font-bold ${charColor}`}>
          {charCount} / 200
        </span>
      </div>
    </div>
  )
}
