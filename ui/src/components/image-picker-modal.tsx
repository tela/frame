import { useState } from 'react'
import { useCharacterImages, thumbUrl } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { CharacterImage } from '@/lib/types'

interface ImagePickerModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (imageIds: string[]) => void
  characterId: string
  eraId?: string
  initialSelected?: string[]
  title?: string
}

export function ImagePickerModal({
  open, onClose, onConfirm, characterId, eraId, initialSelected = [], title = 'Select Reference Images',
}: ImagePickerModalProps) {
  const { data: images } = useCharacterImages(characterId, eraId)
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected))

  const toggle = (imageId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(imageId)) next.delete(imageId)
      else next.add(imageId)
      return next
    })
  }

  const handleConfirm = () => {
    onConfirm(Array.from(selected))
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="bg-background border-border-subtle max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <span className="text-meta text-muted">
            {(images ?? []).length} images available · {selected.size} selected
          </span>
          {selected.size > 0 && (
            <button
              onClick={() => setSelected(new Set())}
              className="text-[11px] uppercase font-bold text-muted hover:text-primary transition-colors"
            >
              Clear Selection
            </button>
          )}
        </div>

        {/* Image grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {(images ?? []).length === 0 ? (
            <div className="py-12 text-center text-muted">
              <span className="material-symbols-outlined text-[48px] text-muted/30 mb-4 block">image</span>
              <p className="text-sm">No images available for this character/era</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {(images ?? []).map((ci) => (
                <ImagePickerCard
                  key={ci.image_id}
                  ci={ci}
                  isSelected={selected.has(ci.image_id)}
                  onToggle={() => toggle(ci.image_id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-border-subtle mt-2">
          <span className="text-sm text-muted">
            {selected.size} reference{selected.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[11px] uppercase font-bold text-muted hover:text-on-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="bg-on-surface text-background px-6 py-2 text-[11px] uppercase font-bold tracking-[0.1em] hover:opacity-90 transition-all"
            >
              Confirm ({selected.size})
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ImagePickerCard({ ci, isSelected, onToggle }: {
  ci: CharacterImage
  isSelected: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative aspect-square overflow-hidden border-2 transition-all ${
        isSelected
          ? 'border-accent shadow-md'
          : 'border-transparent hover:border-border-subtle'
      }`}
    >
      <img
        src={thumbUrl(ci.image_id)}
        alt={`Image ${ci.image_id}`}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-1 right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-[14px]">check</span>
        </div>
      )}

      {/* Ref badge */}
      {ci.ref_type && (
        <div className="absolute bottom-1 left-1">
          <span className="bg-on-surface/70 text-background text-[8px] px-1 rounded-sm uppercase">{ci.ref_type}</span>
        </div>
      )}
    </button>
  )
}
