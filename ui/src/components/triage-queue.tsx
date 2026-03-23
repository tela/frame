import { useParams, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { imageUrl } from '@/lib/api'

interface TriageAction {
  type: 'accept' | 'reject' | 'archive'
  imageIndex: number
}

export function TriageQueue() {
  const { characterId, eraId } = useParams({ from: '/characters/$characterId/eras/$eraId/triage' })
  const navigate = useNavigate()

  // TODO: Replace with real pending images from API
  const [images] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [rating, setRating] = useState(0)
  const [showTagOverlay, setShowTagOverlay] = useState(false)
  const [flashClass, setFlashClass] = useState('')
  const [, setHistory] = useState<TriageAction[]>([])

  const totalImages = images.length
  const currentImage = images[currentIndex]

  const flash = useCallback((color: 'green' | 'red' | 'gray') => {
    const classes: Record<string, string> = {
      green: 'border-green-500',
      red: 'border-accent',
      gray: 'border-muted',
    }
    setFlashClass(classes[color])
    setTimeout(() => setFlashClass(''), 300)
  }, [])

  const advance = useCallback(() => {
    if (currentIndex < totalImages - 1) {
      setCurrentIndex((i) => i + 1)
      setRating(0)
    }
  }, [currentIndex, totalImages])

  const handleAccept = useCallback(() => {
    flash('green')
    setHistory((h) => [...h, { type: 'accept', imageIndex: currentIndex }])
    advance()
  }, [flash, advance, currentIndex])

  const handleReject = useCallback(() => {
    flash('red')
    setHistory((h) => [...h, { type: 'reject', imageIndex: currentIndex }])
    advance()
  }, [flash, advance, currentIndex])

  const handleArchive = useCallback(() => {
    flash('gray')
    setHistory((h) => [...h, { type: 'archive', imageIndex: currentIndex }])
    advance()
  }, [flash, advance, currentIndex])

  const handleRate = useCallback((r: number) => {
    setRating(r)
    // TODO: persist rating via API
  }, [])

  // Keyboard bindings
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showTagOverlay) {
        if (e.key === 'Escape') setShowTagOverlay(false)
        return
      }

      switch (e.key.toLowerCase()) {
        case 'a': handleAccept(); break
        case 'r': handleReject(); break
        case 'x': handleArchive(); break
        case 't': setShowTagOverlay(true); break
        case '1': case '2': case '3': case '4': case '5':
          handleRate(parseInt(e.key)); break
        case 'arrowleft':
          if (currentIndex > 0) { setCurrentIndex((i) => i - 1); setRating(0) }
          break
        case 'arrowright':
          advance(); break
        case 'escape':
          navigate({ to: '/characters/$characterId/eras/$eraId', params: { characterId, eraId } })
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showTagOverlay, handleAccept, handleReject, handleArchive, handleRate, advance, currentIndex, navigate, characterId, eraId])

  // Empty state
  if (totalImages === 0) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background">
        <h2 className="font-display text-3xl text-primary mb-2">Triage Complete</h2>
        <p className="text-muted text-[15px] mb-8">No pending images to review.</p>
        <button
          onClick={() => navigate({ to: '/characters/$characterId/eras/$eraId', params: { characterId, eraId } })}
          className="text-ui text-[13px] text-primary hover:text-accent transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Return to Workspace
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-background text-primary flex flex-col items-center justify-between relative">
      {/* Top Bar: Progress & Close */}
      <header className="w-full flex justify-between items-center p-6 absolute top-0 left-0 right-0 z-20">
        <div />
        <div className="flex items-center gap-6">
          <div className="text-ui text-[13px] tracking-[0.15em] text-muted tabular-nums">
            {currentIndex + 1} / {totalImages}
          </div>
          <button
            onClick={() => navigate({ to: '/characters/$characterId/eras/$eraId', params: { characterId, eraId } })}
            className="text-muted hover:text-primary transition-colors"
            aria-label="Close Triage Queue"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span>
          </button>
        </div>
      </header>

      {/* Image Viewer */}
      <main className="flex-1 w-full flex items-center justify-center p-8 mt-16 mb-24 z-10 relative">
        <div className="relative group max-h-[819px] w-auto max-w-full flex items-center justify-center">
          {/* Flash border */}
          <div className={`absolute inset-0 border-[3px] rounded transition-colors duration-200 z-20 pointer-events-none ${flashClass || 'border-transparent'}`} />
          <img
            alt="Triage image"
            className="max-h-[819px] w-auto object-contain rounded shadow-sm bg-surface transition-transform duration-300 ease-in-out"
            src={currentImage ? imageUrl(currentImage) : ''}
            style={{ maxWidth: '100%' }}
          />
          {/* Rating & Tags overlay on hover */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2 py-1 rounded shadow-sm border border-border-subtle">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`material-symbols-outlined cursor-pointer ${star <= rating ? 'text-accent' : 'text-muted'}`}
                  style={{ fontSize: 16, fontVariationSettings: star <= rating ? "'FILL' 1" : "'FILL' 0" }}
                  onClick={() => handleRate(star)}
                >
                  star
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Bar: Keyboard Legend */}
      <footer className="w-full border-t border-border-subtle bg-background/80 backdrop-blur-md absolute bottom-0 left-0 right-0 z-20 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-6">
            <KeyHint keyLabel="A" action="Accept" onClick={handleAccept} />
            <KeyHint keyLabel="R" action="Reject" onClick={handleReject} variant="danger" />
            <KeyHint keyLabel="X" action="Archive" onClick={handleArchive} />
          </div>
        </div>
        <div className="flex items-center gap-8 border-l border-border-subtle pl-8">
          <div className="flex items-center gap-6">
            <KeyHint keyLabel="1-5" action="Rate" />
            <KeyHint keyLabel="T" action="Tag" onClick={() => setShowTagOverlay(true)} />
          </div>
        </div>
        <div className="flex items-center gap-4 text-muted text-[12px] font-ui ml-auto">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>keyboard</span>
          <span>Use keyboard to navigate</span>
        </div>
      </footer>

      {/* Tag Overlay */}
      {showTagOverlay && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-background border border-border-subtle rounded-lg shadow-2xl p-6 w-full max-w-md">
            <h3 className="font-display text-2xl text-primary mb-4">Apply Tags</h3>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted">search</span>
              <input
                autoFocus
                className="w-full bg-surface border-none rounded py-3 pl-10 pr-4 text-primary font-ui focus:ring-2 focus:ring-accent placeholder-muted"
                placeholder="Type a tag..."
                type="text"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Cinematic', 'Close-up', 'Portrait', 'Front-facing'].map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-surface border border-border-subtle rounded text-[12px] font-ui text-primary cursor-pointer hover:border-primary transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3 text-[13px] font-ui uppercase tracking-ui">
              <button
                className="px-4 py-2 text-muted hover:text-primary transition-colors"
                onClick={() => setShowTagOverlay(false)}
              >
                Cancel (Esc)
              </button>
              <button
                className="px-4 py-2 bg-primary text-background rounded hover:bg-accent transition-colors"
                onClick={() => setShowTagOverlay(false)}
              >
                Apply (Enter)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KeyHint({ keyLabel, action, onClick, variant }: {
  keyLabel: string
  action: string
  onClick?: () => void
  variant?: 'danger'
}) {
  const hoverColor = variant === 'danger' ? 'group-hover:border-accent group-hover:text-accent' : 'group-hover:border-primary'
  const labelHover = variant === 'danger' ? 'group-hover:text-accent' : 'group-hover:text-primary'

  return (
    <div className="flex items-center gap-2 group cursor-pointer" onClick={onClick}>
      <kbd className={`min-w-[28px] h-7 flex items-center justify-center px-1.5 rounded bg-surface border border-border-subtle text-primary font-ui text-[12px] font-semibold shadow-sm transition-colors ${hoverColor}`}>
        {keyLabel}
      </kbd>
      <span className={`text-[13px] font-ui uppercase tracking-ui text-muted transition-colors ${labelHover}`}>
        {action}
      </span>
    </div>
  )
}
