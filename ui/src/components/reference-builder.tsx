import { useParams, useNavigate } from '@tanstack/react-router'
import { useCharacter, useReferencePackage, useCharacterImages, useUpdateCharacterImage, useBulkUpdateCharacterImages, thumbUrl } from '@/lib/api'
import { useState, useCallback, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CharacterImage } from '@/lib/types'

type RefFilter = 'approved' | 'all'

export function ReferenceBuilder() {
  const { characterId, eraId } = useParams({ from: '/characters/$characterId/eras/$eraId/refs' })
  const navigate = useNavigate()
  const updateImage = useUpdateCharacterImage()
  const bulkUpdate = useBulkUpdateCharacterImages()

  const [filter, setFilter] = useState<RefFilter>('approved')
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())

  const { data: character, isLoading: charLoading } = useCharacter(characterId)
  const { data: allImages } = useCharacterImages(characterId, eraId)
  const { data: refPackage } = useReferencePackage(characterId, eraId)

  const era = character?.eras.find((e) => e.id === eraId)

  const filteredImages = useMemo(() => {
    const images = allImages ?? []
    if (filter === 'approved') return images.filter((ci) => ci.triage_status === 'approved')
    return images
  }, [allImages, filter])

  const totalCount = allImages?.length ?? 0
  const faceRefCount = refPackage?.face_refs.length ?? 0
  const bodyRefCount = refPackage?.body_refs.length ?? 0

  // Click-to-cycle: none -> face_ref -> body_ref -> none
  const cycleRef = useCallback((ci: CharacterImage) => {
    if (!ci.is_face_ref && !ci.is_body_ref) {
      updateImage.mutate({ characterId, imageId: ci.image_id, is_face_ref: true, is_body_ref: false })
    } else if (ci.is_face_ref) {
      updateImage.mutate({ characterId, imageId: ci.image_id, is_face_ref: false, is_body_ref: true })
    } else {
      updateImage.mutate({ characterId, imageId: ci.image_id, is_face_ref: false, is_body_ref: false })
    }
  }, [characterId, updateImage])

  const approveImage = useCallback((imageId: string) => {
    updateImage.mutate({ characterId, imageId, triage_status: 'approved' })
  }, [characterId, updateImage])

  const removeRef = useCallback((imageId: string, type: 'face' | 'body') => {
    if (type === 'face') {
      updateImage.mutate({ characterId, imageId, is_face_ref: false })
    } else {
      updateImage.mutate({ characterId, imageId, is_body_ref: false })
    }
  }, [characterId, updateImage])

  const toggleSelect = useCallback((imageId: string) => {
    setSelectedImages((prev) => {
      const next = new Set(prev)
      if (next.has(imageId)) next.delete(imageId)
      else next.add(imageId)
      return next
    })
  }, [])

  const handleBulkApprove = useCallback(() => {
    bulkUpdate.mutate({
      characterId,
      imageIds: Array.from(selectedImages),
      update: { triage_status: 'approved' },
    })
    setSelectedImages(new Set())
  }, [selectedImages, characterId, bulkUpdate])

  const handleBulkFaceRef = useCallback(() => {
    bulkUpdate.mutate({
      characterId,
      imageIds: Array.from(selectedImages),
      update: { is_face_ref: true, is_body_ref: false },
    })
    setSelectedImages(new Set())
  }, [selectedImages, characterId, bulkUpdate])

  const handleBulkBodyRef = useCallback(() => {
    bulkUpdate.mutate({
      characterId,
      imageIds: Array.from(selectedImages),
      update: { is_face_ref: false, is_body_ref: true },
    })
    setSelectedImages(new Set())
  }, [selectedImages, characterId, bulkUpdate])

  // Drag reorder for ref strips
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleFaceReorder = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !refPackage) return

    const oldIndex = refPackage.face_refs.findIndex((r) => r.image_id === active.id)
    const newIndex = refPackage.face_refs.findIndex((r) => r.image_id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(refPackage.face_refs, oldIndex, newIndex)
    reordered.forEach((ref, i) => {
      updateImage.mutate({ characterId, imageId: ref.image_id, ref_rank: i + 1 })
    })
  }, [refPackage, characterId, updateImage])

  const handleBodyReorder = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !refPackage) return

    const oldIndex = refPackage.body_refs.findIndex((r) => r.image_id === active.id)
    const newIndex = refPackage.body_refs.findIndex((r) => r.image_id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(refPackage.body_refs, oldIndex, newIndex)
    reordered.forEach((ref, i) => {
      updateImage.mutate({ characterId, imageId: ref.image_id, ref_rank: i + 1 })
    })
  }, [refPackage, characterId, updateImage])

  if (charLoading) {
    return <div className="p-12 text-muted text-[15px]">Loading...</div>
  }

  if (!character || !era) {
    return <div className="p-12 text-muted text-[15px]">Character or era not found</div>
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-surface-low">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate({ to: '/characters/$characterId', params: { characterId } })}
            className="text-muted hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="font-display text-xl font-light tracking-display text-on-surface">
              {character.display_name || character.name}{' '}
              <span className="text-muted">·</span>{' '}
              <span className="italic">{era.label}</span>
            </h1>
          </div>
        </div>
        <span className="text-ui text-[11px] tracking-[0.15em] text-muted">
          {faceRefCount} face · {bodyRefCount} body · {totalCount} total
        </span>
      </header>

      {/* Two-Panel Split */}
      <section className="flex flex-1 overflow-hidden">
        {/* Left Panel: Image Pool */}
        <div className="w-[60%] flex flex-col border-r border-surface overflow-hidden">
          <div className="p-8 pb-4 flex justify-between items-end">
            <div>
              <h2 className="font-display text-3xl tracking-display text-on-surface">Image Pool</h2>
              <p className="text-primary-dim text-sm mt-1 italic font-display opacity-80">
                {character.display_name || character.name} · {era.label}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('approved')}
                className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase border transition-colors ${
                  filter === 'approved'
                    ? 'bg-on-surface text-background border-on-surface'
                    : 'bg-surface border-outline-variant/20 text-muted hover:text-on-surface'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase border transition-colors ${
                  filter === 'all'
                    ? 'bg-on-surface text-background border-on-surface'
                    : 'bg-surface border-outline-variant/20 text-muted hover:text-on-surface'
                }`}
              >
                All
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 pt-4">
            {filteredImages.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-muted text-[15px] mb-2">No images in this era yet.</p>
                <p className="text-muted text-[13px]">Import images first, then return here to build references.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredImages.map((ci) => (
                  <PoolImageCard
                    key={ci.image_id}
                    ci={ci}
                    isSelected={selectedImages.has(ci.image_id)}
                    onCycleRef={() => cycleRef(ci)}
                    onApprove={() => approveImage(ci.image_id)}
                    onToggleSelect={() => toggleSelect(ci.image_id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Reference Set & Test */}
        <div className="w-[40%] bg-surface flex flex-col overflow-y-auto">
          <div className="p-10 space-y-12">
            {/* Face Refs */}
            <div>
              <div className="flex justify-between items-baseline mb-4">
                <h3 className="font-display text-xl tracking-display">Face Refs</h3>
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-40">
                  {String(faceRefCount).padStart(2, '0')} selected
                </span>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFaceReorder}>
                <SortableContext
                  items={(refPackage?.face_refs ?? []).map((r) => r.image_id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="flex gap-3 flex-wrap">
                    {(refPackage?.face_refs ?? []).map((ref) => (
                      <SortableRefThumb
                        key={ref.image_id}
                        imageId={ref.image_id}
                        type="face"
                        onRemove={() => removeRef(ref.image_id, 'face')}
                      />
                    ))}
                    {faceRefCount === 0 && (
                      <div className="w-14 h-14 rounded-full bg-surface-low flex items-center justify-center border border-outline-variant/20">
                        <span className="material-symbols-outlined text-sm opacity-40">add</span>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {/* Body Refs */}
            <div>
              <div className="flex justify-between items-baseline mb-4">
                <h3 className="font-display text-xl tracking-display">Body Refs</h3>
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-40">
                  {String(bodyRefCount).padStart(2, '0')} selected
                </span>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBodyReorder}>
                <SortableContext
                  items={(refPackage?.body_refs ?? []).map((r) => r.image_id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="flex gap-3 flex-wrap">
                    {(refPackage?.body_refs ?? []).map((ref) => (
                      <SortableRefThumb
                        key={ref.image_id}
                        imageId={ref.image_id}
                        type="body"
                        onRemove={() => removeRef(ref.image_id, 'body')}
                      />
                    ))}
                    {bodyRefCount === 0 && (
                      <div className="w-14 h-14 bg-surface-low flex items-center justify-center border border-outline-variant/20">
                        <span className="material-symbols-outlined text-sm opacity-40">add</span>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {/* Test Result */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-display text-xl tracking-display">Test Result</h3>
              </div>
              <div className="aspect-[4/5] bg-surface-low flex items-center justify-center border border-outline-variant/10">
                <div className="text-center px-8">
                  <span className="material-symbols-outlined text-[32px] text-muted/40 mb-3 block">science</span>
                  <p className="text-muted text-[13px]">Select refs and test identity lock.</p>
                  <p className="text-muted/60 text-[11px] mt-1">Test generation available in Phase 2.</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-4">
                <button
                  disabled
                  className="flex-1 bg-on-surface text-background py-4 text-xs font-bold tracking-widest uppercase disabled:opacity-40 cursor-not-allowed"
                  title="Coming in Phase 2"
                >
                  Test Refs
                </button>
                <button
                  disabled
                  className="flex-1 border border-on-surface text-on-surface py-4 text-xs font-bold tracking-widest uppercase disabled:opacity-40 cursor-not-allowed"
                  title="Coming in Phase 2"
                >
                  Lock Refs
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Bar: Quick Generate (Phase 2) */}
      <footer className="h-20 bg-surface-lowest border-t border-surface-low flex items-center px-8 gap-6">
        <div className="flex-1 flex items-center bg-surface px-6 py-2 border border-outline-variant/20 rounded-full opacity-50">
          <span className="material-symbols-outlined text-primary-dim text-lg mr-4">auto_awesome</span>
          <input
            disabled
            className="w-full bg-transparent border-none focus:ring-0 text-sm placeholder:text-primary-dim/40"
            placeholder="Quick Generate: 'Side profile, cinematic film noir lighting, heavy grain...'"
            type="text"
          />
        </div>
        <button
          disabled
          className="bg-on-surface text-background px-8 h-10 text-[10px] font-bold tracking-widest uppercase rounded-full opacity-40 cursor-not-allowed"
        >
          Generate
        </button>
      </footer>

      {/* Bulk Action Bar */}
      {selectedImages.size > 0 && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-on-surface text-background px-6 py-3 shadow-2xl flex items-center gap-4 rounded-sm">
          <span className="text-[13px] font-bold tracking-[0.05em] uppercase">
            {selectedImages.size} Selected
          </span>
          <div className="w-px h-5 bg-background/20" />
          <button
            onClick={handleBulkApprove}
            className="text-[11px] uppercase font-bold tracking-[0.1em] text-green-400 hover:text-green-300 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={handleBulkFaceRef}
            className="text-[11px] uppercase font-bold tracking-[0.1em] text-background/80 hover:text-background transition-colors"
          >
            Face Ref
          </button>
          <button
            onClick={handleBulkBodyRef}
            className="text-[11px] uppercase font-bold tracking-[0.1em] text-background/80 hover:text-background transition-colors"
          >
            Body Ref
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
    </div>
  )
}

// --- Pool Image Card ---

function PoolImageCard({ ci, isSelected, onCycleRef, onApprove, onToggleSelect }: {
  ci: CharacterImage
  isSelected: boolean
  onCycleRef: () => void
  onApprove: () => void
  onToggleSelect: () => void
}) {
  const isPending = ci.triage_status === 'pending'
  const hasRef = ci.is_face_ref || ci.is_body_ref

  return (
    <div className="relative group cursor-pointer">
      <div
        className={`aspect-[3/4] bg-surface-low overflow-hidden rounded-sm relative ${
          hasRef ? 'ring-2 ring-on-surface' : ''
        } ${isPending ? 'opacity-60' : ''}`}
        onClick={onCycleRef}
      >
        <img
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            isPending ? 'grayscale' : ''
          }`}
          src={thumbUrl(ci.image_id)}
          alt={ci.caption ?? `Image ${ci.image_id}`}
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />

        {/* Ref badge — always visible */}
        {ci.is_face_ref && (
          <div className="absolute top-3 left-3 px-2 py-0.5 bg-surface-lowest border border-on-surface text-[10px] font-bold z-10">
            F
          </div>
        )}
        {ci.is_body_ref && (
          <div className="absolute top-3 left-3 px-2 py-0.5 bg-surface-lowest border border-on-surface text-[10px] font-bold z-10">
            B
          </div>
        )}

        {/* Selected checkmark */}
        {hasRef && (
          <div className="absolute top-3 right-3 bg-on-surface text-background rounded-full p-1 shadow-lg z-10">
            <span className="material-symbols-outlined text-sm leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
        )}

        {/* Pending: inline approve button */}
        {isPending && (
          <button
            onClick={(e) => { e.stopPropagation(); onApprove() }}
            className="absolute bottom-3 right-3 bg-green-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Approve"
          >
            <span className="material-symbols-outlined text-[16px]">check</span>
          </button>
        )}
      </div>

      {/* Selection checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
        className={`absolute top-2 left-2 z-20 w-6 h-6 rounded-sm flex items-center justify-center border transition-all ${
          isSelected
            ? 'bg-accent border-accent text-white'
            : 'bg-background/80 border-border-subtle text-transparent opacity-0 group-hover:opacity-100 hover:text-muted hover:border-primary'
        }`}
      >
        <span className="material-symbols-outlined text-[16px]">check</span>
      </button>

      {/* Filename label */}
      <p className="text-[10px] mt-2 text-primary-dim uppercase tracking-widest font-medium truncate">
        {ci.caption || ci.image_id.slice(0, 8)}
      </p>
    </div>
  )
}

// --- Sortable Ref Thumbnail ---

function SortableRefThumb({ imageId, type, onRemove }: {
  imageId: string
  type: 'face' | 'body'
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: imageId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isCircle = type === 'face'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group/ref w-14 h-14 ${isCircle ? 'rounded-full' : ''} overflow-hidden border border-on-surface p-0.5 cursor-grab active:cursor-grabbing`}
      {...attributes}
      {...listeners}
    >
      <img
        className={`w-full h-full object-cover ${isCircle ? 'rounded-full' : ''}`}
        src={thumbUrl(imageId)}
        alt={`${type} ref`}
        loading="lazy"
      />
      {/* Remove button on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute inset-0 bg-on-surface/60 flex items-center justify-center opacity-0 group-hover/ref:opacity-100 transition-opacity"
      >
        <span className="material-symbols-outlined text-background text-[16px]">close</span>
      </button>
    </div>
  )
}
