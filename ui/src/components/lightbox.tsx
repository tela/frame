import { useEffect, useCallback } from 'react'
import { imageUrl } from '@/lib/api'

interface Props {
  imageId: string | null
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}

export function Lightbox({ imageId, onClose, onPrev, onNext }: Props) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft' && onPrev) onPrev()
    if (e.key === 'ArrowRight' && onNext) onNext()
  }, [onClose, onPrev, onNext])

  useEffect(() => {
    if (!imageId) return
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [imageId, handleKeyDown])

  if (!imageId) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-on-surface/90 flex items-center justify-center cursor-zoom-out"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors z-10"
      >
        <span className="material-symbols-outlined text-2xl">close</span>
      </button>

      {/* Nav arrows */}
      {onPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev() }}
          className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white/50 hover:text-white transition-colors z-10"
        >
          <span className="material-symbols-outlined text-3xl">chevron_left</span>
        </button>
      )}
      {onNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext() }}
          className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white/50 hover:text-white transition-colors z-10"
        >
          <span className="material-symbols-outlined text-3xl">chevron_right</span>
        </button>
      )}

      {/* Image */}
      <img
        src={imageUrl(imageId)}
        alt=""
        className="max-w-[90vw] max-h-[90vh] object-contain cursor-default"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
