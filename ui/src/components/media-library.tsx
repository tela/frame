import { useState } from 'react'
import { useMediaItems } from '@/lib/api'
import type { MediaContentType, MediaItem } from '@/lib/types'

const TABS: { label: string; value: MediaContentType | 'all' }[] = [
  { label: 'All Media', value: 'all' },
  { label: 'Wardrobe', value: 'wardrobe' },
  { label: 'Props', value: 'prop' },
  { label: 'Locations', value: 'location' },
]

export function MediaLibrary() {
  const [activeTab, setActiveTab] = useState<MediaContentType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Fetch based on active tab — for 'all', we'd need to merge queries
  const { data: items, isLoading } = useMediaItems(activeTab === 'all' ? 'wardrobe' : activeTab)

  const filtered = (items ?? []).filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab Navigation + Search */}
      <header className="border-b border-border-subtle bg-background sticky top-0 z-10">
        <div className="px-8 pt-6 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setActiveTab(tab.value); setSelected(new Set()) }}
                className={`text-ui text-[13px] pb-4 border-b-2 transition-colors ${
                  activeTab === tab.value
                    ? 'text-primary border-primary'
                    : 'text-muted border-transparent hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[18px]">search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-surface border border-border-subtle rounded pl-9 pr-3 py-2 text-sm placeholder:text-muted focus:border-primary focus:ring-0 focus:outline-none transition-colors w-64"
                placeholder="Search media..."
                type="text"
              />
            </div>
            <button className="material-symbols-outlined text-muted hover:text-primary text-[20px] transition-colors">notifications</button>
            <button className="material-symbols-outlined text-muted hover:text-primary text-[20px] transition-colors">settings</button>
          </div>
        </div>
      </header>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <div className="text-muted text-[15px]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-muted text-[15px] text-center py-20">
            <span className="material-symbols-outlined text-[48px] mb-4 block">photo_library</span>
            No media items found
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filtered.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                isSelected={selected.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="border-t border-border-subtle bg-background px-8 py-4 flex items-center justify-between">
          <span className="text-ui text-[13px] text-primary">{selected.size} Assets Selected</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelected(new Set())}
              className="text-ui text-[13px] text-muted hover:text-primary transition-colors"
            >
              Deselect
            </button>
            <button className="text-ui text-[13px] text-muted hover:text-primary transition-colors">Archive</button>
            <button className="text-ui text-[13px] text-muted hover:text-primary transition-colors">Bulk Tag</button>
            <button className="text-ui text-[13px] text-accent hover:text-accent/80 transition-colors">Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}

function MediaCard({ item, isSelected, onToggleSelect }: {
  item: MediaItem
  isSelected: boolean
  onToggleSelect: () => void
}) {
  return (
    <div
      className={`relative group cursor-pointer rounded overflow-hidden border transition-colors ${
        isSelected ? 'border-primary' : 'border-border-subtle hover:border-primary'
      }`}
      onClick={onToggleSelect}
    >
      <div className="aspect-square bg-surface flex items-center justify-center">
        <span className="material-symbols-outlined text-[48px] text-muted/30">image</span>
      </div>

      {/* Selection checkmark */}
      {isSelected && (
        <div className="absolute top-2 left-2 w-6 h-6 bg-primary rounded-sm flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-[16px]">check</span>
        </div>
      )}

      <div className="p-3">
        <h3 className="text-ui text-[13px] text-primary truncate">{item.name.toUpperCase()}</h3>
        <p className="text-meta text-muted mt-1 capitalize">{item.content_type}</p>
      </div>
    </div>
  )
}
