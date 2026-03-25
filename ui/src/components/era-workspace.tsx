import { Link, useParams } from '@tanstack/react-router'
import { useCharacter, useReferencePackage, useIngestImage, useCharacterImages, useUpdateCharacterImage, thumbUrl } from '@/lib/api'
import { useState, useCallback } from 'react'
import { Dropzone } from '@/components/dropzone'
import type { CharacterImage } from '@/lib/types'

export function EraWorkspace() {
  const { characterId, eraId } = useParams({ from: '/characters/$characterId/eras/$eraId' })
  const ingestImage = useIngestImage()
  const updateImage = useUpdateCharacterImage()
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const { data: character, isLoading: charLoading } = useCharacter(characterId)
  const { data: eraImages } = useCharacterImages(characterId, eraId)
  const { data: refPackage } = useReferencePackage(characterId, eraId)

  if (charLoading) {
    return <div className="p-12 text-muted text-[15px]">Loading...</div>
  }

  if (!character) {
    return <div className="p-12 text-muted text-[15px]">Character not found</div>
  }

  const era = character.eras.find((e) => e.id === eraId)
  if (!era) {
    return <div className="p-12 text-muted text-[15px]">Era not found</div>
  }

  const pendingCount = 0 // TODO: derive from image query

  const handleFileDrop = (files: File[]) => {
    setUploadStatus(`Uploading ${files.length} file(s)...`)
    let completed = 0
    for (const file of files) {
      ingestImage.mutate(
        { characterId, eraId, file, source: 'manual' },
        {
          onSuccess: () => {
            completed++
            if (completed === files.length) {
              setUploadStatus(`${completed} file(s) uploaded`)
              setTimeout(() => setUploadStatus(null), 3000)
            }
          },
          onError: () => {
            completed++
            if (completed === files.length) {
              setUploadStatus(`Upload complete (some may have failed)`)
              setTimeout(() => setUploadStatus(null), 3000)
            }
          },
        }
      )
    }
  }

  const toggleSelect = useCallback((imageId: string) => {
    setSelectedImages((prev) => {
      const next = new Set(prev)
      if (next.has(imageId)) next.delete(imageId)
      else next.add(imageId)
      return next
    })
  }, [])

  const bulkUpdate = useCallback((field: string, value: string) => {
    for (const imageId of selectedImages) {
      updateImage.mutate({ characterId, imageId, [field]: value })
    }
    setSelectedImages(new Set())
  }, [selectedImages, characterId, updateImage])

  const handleSingleUpdate = useCallback((imageId: string, field: string, value: unknown) => {
    updateImage.mutate({ characterId, imageId, [field]: value })
  }, [characterId, updateImage])

  return (
    <Dropzone onFiles={handleFileDrop} accept=".png,.jpg,.jpeg,.webp" className="flex-1 flex flex-col">
      {/* Upload status toast */}
      {uploadStatus && (
        <div className="fixed bottom-6 right-6 z-50 bg-on-surface text-background px-6 py-3 shadow-lg text-sm">
          {uploadStatus}
        </div>
      )}
      {/* Workspace Header */}
      <section className="px-12 py-20 flex flex-col md:flex-row justify-between items-end gap-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-5xl md:text-7xl font-light tracking-display text-on-surface">
            {character.display_name || character.name}{' '}
            <span className="text-muted font-light">—</span>{' '}
            <span className="italic font-normal">{era.label}</span>
          </h2>
          {era.visual_description && (
            <p className="mt-6 font-body text-primary-dim max-w-lg leading-relaxed text-[15px]">
              {era.visual_description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <span className="text-ui text-[11px] tracking-[0.2em] text-muted">
            {refPackage?.face_refs.length ?? 0} Face Refs · {refPackage?.body_refs.length ?? 0} Body Refs
          </span>
          {era.prompt_prefix && (
            <span className="font-display text-lg text-on-surface">{era.prompt_prefix.slice(0, 60)}{era.prompt_prefix.length > 60 ? '...' : ''}</span>
          )}
        </div>
      </section>

      {/* Triage Status Banner */}
      {pendingCount > 0 && (
        <section className="mx-12 mb-20 bg-surface-low px-8 py-5 flex items-center justify-between group cursor-pointer hover:bg-surface transition-colors duration-300">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-ui text-xs tracking-[0.15em] text-on-surface">
              {pendingCount} Unsorted Assets — Pending Triage Queue
            </span>
          </div>
          <Link
            to="/characters/$characterId/eras/$eraId/triage"
            params={{ characterId, eraId }}
            className="text-ui text-xs tracking-[0.15em] border-b border-on-surface/20 hover:border-on-surface transition-all flex items-center gap-2"
          >
            Begin Triage <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </section>
      )}

      {/* Action Bar */}
      <section className="mx-12 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/characters/$characterId/eras/$eraId/triage"
            params={{ characterId, eraId }}
            className="text-ui text-[13px] text-muted hover:text-primary transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Triage
          </Link>
          <Link
            to="/characters/$characterId/eras/$eraId/studio"
            params={{ characterId, eraId }}
            className="text-ui text-[13px] text-muted hover:text-primary transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            Studio
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {selectedImages.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-meta">{selectedImages.size} selected</span>
              <button onClick={() => bulkUpdate('set_type', 'reference')} className="text-ui text-[11px] text-muted hover:text-primary px-2 py-1 border border-border-subtle hover:border-primary transition-colors">Reference</button>
              <button onClick={() => bulkUpdate('set_type', 'curated')} className="text-ui text-[11px] text-muted hover:text-primary px-2 py-1 border border-border-subtle hover:border-primary transition-colors">Curated</button>
              <button onClick={() => bulkUpdate('set_type', 'training')} className="text-ui text-[11px] text-muted hover:text-primary px-2 py-1 border border-border-subtle hover:border-primary transition-colors">Training</button>
              <button onClick={() => bulkUpdate('set_type', 'archive')} className="text-ui text-[11px] text-muted hover:text-primary px-2 py-1 border border-border-subtle hover:border-primary transition-colors">Archive</button>
              <button onClick={() => bulkUpdate('triage_status', 'approved')} className="text-ui text-[11px] text-muted hover:text-green-600 px-2 py-1 border border-border-subtle hover:border-green-600 transition-colors">Approve</button>
              <button onClick={() => bulkUpdate('triage_status', 'rejected')} className="text-ui text-[11px] text-muted hover:text-accent px-2 py-1 border border-border-subtle hover:border-accent transition-colors">Reject</button>
              <button onClick={() => setSelectedImages(new Set())} className="text-ui text-[11px] text-muted hover:text-primary transition-colors">Clear</button>
            </div>
          )}
          <span className="text-meta">{(eraImages ?? []).length} assets</span>
        </div>
      </section>

      {/* Image Grid */}
      <section className="px-12 pb-24">
        {(eraImages ?? []).length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted text-[15px] mb-4">No images in this era yet.</p>
            <p className="text-muted text-[13px] mb-6">Drag and drop images here, or</p>
            <Link
              to="/characters/$characterId/eras/$eraId/studio"
              params={{ characterId, eraId }}
              className="inline-flex items-center gap-2 bg-on-surface text-background text-ui text-[13px] px-6 py-3 rounded-sm hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              Generate Images
            </Link>
          </div>
        ) : (
          <div className="masonry-grid">
            {(eraImages ?? []).map((ci) => (
              <EraImageCard
                key={ci.image_id}
                ci={ci}
                isSelected={selectedImages.has(ci.image_id)}
                onToggleSelect={() => toggleSelect(ci.image_id)}
                onUpdate={(field, value) => handleSingleUpdate(ci.image_id, field, value)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Masonry CSS */}
      <style>{`
        .masonry-grid {
          columns: 1;
          column-gap: 2.75rem;
        }
        @media (min-width: 768px) { .masonry-grid { columns: 2; } }
        @media (min-width: 1280px) { .masonry-grid { columns: 3; } }
        .masonry-item {
          break-inside: avoid;
          margin-bottom: 2.75rem;
        }
      `}</style>
    </Dropzone>
  )
}

function EraImageCard({ ci, isSelected, onToggleSelect, onUpdate }: {
  ci: CharacterImage
  isSelected: boolean
  onToggleSelect: () => void
  onUpdate: (field: string, value: unknown) => void
}) {
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionText, setCaptionText] = useState(ci.caption ?? '')

  const saveCaption = () => {
    onUpdate('caption', captionText)
    setEditingCaption(false)
  }

  return (
    <div className={`masonry-item relative group overflow-hidden ${isSelected ? 'ring-2 ring-accent' : ''}`}>
      {/* Selection checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
        className={`absolute top-2 left-2 z-20 w-6 h-6 rounded-sm flex items-center justify-center border transition-all ${
          isSelected
            ? 'bg-accent border-accent text-white'
            : 'bg-background/80 border-border-subtle text-transparent group-hover:text-muted hover:text-primary hover:border-primary'
        }`}
      >
        <span className="material-symbols-outlined text-[16px]">check</span>
      </button>

      <div className="bg-surface-lowest p-1">
        <img
          alt={`Image ${ci.image_id}`}
          className="w-full h-auto rounded-[2px]"
          src={thumbUrl(ci.image_id)}
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 text-background">
        {/* Top: quick actions */}
        <div className="flex justify-end gap-1">
          <button
            onClick={() => onUpdate('is_face_ref', !ci.is_face_ref)}
            className={`px-2 py-1 text-[9px] uppercase font-bold tracking-wider rounded-sm transition-colors ${
              ci.is_face_ref ? 'bg-accent text-white' : 'bg-background/20 hover:bg-accent/60'
            }`}
          >
            Face
          </button>
          <button
            onClick={() => onUpdate('is_body_ref', !ci.is_body_ref)}
            className={`px-2 py-1 text-[9px] uppercase font-bold tracking-wider rounded-sm transition-colors ${
              ci.is_body_ref ? 'bg-accent text-white' : 'bg-background/20 hover:bg-accent/60'
            }`}
          >
            Body
          </button>
        </div>

        {/* Bottom: rating + badges */}
        <div className="space-y-2">
          {/* Star rating */}
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => onUpdate('rating', star === ci.rating ? 0 : star)}
                className="material-symbols-outlined text-[16px] hover:scale-110 transition-transform"
                style={{ fontVariationSettings: star <= (ci.rating ?? 0) ? "'FILL' 1" : "'FILL' 0" }}
              >
                star
              </button>
            ))}
          </div>
          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            <span className="text-[9px] tracking-widest uppercase bg-background/20 px-1.5 py-0.5 backdrop-blur-md">
              {ci.set_type}
            </span>
            <span className="text-[9px] tracking-widest uppercase bg-background/20 px-1.5 py-0.5 backdrop-blur-md">
              {ci.triage_status}
            </span>
          </div>
        </div>
      </div>

      {/* Caption */}
      <div className="px-2 py-1">
        {editingCaption ? (
          <div className="flex gap-1">
            <input
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveCaption(); if (e.key === 'Escape') setEditingCaption(false) }}
              className="flex-1 bg-surface border border-border-subtle text-[11px] py-1 px-2 focus:border-on-surface focus:ring-0 focus:outline-none"
              placeholder="Write a caption..."
              autoFocus
            />
            <button onClick={saveCaption} className="text-muted hover:text-primary">
              <span className="material-symbols-outlined text-[14px]">check</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingCaption(true)}
            className="text-[10px] text-muted hover:text-primary transition-colors w-full text-left truncate"
            title={ci.caption ?? 'Add caption'}
          >
            {ci.caption ? (
              <span className="italic">{ci.caption}</span>
            ) : (
              <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-[12px]">edit</span>
                Add caption
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
