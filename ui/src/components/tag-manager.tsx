import { useState } from 'react'
import { Badge } from '@/components/ui/badge'

interface TagItem {
  name: string
  count: number
}

// TODO: Replace with real data from API
const MOCK_TAGS: TagItem[] = [
  { name: 'Cyberpunk', count: 142 },
  { name: 'Moody Lighting', count: 98 },
  { name: 'Portrait', count: 86 },
  { name: 'Profile', count: 72 },
  { name: 'Neon', count: 64 },
  { name: 'Sci-Fi', count: 51 },
  { name: 'High Contrast', count: 48 },
  { name: 'Close Up', count: 42 },
  { name: 'Gritty', count: 37 },
  { name: 'Monochrome', count: 31 },
]

export function TagManager() {
  const [selectedTag, setSelectedTag] = useState<string>('Cyberpunk')
  const [search, setSearch] = useState('')

  const tags = MOCK_TAGS.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )
  const selected = MOCK_TAGS.find((t) => t.name === selectedTag)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-[88px] flex items-center justify-between px-8 border-b border-border-subtle bg-background z-10">
        <div className="flex flex-col">
          <h2 className="font-display text-3xl">Taxonomy</h2>
          <p className="text-muted text-sm">Manage global tags, synonyms, and relationships</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-1 overflow-hidden mt-[88px]">
        {/* Left Column: Tag List */}
        <section className="w-[320px] flex flex-col border-r border-border-subtle bg-background shrink-0">
          <div className="p-4 border-b border-border-subtle flex flex-col gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[18px]">search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface border-none rounded pl-9 pr-3 py-2 text-sm placeholder:text-muted focus:ring-1 focus:ring-primary focus:outline-none transition-shadow"
                placeholder="Search tags..."
                type="text"
              />
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-ui text-[11px] text-muted">{tags.length} Tags Indexed</span>
              <button className="flex items-center gap-1 text-muted hover:text-primary text-ui text-[11px] transition-colors">
                Sort: Count
                <span className="material-symbols-outlined text-[14px]">expand_more</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tags.map((tag) => (
              <button
                key={tag.name}
                onClick={() => setSelectedTag(tag.name)}
                className={`flex items-center justify-between px-4 py-3 border-b border-border-subtle border-l-2 text-left w-full transition-colors group ${
                  tag.name === selectedTag
                    ? 'bg-surface border-l-primary'
                    : 'border-l-transparent hover:bg-surface/50'
                }`}
              >
                <span className={`font-body text-primary ${tag.name === selectedTag ? 'font-medium' : ''}`}>{tag.name}</span>
                <span className="text-meta text-muted group-hover:text-primary transition-colors">{tag.count}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Right Column: Detail Pane */}
        <section className="flex-1 flex flex-col overflow-y-auto bg-background">
          {selected ? (
            <div className="max-w-[720px] w-full mx-auto p-12 flex flex-col gap-12">
              <div className="flex flex-col gap-2">
                <h2 className="font-display text-[48px] leading-none text-primary">{selected.name}</h2>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-meta bg-surface border-border-subtle rounded">
                    {selected.count} Assets
                  </Badge>
                  <span className="text-muted text-sm font-body">Created Oct 12, 2023</span>
                </div>
              </div>

              {/* Usage Statistics */}
              <div className="flex flex-col gap-4">
                <h3 className="text-ui text-[13px] text-muted border-b border-border-subtle pb-2">Usage Statistics</h3>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-meta text-muted mb-1">Associated Characters</p>
                    <p className="font-body text-primary text-sm">4 Characters</p>
                  </div>
                  <div>
                    <p className="text-meta text-muted mb-1">Dominant Eras</p>
                    <p className="font-body text-primary text-sm">—</p>
                  </div>
                </div>
              </div>

              {/* Relationships */}
              <div className="flex flex-col gap-4">
                <h3 className="text-ui text-[13px] text-muted border-b border-border-subtle pb-2">Relationships</h3>
                <div>
                  <p className="text-meta text-muted mb-2">Synonyms (Auto-mapped during search)</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-surface border border-border-subtle rounded text-sm flex items-center gap-2 group cursor-pointer hover:border-primary transition-colors">
                      sci-fi
                      <span className="material-symbols-outlined text-[14px] text-muted group-hover:text-primary">close</span>
                    </span>
                    <button className="px-3 py-1 border border-dashed border-muted text-muted rounded text-sm hover:text-primary hover:border-primary transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">add</span> Add Synonym
                    </button>
                  </div>
                </div>
              </div>

              {/* Merge */}
              <div className="flex flex-col gap-4 bg-surface p-6 rounded border border-border-subtle">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">call_merge</span>
                  <h3 className="text-ui text-[13px] text-primary">Merge Tag</h3>
                </div>
                <p className="text-sm text-muted">
                  Reassign all assets currently tagged with <strong className="text-primary font-medium">{selected.name}</strong> to a parent tag. This tag will be removed.
                </p>
                <div className="flex items-end gap-4">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-meta text-muted">Target Parent Tag</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[18px]">search</span>
                      <input
                        className="w-full bg-background border border-border-subtle rounded pl-9 pr-3 py-2 text-sm focus:border-primary focus:ring-0 transition-colors"
                        placeholder="Select target tag..."
                        type="text"
                      />
                    </div>
                  </div>
                  <button className="bg-primary text-background px-6 py-2 rounded text-ui text-[13px] hover:bg-primary/90 transition-colors h-[38px] disabled:opacity-50" disabled>
                    Merge
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="flex flex-col gap-4 mt-8 pt-8 border-t border-border-subtle">
                <h3 className="text-ui text-[13px] text-accent">Danger Zone</h3>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted max-w-[400px]">
                    Permanently remove this tag from the taxonomy. This will strip the tag from {selected.count} assets.
                  </p>
                  <button className="border border-accent text-accent px-4 py-2 rounded text-ui text-[13px] hover:bg-accent hover:text-white transition-colors">
                    Delete Tag
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted">
              Select a tag to view details
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
