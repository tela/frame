import { useState } from 'react'

export function ImageSearch() {
  const [query, setQuery] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>(['neon', 'rain', 'night'])
  const [minRating, setMinRating] = useState(3)

  const removeTag = (tag: string) => {
    setActiveTags((prev) => prev.filter((t) => t !== tag))
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Filter Sidebar */}
      <aside className="w-[280px] flex-shrink-0 border-r border-border-subtle bg-background flex flex-col p-6 gap-8 overflow-y-auto hidden lg:flex">
        {/* Tags */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-ui text-[13px] text-muted">Tags</h3>
            <button className="material-symbols-outlined text-muted hover:text-primary text-[18px] transition-colors">add</button>
          </div>
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
          <div className="flex flex-wrap gap-2">
            {['portrait', 'cinematic', 'dress', 'mono'].map((tag) => (
              <span
                key={tag}
                onClick={() => setActiveTags((prev) => [...prev, tag])}
                className="px-2 py-1 border border-dashed border-border-subtle rounded text-[12px] font-ui text-muted cursor-pointer hover:border-primary hover:text-primary transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Rating */}
        <div className="flex flex-col gap-3">
          <h3 className="text-ui text-[13px] text-muted">Minimum Rating</h3>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setMinRating(star)}
                className={`w-8 h-8 flex items-center justify-center rounded-sm border transition-colors ${
                  star <= minRating
                    ? 'bg-accent border-accent text-white'
                    : 'bg-surface border-border-subtle text-muted hover:border-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: star <= minRating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratio */}
        <div className="flex flex-col gap-3">
          <h3 className="text-ui text-[13px] text-muted">Aspect Ratio</h3>
          <div className="flex flex-col gap-2 text-sm">
            {[
              { label: 'Square (1:1)', value: 'square' },
              { label: 'Portrait (3:4, 9:16)', value: 'portrait' },
              { label: 'Landscape (16:9, 3:2)', value: 'landscape' },
            ].map((ratio) => (
              <label key={ratio.value} className="flex items-center gap-2 text-primary cursor-pointer">
                <input type="checkbox" className="rounded border-border-subtle text-primary focus:ring-primary" />
                {ratio.label}
              </label>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search Header */}
        <div className="px-8 py-6 border-b border-border-subtle bg-background flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-[32px] lg:text-[40px] font-display tracking-display text-primary placeholder:text-muted/40 focus:outline-none"
              placeholder="Search..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-meta text-muted">343 results</span>
            {query && (
              <button onClick={() => setQuery('')} className="text-muted hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Results toolbar */}
        <div className="px-8 py-3 border-b border-border-subtle bg-background flex items-center justify-between">
          <button className="lg:hidden flex items-center gap-2 text-ui text-[13px] text-muted hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Filters
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-ui text-[11px] text-muted">Sort by</span>
            <button className="flex items-center gap-1 text-ui text-[13px] text-primary">
              Relevance
              <span className="material-symbols-outlined text-[14px]">expand_more</span>
            </button>
          </div>
        </div>

        {/* Results Grid */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="text-muted text-[15px] text-center py-20">
            <span className="material-symbols-outlined text-[48px] mb-4 block">image_search</span>
            Search results will appear here
          </div>
        </div>
      </div>
    </div>
  )
}
