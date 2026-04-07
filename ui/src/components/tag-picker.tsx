import { useState, useEffect } from 'react'
import { useTagFamilies, useFamilyTaxonomy, useBulkTag } from '@/lib/api'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface TagPickerProps {
  open: boolean
  onClose: () => void
  imageIds: string[]
  existingTags?: Array<{ namespace: string; value: string }>
  refType?: string | null
}

export function TagPicker({ open, onClose, imageIds, existingTags = [], refType }: TagPickerProps) {
  const { data: families } = useTagFamilies()
  const bulkTag = useBulkTag()

  const [activeFamily, setActiveFamily] = useState<string>('')
  const [activeNamespace, setActiveNamespace] = useState<string>('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Map<string, Set<string>>>(new Map()) // namespace → Set<value>

  const activeFamilyId = activeFamily || families?.[0]?.id || ''
  const { data: taxonomy } = useFamilyTaxonomy(activeFamilyId, refType)

  // Initialize selected from existing tags when the dialog opens
  const existingKey = existingTags.map(t => `${t.namespace}:${t.value}`).sort().join(',')
  useEffect(() => {
    const map = new Map<string, Set<string>>()
    for (const tag of existingTags) {
      if (!map.has(tag.namespace)) map.set(tag.namespace, new Set())
      map.get(tag.namespace)!.add(tag.value)
    }
    setSelected(map)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingKey])

  // Auto-select first namespace when taxonomy loads
  useEffect(() => {
    if (taxonomy?.namespaces?.length && !activeNamespace) {
      setActiveNamespace(taxonomy.namespaces[0].id)
    }
  }, [taxonomy, activeNamespace])

  const activeNs = taxonomy?.namespaces?.find((ns) => ns.id === activeNamespace)

  const isValueSelected = (namespace: string, value: string) => {
    return selected.get(namespace)?.has(value) ?? false
  }

  const toggleValue = (namespace: string, value: string) => {
    setSelected((prev) => {
      const next = new Map(prev)
      if (!next.has(namespace)) next.set(namespace, new Set())
      const values = new Set(next.get(namespace)!)
      if (values.has(value)) values.delete(value)
      else values.add(value)
      next.set(namespace, values)
      return next
    })
  }

  // Collect all selected tags as [namespace:value] pairs
  const selectedTags: Array<{ namespace: string; value: string }> = []
  for (const [ns, values] of selected) {
    for (const v of values) {
      selectedTags.push({ namespace: ns, value: v })
    }
  }

  // Find newly added tags (not in existingTags)
  const newTags = selectedTags.filter(
    (t) => !existingTags.some((e) => e.namespace === t.namespace && e.value === t.value)
  )

  // Find removed tags (in existingTags but not in selected)
  const removedTags = existingTags.filter(
    (e) => !selectedTags.some((t) => t.namespace === e.namespace && t.value === e.value)
  )

  const handleApply = async () => {
    // Add new tags
    for (const tag of newTags) {
      const familyId = taxonomy?.family.id
      await bulkTag.mutateAsync({
        image_ids: imageIds,
        tag_namespace: tag.namespace,
        tag_value: tag.value,
        family_id: familyId,
        action: 'add',
      })
    }
    // Remove removed tags
    for (const tag of removedTags) {
      await bulkTag.mutateAsync({
        image_ids: imageIds,
        tag_namespace: tag.namespace,
        tag_value: tag.value,
        action: 'remove',
      })
    }
    onClose()
  }

  // Search filter across all namespaces and values
  const searchResults = search.trim()
    ? (taxonomy?.namespaces ?? []).flatMap((ns) =>
        ns.values
          .filter((v) => v.value.toLowerCase().includes(search.toLowerCase()) || ns.name.toLowerCase().includes(search.toLowerCase()))
          .map((v) => ({ namespace: ns.name, namespaceId: ns.id, value: v.value }))
      )
    : null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="bg-surface border-none shadow-[0_40px_100px_rgba(47,51,51,0.12)] max-w-[800px] max-h-[600px] p-0 gap-0 flex flex-col">
        {/* Header */}
        <div className="p-8 pb-4 flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-display text-2xl italic tracking-display">Tag Metadata</h2>
              <p className="text-[10px] tracking-[0.15em] text-muted mt-1 uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                Applying to {imageIds.length} image{imageIds.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted/40">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-low border-transparent focus:border-on-surface focus:ring-0 text-sm py-3 pl-12 pr-4 transition-all"
              placeholder="Search taxonomies or values..."
            />
          </div>
        </div>

        {/* Family Tabs */}
        <div className="px-8 border-b border-on-surface/5">
          <div className="flex gap-8">
            {(families ?? []).map((f) => (
              <button
                key={f.id}
                onClick={() => { setActiveFamily(f.id); setActiveNamespace(''); setSearch('') }}
                className={`pb-4 border-b-2 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors ${
                  (activeFamilyId === f.id) ? 'border-on-surface text-on-surface' : 'border-transparent text-muted/40 hover:text-muted'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Search Results or Namespace + Values */}
        <div className="flex flex-grow overflow-hidden min-h-0">
          {searchResults ? (
            /* Search results mode */
            <div className="flex-grow p-8 overflow-y-auto">
              {searchResults.length === 0 ? (
                <p className="text-muted text-sm text-center py-8">No matching values</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {searchResults.map((r) => {
                    const sel = isValueSelected(r.namespace, r.value)
                    return (
                      <button
                        key={`${r.namespace}:${r.value}`}
                        onClick={() => toggleValue(r.namespace, r.value)}
                        className={`flex items-center justify-between p-4 border transition-all group ${
                          sel ? 'bg-on-surface text-surface border-transparent' : 'bg-surface-low border-transparent hover:border-on-surface/20'
                        }`}
                      >
                        <div className="flex flex-col items-start">
                          <span className="text-xs font-medium">{r.value}</span>
                          <span className="text-[9px] text-muted/60 uppercase tracking-wider">{r.namespace}</span>
                        </div>
                        <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: sel ? "'FILL' 1" : "'FILL' 0" }}>
                          {sel ? 'check_circle' : 'add'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Namespace List */}
              <div className="w-48 bg-surface-low/50 border-r border-on-surface/5 py-6 px-4 overflow-y-auto">
                <nav className="flex flex-col gap-1">
                  {(taxonomy?.namespaces ?? []).map((ns) => (
                    <button
                      key={ns.id}
                      onClick={() => setActiveNamespace(ns.id)}
                      className={`w-full text-left px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                        activeNamespace === ns.id
                          ? 'bg-surface text-on-surface shadow-sm'
                          : 'text-muted/50 hover:bg-surface/50'
                      }`}
                    >
                      {ns.name}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Value Grid */}
              <div className="flex-grow p-8 overflow-y-auto">
                {activeNs ? (
                  activeNs.values.length === 0 ? (
                    <p className="text-muted text-sm text-center py-8">
                      No values defined for this namespace. Add values in the Tag Manager.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {activeNs.values.map((v) => {
                        const sel = isValueSelected(activeNs.name, v.value)
                        return (
                          <button
                            key={v.id}
                            onClick={() => toggleValue(activeNs.name, v.value)}
                            className={`flex items-center justify-between p-4 border transition-all group ${
                              sel ? 'bg-on-surface text-surface border-transparent' : 'bg-surface-low border-transparent hover:border-on-surface/20'
                            }`}
                          >
                            <span className="text-xs font-medium">{v.value}</span>
                            <span
                              className={`material-symbols-outlined text-xs ${sel ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                              style={{ fontVariationSettings: sel ? "'FILL' 1" : "'FILL' 0" }}
                            >
                              {sel ? 'check_circle' : 'add'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )
                ) : (
                  <p className="text-muted text-sm text-center py-8">Select a namespace</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-surface-low flex justify-between items-center">
          <div className="flex gap-2 flex-wrap max-w-[400px] overflow-hidden">
            {selectedTags.slice(0, 5).map((t) => (
              <div
                key={`${t.namespace}:${t.value}`}
                className="flex items-center gap-2 bg-on-surface/5 px-3 py-1.5 border border-on-surface/10 rounded-full"
              >
                <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface">
                  {t.namespace}: {t.value}
                </span>
                <span
                  className="material-symbols-outlined text-[14px] cursor-pointer hover:text-accent"
                  onClick={() => toggleValue(t.namespace, t.value)}
                >
                  close
                </span>
              </div>
            ))}
            {selectedTags.length > 5 && (
              <span className="text-[9px] text-muted self-center">+{selectedTags.length - 5} more</span>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-6 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted/60 hover:text-on-surface transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleApply}
              disabled={bulkTag.isPending || (newTags.length === 0 && removedTags.length === 0)}
              className="px-8 py-2 bg-on-surface text-surface text-[10px] font-bold uppercase tracking-[0.15em] disabled:opacity-50"
            >
              {bulkTag.isPending ? 'Applying...' : 'Apply Selection'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
