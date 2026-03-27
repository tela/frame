import { useParams } from '@tanstack/react-router'
import { useDataset, useExportDataset, useForkDataset, useAddDatasetImages, useImageSearch, useCharacters, thumbUrl } from '@/lib/api'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function DatasetDetail() {
  const { datasetId } = useParams({ from: '/datasets/$datasetId' })
  const { data, isLoading } = useDataset(datasetId)
  const exportDataset = useExportDataset()
  const forkDataset = useForkDataset()
  const addImages = useAddDatasetImages()
  const [exportDir, setExportDir] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [showAddImages, setShowAddImages] = useState(false)

  if (isLoading) return <div className="p-12 text-muted">Loading...</div>
  if (!data) return <div className="p-12 text-muted">Dataset not found</div>

  const { dataset: ds, images: rawImages } = data
  const images = rawImages ?? []
  const includedCount = images.filter((i) => i.included).length

  return (
    <>
      {/* Header */}
      <header className="px-12 py-6 border-b border-border-subtle flex items-center justify-between sticky top-0 glass-header z-10">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-2xl text-on-surface">{ds.name}</h2>
          <span className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest bg-on-surface text-background">
            {ds.type}
          </span>
          <span className="text-meta text-muted">{includedCount} / {images.length} included</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddImages(true)}
            className="border border-border-subtle px-4 py-2 text-[11px] uppercase font-bold tracking-[0.1em] hover:bg-surface transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[14px]">add_photo_alternate</span>
            Add Images
          </button>
          <button
            onClick={() => forkDataset.mutate({ id: datasetId, name: `${ds.name} (Fork)` })}
            disabled={forkDataset.isPending}
            className="border border-border-subtle px-4 py-2 text-[11px] uppercase font-bold tracking-[0.1em] hover:bg-surface transition-colors disabled:opacity-50"
          >
            {forkDataset.isPending ? 'Forking...' : 'Fork'}
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="bg-accent text-white px-6 py-2.5 text-[11px] uppercase font-bold tracking-[0.15em] hover:opacity-90 transition-all"
          >
            Export
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-12">
          {/* Source query */}
          {ds.source_query && ds.source_query !== '{}' && (
            <div className="mb-8 p-4 bg-surface-low border-l-2 border-on-surface">
              <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-muted block mb-1">Source Summary</span>
              <p className="font-display text-lg text-on-surface">
                Filter: <span className="italic">{ds.source_query}</span>
              </p>
              <button className="text-[10px] uppercase font-bold text-accent hover:underline mt-2">Edit Filter</button>
            </div>
          )}

          {/* Image grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img, idx) => (
              <div
                key={img.image_id}
                className={`relative group cursor-pointer border transition-all ${
                  img.included
                    ? 'border-border-subtle hover:border-on-surface'
                    : 'border-border-subtle opacity-40 hover:opacity-70'
                }`}
              >
                <div className="aspect-square bg-surface-low overflow-hidden">
                  <img
                    src={thumbUrl(img.image_id)}
                    alt={img.caption ?? `Image ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-on-surface/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <div className="flex justify-between items-end">
                    <div>
                      {img.caption && (
                        <p className="text-[10px] text-white/80 line-clamp-2 mb-1">"{img.caption}"</p>
                      )}
                      <span className="text-[9px] uppercase tracking-widest text-white/60">
                        #{img.sort_order + 1}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button className="bg-white/20 backdrop-blur-sm p-1 rounded-sm hover:bg-white/40 transition-colors">
                        <span className="material-symbols-outlined text-white text-[16px]">edit</span>
                      </button>
                      <button className="bg-white/20 backdrop-blur-sm p-1 rounded-sm hover:bg-white/40 transition-colors">
                        <span className="material-symbols-outlined text-white text-[16px]">
                          {img.included ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Position badge */}
                <div className="absolute top-2 left-2 bg-background/90 px-1.5 py-0.5 text-[9px] font-bold tabular-nums">
                  {img.sort_order + 1}
                </div>
              </div>
            ))}
          </div>

          {images.length === 0 && (
            <div className="py-20 text-center">
              <span className="material-symbols-outlined text-[48px] text-muted/30 mb-4 block">dataset</span>
              <p className="text-muted">No images in this dataset yet.</p>
              <button onClick={() => setShowAddImages(true)} className="mt-4 text-[11px] uppercase font-bold text-accent hover:underline">
                Add from Image Search
              </button>
            </div>
          )}
        </div>

        {/* Right sidebar: Coverage + Export */}
        <aside className="w-[300px] flex-shrink-0 border-l border-border-subtle/20 bg-background p-8 overflow-y-auto hidden xl:flex flex-col gap-8">
          <div>
            <h3 className="text-ui text-[11px] text-muted mb-4">Coverage Analysis</h3>
            <div className="space-y-3">
              {[
                { label: 'Poses', count: '—' },
                { label: 'Portrait', count: '—' },
                { label: 'Full Body', count: '—' },
                { label: 'Expressions', count: '—' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-muted">{item.label}</span>
                  <span className="text-on-surface font-body tabular-nums">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-ui text-[11px] text-muted mb-4">Export Preview</h3>
            <div className="space-y-2 text-xs text-muted">
              <p>Format: {ds.export_config !== '{}' ? 'Configured' : 'Not configured'}</p>
              <p>{includedCount} images will be exported</p>
            </div>
            <button
              onClick={() => setShowExport(true)}
              className="mt-4 w-full bg-accent text-white py-3 text-[11px] uppercase font-bold tracking-[0.15em] hover:opacity-90 transition-all"
            >
              Export to Disk
            </button>
            {ds.description && (
              <div className="mt-6 p-4 bg-surface-low text-xs text-muted leading-relaxed">
                {ds.description}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Export Dialog */}
      {showExport && (
        <div className="fixed inset-0 bg-on-surface/40 z-50 flex items-center justify-center" onClick={() => setShowExport(false)}>
          <div className="bg-background border border-border-subtle p-8 w-[420px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl mb-6">Export Dataset</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Output Directory</label>
                <input
                  value={exportDir}
                  onChange={(e) => setExportDir(e.target.value)}
                  className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:outline-none"
                  placeholder="/path/to/export"
                  autoFocus
                />
              </div>
              <p className="text-[12px] text-muted">{includedCount} images will be exported with caption sidecars.</p>
              {exportDataset.data && (
                <p className="text-[12px] text-green-600 bg-green-50 p-3">
                  Exported {exportDataset.data.exported} images. {exportDataset.data.skipped > 0 ? `${exportDataset.data.skipped} skipped.` : ''} {exportDataset.data.errors > 0 ? `${exportDataset.data.errors} errors.` : ''}
                </p>
              )}
              {exportDataset.error && (
                <p className="text-[12px] text-accent bg-accent/10 p-3">{(exportDataset.error as Error).message}</p>
              )}
              <div className="flex justify-end gap-3 mt-2">
                <button onClick={() => setShowExport(false)} className="px-4 py-2 text-[11px] uppercase font-bold text-muted">Cancel</button>
                <button
                  onClick={() => exportDataset.mutate({ datasetId, outputDir: exportDir })}
                  disabled={!exportDir.trim() || exportDataset.isPending}
                  className="bg-on-surface text-background px-6 py-2 text-[11px] uppercase font-bold disabled:opacity-50"
                >
                  {exportDataset.isPending ? 'Exporting...' : 'Export'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Images Modal */}
      <AddImagesModal
        open={showAddImages}
        onClose={() => setShowAddImages(false)}
        onAdd={(imageIds) => {
          addImages.mutate({ datasetId, imageIds })
          setShowAddImages(false)
        }}
      />
    </>
  )
}

function AddImagesModal({ open, onClose, onAdd }: {
  open: boolean
  onClose: () => void
  onAdd: (imageIds: string[]) => void
}) {
  const { data: characters } = useCharacters()
  const [characterFilter, setCharacterFilter] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [ratingMin, setRatingMin] = useState<number | undefined>(undefined)
  const [sourceFilter, setSourceFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const searchParams = {
    character: characterFilter || undefined,
    tags: tagsInput.trim() ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    rating_min: ratingMin,
    source: sourceFilter || undefined,
    limit: 100,
  }

  const { data: results } = useImageSearch(searchParams)

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    onAdd(Array.from(selected))
    setSelected(new Set())
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="bg-background border-border-subtle max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add Images from Search</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mt-2 pb-4 border-b border-border-subtle">
          <select
            value={characterFilter}
            onChange={(e) => setCharacterFilter(e.target.value)}
            className="border border-border-subtle bg-transparent py-1.5 px-3 text-[13px] focus:border-on-surface focus:ring-0 focus:outline-none"
          >
            <option value="">All Characters</option>
            {(characters ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.display_name || c.name}</option>
            ))}
          </select>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="border border-border-subtle bg-transparent py-1.5 px-3 text-[13px] focus:border-on-surface focus:ring-0 focus:outline-none w-48"
            placeholder="Tags (comma separated)"
          />
          <select
            value={ratingMin ?? ''}
            onChange={(e) => setRatingMin(e.target.value ? Number(e.target.value) : undefined)}
            className="border border-border-subtle bg-transparent py-1.5 px-3 text-[13px] focus:border-on-surface focus:ring-0 focus:outline-none"
          >
            <option value="">Any Rating</option>
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>{r}+ stars</option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="border border-border-subtle bg-transparent py-1.5 px-3 text-[13px] focus:border-on-surface focus:ring-0 focus:outline-none"
          >
            <option value="">Any Source</option>
            <option value="fig">Fig</option>
            <option value="comfyui">ComfyUI</option>
            <option value="manual">Manual</option>
          </select>
          <span className="text-meta text-muted self-center ml-auto">
            {results?.total ?? 0} results · {selected.size} selected
          </span>
        </div>

        {/* Results grid */}
        <div className="flex-1 overflow-y-auto min-h-0 mt-4">
          {(results?.images ?? []).length === 0 ? (
            <div className="py-12 text-center text-muted text-[13px]">
              <span className="material-symbols-outlined text-[48px] text-muted/20 block mb-4">search</span>
              No images match the current filters.
            </div>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {(results?.images ?? []).map((img) => (
                <button
                  key={img.id}
                  onClick={() => toggle(img.id)}
                  className={`relative aspect-square overflow-hidden border-2 transition-all ${
                    selected.has(img.id) ? 'border-accent shadow-md' : 'border-transparent hover:border-border-subtle'
                  }`}
                >
                  <img
                    src={thumbUrl(img.id)}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  {selected.has(img.id) && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[14px]">check</span>
                    </div>
                  )}
                  {img.character_name && (
                    <div className="absolute bottom-1 left-1 bg-on-surface/60 text-background text-[8px] px-1 py-0.5 rounded-sm backdrop-blur-sm">
                      {img.character_name}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle mt-2">
          <button onClick={onClose} className="px-4 py-2 text-[11px] uppercase font-bold text-muted">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="bg-on-surface text-background px-6 py-2 text-[11px] uppercase font-bold disabled:opacity-50"
          >
            Add {selected.size} Selected
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
