import { useParams, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { imageUrl, useApplyPreprocess } from '@/lib/api'
import type { DerivativeOperation } from '@/lib/types'

type OpType = 'crop' | 'resize' | 'upscale' | 'rotate' | 'pad'

const OPERATIONS: { type: OpType; icon: string; label: string }[] = [
  { type: 'crop', icon: 'crop', label: 'Crop' },
  { type: 'resize', icon: 'photo_size_select_large', label: 'Resize' },
  { type: 'upscale', icon: 'zoom_in', label: 'Upscale' },
  { type: 'rotate', icon: 'rotate_right', label: 'Rotate' },
  { type: 'pad', icon: 'padding', label: 'Pad' },
]

const ASPECT_RATIOS = ['1:1', '4:3', '16:9', 'Free'] as const

export function ImagePreprocessor() {
  const { imageId } = useParams({ from: '/preprocess/$imageId' })
  const navigate = useNavigate()
  const applyPreprocess = useApplyPreprocess()
  const [activeOp, setActiveOp] = useState<OpType>('crop')
  const [cropX, setCropX] = useState(0)
  const [cropY, setCropY] = useState(0)
  const [cropW, setCropW] = useState(1024)
  const [cropH, setCropH] = useState(1024)
  const [resizeW, setResizeW] = useState(512)
  const [resizeH, setResizeH] = useState(512)
  const [rotateDeg, setRotateDeg] = useState(90)
  const [padTop, setPadTop] = useState(0)
  const [padBottom, setPadBottom] = useState(0)
  const [padLeft, setPadLeft] = useState(0)
  const [padRight, setPadRight] = useState(0)
  const [aspectLock, setAspectLock] = useState<string>('1:1')
  const [history, setHistory] = useState<DerivativeOperation[]>([])

  const addToHistory = (op: DerivativeOperation) => {
    setHistory((prev) => [...prev, op])
  }

  const buildCurrentOp = (): DerivativeOperation => {
    const ts = new Date().toISOString()
    switch (activeOp) {
      case 'crop':
        return { type: 'crop', params: { x: cropX, y: cropY, width: cropW, height: cropH }, timestamp: ts }
      case 'resize':
        return { type: 'resize', params: { width: resizeW, height: resizeH }, timestamp: ts }
      case 'rotate':
        return { type: 'rotate', params: { degrees: rotateDeg }, timestamp: ts }
      case 'pad':
        return { type: 'pad', params: { top: padTop, bottom: padBottom, left: padLeft, right: padRight }, timestamp: ts }
      default:
        return { type: activeOp, params: {}, timestamp: ts }
    }
  }

  const handleAddOp = () => {
    addToHistory(buildCurrentOp())
  }

  const handleSave = () => {
    const ops = history.length > 0 ? history : [buildCurrentOp()]
    applyPreprocess.mutate(
      { image_id: imageId, operations: ops.map((o) => ({ type: o.type, params: o.params })) },
      {
        onSuccess: (result) => {
          navigate({ to: '/images/$imageId', params: { imageId: result.image_id } })
        },
      }
    )
  }

  return (
    <div className="flex h-full overflow-hidden bg-surface-high">
      {/* Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-12 bg-on-surface flex items-center justify-between px-4">
          <div className="flex items-center gap-2 text-background/60 text-xs">
            <span>Library</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>Sarah</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>Young Adult</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-background">Preprocess</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="material-symbols-outlined text-background/60 hover:text-background text-[20px]">settings</button>
            <button className="material-symbols-outlined text-background/60 hover:text-background text-[20px]">help_outline</button>
          </div>
        </div>

        {/* Image canvas */}
        <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden bg-surface-highest/50">
          <div className="relative max-w-full max-h-full">
            <img
              src={imageUrl(imageId)}
              alt="Image to preprocess"
              className="max-h-[600px] w-auto object-contain shadow-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = ''
                ;(e.target as HTMLImageElement).alt = 'Image not available'
              }}
            />
            {/* Crop overlay (visual indicator) */}
            {activeOp === 'crop' && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute border-2 border-white border-dashed" style={{
                  left: '15%', top: '10%', width: '70%', height: '80%',
                }}>
                  {/* Corner handles */}
                  {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => (
                    <div
                      key={pos}
                      className={`absolute w-3 h-3 bg-white border border-on-surface ${
                        pos.includes('top') ? 'top-0' : 'bottom-0'
                      } ${pos.includes('left') ? 'left-0' : 'right-0'} -translate-x-1/2 -translate-y-1/2`}
                      style={{
                        transform: `translate(${pos.includes('left') ? '-50%' : '50%'}, ${pos.includes('top') ? '-50%' : '50%'})`,
                      }}
                    />
                  ))}
                  {/* Rule of thirds grid */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="border border-white/20" />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom tools */}
        <div className="h-12 bg-background border-t border-border-subtle flex items-center justify-center gap-6 px-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="material-symbols-outlined text-[18px]">search</span>
            <span className="tabular-nums">85%</span>
          </div>
          <button className="material-symbols-outlined text-muted hover:text-on-surface text-[20px]">fit_screen</button>
          <button className="material-symbols-outlined text-muted hover:text-on-surface text-[20px]">grid_on</button>
          <button className="material-symbols-outlined text-muted hover:text-on-surface text-[20px]">tune</button>
        </div>
      </div>

      {/* Right Panel: Operations */}
      <aside className="w-[320px] flex-shrink-0 bg-background border-l border-border-subtle flex flex-col overflow-y-auto">
        <div className="p-6 border-b border-border-subtle">
          <h2 className="font-display text-xl tracking-display">Operations</h2>
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted mt-1">Non-Destructive Edit</p>
        </div>

        {/* Operation selector */}
        <div className="p-6 border-b border-border-subtle">
          <div className="flex flex-col gap-1">
            {OPERATIONS.map((op) => (
              <button
                key={op.type}
                onClick={() => setActiveOp(op.type)}
                className={`flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  activeOp === op.type
                    ? 'text-on-surface font-bold border-l-2 border-on-surface -ml-[2px]'
                    : 'text-muted hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{op.icon}</span>
                <span className="text-ui text-[11px]">{op.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Operation params */}
        <div className="p-6 border-b border-border-subtle flex flex-col gap-4">
          {activeOp === 'crop' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.1em] text-muted block mb-1">X Position</label>
                  <input
                    type="number"
                    value={cropX}
                    onChange={(e) => setCropX(+e.target.value)}
                    className="w-full border border-border-subtle bg-transparent py-2 px-3 text-sm tabular-nums focus:border-on-surface focus:ring-0"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.1em] text-muted block mb-1">Y Position</label>
                  <input
                    type="number"
                    value={cropY}
                    onChange={(e) => setCropY(+e.target.value)}
                    className="w-full border border-border-subtle bg-transparent py-2 px-3 text-sm tabular-nums focus:border-on-surface focus:ring-0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.1em] text-muted block mb-1">Width</label>
                  <input
                    type="number"
                    value={cropW}
                    onChange={(e) => setCropW(+e.target.value)}
                    className="w-full border border-border-subtle bg-transparent py-2 px-3 text-sm tabular-nums focus:border-on-surface focus:ring-0"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.1em] text-muted block mb-1">Height</label>
                  <input
                    type="number"
                    value={cropH}
                    onChange={(e) => setCropH(+e.target.value)}
                    className="w-full border border-border-subtle bg-transparent py-2 px-3 text-sm tabular-nums focus:border-on-surface focus:ring-0"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.1em] text-muted block mb-2">Aspect Ratio Lock</label>
                <div className="flex gap-2">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectLock(ratio)}
                      className={`px-3 py-1.5 text-[11px] border transition-colors ${
                        aspectLock === ratio
                          ? 'bg-on-surface text-background border-on-surface'
                          : 'text-muted border-border-subtle hover:border-on-surface'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeOp === 'resize' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-[0.1em] text-muted block mb-1">Width</label>
                <input type="number" value={resizeW} onChange={(e) => setResizeW(+e.target.value)} className="w-full border border-border-subtle bg-transparent py-2 px-3 text-sm tabular-nums focus:border-on-surface focus:ring-0" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.1em] text-muted block mb-1">Height</label>
                <input type="number" value={resizeH} onChange={(e) => setResizeH(+e.target.value)} className="w-full border border-border-subtle bg-transparent py-2 px-3 text-sm tabular-nums focus:border-on-surface focus:ring-0" />
              </div>
            </div>
          )}

          {activeOp === 'rotate' && (
            <div>
              <label className="text-[10px] uppercase tracking-[0.1em] text-muted block mb-2">Degrees</label>
              <div className="flex gap-2">
                {[90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => setRotateDeg(deg)}
                    className={`px-4 py-2 text-[11px] border transition-colors ${
                      rotateDeg === deg ? 'bg-on-surface text-background border-on-surface' : 'text-muted border-border-subtle hover:border-on-surface'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeOp === 'pad' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Top', value: padTop, set: setPadTop },
                { label: 'Bottom', value: padBottom, set: setPadBottom },
                { label: 'Left', value: padLeft, set: setPadLeft },
                { label: 'Right', value: padRight, set: setPadRight },
              ].map((p) => (
                <div key={p.label}>
                  <label className="text-[10px] uppercase tracking-[0.1em] text-muted block mb-1">{p.label}</label>
                  <input type="number" value={p.value} onChange={(e) => p.set(+e.target.value)} className="w-full border border-border-subtle bg-transparent py-2 px-3 text-sm tabular-nums focus:border-on-surface focus:ring-0" />
                </div>
              ))}
            </div>
          )}

          {activeOp === 'upscale' && (
            <div>
              <label className="text-[10px] uppercase tracking-[0.1em] text-muted block mb-2">Scale Factor</label>
              <div className="flex gap-2">
                {['2x', '4x'].map((scale) => (
                  <button key={scale} className="px-4 py-2 text-[11px] border border-border-subtle text-muted hover:border-on-surface hover:text-on-surface transition-colors">
                    {scale}
                  </button>
                ))}
              </div>
              <label className="text-[10px] uppercase tracking-[0.1em] text-muted block mb-2 mt-4">Method</label>
              <div className="flex gap-2">
                {['Lanczos', 'AI (ESRGAN)'].map((method) => (
                  <button key={method} className="px-4 py-2 text-[11px] border border-border-subtle text-muted hover:border-on-surface hover:text-on-surface transition-colors">
                    {method}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Operation History */}
        <div className="p-6 border-b border-border-subtle flex-1">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted mb-4">Operation History</h3>
          <div className="space-y-3">
            {history.map((op, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-on-surface mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-on-surface capitalize">{op.type} Transformation</p>
                  <p className="text-xs text-muted">
                    {Object.values(op.params).map((v) => `${v}`).join(' · ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-4 text-xs">
            <button onClick={handleAddOp} className="text-primary hover:text-on-surface flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">add</span> Add Operation
            </button>
            <button onClick={() => setHistory((prev) => prev.slice(0, -1))} className="text-muted hover:text-on-surface flex items-center gap-1" disabled={history.length === 0}>
              <span className="material-symbols-outlined text-[14px]">undo</span> Undo
            </button>
          </div>
        </div>

        {/* Save */}
        <div className="p-6">
          <button
            onClick={handleSave}
            disabled={applyPreprocess.isPending}
            className="w-full bg-on-surface text-background py-3.5 text-[11px] uppercase font-bold tracking-[0.15em] hover:opacity-90 transition-all disabled:opacity-50"
          >
            {applyPreprocess.isPending ? 'Processing...' : 'Save Derivative'}
          </button>
          {applyPreprocess.error && (
            <p className="text-[11px] text-accent mt-2">{(applyPreprocess.error as Error).message}</p>
          )}
        </div>
      </aside>
    </div>
  )
}
