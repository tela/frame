import { useState } from 'react'
import { useCharacters } from '@/lib/api'

export function ImportScreen() {
  const { data: characters } = useCharacters()
  const [directoryPath, setDirectoryPath] = useState('')
  const [characterId, setCharacterId] = useState('')
  const [sourceOrigin, setSourceOrigin] = useState<'comfyui' | 'fig' | 'manual'>('manual')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [importing] = useState(false)

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (t: string) => setTags(tags.filter((tag) => tag !== t))

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-12 pt-12 pb-8">
        <h1 className="text-5xl font-display tracking-display text-on-surface mb-4">Import Assets</h1>
        <p className="text-lg font-display text-muted italic max-w-2xl">
          Seamlessly ingest high-fidelity visual artifacts into the curate archive. Drag and drop local directories or individual frames to begin identity alignment.
        </p>
      </div>

      <div className="px-12 flex gap-12">
        {/* Left: Source & Metadata */}
        <div className="flex-1 max-w-2xl">
          {/* Source Selection */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-8 rounded-full bg-on-surface text-background flex items-center justify-center text-sm font-bold">01</span>
              <h2 className="text-ui text-[13px] tracking-[0.15em]">Source Selection</h2>
            </div>

            {/* Drop zone */}
            <div className="border-2 border-dashed border-border-subtle hover:border-on-surface transition-colors p-12 flex flex-col items-center justify-center gap-4 bg-surface-low/50 cursor-pointer group">
              <span className="material-symbols-outlined text-[48px] text-muted group-hover:text-on-surface transition-colors">cloud_upload</span>
              <p className="text-sm text-muted">Drag and drop directories or files here</p>
              <p className="text-xs text-muted">Supports PNG, WEBP, and TIFF up to 50MB</p>
              <div className="flex gap-3 mt-2">
                <button className="border border-on-surface text-on-surface px-4 py-2 text-[11px] uppercase font-bold tracking-[0.1em] hover:bg-on-surface hover:text-background transition-colors">
                  Browse Files
                </button>
                <button className="border border-on-surface text-on-surface px-4 py-2 text-[11px] uppercase font-bold tracking-[0.1em] hover:bg-on-surface hover:text-background transition-colors">
                  Link Directory
                </button>
              </div>
            </div>

            {/* Directory path */}
            <div className="mt-4 flex items-center gap-2">
              <input
                value={directoryPath}
                onChange={(e) => setDirectoryPath(e.target.value)}
                className="flex-1 bg-surface-low border border-border-subtle text-sm py-2 px-4 focus:border-on-surface focus:ring-0 transition-colors placeholder-muted font-body"
                placeholder="/volumes/Studio_A/Project_East/Shoot/2024_Q1/"
              />
              <button className="text-[11px] uppercase font-bold text-accent hover:underline">Change</button>
            </div>
          </div>

          {/* Contextual Metadata */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-8 rounded-full bg-on-surface text-background flex items-center justify-center text-sm font-bold">02</span>
              <h2 className="text-ui text-[13px] tracking-[0.15em]">Contextual Metadata</h2>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Character */}
              <div>
                <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Primary Character</label>
                <select
                  value={characterId}
                  onChange={(e) => setCharacterId(e.target.value)}
                  className="w-full bg-transparent border border-border-subtle py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 cursor-pointer"
                >
                  <option value="">No character</option>
                  {(characters ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.display_name || c.name}</option>
                  ))}
                </select>
              </div>

              {/* Era */}
              <div>
                <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Era / Timeline</label>
                <select className="w-full bg-transparent border border-border-subtle py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 cursor-pointer">
                  <option>No era</option>
                </select>
              </div>
            </div>

            {/* Source origin */}
            <div className="mb-6">
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Source Origin</label>
              <div className="flex gap-2">
                {(['comfyui', 'fig', 'manual'] as const).map((src) => (
                  <button
                    key={src}
                    onClick={() => setSourceOrigin(src)}
                    className={`px-4 py-2 text-[11px] uppercase font-bold tracking-[0.1em] border transition-colors ${
                      sourceOrigin === src
                        ? 'bg-on-surface text-background border-on-surface'
                        : 'text-muted border-border-subtle hover:border-on-surface'
                    }`}
                  >
                    {src}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Tag Selection</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((t) => (
                  <span key={t} className="px-2 py-1 bg-accent/10 text-accent text-[11px] uppercase font-bold flex items-center gap-1">
                    {t}
                    <span className="material-symbols-outlined text-[12px] cursor-pointer hover:text-accent/70" onClick={() => removeTag(t)}>close</span>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  className="flex-1 bg-surface-low border border-border-subtle text-sm py-2 px-3 focus:border-on-surface focus:ring-0 placeholder-muted"
                  placeholder="+ Add Tag"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Import Queue & Progress */}
        <div className="w-[320px] flex-shrink-0">
          <div className="border border-border-subtle bg-background p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-ui text-[13px] tracking-[0.15em]">Import Queue</h3>
              <span className="text-meta text-muted">Est: 0 / 12s</span>
            </div>

            {/* Preview grid */}
            <div className="grid grid-cols-4 gap-1 mb-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square bg-surface-low" />
              ))}
            </div>

            <button
              disabled={importing}
              className="w-full bg-accent text-white py-3 text-[11px] uppercase font-bold tracking-[0.15em] hover:opacity-90 transition-all disabled:opacity-50"
            >
              Execute Import
            </button>
          </div>

          {/* Active session */}
          <div className="mt-6 border border-border-subtle bg-background p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-ui text-[13px] tracking-[0.15em]">Active Session</h3>
            </div>
            <p className="text-xs text-muted">No active import session</p>
          </div>
        </div>
      </div>
    </div>
  )
}
