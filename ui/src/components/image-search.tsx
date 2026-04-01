import { useState } from 'react'
import { useImageSearch, useCharacters, thumbUrl } from '@/lib/api'
import type { SearchResult } from '@/lib/types'

export function ImageSearch() {
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [minRating, setMinRating] = useState(0)
  const [characterFilter, setCharacterFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [setTypeFilter, setSetTypeFilter] = useState('')

  const { data: characters } = useCharacters()
  const { data: results, isLoading } = useImageSearch({
    tags: activeTags.length > 0 ? activeTags : undefined,
    rating_min: minRating > 0 ? minRating : undefined,
    character: characterFilter || undefined,
    source: sourceFilter || undefined,
    set_type: setTypeFilter || undefined,
    limit: 60,
  })

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !activeTags.includes(tag)) {
      // If it doesn't contain ":", assume it's a value and prepend a wildcard namespace
      setActiveTags([...activeTags, tag.includes(':') ? tag : tag])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => setActiveTags(activeTags.filter((t) => t !== tag))

  return (
    <div className="flex h-full overflow-hidden">
      {/* Filter Sidebar */}
      <aside className="w-[280px] flex-shrink-0 border-r border-border-subtle bg-background flex flex-col p-6 gap-6 overflow-y-auto hidden lg:flex">
        {/* Character filter */}
        <div className="flex flex-col gap-2">
          <h3 className="text-ui text-[13px] text-muted">Character</h3>
          <select
            value={characterFilter}
            onChange={(e) => setCharacterFilter(e.target.value)}
            className="bg-transparent border border-border-subtle py-2 px-3 text-sm focus:border-on-surface focus:ring-0"
          >
            <option value="">All characters</option>
            {(characters ?? []).filter(c => c.id && !c.id.startsWith('seed-')).map((c) => (
              <option key={c.id} value={c.id}>{c.display_name || c.name}</option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-ui text-[13px] text-muted">Tags</h3>
          </div>
          {activeTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-surface border border-border-subtle rounded text-[12px] font-ui text-primary flex items-center gap-1 cursor-pointer hover:border-primary transition-colors"
                >
                  {tag}
                  <span className="material-symbols-outlined text-[12px] text-muted hover:text-primary" onClick={() => removeTag(tag)}>close</span>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-1">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              className="flex-1 bg-surface border border-border-subtle text-sm py-1.5 px-2 focus:border-on-surface focus:ring-0 placeholder-muted"
              placeholder="namespace:value"
            />
            <button onClick={addTag} className="px-2 border border-border-subtle text-muted hover:text-primary hover:border-primary transition-colors">
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>
        </div>

        {/* Rating */}
        <div className="flex flex-col gap-2">
          <h3 className="text-ui text-[13px] text-muted">Minimum Rating</h3>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setMinRating(star)}
                className={`w-8 h-8 flex items-center justify-center rounded-sm border transition-colors text-[12px] ${
                  star === minRating
                    ? 'bg-accent border-accent text-white'
                    : 'bg-surface border-border-subtle text-muted hover:border-primary'
                }`}
              >
                {star === 0 ? '—' : star}
              </button>
            ))}
          </div>
        </div>

        {/* Source */}
        <div className="flex flex-col gap-2">
          <h3 className="text-ui text-[13px] text-muted">Source</h3>
          <div className="flex flex-wrap gap-1">
            {['', 'fig', 'comfyui', 'manual'].map((src) => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`px-2 py-1 text-[11px] uppercase border transition-colors ${
                  sourceFilter === src ? 'bg-on-surface text-background border-on-surface' : 'text-muted border-border-subtle hover:border-on-surface'
                }`}
              >
                {src || 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Set type */}
        <div className="flex flex-col gap-2">
          <h3 className="text-ui text-[13px] text-muted">Set Type</h3>
          <div className="flex flex-wrap gap-1">
            {['', 'staging', 'reference', 'curated', 'training', 'archive'].map((st) => (
              <button
                key={st}
                onClick={() => setSetTypeFilter(st)}
                className={`px-2 py-1 text-[11px] uppercase border transition-colors ${
                  setTypeFilter === st ? 'bg-on-surface text-background border-on-surface' : 'text-muted border-border-subtle hover:border-on-surface'
                }`}
              >
                {st || 'All'}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-border-subtle bg-background flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-display tracking-display text-on-surface">Image Search</h1>
            {results && (
              <span className="text-meta text-muted">{results.total} results</span>
            )}
          </div>
        </div>

        {/* Results Grid */}
        <div className="flex-1 overflow-y-auto p-8">
          {isLoading ? (
            <p className="text-muted text-center py-12">Searching...</p>
          ) : (results?.images.length ?? 0) === 0 ? (
            <div className="text-muted text-center py-20">
              <span className="material-symbols-outlined text-[48px] text-muted/30 mb-4 block">image_search</span>
              <p className="text-sm">No images match your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {results?.images.map((img) => (
                <SearchResultCard key={img.id} result={img} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SearchResultCard({ result }: { result: SearchResult }) {
  return (
    <div className="group relative border border-border-subtle hover:border-primary transition-colors overflow-hidden">
      <div className="aspect-square bg-surface-low overflow-hidden">
        <img
          src={thumbUrl(result.id)}
          alt={result.original_filename}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-background">
        <div className="space-y-1">
          {result.character_name && (
            <p className="text-[10px] uppercase tracking-widest">{result.character_name}</p>
          )}
          {result.era_label && (
            <p className="text-[9px] text-background/70">{result.era_label}</p>
          )}
          <div className="flex gap-1">
            {result.set_type && (
              <span className="text-[8px] uppercase tracking-wider bg-background/20 px-1.5 py-0.5">{result.set_type}</span>
            )}
            {result.ref_type && <span className="text-[8px] uppercase bg-accent/80 px-1.5 py-0.5">{result.ref_type}</span>}
          </div>
          {result.rating != null && result.rating > 0 && (
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: s <= result.rating! ? "'FILL' 1" : "'FILL' 0" }}>star</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
