import { useState } from 'react'
import { useCharacters } from '@/lib/api'
import type { ImageSearchParams } from '@/lib/api'

export interface SearchFilterState {
  character: string
  tags: string[]
  ratingMin: number
  source: string
  setType: string
  triageStatus: string
  query: string
  sort: string
}

const EMPTY_FILTERS: SearchFilterState = {
  character: '',
  tags: [],
  ratingMin: 0,
  source: '',
  setType: '',
  triageStatus: '',
  query: '',
  sort: '',
}

export function useSearchFilters(initial?: Partial<SearchFilterState>) {
  const [filters, setFilters] = useState<SearchFilterState>({ ...EMPTY_FILTERS, ...initial })

  const setFilter = <K extends keyof SearchFilterState>(key: K, value: SearchFilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const addTag = (tag: string) => {
    if (tag && !filters.tags.includes(tag)) {
      setFilter('tags', [...filters.tags, tag])
    }
  }

  const removeTag = (tag: string) => {
    setFilter('tags', filters.tags.filter(t => t !== tag))
  }

  const reset = () => setFilters({ ...EMPTY_FILTERS, ...initial })

  const toSearchParams = (overrides?: Partial<ImageSearchParams>): ImageSearchParams => ({
    character: filters.character || undefined,
    tags: filters.tags.length > 0 ? filters.tags : undefined,
    rating_min: filters.ratingMin > 0 ? filters.ratingMin : undefined,
    source: filters.source || undefined,
    set_type: filters.setType || undefined,
    triage_status: filters.triageStatus || undefined,
    q: filters.query || undefined,
    sort: filters.sort || undefined,
    ...overrides,
  })

  return { filters, setFilter, addTag, removeTag, reset, toSearchParams }
}

export function ImageSearchFilters({ filters, setFilter, addTag, removeTag, compact }: {
  filters: SearchFilterState
  setFilter: <K extends keyof SearchFilterState>(key: K, value: SearchFilterState[K]) => void
  addTag: (tag: string) => void
  removeTag: (tag: string) => void
  compact?: boolean
}) {
  const { data: characters } = useCharacters()
  const [tagInput, setTagInput] = useState('')

  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag) {
      addTag(tag)
      setTagInput('')
    }
  }

  const labelClass = "text-[11px] uppercase tracking-[0.1em] font-bold text-muted"
  const selectClass = "w-full bg-transparent border border-border-subtle py-2 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none"

  return (
    <div className={`flex flex-col gap-${compact ? '4' : '6'}`}>
      {/* Text search */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Search</label>
        <input
          value={filters.query}
          onChange={(e) => setFilter('query', e.target.value)}
          placeholder="Search filenames and captions..."
          className={selectClass}
        />
      </div>

      {/* Character */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Character</label>
        <select
          value={filters.character}
          onChange={(e) => setFilter('character', e.target.value)}
          className={selectClass}
        >
          <option value="">All characters</option>
          {(characters ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.display_name || c.name}</option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Tags</label>
        {filters.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {filters.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 bg-surface-low text-on-surface text-[11px] px-2 py-1"
              >
                {tag}
                <button onClick={() => removeTag(tag)} className="text-muted hover:text-on-surface">
                  <span className="material-symbols-outlined text-[12px]">close</span>
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
            placeholder="namespace:value"
            className="flex-1 bg-transparent border border-border-subtle py-1.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none"
          />
          <button
            onClick={handleAddTag}
            disabled={!tagInput.trim()}
            className="px-3 py-1.5 bg-on-surface text-background text-[11px] font-bold uppercase disabled:opacity-30"
          >
            Add
          </button>
        </div>
      </div>

      {/* Rating */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Min Rating</label>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setFilter('ratingMin', star)}
              className={`px-2.5 py-1 text-[11px] font-bold border transition-colors ${
                filters.ratingMin === star
                  ? 'bg-on-surface text-background border-on-surface'
                  : 'text-muted border-border-subtle hover:border-on-surface'
              }`}
            >
              {star === 0 ? 'Any' : `${star}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Source */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Source</label>
        <div className="flex gap-1">
          {[
            { value: '', label: 'All' },
            { value: 'comfyui', label: 'Generated' },
            { value: 'fig', label: 'Fig' },
            { value: 'manual', label: 'Manual' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter('source', opt.value)}
              className={`px-3 py-1 text-[11px] font-bold uppercase border transition-colors ${
                filters.source === opt.value
                  ? 'bg-on-surface text-background border-on-surface'
                  : 'text-muted border-border-subtle hover:border-on-surface'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Set Type */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Set Type</label>
        <select
          value={filters.setType}
          onChange={(e) => setFilter('setType', e.target.value)}
          className={selectClass}
        >
          <option value="">All</option>
          <option value="staging">Staging</option>
          <option value="reference">Reference</option>
          <option value="curated">Curated</option>
          <option value="training">Training</option>
          <option value="archive">Archive</option>
        </select>
      </div>

      {/* Triage Status */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Triage Status</label>
        <select
          value={filters.triageStatus}
          onChange={(e) => setFilter('triageStatus', e.target.value)}
          className={selectClass}
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Sort */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>Sort</label>
        <select
          value={filters.sort}
          onChange={(e) => setFilter('sort', e.target.value)}
          className={selectClass}
        >
          <option value="">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="rating">Highest Rating</option>
          <option value="filename">Filename</option>
        </select>
      </div>
    </div>
  )
}
