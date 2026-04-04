import { Link, useParams, useSearch, useNavigate } from '@tanstack/react-router'
import { useCharacter, useReferencePackage, useIngestImage, useCharacterImages, useDeleteCharacterImage, useBulkUpdateCharacterImages, useShoots, useBulkAddShootImages, useShootImages, useCreateShoot, thumbUrl } from '@/lib/api'
import { useState, useCallback, useMemo } from 'react'
import { SkeletonGrid } from '@/components/skeleton'
import { Dropzone } from '@/components/dropzone'
import { TagPicker } from '@/components/tag-picker'
import type { CharacterImage } from '@/lib/types'

export function EraWorkspace() {
  const { characterId, eraId } = useParams({ from: '/characters/$characterId/eras/$eraId' })
  const { shoot: shootFilter } = useSearch({ from: '/characters/$characterId/eras/$eraId' })
  const navigate = useNavigate()
  const ingestImage = useIngestImage()
  const deleteImage = useDeleteCharacterImage()
  const bulkUpdate = useBulkUpdateCharacterImages()
  const bulkAddShoot = useBulkAddShootImages()
  const createShoot = useCreateShoot()
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [showShootDropdown, setShowShootDropdown] = useState(false)
  const [showSetTypeDropdown, setShowSetTypeDropdown] = useState(false)
  const [newShootName, setNewShootName] = useState('')
  const [showNewShootInput, setShowNewShootInput] = useState(false)
  const { data: character, isLoading: charLoading } = useCharacter(characterId)
  const { data: eraImages } = useCharacterImages(characterId, eraId)
  const { data: refPackage } = useReferencePackage(characterId, eraId)
  const { data: shoots } = useShoots(characterId)
  const { data: shootImageIds } = useShootImages(shootFilter ?? '')

  // Build a map of image_id -> shoot name for badges
  const shootMap = useMemo(() => {
    const map = new Map<string, string>()
    // We only populate for the active shoot filter since we get image IDs per shoot
    if (shootFilter && shootImageIds && shoots) {
      const shoot = shoots.find(s => s.id === shootFilter)
      if (shoot) {
        for (const id of shootImageIds) {
          map.set(id, shoot.name)
        }
      }
    }
    return map
  }, [shootFilter, shootImageIds, shoots])

  // Filter images by shoot if a shoot filter is active
  const filteredImages = useMemo(() => {
    const images = eraImages ?? []
    if (!shootFilter || !shootImageIds) return images
    const idSet = new Set(shootImageIds)
    return images.filter(ci => idSet.has(ci.image_id))
  }, [eraImages, shootFilter, shootImageIds])

  if (charLoading) {
    return (
      <div className="px-12 py-20">
        <div className="w-96 h-16 bg-surface-low animate-pulse rounded-sm mb-20" />
        <SkeletonGrid count={6} columns={3} />
      </div>
    )
  }

  if (!character) {
    return <div className="p-12 text-muted text-[15px]">Character not found</div>
  }

  const era = character.eras.find((e) => e.id === eraId)
  if (!era) {
    return <div className="p-12 text-muted text-[15px]">Era not found</div>
  }

  const pendingCount = (eraImages ?? []).filter(ci => ci.triage_status === 'pending').length

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

  const handleBulkUpdate = useCallback((field: string, value: string) => {
    bulkUpdate.mutate({
      characterId,
      imageIds: Array.from(selectedImages),
      update: { [field]: value },
    })
    setSelectedImages(new Set())
  }, [selectedImages, characterId, bulkUpdate])

  const handleSingleUpdate = useCallback((imageId: string, field: string, value: unknown) => {
    bulkUpdate.mutate({
      characterId,
      imageIds: [imageId],
      update: { [field]: value },
    })
  }, [characterId, bulkUpdate])

  const handleMoveToShoot = useCallback((shootId: string) => {
    bulkAddShoot.mutate({
      shootId,
      imageIds: Array.from(selectedImages),
    })
    setSelectedImages(new Set())
    setShowShootDropdown(false)
  }, [selectedImages, bulkAddShoot])

  const handleCreateAndMoveToShoot = useCallback(() => {
    if (!newShootName.trim()) return
    createShoot.mutate(
      { characterId, name: newShootName.trim() },
      {
        onSuccess: (newShoot) => {
          bulkAddShoot.mutate({
            shootId: newShoot.id,
            imageIds: Array.from(selectedImages),
          })
          setSelectedImages(new Set())
          setShowShootDropdown(false)
          setShowNewShootInput(false)
          setNewShootName('')
        },
      }
    )
  }, [newShootName, characterId, selectedImages, createShoot, bulkAddShoot])

  const handleShootFilterChange = (shootId: string) => {
    navigate({
      to: '/characters/$characterId/eras/$eraId',
      params: { characterId, eraId },
      search: shootId ? { shoot: shootId } : {},
    })
  }

  const activeShoot = shoots?.find(s => s.id === shootFilter)

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

      {/* Filter Bar */}
      <section className="mx-12 mb-4 flex items-center gap-4">
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
        <Link
          to="/characters/$characterId/eras/$eraId/refs"
          params={{ characterId, eraId }}
          className="text-ui text-[13px] text-muted hover:text-primary transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">collections</span>
          Ref Builder
        </Link>
        {/* Shoot filter dropdown */}
        <div className="ml-auto flex items-center gap-4">
          <select
            value={shootFilter ?? ''}
            onChange={(e) => handleShootFilterChange(e.target.value)}
            className="bg-transparent border border-border-subtle text-[13px] text-muted py-1.5 px-3 focus:border-on-surface focus:ring-0 focus:outline-none"
          >
            <option value="">All Shoots</option>
            {(shoots ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.image_count})</option>
            ))}
          </select>
          {activeShoot && (
            <span className="text-[11px] text-muted">
              Showing: <span className="text-on-surface font-medium">{activeShoot.name}</span>
            </span>
          )}
          <span className="text-meta">{filteredImages.length} assets</span>
        </div>
      </section>

      {/* Image Grid */}
      <section className="px-12 pb-24">
        {filteredImages.length === 0 ? (
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
            {filteredImages.map((ci) => (
              <EraImageCard
                key={ci.image_id}
                ci={ci}
                characterId={characterId}
                eraId={eraId}
                isSelected={selectedImages.has(ci.image_id)}
                onToggleSelect={() => toggleSelect(ci.image_id)}
                onUpdate={(field, value) => handleSingleUpdate(ci.image_id, field, value)}
                onDelete={() => deleteImage.mutate({ characterId, imageId: ci.image_id })}
                shootName={shootMap.get(ci.image_id)}
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

      {/* Bulk Action Bar */}
      {selectedImages.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-on-surface text-background px-6 py-3 shadow-2xl flex items-center gap-4 rounded-sm">
          <span className="text-[13px] font-bold tracking-[0.05em] uppercase">
            {selectedImages.size} Selected
          </span>
          <div className="w-px h-5 bg-background/20" />

          {/* Set Type dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowSetTypeDropdown(!showSetTypeDropdown); setShowShootDropdown(false) }}
              className="text-[11px] uppercase font-bold tracking-[0.1em] text-background/80 hover:text-background flex items-center gap-1 transition-colors"
            >
              Set Type
              <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
            </button>
            {showSetTypeDropdown && (
              <div className="absolute bottom-full left-0 mb-2 bg-background border border-border-subtle shadow-lg py-1 min-w-[140px]">
                {['reference', 'curated', 'training', 'archive'].map((type) => (
                  <button
                    key={type}
                    onClick={() => { handleBulkUpdate('set_type', type); setShowSetTypeDropdown(false) }}
                    className="w-full text-left px-4 py-2 text-[12px] text-on-surface hover:bg-surface-low transition-colors capitalize"
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => handleBulkUpdate('triage_status', 'approved')}
            className="text-[11px] uppercase font-bold tracking-[0.1em] text-green-400 hover:text-green-300 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => handleBulkUpdate('triage_status', 'rejected')}
            className="text-[11px] uppercase font-bold tracking-[0.1em] text-red-400 hover:text-red-300 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={() => { setShowTagPicker(true); setShowShootDropdown(false); setShowSetTypeDropdown(false) }}
            className="text-[11px] uppercase font-bold tracking-[0.1em] text-background/80 hover:text-background transition-colors"
          >
            Tag
          </button>

          {/* Move to Shoot dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowShootDropdown(!showShootDropdown); setShowSetTypeDropdown(false) }}
              className="text-[11px] uppercase font-bold tracking-[0.1em] text-background/80 hover:text-background flex items-center gap-1 transition-colors"
            >
              Move to Shoot
              <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
            </button>
            {showShootDropdown && (
              <div className="absolute bottom-full right-0 mb-2 bg-background border border-border-subtle shadow-lg py-1 min-w-[200px]">
                {(shoots ?? []).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleMoveToShoot(s.id)}
                    className="w-full text-left px-4 py-2 text-[12px] text-on-surface hover:bg-surface-low transition-colors"
                  >
                    {s.name}
                  </button>
                ))}
                <div className="border-t border-border-subtle mt-1 pt-1">
                  {showNewShootInput ? (
                    <div className="px-3 py-2 flex gap-2">
                      <input
                        value={newShootName}
                        onChange={(e) => setNewShootName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAndMoveToShoot() }}
                        className="flex-1 border border-border-subtle bg-transparent py-1 px-2 text-[12px] text-on-surface focus:border-on-surface focus:outline-none"
                        placeholder="Shoot name..."
                        autoFocus
                      />
                      <button
                        onClick={handleCreateAndMoveToShoot}
                        disabled={!newShootName.trim()}
                        className="text-[11px] font-bold text-on-surface hover:text-accent disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewShootInput(true)}
                      className="w-full text-left px-4 py-2 text-[12px] text-muted hover:text-on-surface hover:bg-surface-low transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      New Shoot...
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-background/20" />
          <button
            onClick={() => { setSelectedImages(new Set()); setShowShootDropdown(false); setShowSetTypeDropdown(false) }}
            className="text-background/60 hover:text-background transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Tag Picker */}
      <TagPicker
        open={showTagPicker}
        onClose={() => setShowTagPicker(false)}
        imageIds={Array.from(selectedImages)}
        refType={(() => {
          const selectedCIs = (eraImages ?? []).filter((ci) => selectedImages.has(ci.image_id))
          const types = new Set(selectedCIs.map((ci) => ci.ref_type).filter(Boolean))
          return types.size === 1 ? [...types][0] : undefined
        })()}
      />
    </Dropzone>
  )
}

function EraImageCard({ ci, characterId, eraId, isSelected, onToggleSelect, onUpdate, onDelete, shootName }: {
  ci: CharacterImage
  characterId: string
  eraId: string
  isSelected: boolean
  onToggleSelect: () => void
  onUpdate: (field: string, value: unknown) => void
  onDelete: () => void
  shootName?: string
}) {
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionText, setCaptionText] = useState(ci.caption ?? '')

  const saveCaption = () => {
    onUpdate('caption', captionText)
    setEditingCaption(false)
  }

  return (
    <div className={`masonry-item relative group overflow-hidden ${isSelected ? 'ring-2 ring-on-surface ring-offset-4' : ''}`}>
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

      {/* Shoot badge */}
      {shootName && (
        <div className="absolute top-2 left-10 z-20">
          <span className="bg-on-surface/70 text-background text-[9px] px-2 py-0.5 rounded-full backdrop-blur-sm">
            {shootName}
          </span>
        </div>
      )}

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
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 text-background">
        {/* Top row: ref type toggles + delete */}
        <div className="flex justify-between">
          <div className="flex gap-1">
            {(['face', 'body', 'breasts', 'vagina'] as const).map((rt) => (
              <button
                key={rt}
                onClick={() => onUpdate('ref_type', ci.ref_type === rt ? '' : rt)}
                className={`px-2 py-1 text-[9px] uppercase font-bold tracking-wider rounded-sm transition-colors ${
                  ci.ref_type === rt ? 'bg-accent text-white' : 'bg-background/20 hover:bg-accent/60'
                }`}
              >
                {rt === 'breasts' ? 'Br' : rt === 'vagina' ? 'V' : rt.charAt(0).toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-full bg-background/20 flex items-center justify-center hover:bg-red-500/80 transition-colors"
            title="Delete"
          >
            <span className="material-symbols-outlined text-[14px]">delete</span>
          </button>
        </div>

        {/* Middle: triage + studio actions */}
        <div className="flex justify-center gap-2">
          <button
            onClick={() => onUpdate('triage_status', 'approved')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors ${
              ci.triage_status === 'approved'
                ? 'bg-green-500 text-white'
                : 'bg-background/80 text-on-surface hover:bg-green-500 hover:text-white'
            }`}
          >
            Approve
          </button>
          <button
            onClick={() => onUpdate('triage_status', 'rejected')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors ${
              ci.triage_status === 'rejected'
                ? 'bg-red-500 text-white'
                : 'bg-background/80 text-on-surface hover:bg-red-500 hover:text-white'
            }`}
          >
            Reject
          </button>
          <Link
            to="/characters/$characterId/eras/$eraId/studio"
            params={{ characterId, eraId }}
            search={{ intent: 'remix', source: ci.image_id }}
            className="px-3 py-1.5 bg-background/80 rounded-full text-on-surface text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-colors"
          >
            Remix
          </Link>
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
            <span className={`text-[9px] tracking-widest uppercase px-1.5 py-0.5 backdrop-blur-md ${
              ci.triage_status === 'approved' ? 'bg-green-500/40' :
              ci.triage_status === 'rejected' ? 'bg-red-500/40' :
              'bg-background/20'
            }`}>
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
