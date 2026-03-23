import { useParams } from '@tanstack/react-router'
import { useCharacter } from '@/lib/api'
import { useState } from 'react'

interface GeneratedImage {
  id: string
  url: string
  seed: number
  prompt: string
  timestamp: string
  status: 'generating' | 'complete'
}

export function Studio() {
  const { characterId, eraId } = useParams({ from: '/characters/$characterId/eras/$eraId/studio' })
  const { data: character } = useCharacter(characterId)

  const [prompt, setPrompt] = useState('')
  const [template, setTemplate] = useState('Cinematic Close-up (35mm)')
  const [showParams, setShowParams] = useState(false)
  const [sessionImages, setSessionImages] = useState<GeneratedImage[]>([])

  const era = character?.eras.find((e) => e.id === eraId)
  const charCount = prompt.length

  const handleGenerate = () => {
    // TODO: Send generation request to Bifrost via Frame API
    const placeholder: GeneratedImage = {
      id: crypto.randomUUID(),
      url: '',
      seed: Math.floor(Math.random() * 100000),
      prompt: `${template}: ${prompt}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'generating',
    }
    setSessionImages((prev) => [placeholder, ...prev])
  }

  const insertVariable = (v: string) => {
    setPrompt((p) => p + ` [${v}]`)
  }

  return (
    <div className="flex h-full">
      {/* Configuration Panel (Left) */}
      <aside className="w-[400px] flex-shrink-0 border-r border-border-subtle bg-background flex flex-col">
        <div className="px-8 py-6 border-b border-border-subtle">
          <h2 className="font-display text-3xl tracking-display">Studio</h2>
          <p className="text-muted text-sm mt-1">
            {character?.display_name || character?.name}{era ? ` — ${era.label}` : ''}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8">
          {/* Template Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] uppercase tracking-ui font-medium text-muted flex justify-between">
              Style Template
              <button className="text-accent hover:underline lowercase tracking-normal text-[13px]">Manage</button>
            </label>
            <div className="relative">
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full appearance-none bg-transparent border border-border-subtle rounded-sm py-3 px-4 text-sm focus:outline-none focus:border-primary cursor-pointer transition-colors hover:border-muted"
              >
                <option>Cinematic Close-up (35mm)</option>
                <option>Archival Polaroid</option>
                <option>Studio Portrait - High Contrast</option>
                <option>Environmental Wide</option>
                <option>Custom Override</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-[20px]">expand_more</span>
            </div>
          </div>

          {/* Prompt Textarea */}
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-[13px] uppercase tracking-ui font-medium text-muted flex justify-between">
              Base Prompt
              <span className="text-[11px] tracking-normal lowercase tabular-nums">{charCount}/1000</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-[240px] resize-none bg-surface border border-border-subtle rounded-sm p-4 font-body text-sm leading-relaxed text-primary focus:outline-none focus:border-primary placeholder:text-muted/50"
              placeholder="Describe the subject, environment, lighting, and camera details..."
            />
            {/* Variable Pills */}
            <div className="flex flex-wrap gap-2 mt-2">
              {['SUBJECT', 'ERA', 'LIGHTING'].map((v) => (
                <span
                  key={v}
                  onClick={() => insertVariable(v)}
                  className="text-[11px] px-2 py-1 border border-border-subtle rounded-sm bg-surface font-body text-muted cursor-pointer hover:border-primary hover:text-primary transition-colors"
                >
                  + [{v}]
                </span>
              ))}
            </div>
          </div>

          {/* Parameters (Collapsed) */}
          <div className="border-t border-border-subtle pt-6">
            <button
              onClick={() => setShowParams(!showParams)}
              className="flex items-center justify-between w-full text-[13px] uppercase tracking-ui font-medium text-muted hover:text-primary transition-colors group"
            >
              Parameters
              <span className={`material-symbols-outlined text-[18px] transition-transform ${showParams ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            {showParams && (
              <div className="mt-4 flex flex-col gap-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Batch Size</span>
                  <span className="text-primary tabular-nums">4</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Steps</span>
                  <span className="text-primary tabular-nums">30</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">CFG Scale</span>
                  <span className="text-primary tabular-nums">7.5</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Seed</span>
                  <span className="text-primary tabular-nums">Random</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Generate Button */}
        <div className="p-8 border-t border-border-subtle bg-surface/50">
          <button
            onClick={handleGenerate}
            className="w-full bg-accent text-white py-4 rounded-sm font-medium tracking-ui hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            Generate Batch (4)
          </button>
          <p className="text-center text-[11px] text-muted mt-3">
            Press <kbd className="font-body bg-surface px-1 rounded text-[10px]">Cmd</kbd> + <kbd className="font-body bg-surface px-1 rounded text-[10px]">Enter</kbd> to generate
          </p>
        </div>
      </aside>

      {/* Preview & History Area (Right) */}
      <section className="flex-1 flex flex-col bg-surface overflow-hidden relative">
        {/* Top Utility Bar */}
        <div className="h-[73px] border-b border-border-subtle bg-background flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Session History</span>
            <span className="text-xs text-muted bg-surface px-2 py-1 rounded-sm border border-border-subtle">
              {sessionImages.length} Items
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-muted hover:text-primary border border-transparent hover:border-border-subtle rounded-sm transition-all" title="Toggle Layout">
              <span className="material-symbols-outlined text-[20px]">splitscreen</span>
            </button>
            <button
              onClick={() => setSessionImages([])}
              className="text-[13px] uppercase tracking-ui font-medium border border-border-subtle px-4 py-2 rounded-sm hover:bg-surface transition-colors"
            >
              Clear Session
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-8">
          {sessionImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted gap-4">
              <span className="material-symbols-outlined text-[48px]">auto_awesome</span>
              <p className="text-sm">Generated images will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-6">
              {sessionImages.map((img) => (
                <div key={img.id} className="aspect-[3/4] relative rounded-sm overflow-hidden border border-border-subtle group cursor-pointer bg-background">
                  {img.status === 'generating' ? (
                    <>
                      <div className="absolute inset-0 bg-muted/10 backdrop-blur-md" />
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-background overflow-hidden">
                        <div className="h-full w-full bg-accent animate-progress origin-left" style={{ animation: 'progress 2s infinite linear' }} />
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
                        className="w-full h-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-[1.02]"
                        src={img.url}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
                        <div className="flex justify-end gap-2">
                          <button className="bg-background/90 text-primary p-1.5 rounded-sm hover:bg-white hover:text-accent transition-colors" title="Reject">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                          <button className="bg-accent/90 text-white p-1.5 rounded-sm hover:bg-accent transition-colors" title="Accept">
                            <span className="material-symbols-outlined text-[18px]">check</span>
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

      {/* Progress animation keyframes */}
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
