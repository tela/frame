import { useState } from 'react'
import {
  useTagFamilies, useTags, useCreateTagFamily, useDeleteTag, useRenameTag,
  useFamilyTaxonomy, useCreateNamespace, useCreateAllowedValue,
} from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { TagSummary, NamespaceWithValues } from '@/lib/types'

const FAMILY_ICONS: Record<string, string> = {
  'fam_character': 'fingerprint',
  'fam_nsfw': 'explicit',
  'fam_technical': 'settings_ethernet',
  'fam_training': 'model_training',
}

type TabView = 'taxonomy' | 'usage'

export function TagManager() {
  const { data: families } = useTagFamilies()
  const createFamily = useCreateTagFamily()
  const deleteTagMutation = useDeleteTag()
  const renameTagMutation = useRenameTag()
  const createNamespace = useCreateNamespace()
  const createValue = useCreateAllowedValue()

  const [activeFamily, setActiveFamily] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabView>('taxonomy')
  const [selectedTag, setSelectedTag] = useState<TagSummary | null>(null)
  const [search, setSearch] = useState('')
  const [showCreateFamily, setShowCreateFamily] = useState(false)
  const [newFamilyName, setNewFamilyName] = useState('')
  const [showAddNamespace, setShowAddNamespace] = useState(false)
  const [newNsName, setNewNsName] = useState('')
  const [newNsDesc, setNewNsDesc] = useState('')
  const [addingValueTo, setAddingValueTo] = useState<string | null>(null)
  const [newValue, setNewValue] = useState('')
  const [newValueDesc, setNewValueDesc] = useState('')
  const [showRename, setShowRename] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  const activeFamilyId = activeFamily ?? families?.[0]?.id ?? null
  const { data: tags } = useTags(activeFamilyId ?? undefined)
  const { data: taxonomy } = useFamilyTaxonomy(activeFamilyId ?? '')
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
          {(families ?? []).map((family) => {
            const isActive = family.id === activeFamilyId
            const icon = FAMILY_ICONS[family.id] ?? 'label'
            return (
              <button
                key={family.id}
                onClick={() => { setActiveFamily(family.id); setSelectedTag(null); setSearch('') }}
                className={`flex items-center gap-3 px-3 py-2 text-left transition-all duration-200 hover:translate-x-1 ${
                  isActive ? 'bg-surface-lowest text-primary rounded-l-sm shadow-sm' : 'text-muted hover:bg-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
                <span className="text-ui text-[11px] font-bold">{family.name}</span>
              </button>
            )
          })}
        </div>
        <button onClick={() => setShowCreateFamily(true)} className="mt-4 mx-3 py-3 border border-border-subtle bg-surface hover:bg-surface-high text-on-surface text-[10px] uppercase font-bold tracking-[0.15em] transition-all">
          Create New Family
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full bg-background">
        {/* Header with tabs */}
        <header className="flex justify-between items-center px-8 py-4 border-b border-border-subtle/50">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold font-display text-on-surface">Tag Manager</span>
            <div className="flex gap-4">
              {(['taxonomy', 'usage'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-sm font-medium pb-1 border-b-2 transition-colors capitalize ${
                    activeTab === tab ? 'text-primary border-primary' : 'text-muted border-transparent hover:text-primary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </header>

        {activeTab === 'taxonomy' ? (
          <TaxonomyView
            taxonomy={taxonomy}
            familyName={activeF?.name ?? ''}
            onAddNamespace={() => { setShowAddNamespace(true); setNewNsName(''); setNewNsDesc('') }}
            onAddValue={(nsId) => { setAddingValueTo(nsId); setNewValue(''); setNewValueDesc('') }}
          />
        ) : (
          <UsageView
            tags={filteredTags}
            search={search}
            onSearchChange={setSearch}
            familyName={activeF?.name ?? ''}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            onDelete={() => {
              if (selectedTag) deleteTagMutation.mutate(
                { namespace: selectedTag.tag_namespace, value: selectedTag.tag_value },
                { onSuccess: () => setSelectedTag(null) }
              )
            }}
            onRename={() => {
              if (selectedTag) { setShowRename(true); setRenameValue(selectedTag.tag_value) }
            }}
            deleteLoading={deleteTagMutation.isPending}
          />
        )}
      </main>

      {/* Dialogs */}
      <Dialog open={showCreateFamily} onOpenChange={setShowCreateFamily}>
        <DialogContent className="bg-background border-border-subtle">
          <DialogHeader><DialogTitle className="font-display text-2xl">Create Tag Family</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <input value={newFamilyName} onChange={(e) => setNewFamilyName(e.target.value)} className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none" placeholder="Family name..." autoFocus />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreateFamily(false)} className="px-4 py-2 text-[11px] uppercase font-bold text-muted">Cancel</button>
              <button onClick={() => { createFamily.mutate({ name: newFamilyName.trim() }, { onSuccess: () => { setShowCreateFamily(false); setNewFamilyName('') } }) }} disabled={!newFamilyName.trim()} className="bg-on-surface text-background px-6 py-2 text-[11px] uppercase font-bold disabled:opacity-50">Create</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddNamespace} onOpenChange={setShowAddNamespace}>
        <DialogContent className="bg-background border-border-subtle">
          <DialogHeader><DialogTitle className="font-display text-2xl">Add Namespace</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <div>
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Name</label>
              <input value={newNsName} onChange={(e) => setNewNsName(e.target.value)} className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none" placeholder="e.g., body-part" autoFocus />
            </div>
            <div>
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Description</label>
              <input value={newNsDesc} onChange={(e) => setNewNsDesc(e.target.value)} className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none" placeholder="What this namespace categorizes..." />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddNamespace(false)} className="px-4 py-2 text-[11px] uppercase font-bold text-muted">Cancel</button>
              <button onClick={() => { if (activeFamilyId) createNamespace.mutate({ familyId: activeFamilyId, name: newNsName.trim(), description: newNsDesc }, { onSuccess: () => setShowAddNamespace(false) }) }} disabled={!newNsName.trim()} className="bg-on-surface text-background px-6 py-2 text-[11px] uppercase font-bold disabled:opacity-50">Add</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addingValueTo} onOpenChange={(open) => { if (!open) setAddingValueTo(null) }}>
        <DialogContent className="bg-background border-border-subtle">
          <DialogHeader><DialogTitle className="font-display text-2xl">Add Allowed Value</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <div>
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Value</label>
              <input value={newValue} onChange={(e) => setNewValue(e.target.value)} className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none" placeholder="e.g., front-facing" autoFocus />
            </div>
            <div>
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Description</label>
              <input value={newValueDesc} onChange={(e) => setNewValueDesc(e.target.value)} className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none" placeholder="What this value means..." />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setAddingValueTo(null)} className="px-4 py-2 text-[11px] uppercase font-bold text-muted">Cancel</button>
              <button onClick={() => { if (addingValueTo) createValue.mutate({ namespaceId: addingValueTo, value: newValue.trim(), description: newValueDesc }, { onSuccess: () => setAddingValueTo(null) }) }} disabled={!newValue.trim()} className="bg-on-surface text-background px-6 py-2 text-[11px] uppercase font-bold disabled:opacity-50">Add</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent className="bg-background border-border-subtle">
          <DialogHeader><DialogTitle className="font-display text-2xl">Rename Tag</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <p className="text-sm text-muted">Rename <strong>{selectedTag?.tag_value}</strong> in namespace <strong>{selectedTag?.tag_namespace}</strong></p>
            <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none" autoFocus />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRename(false)} className="px-4 py-2 text-[11px] uppercase font-bold text-muted">Cancel</button>
              <button onClick={() => { if (selectedTag) renameTagMutation.mutate({ namespace: selectedTag.tag_namespace, old_value: selectedTag.tag_value, new_value: renameValue.trim() }, { onSuccess: () => { setShowRename(false); setSelectedTag(null) } }) }} disabled={!renameValue.trim()} className="bg-on-surface text-background px-6 py-2 text-[11px] uppercase font-bold disabled:opacity-50">Rename</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Taxonomy View ---
function TaxonomyView({ taxonomy, familyName, onAddNamespace, onAddValue }: {
  taxonomy: ReturnType<typeof useFamilyTaxonomy>['data']
  familyName: string
  onAddNamespace: () => void
  onAddValue: (nsId: string) => void
}) {
  return (
    <div className="flex-1 overflow-y-auto p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-4xl font-display tracking-display text-on-surface">{familyName}</h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.15em] text-muted mt-2">
              {taxonomy?.namespaces.length ?? 0} namespaces · Taxonomy Definition
            </p>
          </div>
          <button onClick={onAddNamespace} className="bg-on-surface text-background px-6 py-2.5 text-[11px] uppercase font-bold tracking-[0.15em] hover:opacity-90 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add Namespace
          </button>
        </div>

        {(taxonomy?.namespaces ?? []).length === 0 ? (
          <div className="py-20 text-center">
            <span className="material-symbols-outlined text-[48px] text-muted/30 mb-4 block">sell</span>
            <p className="text-muted mb-4">No namespaces defined for this family.</p>
            <button onClick={onAddNamespace} className="text-[11px] uppercase font-bold text-accent hover:underline">Add the first namespace</button>
          </div>
        ) : (
          <div className="space-y-8">
            {(taxonomy?.namespaces ?? []).map((ns) => (
              <NamespaceCard key={ns.id} ns={ns} onAddValue={() => onAddValue(ns.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function NamespaceCard({ ns, onAddValue }: { ns: NamespaceWithValues; onAddValue: () => void }) {
  return (
    <div className="border border-border-subtle/20">
      <div className="flex justify-between items-center p-6 border-b border-border-subtle/10">
        <div>
          <h3 className="text-lg font-display tracking-display text-on-surface">{ns.name}</h3>
          {ns.description && <p className="text-xs text-muted mt-1">{ns.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-meta text-muted">{ns.values.length} values</span>
          <button onClick={onAddValue} className="p-1 text-muted hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
        </div>
      </div>
      <div className="p-6">
        {ns.values.length === 0 ? (
          <p className="text-xs text-muted italic">No allowed values defined — any value will be accepted for this namespace.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {ns.values.map((v) => (
              <span
                key={v.id}
                className="px-3 py-1.5 bg-surface-low text-on-surface text-[12px] border border-border-subtle/30 hover:border-primary transition-colors cursor-default"
                title={v.description || undefined}
              >
                {v.value}
              </span>
            ))}
            <button
              onClick={onAddValue}
              className="px-3 py-1.5 border border-dashed border-border-subtle text-muted text-[12px] hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Add Value
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Usage View ---
function UsageView({ tags, search, onSearchChange, familyName, selectedTag, onSelectTag, onDelete, onRename, deleteLoading }: {
  tags: TagSummary[]
  search: string
  onSearchChange: (s: string) => void
  familyName: string
  selectedTag: TagSummary | null
  onSelectTag: (t: TagSummary | null) => void
  onDelete: () => void
  onRename: () => void
  deleteLoading: boolean
}) {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Tag List */}
      <section className="w-1/3 flex flex-col border-r border-border-subtle/20 bg-background">
        <div className="p-8 border-b border-border-subtle/10">
          <h1 className="text-3xl font-display tracking-display text-on-surface mb-1">{familyName}</h1>
          <p className="text-[10px] uppercase font-bold tracking-[0.15em] text-muted">{tags.length} tags in use</p>
          <div className="relative mt-4">
            <input value={search} onChange={(e) => onSearchChange(e.target.value)} className="w-full bg-surface-low border-none text-sm py-3 px-4 focus:bg-surface-lowest focus:ring-1 focus:ring-on-surface transition-all placeholder-muted" placeholder="Filter tags..." type="text" />
            <span className="absolute right-4 top-3.5 material-symbols-outlined text-muted">search</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-6 space-y-1">
          {tags.length === 0 && <p className="text-muted text-sm text-center py-8">No tags in use for this family.</p>}
          {tags.map((tag) => {
            const isActive = selectedTag?.tag_namespace === tag.tag_namespace && selectedTag?.tag_value === tag.tag_value
            return (
              <button key={`${tag.tag_namespace}:${tag.tag_value}`} onClick={() => onSelectTag(tag)} className={`group flex items-center justify-between p-4 w-full text-left transition-all ${isActive ? 'bg-surface shadow-sm border-l-2 border-on-surface' : 'hover:bg-surface-low border-l-2 border-transparent'}`}>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold tracking-tight text-muted mb-0.5">{tag.tag_namespace}</span>
                  <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'} text-on-surface`}>{tag.tag_value}</span>
                </div>
                <span className={`text-[10px] font-body tabular-nums px-2 py-0.5 ${isActive ? 'bg-primary text-background' : 'bg-surface text-muted'}`}>{tag.count}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Detail Pane */}
      <section className="flex-1 overflow-y-auto bg-background p-12">
        {selectedTag ? (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-start mb-16">
              <div className="space-y-4">
                <span className="inline-block px-3 py-1 bg-surface-high text-on-surface text-[10px] uppercase font-bold tracking-[0.15em]">{selectedTag.tag_namespace}</span>
                <h2 className="text-5xl font-display italic tracking-display text-on-surface">{selectedTag.tag_value}</h2>
                <p className="text-lg font-display text-muted italic">{selectedTag.count} assets tagged</p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={onRename} className="border border-border-subtle px-8 py-3 text-xs uppercase font-bold tracking-[0.15em] hover:bg-surface transition-all">Rename</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 mb-20">
              <div className="bg-surface-low p-8">
                <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-muted mb-4 block">Total Usage</span>
                <span className="text-4xl font-display text-on-surface">{selectedTag.count.toLocaleString()}</span>
              </div>
              <div className="bg-surface-low p-8">
                <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-muted mb-4 block">Namespace</span>
                <span className="text-2xl font-display text-on-surface">{selectedTag.tag_namespace}</span>
              </div>
            </div>
            <div className="border-t border-border-subtle pt-8">
              <h3 className="text-ui text-[13px] text-accent mb-4">Danger Zone</h3>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted max-w-[400px]">Permanently remove this tag from {selectedTag.count} assets.</p>
                <button onClick={onDelete} disabled={deleteLoading} className="border border-accent text-accent px-4 py-2 rounded text-ui text-[13px] hover:bg-accent hover:text-white transition-colors disabled:opacity-50">{deleteLoading ? 'Deleting...' : 'Delete Tag'}</button>
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
  )
}
