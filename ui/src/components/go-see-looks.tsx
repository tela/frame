import { useState } from 'react'
import { useLooks, useCreateLook, useUpdateLook, useDeleteLook, useLookTryOn, useGenerateLookTryOn, useMediaItems, thumbUrl, type LookWithDetails } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { MediaItem } from '@/lib/types'

export function GoSeeLooks({ characterId }: { characterId: string }) {
  const { data: looks } = useLooks(characterId)
  const createLook = useCreateLook()
  const [showCreate, setShowCreate] = useState(false)
  const [newLookName, setNewLookName] = useState('')
  const [expandedLookId, setExpandedLookId] = useState<string | null>(null)

  const handleCreate = () => {
    if (!newLookName.trim()) return
    createLook.mutate(
      { characterId, name: newLookName.trim() },
      {
        onSuccess: () => {
          setShowCreate(false)
          setNewLookName('')
        },
      }
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[24px] font-display font-normal tracking-display text-primary">Go-See Looks</h2>
      </div>

      {/* Horizontal scroll of look cards */}
      <div className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
        {(looks ?? []).map((look) => (
          <LookCard
            key={look.id}
            look={look}
            isExpanded={expandedLookId === look.id}
            onToggleExpand={() => setExpandedLookId(expandedLookId === look.id ? null : look.id)}
          />
        ))}
        {/* Add Look */}
        <button
          onClick={() => { setShowCreate(true); setNewLookName('') }}
          className="flex flex-col gap-3 min-w-[200px] group snap-start outline-none text-left flex-shrink-0"
        >
          <div className="aspect-[3/4] w-full bg-transparent rounded-sm border border-dashed border-border-subtle flex items-center justify-center transition-all duration-300 group-hover:border-primary group-hover:bg-primary/5">
            <span className="material-symbols-outlined text-[24px] text-muted group-hover:text-primary transition-colors">add</span>
          </div>
          <div className="px-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <h3 className="text-[14px] font-display tracking-display text-primary">New Look</h3>
          </div>
        </button>
      </div>

      {/* Expanded Look Detail */}
      {expandedLookId && (
        <LookDetail
          lookId={expandedLookId}
          characterId={characterId}
          onClose={() => setExpandedLookId(null)}
        />
      )}

      {/* Create Look Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-background border-border-subtle max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Create Look</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <div>
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Look Name <span className="text-accent">*</span></label>
              <input
                value={newLookName}
                onChange={(e) => setNewLookName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none"
                placeholder="e.g. Casual Summer, Evening Gala"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-[11px] uppercase font-bold text-muted hover:text-on-surface transition-colors">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={!newLookName.trim() || createLook.isPending}
                className="bg-on-surface text-background px-6 py-2 text-[11px] uppercase font-bold disabled:opacity-50"
              >
                {createLook.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LookCard({ look, isExpanded, onToggleExpand }: {
  look: LookWithDetails
  isExpanded: boolean
  onToggleExpand: () => void
}) {
  const { data: tryOn } = useLookTryOn(look.id)
  const heroImageId = tryOn?.images?.[0]

  return (
    <button
      onClick={onToggleExpand}
      className={`flex flex-col gap-3 min-w-[200px] group snap-start outline-none text-left flex-shrink-0 ${
        isExpanded ? 'ring-2 ring-on-surface ring-offset-4' : ''
      }`}
    >
      <div className="aspect-[3/4] w-full bg-surface rounded-sm border border-border-subtle overflow-hidden relative transition-all duration-300 group-hover:border-primary">
        {heroImageId ? (
          <img
            src={thumbUrl(heroImageId)}
            alt={look.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-low">
            <span className="material-symbols-outlined text-[32px] text-muted/30">checkroom</span>
          </div>
        )}
        {/* DEFAULT badge */}
        {look.is_default && (
          <div className="absolute top-2 right-2">
            <span className="bg-accent text-white text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm">
              Default
            </span>
          </div>
        )}
      </div>
      <div className="px-1">
        <h3 className="text-[14px] font-display tracking-display text-primary group-hover:text-accent transition-colors">
          {look.name}
        </h3>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-muted tabular-nums">{look.garment_count} garments</span>
          {look.try_on_total > 0 && (
            <span className="text-[11px] text-muted tabular-nums">
              · {look.try_on_complete}/{look.try_on_total} try-ons
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

function LookDetail({ lookId, characterId, onClose }: {
  lookId: string
  characterId: string
  onClose: () => void
}) {
  const { data: looks } = useLooks(characterId)
  const look = looks?.find(l => l.id === lookId)
  const { data: tryOn } = useLookTryOn(lookId)
  const updateLook = useUpdateLook()
  const deleteLook = useDeleteLook()
  const generateTryOn = useGenerateLookTryOn()
  const { data: wardrobeItems } = useMediaItems('wardrobe')
  const [showGarmentPicker, setShowGarmentPicker] = useState(false)
  const [generatePrompt, setGeneratePrompt] = useState('')

  if (!look) return null

  // Parse wardrobe_item_ids from comma-separated string
  const garmentIds = look.wardrobe_item_ids ? look.wardrobe_item_ids.split(',').filter(Boolean) : []
  const garments = (wardrobeItems ?? []).filter(item => garmentIds.includes(item.id))

  const handleRemoveGarment = (garmentId: string) => {
    const newIds = garmentIds.filter(id => id !== garmentId)
    updateLook.mutate({ lookId, wardrobe_item_ids: newIds })
  }

  const handleAddGarments = (items: MediaItem[]) => {
    const newIds = [...new Set([...garmentIds, ...items.map(i => i.id)])]
    updateLook.mutate({ lookId, wardrobe_item_ids: newIds })
    setShowGarmentPicker(false)
  }

  const handleGenerate = () => {
    if (!generatePrompt.trim()) return
    generateTryOn.mutate({ lookId, prompt: generatePrompt.trim() })
    setGeneratePrompt('')
  }

  const handleDelete = () => {
    deleteLook.mutate(lookId)
    onClose()
  }

  return (
    <div className="mt-6 border border-border-subtle bg-surface-low p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-[18px] font-display tracking-display text-on-surface">{look.name}</h3>
          {look.is_default && (
            <span className="bg-accent text-white text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm">Default</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!look.is_default && (
            <button
              onClick={() => updateLook.mutate({ lookId, is_default: true })}
              className="text-[11px] uppercase font-bold text-muted hover:text-on-surface transition-colors"
            >
              Set as Default
            </button>
          )}
          <button onClick={handleDelete} className="text-[11px] uppercase font-bold text-muted hover:text-accent transition-colors">
            Delete
          </button>
          <button onClick={onClose} className="text-muted hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left: Garment list */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted">Garments ({garments.length})</span>
            <button
              onClick={() => setShowGarmentPicker(true)}
              className="text-[11px] uppercase font-bold text-muted hover:text-primary transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Add Garment
            </button>
          </div>
          {garments.length === 0 ? (
            <div className="py-8 text-center text-muted text-[13px]">
              No garments added yet. Add from the wardrobe.
            </div>
          ) : (
            <div className="space-y-2">
              {garments.map((garment) => (
                <div key={garment.id} className="flex items-center gap-3 p-2 bg-background border border-border-subtle group">
                  <div className="w-10 h-10 bg-surface-low rounded-sm overflow-hidden flex-shrink-0">
                    {garment.primary_image_id ? (
                      <img src={thumbUrl(garment.primary_image_id)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px] text-muted/30">checkroom</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[13px] text-on-surface flex-1 truncate">{garment.name}</span>
                  <span className="text-[9px] uppercase tracking-widest bg-surface-high text-on-surface px-1.5 py-0.5">
                    {garment.content_type}
                  </span>
                  <button
                    onClick={() => handleRemoveGarment(garment.id)}
                    className="text-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Generate section */}
          <div className="mt-6 pt-4 border-t border-border-subtle">
            <div className="flex gap-2">
              <input
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate() }}
                className="flex-1 border border-border-subtle bg-transparent py-2 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none"
                placeholder="Try-on prompt..."
              />
              <button
                onClick={handleGenerate}
                disabled={!generatePrompt.trim() || generateTryOn.isPending}
                className="bg-on-surface text-background px-4 py-2 text-[11px] uppercase font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                {generateTryOn.isPending ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Try-on images */}
        <div className="w-[360px] flex-shrink-0">
          <span className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-4">
            Try-On Results ({tryOn?.images?.length ?? 0})
          </span>
          {(tryOn?.images?.length ?? 0) === 0 ? (
            <div className="aspect-square bg-surface border border-border-subtle flex items-center justify-center">
              <span className="material-symbols-outlined text-[48px] text-muted/20">image</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(tryOn?.images ?? []).map((imageId) => (
                <div key={imageId} className="aspect-square bg-surface-low border border-border-subtle overflow-hidden">
                  <img
                    src={thumbUrl(imageId)}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Garment Picker Dialog */}
      <GarmentPicker
        open={showGarmentPicker}
        onClose={() => setShowGarmentPicker(false)}
        onAdd={handleAddGarments}
        excludeIds={garmentIds}
      />
    </div>
  )
}

function GarmentPicker({ open, onClose, onAdd, excludeIds }: {
  open: boolean
  onClose: () => void
  onAdd: (items: MediaItem[]) => void
  excludeIds: string[]
}) {
  const { data: items } = useMediaItems('wardrobe')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const available = (items ?? []).filter(item => !excludeIds.includes(item.id))

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    const selectedItems = available.filter(item => selected.has(item.id))
    onAdd(selectedItems)
    setSelected(new Set())
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="bg-background border-border-subtle max-w-3xl max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add Garments from Wardrobe</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 mt-4">
          {available.length === 0 ? (
            <div className="py-12 text-center text-muted text-[13px]">No wardrobe items available.</div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {available.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className={`border-2 p-2 transition-all text-left ${
                    selected.has(item.id)
                      ? 'border-accent bg-accent/5'
                      : 'border-transparent hover:border-border-subtle'
                  }`}
                >
                  <div className="aspect-square bg-surface-low rounded-sm overflow-hidden mb-2">
                    {item.primary_image_id ? (
                      <img src={thumbUrl(item.primary_image_id)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-[24px] text-muted/30">checkroom</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[12px] text-on-surface truncate block">{item.name}</span>
                  {selected.has(item.id) && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[14px]">check</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
          <button onClick={onClose} className="px-4 py-2 text-[11px] uppercase font-bold text-muted">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="bg-on-surface text-background px-6 py-2 text-[11px] uppercase font-bold disabled:opacity-50"
          >
            Add {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
