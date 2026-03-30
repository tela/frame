import { useState, useMemo } from 'react'
import {
  useHairstyles,
  useHairstyleFacets,
  useHairstyle,
  useCreateHairstyle,
  useUpdateHairstyle,
  useDeleteHairstyle,
  useBulkUpdateHairstyleStatus,
  useAddHairstyleImage,
  useAddHairstyleAffinity,
  useRemoveHairstyleAffinity,
  useCharacters,
  thumbUrl,
  imageUrl,
  avatarUrl,
  type HairListParams,
} from '@/lib/api'
import type { Hairstyle } from '@/lib/types'
import { Sheet, SheetContent } from '@/components/ui/sheet'

const STATUS_COLORS: Record<string, string> = {
  ingested: 'bg-amber-400',
  reviewed: 'bg-blue-400',
  available: 'bg-green-500',
  rejected: 'bg-red-400',
}

const LENGTH_OPTIONS = ['pixie', 'short', 'medium', 'long', 'very_long']
const TEXTURE_OPTIONS = ['straight', 'wavy', 'curly', 'coily', 'kinky']
const STYLE_OPTIONS = ['updo', 'down', 'half_up', 'ponytail', 'braids', 'bun', 'loose', 'structured']

export function HairCatalog() {
  const [search, setSearch] = useState('')
  const [textureFilter, setTextureFilter] = useState<string[]>([])
  const [lengthFilter, setLengthFilter] = useState('')
  const [styleFilter, setStyleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detailId, setDetailId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')

  const params: HairListParams = useMemo(() => ({
    q: search || undefined,
    length: lengthFilter || undefined,
    texture: textureFilter.length === 1 ? textureFilter[0] : undefined,
    style: styleFilter || undefined,
    status: statusFilter === 'all' ? 'all' : statusFilter || undefined,
    limit: 100,
  }), [search, lengthFilter, textureFilter, styleFilter, statusFilter])

  const { data: hairstyles, isLoading } = useHairstyles(params)
  const { data: facets } = useHairstyleFacets(params)
  const createHairstyle = useCreateHairstyle()
  const bulkStatus = useBulkUpdateHairstyleStatus()

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleTexture = (tex: string) => {
    setTextureFilter(prev =>
      prev.includes(tex) ? prev.filter(t => t !== tex) : [...prev, tex]
    )
  }

  const handleCreate = () => {
    if (!newName.trim()) return
    createHairstyle.mutate({ name: newName }, {
      onSuccess: (h) => {
        setShowCreate(false)
        setNewName('')
        setDetailId(h.id)
      },
    })
  }

  const totalCount = hairstyles?.length ?? 0

  return (
    <div className="flex h-full overflow-hidden">
      {/* Facet Sidebar */}
      <aside className="w-[220px] flex-shrink-0 border-r border-border-subtle/50 flex flex-col pt-8 pb-8 bg-surface-low/30 overflow-y-auto">
        <div className="px-6 mb-8">
          <h2 className="text-ui text-[10px] font-bold tracking-[0.15em] text-muted mb-1">Editorial</h2>
          <p className="text-[10px] tracking-[0.1em] uppercase text-muted/60">Archive System</p>
        </div>

        {/* Status facet */}
        <FacetSection title="Status">
          {(['ingested', 'reviewed', 'available'] as const).map((s) => (
            <FacetItem key={s} label={s} count={facets?.status?.[s]} active={statusFilter === s}
              onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)} />
          ))}
        </FacetSection>

        {/* Length facet */}
        <FacetSection title="Length">
          {LENGTH_OPTIONS.map((l) => (
            <FacetItem key={l} label={l} count={facets?.length?.[l]} active={lengthFilter === l}
              onClick={() => setLengthFilter(lengthFilter === l ? '' : l)} />
          ))}
        </FacetSection>

        {/* Texture facet */}
        <FacetSection title="Texture">
          <div className="flex flex-wrap gap-1.5 px-6">
            {TEXTURE_OPTIONS.map((tex) => (
              <button key={tex} onClick={() => toggleTexture(tex)}
                className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-sm transition-colors ${
                  textureFilter.includes(tex)
                    ? 'bg-on-surface/10 text-primary font-medium'
                    : 'bg-surface text-primary-dim hover:bg-surface-high'
                }`}
              >{tex}</button>
            ))}
          </div>
        </FacetSection>

        {/* Style facet */}
        <FacetSection title="Style">
          {STYLE_OPTIONS.filter(s => facets?.style?.[s]).map((s) => (
            <FacetItem key={s} label={s} count={facets?.style?.[s]} active={styleFilter === s}
              onClick={() => setStyleFilter(styleFilter === s ? '' : s)} />
          ))}
        </FacetSection>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-8 pt-8 pb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="font-display italic text-5xl tracking-tight text-on-surface">Hair</h1>
              <p className="text-ui text-[11px] text-muted mt-2">
                {totalCount} styles · {facets?.status ? Object.values(facets.status).reduce((a, b) => a + b, 0) : 0} total
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-on-surface text-background text-ui text-[11px] hover:opacity-90 transition-opacity"
            >
              + New Style
            </button>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[16px]">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-low border-0 rounded-sm pl-9 pr-3 py-2 text-sm placeholder:text-muted focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="Search archive..."
              type="text"
            />
          </div>
        </header>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {isLoading ? (
            <div className="text-muted text-sm text-center py-20">Loading...</div>
          ) : !hairstyles?.length ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-[48px] text-muted/20 mb-4 block">face</span>
              <p className="text-muted text-sm">No hairstyles found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {hairstyles.map((h) => (
                <HairCard key={h.id} hairstyle={h} isSelected={selected.has(h.id)}
                  onToggleSelect={() => toggleSelect(h.id)} onOpen={() => setDetailId(h.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination footer */}
        <div className="px-8 py-3 border-t border-border-subtle/30 text-[10px] text-ui text-muted flex justify-between">
          <span>Viewing 1–{totalCount} of {totalCount} styles</span>
          <div className="flex gap-4">
            <button disabled className="text-muted/40">Previous</button>
            <button className="text-primary font-bold">Next</button>
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="border-t border-border-subtle bg-background px-8 py-4 flex items-center justify-between">
            <span className="text-ui text-[11px] text-primary">{selected.size} selected</span>
            <div className="flex items-center gap-4">
              <button onClick={() => setSelected(new Set())} className="text-ui text-[11px] text-muted hover:text-primary">Deselect</button>
              <button onClick={() => { bulkStatus.mutate({ ids: Array.from(selected), status: 'available' }); setSelected(new Set()) }}
                className="text-ui text-[11px] text-muted hover:text-primary">Mark Available</button>
              <button onClick={() => { bulkStatus.mutate({ ids: Array.from(selected), status: 'rejected' }); setSelected(new Set()) }}
                className="text-ui text-[11px] text-accent hover:text-accent/80">Reject</button>
            </div>
          </div>
        )}
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/10 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-background p-8 w-[400px] shadow-ambient" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display italic text-2xl mb-6">New Hairstyle</h2>
            <div>
              <label className="text-ui text-[10px] text-muted mb-2 block">Name</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="w-full bg-surface-low border-0 rounded-sm px-3 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                placeholder="Victory Rolls" />
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={handleCreate} disabled={!newName.trim()}
                className="flex-1 py-3 bg-on-surface text-background text-ui text-[11px] disabled:opacity-30 hover:opacity-90">Create</button>
              <button onClick={() => setShowCreate(false)}
                className="px-6 py-3 border border-outline-variant text-ui text-[11px] hover:bg-surface-low">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail sheet */}
      <Sheet open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[600px] p-0 flex flex-col border-l border-border-subtle/30">
          {detailId && <HairDetailSheet id={detailId} onClose={() => setDetailId(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function FacetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-ui text-[10px] text-muted px-6 mb-2">{title}</h3>
      {children}
    </div>
  )
}

function FacetItem({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex items-center justify-between w-full px-6 py-1.5 text-[12px] transition-colors ${
        active ? 'text-primary font-bold' : 'text-primary-dim hover:text-primary'
      }`}
    >
      <span className="capitalize">{label.replace('_', ' ')}</span>
      {count !== undefined && count > 0 && <span className="text-[10px] text-muted tabular-nums">{count}</span>}
    </button>
  )
}

function HairCard({ hairstyle: h, isSelected, onToggleSelect, onOpen }: {
  hairstyle: Hairstyle; isSelected: boolean; onToggleSelect: () => void; onOpen: () => void
}) {
  return (
    <div className="group relative cursor-pointer" onClick={onOpen}>
      <button onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
        className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-sm flex items-center justify-center transition-all border ${
          isSelected ? 'bg-primary border-primary' : 'border-outline-variant/30 bg-background/60 opacity-0 group-hover:opacity-100'
        }`}
      >
        {isSelected && <span className="material-symbols-outlined text-background text-[14px]">check</span>}
      </button>

      {/* Status dot */}
      <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${STATUS_COLORS[h.status] || 'bg-muted'}`} />

      {/* Image */}
      <div className="aspect-[3/4] bg-surface-low mb-3 overflow-hidden outline outline-1 outline-on-surface/5">
        {h.primary_image_id ? (
          <img src={thumbUrl(h.primary_image_id)} alt={h.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[48px] text-muted/15">face</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display italic text-sm text-on-surface truncate">{h.name}</h3>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {h.length && (
              <span className="px-2 py-0.5 bg-surface text-[9px] text-primary-dim uppercase tracking-wider rounded-sm">{h.length}</span>
            )}
            {h.texture && (
              <span className="px-2 py-0.5 bg-surface text-[9px] text-primary-dim uppercase tracking-wider rounded-sm">{h.texture}</span>
            )}
          </div>
        </div>
        {h.affinity_count ? (
          <span className="flex items-center gap-1 text-[10px] text-muted mt-0.5">
            <span className="material-symbols-outlined text-[14px]">person</span>
            {h.affinity_count}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function HairDetailSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useHairstyle(id)
  const { data: characters } = useCharacters()
  const updateHairstyle = useUpdateHairstyle()
  const deleteHairstyle = useDeleteHairstyle()
  const addImage = useAddHairstyleImage()
  const addAffinity = useAddHairstyleAffinity()
  const removeAffinity = useRemoveHairstyleAffinity()

  if (isLoading || !data) {
    return <div className="flex-1 flex items-center justify-center text-muted text-sm">Loading...</div>
  }

  const { hairstyle: h, images, affinity } = data
  const primaryImageId = h.primary_image_id || images?.[0]?.image_id
  const affinityChars = (characters ?? []).filter(c => affinity.includes(c.id))
  const availableChars = (characters ?? []).filter(c => !affinity.includes(c.id))

  const handleFieldChange = (field: string, value: string) => {
    updateHairstyle.mutate({ id, [field]: value })
  }

  return (
    <>
      {/* Header */}
      <header className="flex justify-between items-center px-8 py-5 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-outline-variant/10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="material-symbols-outlined text-muted hover:text-primary transition-colors">close</button>
          <span className="text-[10px] tracking-[0.15em] uppercase text-muted">Detail Sheet — {h.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Hero image */}
        <section className="px-8 pb-8 pt-2">
          <div className="aspect-[4/5] bg-surface overflow-hidden rounded-sm">
            {primaryImageId ? (
              <img src={imageUrl(primaryImageId)} alt={h.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[64px] text-muted/15">face</span>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-5">
            {images?.map((img) => (
              <div key={img.image_id} className="w-20 aspect-square bg-surface-low rounded-sm overflow-hidden border-2 border-transparent hover:border-on-surface/30 transition-all cursor-pointer">
                <img src={thumbUrl(img.image_id)} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            <label className="w-20 aspect-square bg-surface-low rounded-sm flex items-center justify-center border-2 border-dashed border-outline-variant/30 cursor-pointer hover:bg-surface transition-colors">
              <span className="material-symbols-outlined text-muted">add</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => {
                if (e.target.files) Array.from(e.target.files).forEach(f => addImage.mutate({ hairstyleId: id, file: f }))
              }} />
            </label>
          </div>
        </section>

        <div className="h-px bg-outline-variant/10 mx-8" />

        {/* Classification */}
        <section className="p-8 space-y-8">
          <div>
            <label className="text-[10px] tracking-[0.1em] uppercase text-muted mb-1 block">Name / Archive Title</label>
            <input defaultValue={h.name} onBlur={(e) => e.target.value !== h.name && handleFieldChange('name', e.target.value)}
              className="w-full bg-transparent border-0 p-0 font-display italic text-2xl text-on-surface focus:outline-none focus:ring-0" />
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-6">
            <SelectField label="Length" value={h.length} options={LENGTH_OPTIONS} onChange={(v) => handleFieldChange('length', v)} />
            <SelectField label="Texture" value={h.texture} options={TEXTURE_OPTIONS} onChange={(v) => handleFieldChange('texture', v)} />
            <div>
              <label className="text-[10px] tracking-[0.1em] uppercase text-muted mb-1 block">Style</label>
              <input defaultValue={h.style} onBlur={(e) => e.target.value !== h.style && handleFieldChange('style', e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-sm text-on-surface focus:outline-none focus:ring-0" placeholder="Add style..." />
            </div>
            <div>
              <label className="text-[10px] tracking-[0.1em] uppercase text-muted mb-1 block">Color</label>
              <input defaultValue={h.color} onBlur={(e) => e.target.value !== h.color && handleFieldChange('color', e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-sm text-on-surface focus:outline-none focus:ring-0" placeholder="honey blonde" />
            </div>
          </div>

          <div>
            <label className="text-[10px] tracking-[0.1em] uppercase text-muted mb-2 block">Description</label>
            <textarea defaultValue={h.description} onBlur={(e) => e.target.value !== h.description && handleFieldChange('description', e.target.value)}
              className="w-full bg-surface-low border-0 p-4 rounded-sm text-sm leading-relaxed text-on-surface focus:ring-1 focus:ring-on-surface/10 resize-none"
              rows={4} placeholder="Technical notes on styling technique..." />
          </div>
        </section>

        {/* Character affinity */}
        <section className="bg-surface-low mx-8 p-6 rounded-lg mb-10">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-display italic text-lg">Character Affinity</h3>
          </div>
          <div className="flex -space-x-2">
            {affinityChars.map((c) => (
              <div key={c.id} className="group/avatar relative">
                <img src={avatarUrl(c.id)} alt={c.display_name}
                  className="inline-block h-12 w-12 rounded-full ring-4 ring-surface-low grayscale hover:grayscale-0 transition-all cursor-pointer" />
                <button onClick={() => removeAffinity.mutate({ hairstyleId: id, characterId: c.id })}
                  className="absolute -top-1 -right-1 bg-accent text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover/avatar:opacity-100 transition-opacity">×</button>
              </div>
            ))}
            {availableChars.length > 0 && (
              <div className="relative group/add">
                <div className="h-12 w-12 rounded-full ring-4 ring-surface-low bg-surface border-2 border-dashed border-outline-variant/30 flex items-center justify-center cursor-pointer hover:bg-surface-high transition-colors">
                  <span className="material-symbols-outlined text-muted text-[18px]">add</span>
                </div>
                <div className="absolute top-full left-0 mt-2 bg-surface-lowest shadow-ambient py-2 min-w-[160px] hidden group-hover/add:block z-20">
                  {availableChars.map((c) => (
                    <button key={c.id} onClick={() => addAffinity.mutate({ hairstyleId: id, characterId: c.id })}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-surface transition-colors flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-surface-high flex-shrink-0">
                        <img src={avatarUrl(c.id)} alt="" className="w-full h-full object-cover" />
                      </div>
                      {c.display_name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Provenance */}
        {(h.source_url || h.source_site || h.provenance) && (
          <section className="px-8 pb-10">
            <div className="bg-surface border border-outline-variant/10 rounded-sm p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-muted text-[18px]">history_edu</span>
                <h3 className="text-ui text-[10px] font-bold tracking-[0.15em]">Provenance</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {h.provenance && <div><p className="text-muted mb-0.5">Source</p><p className="font-medium capitalize">{h.provenance}</p></div>}
                {h.source_url && <div><p className="text-muted mb-0.5">Source URL</p><a href={h.source_url} target="_blank" className="text-primary-dim underline truncate block">{h.source_site || h.source_url}</a></div>}
                <div className="col-span-2 pt-2 border-t border-outline-variant/10">
                  <p className="text-muted mb-0.5">Created</p>
                  <p className="font-medium">{new Date(h.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="p-6 bg-background border-t border-outline-variant/10 flex gap-3">
        <button onClick={() => handleFieldChange('status', h.status === 'available' ? 'ingested' : 'available')}
          className="flex-1 py-3 bg-on-surface text-background text-ui text-[11px] hover:opacity-90 rounded-sm">
          {h.status === 'available' ? 'Archive' : 'Mark Available'}
        </button>
        <button onClick={() => { if (confirm('Delete this hairstyle?')) deleteHairstyle.mutate(id, { onSuccess: onClose }) }}
          className="px-4 py-3 bg-surface-high text-on-surface hover:bg-surface-highest transition-all rounded-sm">
          <span className="material-symbols-outlined text-[18px]">archive</span>
        </button>
      </footer>
    </>
  )
}

function SelectField({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-[10px] tracking-[0.1em] uppercase text-muted mb-1 block">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-0 p-0 text-sm text-on-surface focus:ring-0 appearance-none cursor-pointer capitalize">
        <option value="">—</option>
        {options.map(o => <option key={o} value={o} className="capitalize">{o.replace('_', ' ')}</option>)}
      </select>
    </div>
  )
}
