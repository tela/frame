import { useState, useMemo } from 'react'
import {
  useGarments,
  useGarmentFacets,
  useGarment,
  useCreateGarment,
  useUpdateGarment,
  useDeleteGarment,
  useBulkUpdateGarmentStatus,
  useAddGarmentImage,
  useAddGarmentAffinity,
  useRemoveGarmentAffinity,
  useCharacters,
  thumbUrl,
  imageUrl,
  avatarUrl,
  type GarmentListParams,
} from '@/lib/api'
import type { Garment } from '@/lib/types'
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'

const STATUS_COLORS: Record<string, string> = {
  ingested: 'bg-amber-400',
  reviewed: 'bg-blue-400',
  available: 'bg-green-500',
  reference_only: 'bg-purple-400',
  rejected: 'bg-red-400',
}

const CATEGORY_NAV = [
  { label: 'All Garments', icon: 'inventory_2', value: '' },
  { label: 'Dresses', icon: 'checkroom', value: 'dress' },
  { label: 'Tops', icon: 'styler', value: 'top' },
  { label: 'Bottoms', icon: 'straighten', value: 'bottom' },
  { label: 'Lingerie', icon: 'spa', value: 'lingerie' },
  { label: 'Outerwear', icon: 'dry_cleaning', value: 'outerwear' },
  { label: 'Footwear', icon: 'steps', value: 'footwear' },
  { label: 'Accessories', icon: 'diamond', value: 'accessory' },
]

export function Wardrobe() {
  const [search, setSearch] = useState('')
  const [categoryNav, setCategoryNav] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detailId, setDetailId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')

  const params: GarmentListParams = useMemo(() => ({
    q: search || undefined,
    category: categoryNav || undefined,
    status: statusFilter === 'all' ? 'all' : statusFilter || undefined,
    limit: 100,
  }), [search, categoryNav, statusFilter])

  const { data: garments, isLoading } = useGarments(params)
  const { data: facets } = useGarmentFacets(params)
  const createGarment = useCreateGarment()
  const bulkStatus = useBulkUpdateGarmentStatus()

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreate = () => {
    if (!newName.trim()) return
    createGarment.mutate(
      { name: newName, category: newCategory || undefined },
      {
        onSuccess: (g) => {
          setShowCreate(false)
          setNewName('')
          setNewCategory('')
          setDetailId(g.id)
        },
      }
    )
  }

  const handleBulkStatus = (status: string) => {
    bulkStatus.mutate({ ids: Array.from(selected), status }, {
      onSuccess: () => setSelected(new Set()),
    })
  }

  const totalCount = garments?.length ?? 0

  return (
    <div className="flex h-full overflow-hidden">
      {/* Category Sidebar */}
      <aside className="w-[220px] flex-shrink-0 border-r border-border-subtle/50 flex flex-col pt-8 pb-8 bg-surface-low/30">
        <div className="px-6 mb-8">
          <h2 className="font-display italic text-lg tracking-tight text-primary mb-1">Wardrobe</h2>
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted">
            {totalCount} garment{totalCount !== 1 ? 's' : ''}
          </p>
        </div>

        <nav className="flex flex-col gap-0.5 px-3 flex-grow">
          {CATEGORY_NAV.map((item) => {
            const isActive = categoryNav === item.value
            const count = item.value ? facets?.category?.[item.value] ?? 0 : totalCount
            return (
              <button
                key={item.value}
                onClick={() => setCategoryNav(item.value)}
                className={`flex items-center gap-3 px-3 py-2.5 text-ui text-[11px] transition-all rounded-sm ${
                  isActive
                    ? 'bg-surface-lowest text-primary font-bold'
                    : 'text-primary-dim hover:bg-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.value && count > 0 && (
                  <span className="text-[10px] text-muted tabular-nums">{count}</span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="px-4 mt-auto">
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-3 border border-on-surface text-ui text-[11px] hover:bg-on-surface hover:text-background transition-colors"
          >
            New Entry
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with search and status tabs */}
        <header className="border-b border-border-subtle/50 bg-background px-8 pt-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              {(['all', 'ingested', 'reviewed', 'available', 'rejected'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-ui text-[11px] pb-3 border-b-2 transition-colors capitalize ${
                    statusFilter === s
                      ? 'text-primary border-primary'
                      : 'text-muted border-transparent hover:text-primary'
                  }`}
                >
                  {s}
                  {s !== 'all' && facets?.status?.[s] !== undefined && (
                    <span className="ml-1.5 text-[10px] text-muted">({facets.status[s]})</span>
                  )}
                </button>
              ))}
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[16px]">search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-surface-low border-0 rounded-sm pl-9 pr-3 py-2 text-sm placeholder:text-muted focus:ring-1 focus:ring-primary focus:outline-none transition-colors w-64"
                placeholder="Search garments..."
                type="text"
              />
            </div>
          </div>
        </header>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-8">
          {isLoading ? (
            <div className="text-muted text-sm text-center py-20">Loading...</div>
          ) : !garments?.length ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-[48px] text-muted/20 mb-4 block">checkroom</span>
              <p className="text-muted text-sm">No garments found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {garments.map((g) => (
                <GarmentCard
                  key={g.id}
                  garment={g}
                  isSelected={selected.has(g.id)}
                  onToggleSelect={() => toggleSelect(g.id)}
                  onOpen={() => setDetailId(g.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="border-t border-border-subtle bg-background px-8 py-4 flex items-center justify-between">
            <span className="text-ui text-[11px] text-primary">{selected.size} selected</span>
            <div className="flex items-center gap-4">
              <button onClick={() => setSelected(new Set())} className="text-ui text-[11px] text-muted hover:text-primary transition-colors">Deselect</button>
              <button onClick={() => handleBulkStatus('available')} className="text-ui text-[11px] text-muted hover:text-primary transition-colors">Mark Available</button>
              <button onClick={() => handleBulkStatus('reviewed')} className="text-ui text-[11px] text-muted hover:text-primary transition-colors">Mark Reviewed</button>
              <button onClick={() => handleBulkStatus('rejected')} className="text-ui text-[11px] text-accent hover:text-accent/80 transition-colors">Reject</button>
            </div>
          </div>
        )}
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/10 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-background p-8 w-[400px] shadow-ambient" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display italic text-2xl mb-6">New Garment</h2>
            <div className="space-y-4">
              <div>
                <label className="text-ui text-[10px] text-muted mb-2 block">Name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-surface-low border-0 rounded-sm px-3 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                  placeholder="Midnight Silk Slip Dress"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div>
                <label className="text-ui text-[10px] text-muted mb-2 block">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-surface-low border-0 rounded-sm px-3 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="">Select category...</option>
                  {CATEGORY_NAV.filter(c => c.value).map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="flex-1 py-3 bg-on-surface text-background text-ui text-[11px] disabled:opacity-30 hover:opacity-90 transition-opacity"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-6 py-3 border border-outline-variant text-ui text-[11px] hover:bg-surface-low transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail sheet */}
      <Sheet open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[720px] p-0 flex flex-col border-l border-border-subtle/30">
          {detailId && <GarmentDetailSheet id={detailId} onClose={() => setDetailId(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function GarmentCard({ garment, isSelected, onToggleSelect, onOpen }: {
  garment: Garment
  isSelected: boolean
  onToggleSelect: () => void
  onOpen: () => void
}) {
  return (
    <div className="group relative cursor-pointer" onClick={onOpen}>
      {/* Select checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect() }}
        className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-sm flex items-center justify-center transition-all border ${
          isSelected
            ? 'bg-primary border-primary'
            : 'border-outline-variant/30 bg-background/60 opacity-0 group-hover:opacity-100'
        }`}
      >
        {isSelected && <span className="material-symbols-outlined text-background text-[14px]">check</span>}
      </button>

      {/* Image */}
      <div className="aspect-[3/4] bg-surface-low mb-3 overflow-hidden outline outline-1 outline-on-surface/5">
        {garment.primary_image_id ? (
          <img
            src={thumbUrl(garment.primary_image_id)}
            alt={garment.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[48px] text-muted/15">checkroom</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-ui text-[11px] text-primary truncate">{garment.name}</h3>
          {garment.category && (
            <span className="inline-block mt-1.5 px-2 py-0.5 bg-surface text-[10px] text-primary-dim uppercase tracking-wider rounded-sm">
              {garment.category}
            </span>
          )}
        </div>
        <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${STATUS_COLORS[garment.status] || 'bg-muted'}`} />
      </div>
    </div>
  )
}

function GarmentDetailSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useGarment(id)
  const { data: characters } = useCharacters()
  const updateGarment = useUpdateGarment()
  const deleteGarment = useDeleteGarment()
  const addImage = useAddGarmentImage()
  const addAffinity = useAddGarmentAffinity()
  const removeAffinity = useRemoveGarmentAffinity()

  if (isLoading || !data) {
    return <div className="flex-1 flex items-center justify-center text-muted text-sm">Loading...</div>
  }

  const { garment: g, images, affinity } = data
  const primaryImageId = g.primary_image_id || images?.[0]?.image_id
  const affinityChars = (characters ?? []).filter(c => affinity.includes(c.id))
  const availableChars = (characters ?? []).filter(c => !affinity.includes(c.id))

  const handleFieldChange = (field: string, value: string) => {
    updateGarment.mutate({ id, [field]: value })
  }

  const handleImageUpload = (files: FileList) => {
    Array.from(files).forEach(file => {
      addImage.mutate({ garmentId: id, file })
    })
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-outline-variant/10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="material-symbols-outlined text-muted hover:text-primary transition-colors">close</button>
          <span className="text-[10px] tracking-[0.15em] uppercase text-muted">Wardrobe / Garment</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Image section */}
        <section className="p-8">
          <div className="aspect-[4/5] bg-surface mb-5 overflow-hidden">
            {primaryImageId ? (
              <img src={imageUrl(primaryImageId)} alt={g.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[64px] text-muted/15">checkroom</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {images?.map((img) => (
              <div key={img.image_id} className="w-20 h-24 bg-surface-high outline outline-1 outline-on-surface/5 overflow-hidden">
                <img src={thumbUrl(img.image_id)} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            <label className="w-20 h-24 border border-dashed border-outline-variant flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
              <span className="material-symbols-outlined text-muted">add_a_photo</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && handleImageUpload(e.target.files)} />
            </label>
          </div>
        </section>

        {/* Title */}
        <section className="px-8 mb-10">
          <input
            defaultValue={g.name}
            onBlur={(e) => e.target.value !== g.name && handleFieldChange('name', e.target.value)}
            className="font-display italic text-4xl tracking-tight text-on-surface bg-transparent border-0 p-0 w-full focus:outline-none focus:ring-0"
          />
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted mt-1">
            {g.id.slice(0, 8).toUpperCase()}
          </p>
        </section>

        {/* Classification grid */}
        <section className="px-8 grid grid-cols-2 gap-y-8 gap-x-10 mb-16">
          <ClassificationField label="Category" value={g.category}
            options={['top', 'bottom', 'dress', 'lingerie', 'outerwear', 'footwear', 'accessory']}
            onChange={(v) => handleFieldChange('category', v)} />
          <ClassificationField label="Occasion" value={g.occasion_energy}
            options={['intimate', 'casual', 'formal', 'provocative', 'loungewear', 'athletic']}
            onChange={(v) => handleFieldChange('occasion_energy', v)} />
          <ClassificationField label="Era" value={g.era}
            options={['70s', '80s', '90s', 'y2k', 'contemporary', 'vintage', 'timeless']}
            onChange={(v) => handleFieldChange('era', v)} />
          <ClassificationField label="Aesthetic" value={g.aesthetic_cluster}
            onChange={(v) => handleFieldChange('aesthetic_cluster', v)} />
          <ClassificationField label="Dominant Signal" value={g.dominant_signal}
            options={['power', 'vulnerability', 'comfort', 'provocation', 'elegance', 'rebellion', 'softness']}
            onChange={(v) => handleFieldChange('dominant_signal', v)} />
          <ClassificationField label="Material" value={g.material}
            onChange={(v) => handleFieldChange('material', v)} />
          <div className="col-span-2">
            <label className="text-[10px] tracking-[0.15em] uppercase text-muted mb-2 block">Description</label>
            <textarea
              defaultValue={g.description}
              onBlur={(e) => e.target.value !== g.description && handleFieldChange('description', e.target.value)}
              className="w-full bg-transparent border-0 p-0 text-sm leading-relaxed text-on-surface focus:outline-none focus:ring-0 resize-none"
              rows={3}
              placeholder="Add a description..."
            />
          </div>
        </section>

        {/* Character affinity */}
        <section className="px-8 mb-16">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[10px] tracking-[0.15em] uppercase text-muted">Character Affinity</h3>
          </div>
          <div className="flex gap-6 flex-wrap">
            {affinityChars.map((c) => (
              <div key={c.id} className="flex flex-col items-center gap-2 group/avatar">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-surface-high grayscale hover:grayscale-0 transition-all">
                    <img src={avatarUrl(c.id)} alt={c.display_name} className="w-full h-full object-cover" />
                  </div>
                  <button
                    onClick={() => removeAffinity.mutate({ garmentId: id, characterId: c.id })}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-white rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                  >
                    <span className="text-[10px]">×</span>
                  </button>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-on-surface">{c.display_name}</span>
              </div>
            ))}
            {availableChars.length > 0 && (
              <div className="relative group/add">
                <button className="w-14 h-14 rounded-full border border-dashed border-outline-variant flex items-center justify-center text-muted hover:text-primary hover:border-primary transition-all">
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
                {/* Simple dropdown on hover */}
                <div className="absolute top-full left-0 mt-2 bg-surface-lowest shadow-ambient py-2 min-w-[160px] hidden group-hover/add:block z-20">
                  {availableChars.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => addAffinity.mutate({ garmentId: id, characterId: c.id })}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-surface transition-colors flex items-center gap-2"
                    >
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
        {(g.source_url || g.source_site || g.provenance) && (
          <section className="px-8 bg-surface-low py-10">
            <h3 className="text-[10px] tracking-[0.15em] uppercase text-muted mb-6">Provenance</h3>
            <div className="space-y-4">
              {g.source_site && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] tracking-[0.15em] uppercase text-muted">Source Site</span>
                  {g.source_url ? (
                    <a href={g.source_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-dim underline underline-offset-4">{g.source_site}</a>
                  ) : (
                    <span className="text-sm">{g.source_site}</span>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-6">
                {g.provenance && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] tracking-[0.15em] uppercase text-muted">Source</span>
                    <span className="text-sm capitalize">{g.provenance}</span>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] tracking-[0.15em] uppercase text-muted">Added</span>
                  <span className="text-sm">{new Date(g.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Sticky footer */}
      <div className="px-8 py-5 border-t border-outline-variant/10 flex gap-3 bg-background">
        <button
          onClick={() => handleFieldChange('status', g.status === 'available' ? 'ingested' : 'available')}
          className="flex-1 py-3.5 bg-on-surface text-background text-ui text-[11px] hover:opacity-90 transition-opacity"
        >
          {g.status === 'available' ? 'Archive Entry' : 'Mark Available'}
        </button>
        <button
          onClick={() => {
            if (confirm('Delete this garment?')) {
              deleteGarment.mutate(id, { onSuccess: onClose })
            }
          }}
          className="px-6 py-3.5 border border-outline-variant text-ui text-[11px] text-accent hover:bg-surface-low transition-colors"
        >
          Delete
        </button>
      </div>
    </>
  )
}

function ClassificationField({ label, value, options, onChange }: {
  label: string
  value: string
  options?: string[]
  onChange: (v: string) => void
}) {
  if (options) {
    return (
      <div>
        <label className="text-[10px] tracking-[0.15em] uppercase text-muted mb-2 block">{label}</label>
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => onChange(value === opt ? '' : opt)}
              className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-sm transition-colors ${
                value === opt
                  ? 'bg-on-surface/10 text-primary font-medium'
                  : 'bg-surface-low text-primary-dim hover:bg-surface'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="text-[10px] tracking-[0.15em] uppercase text-muted mb-2 block">{label}</label>
      <input
        defaultValue={value}
        onBlur={(e) => e.target.value !== value && onChange(e.target.value)}
        className="bg-transparent border-0 p-0 text-sm text-on-surface focus:outline-none focus:ring-0 w-full"
        placeholder={`Add ${label.toLowerCase()}...`}
      />
    </div>
  )
}
