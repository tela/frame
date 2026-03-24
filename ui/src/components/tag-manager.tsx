import { useState } from 'react'
import { useTagFamilies, useTags } from '@/lib/api'
import type { TagSummary } from '@/lib/types'

const FAMILY_ICONS: Record<string, string> = {
  'fam_character': 'fingerprint',
  'fam_nsfw': 'explicit',
  'fam_technical': 'settings_ethernet',
  'fam_training': 'model_training',
}

export function TagManager() {
  const { data: families } = useTagFamilies()
  const [activeFamily, setActiveFamily] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<TagSummary | null>(null)
  const [search, setSearch] = useState('')

  const activeFamilyId = activeFamily ?? families?.[0]?.id ?? null
  const { data: tags } = useTags(activeFamilyId ?? undefined)
  const activeF = families?.find((f) => f.id === activeFamilyId)

  const filteredTags = (tags ?? []).filter((t) =>
    t.tag_value.toLowerCase().includes(search.toLowerCase()) ||
    t.tag_namespace.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-full overflow-hidden">
      {/* Family Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-surface-low flex flex-col py-6 px-4 gap-4 h-full">
        <div className="mb-8">
          <span className="text-lg font-display italic text-on-surface">Frame Archive</span>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-ui text-[11px] text-muted px-3 mb-2">Tag Families</h2>
          <p className="text-xs text-muted px-3 mb-4">Domain Management</p>

          {(families ?? []).map((family) => {
            const isActive = family.id === activeFamilyId
            const icon = FAMILY_ICONS[family.id] ?? 'label'
            return (
              <button
                key={family.id}
                onClick={() => { setActiveFamily(family.id); setSelectedTag(null); setSearch('') }}
                className={`flex items-center gap-3 px-3 py-2 text-left transition-all duration-200 hover:translate-x-1 ${
                  isActive
                    ? 'bg-surface-lowest text-primary rounded-l-sm shadow-sm'
                    : 'text-muted hover:bg-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
                <span className="text-ui text-[11px] font-bold">{family.name}</span>
              </button>
            )
          })}
        </div>

        <button className="mt-4 mx-3 py-3 border border-border-subtle bg-surface hover:bg-surface-high text-on-surface text-[10px] uppercase font-bold tracking-[0.15em] transition-all">
          Create New Family
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full bg-background">
        {/* Top Bar */}
        <header className="flex justify-between items-center px-8 py-4 border-b border-border-subtle/50">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold font-display text-on-surface">Tag Manager</span>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Tag List */}
          <section className="w-1/3 flex flex-col border-r border-border-subtle/20 bg-background">
            <div className="p-8 border-b border-border-subtle/10">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h1 className="text-3xl font-display tracking-display text-on-surface">{activeF?.name ?? 'Tags'}</h1>
                  <p className="text-[10px] uppercase font-bold tracking-[0.15em] text-muted mt-1">Namespace Registry</p>
                </div>
              </div>
              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-surface-low border-none text-sm py-3 px-4 focus:bg-surface-lowest focus:ring-1 focus:ring-on-surface transition-all placeholder-muted"
                  placeholder={`Filter ${activeF?.name ?? ''} Tags...`}
                  type="text"
                />
                <span className="absolute right-4 top-3.5 material-symbols-outlined text-muted">search</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-6 space-y-1">
              {filteredTags.map((tag) => {
                const isActive = selectedTag?.tag_namespace === tag.tag_namespace && selectedTag?.tag_value === tag.tag_value
                return (
                  <button
                    key={`${tag.tag_namespace}:${tag.tag_value}`}
                    onClick={() => setSelectedTag(tag)}
                    className={`group flex items-center justify-between p-4 w-full text-left transition-all ${
                      isActive
                        ? 'bg-surface shadow-sm border-l-2 border-on-surface'
                        : 'hover:bg-surface-low border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold tracking-tight text-muted mb-0.5">
                        {tag.tag_namespace}
                      </span>
                      <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'} text-on-surface`}>
                        {tag.tag_value}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-body tabular-nums px-2 py-0.5 ${
                        isActive ? 'bg-primary text-background' : 'bg-surface text-muted'
                      }`}>
                        {tag.count}
                      </span>
                      <span className={`material-symbols-outlined text-muted ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                        chevron_right
                      </span>
                    </div>
                  </button>
                )
              })}
              {filteredTags.length === 0 && (
                <p className="text-muted text-sm text-center py-8">No tags found</p>
              )}
            </div>
          </section>

          {/* Right Column: Detail Pane */}
          <section className="flex-1 overflow-y-auto bg-background p-12">
            {selectedTag ? (
              <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-start mb-16">
                  <div className="space-y-4">
                    <span className="inline-block px-3 py-1 bg-surface-high text-on-surface text-[10px] uppercase font-bold tracking-[0.15em]">
                      Active Definition
                    </span>
                    <h2 className="text-5xl font-display italic tracking-display text-on-surface">
                      {selectedTag.tag_value}
                    </h2>
                    <p className="text-lg font-display text-muted italic">
                      Namespace: {selectedTag.tag_namespace}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button className="bg-on-surface text-background px-8 py-3 text-xs uppercase font-bold tracking-[0.15em] hover:opacity-90 transition-all">
                      Merge Tag
                    </button>
                    <button className="border border-border-subtle px-8 py-3 text-xs uppercase font-bold tracking-[0.15em] hover:bg-surface transition-all">
                      Archive Entry
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-8 mb-20">
                  <div className="bg-surface-low p-8">
                    <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-muted mb-4 block">Total Usage</span>
                    <span className="text-4xl font-display text-on-surface">{selectedTag.count.toLocaleString()}</span>
                    <div className="mt-4 h-1 w-full bg-surface">
                      <div className="h-full bg-on-surface" style={{ width: '65%' }} />
                    </div>
                  </div>
                  <div className="bg-surface-low p-8">
                    <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-muted mb-4 block">Family</span>
                    <span className="text-2xl font-display text-on-surface">{activeF?.name ?? '—'}</span>
                  </div>
                  <div className="bg-surface-low p-8">
                    <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-muted mb-4 block">Namespace</span>
                    <span className="text-2xl font-display text-on-surface">{selectedTag.tag_namespace}</span>
                  </div>
                </div>

                {/* Synonyms */}
                <div className="space-y-8 mb-20">
                  <div className="flex justify-between items-baseline border-b border-border-subtle/20 pb-4">
                    <h3 className="text-2xl font-display tracking-display">Synonym Registry</h3>
                    <button className="text-[10px] uppercase font-bold text-accent hover:underline">Add New Reference</button>
                  </div>
                  <p className="text-sm text-muted">No synonyms defined. Add synonyms to auto-map during search.</p>
                </div>

                {/* Danger Zone */}
                <div className="border-t border-border-subtle pt-8">
                  <h3 className="text-ui text-[13px] text-accent mb-4">Danger Zone</h3>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted max-w-[400px]">
                      Permanently remove this tag from the taxonomy. This will strip the tag from {selectedTag.count} assets.
                    </p>
                    <button className="border border-accent text-accent px-4 py-2 rounded text-ui text-[13px] hover:bg-accent hover:text-white transition-colors">
                      Delete Tag
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted">
                <p className="text-sm">Select a tag to view details</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
