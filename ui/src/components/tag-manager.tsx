import { useState } from 'react'
import { useTagFamilies, useTags, useCreateTagFamily, useDeleteTag, useRenameTag, useMergeTag } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { TagSummary } from '@/lib/types'

const FAMILY_ICONS: Record<string, string> = {
  'fam_character': 'fingerprint',
  'fam_nsfw': 'explicit',
  'fam_technical': 'settings_ethernet',
  'fam_training': 'model_training',
}

export function TagManager() {
  const { data: families } = useTagFamilies()
  const createFamily = useCreateTagFamily()
  const deleteTagMutation = useDeleteTag()
  const renameTagMutation = useRenameTag()
  const mergeTagMutation = useMergeTag()

  const [activeFamily, setActiveFamily] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<TagSummary | null>(null)
  const [search, setSearch] = useState('')
  const [showCreateFamily, setShowCreateFamily] = useState(false)
  const [newFamilyName, setNewFamilyName] = useState('')
  const [showRename, setShowRename] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [showMerge, setShowMerge] = useState(false)
  const [mergeTarget, setMergeTarget] = useState('')

  const activeFamilyId = activeFamily ?? families?.[0]?.id ?? null
  const { data: tags } = useTags(activeFamilyId ?? undefined)
  const activeF = families?.find((f) => f.id === activeFamilyId)

  const filteredTags = (tags ?? []).filter((t) =>
    t.tag_value.toLowerCase().includes(search.toLowerCase()) ||
    t.tag_namespace.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreateFamily = () => {
    if (!newFamilyName.trim()) return
    createFamily.mutate(
      { name: newFamilyName.trim() },
      { onSuccess: () => { setShowCreateFamily(false); setNewFamilyName('') } }
    )
  }

  const handleDeleteTag = () => {
    if (!selectedTag) return
    deleteTagMutation.mutate(
      { namespace: selectedTag.tag_namespace, value: selectedTag.tag_value },
      { onSuccess: () => setSelectedTag(null) }
    )
  }

  const handleRename = () => {
    if (!selectedTag || !renameValue.trim()) return
    renameTagMutation.mutate(
      { namespace: selectedTag.tag_namespace, old_value: selectedTag.tag_value, new_value: renameValue.trim() },
      { onSuccess: () => { setShowRename(false); setSelectedTag(null) } }
    )
  }

  const handleMerge = () => {
    if (!selectedTag || !mergeTarget.trim()) return
    mergeTagMutation.mutate(
      { namespace: selectedTag.tag_namespace, from_value: selectedTag.tag_value, to_value: mergeTarget.trim() },
      { onSuccess: () => { setShowMerge(false); setSelectedTag(null) } }
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Family Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-surface-low flex flex-col py-6 px-4 gap-4 h-full">
        <div className="mb-8">
          <span className="text-lg font-display italic text-on-surface">Frame Archive</span>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-ui text-[11px] text-muted px-3 mb-2">Tag Families</h2>

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

        <button
          onClick={() => setShowCreateFamily(true)}
          className="mt-4 mx-3 py-3 border border-border-subtle bg-surface hover:bg-surface-high text-on-surface text-[10px] uppercase font-bold tracking-[0.15em] transition-all"
        >
          Create New Family
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full bg-background">
        <header className="flex justify-between items-center px-8 py-4 border-b border-border-subtle/50">
          <span className="text-xl font-bold font-display text-on-surface">Tag Manager</span>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Tag List */}
          <section className="w-1/3 flex flex-col border-r border-border-subtle/20 bg-background">
            <div className="p-8 border-b border-border-subtle/10">
              <h1 className="text-3xl font-display tracking-display text-on-surface mb-1">{activeF?.name ?? 'Tags'}</h1>
              <p className="text-[10px] uppercase font-bold tracking-[0.15em] text-muted mt-1">
                {filteredTags.length} tags indexed
              </p>
              <div className="relative mt-4">
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
              {filteredTags.length === 0 && (
                <p className="text-muted text-sm text-center py-8">
                  {(tags ?? []).length === 0 ? 'No tags in this family yet. Tags are created when applied to images.' : 'No tags match your filter.'}
                </p>
              )}
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
                      <span className="text-[9px] uppercase font-bold tracking-tight text-muted mb-0.5">{tag.tag_namespace}</span>
                      <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'} text-on-surface`}>{tag.tag_value}</span>
                    </div>
                    <span className={`text-[10px] font-body tabular-nums px-2 py-0.5 ${
                      isActive ? 'bg-primary text-background' : 'bg-surface text-muted'
                    }`}>
                      {tag.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Right Column: Detail Pane */}
          <section className="flex-1 overflow-y-auto bg-background p-12">
            {selectedTag ? (
              <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-start mb-16">
                  <div className="space-y-4">
                    <span className="inline-block px-3 py-1 bg-surface-high text-on-surface text-[10px] uppercase font-bold tracking-[0.15em]">
                      {selectedTag.tag_namespace}
                    </span>
                    <h2 className="text-5xl font-display italic tracking-display text-on-surface">
                      {selectedTag.tag_value}
                    </h2>
                    <p className="text-lg font-display text-muted italic">
                      {selectedTag.count} assets tagged
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { setShowMerge(true); setMergeTarget('') }}
                      className="bg-on-surface text-background px-8 py-3 text-xs uppercase font-bold tracking-[0.15em] hover:opacity-90 transition-all"
                    >
                      Merge Tag
                    </button>
                    <button
                      onClick={() => { setShowRename(true); setRenameValue(selectedTag.tag_value) }}
                      className="border border-border-subtle px-8 py-3 text-xs uppercase font-bold tracking-[0.15em] hover:bg-surface transition-all"
                    >
                      Rename
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-8 mb-20">
                  <div className="bg-surface-low p-8">
                    <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-muted mb-4 block">Total Usage</span>
                    <span className="text-4xl font-display text-on-surface">{selectedTag.count.toLocaleString()}</span>
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

                {/* Danger Zone */}
                <div className="border-t border-border-subtle pt-8">
                  <h3 className="text-ui text-[13px] text-accent mb-4">Danger Zone</h3>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted max-w-[400px]">
                      Permanently remove this tag. This will strip it from {selectedTag.count} assets.
                    </p>
                    <button
                      onClick={handleDeleteTag}
                      disabled={deleteTagMutation.isPending}
                      className="border border-accent text-accent px-4 py-2 rounded text-ui text-[13px] hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
                    >
                      {deleteTagMutation.isPending ? 'Deleting...' : 'Delete Tag'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted">
                <div className="text-center">
                  <span className="material-symbols-outlined text-[48px] text-muted/30 mb-4 block">sell</span>
                  <p className="text-sm">Select a tag to view details</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Create Family Dialog */}
      <Dialog open={showCreateFamily} onOpenChange={setShowCreateFamily}>
        <DialogContent className="bg-background border-border-subtle">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Create Tag Family</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <div>
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Family Name</label>
              <input
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none"
                placeholder="e.g., Character Identity"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreateFamily(false)} className="px-4 py-2 text-[11px] uppercase font-bold text-muted">Cancel</button>
              <button onClick={handleCreateFamily} disabled={!newFamilyName.trim()} className="bg-on-surface text-background px-6 py-2 text-[11px] uppercase font-bold disabled:opacity-50">Create</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent className="bg-background border-border-subtle">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Rename Tag</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <p className="text-sm text-muted">
              Rename <strong>{selectedTag?.tag_value}</strong> in namespace <strong>{selectedTag?.tag_namespace}</strong>
            </p>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRename(false)} className="px-4 py-2 text-[11px] uppercase font-bold text-muted">Cancel</button>
              <button onClick={handleRename} disabled={!renameValue.trim()} className="bg-on-surface text-background px-6 py-2 text-[11px] uppercase font-bold disabled:opacity-50">Rename</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={showMerge} onOpenChange={setShowMerge}>
        <DialogContent className="bg-background border-border-subtle">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Merge Tag</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <p className="text-sm text-muted">
              Merge all uses of <strong>{selectedTag?.tag_value}</strong> into another tag. The source tag will be removed.
            </p>
            <div>
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Target Tag Value</label>
              <input
                value={mergeTarget}
                onChange={(e) => setMergeTarget(e.target.value)}
                className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none"
                placeholder="Tag to merge into..."
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowMerge(false)} className="px-4 py-2 text-[11px] uppercase font-bold text-muted">Cancel</button>
              <button onClick={handleMerge} disabled={!mergeTarget.trim()} className="bg-on-surface text-background px-6 py-2 text-[11px] uppercase font-bold disabled:opacity-50">Merge</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
