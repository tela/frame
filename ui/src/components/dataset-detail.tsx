import { useParams } from '@tanstack/react-router'
import { useDataset, thumbUrl } from '@/lib/api'

export function DatasetDetail() {
  const { datasetId } = useParams({ from: '/datasets/$datasetId' })
  const { data, isLoading } = useDataset(datasetId)

  if (isLoading) return <div className="p-12 text-muted">Loading...</div>
  if (!data) return <div className="p-12 text-muted">Dataset not found</div>

  const { dataset: ds, images } = data
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
          <button className="border border-border-subtle px-4 py-2 text-[11px] uppercase font-bold tracking-[0.1em] hover:bg-surface transition-colors">
            Fork
          </button>
          <button className="bg-accent text-white px-6 py-2.5 text-[11px] uppercase font-bold tracking-[0.15em] hover:opacity-90 transition-all">
            Prepare Bundle
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
              <button className="mt-4 text-[11px] uppercase font-bold text-accent hover:underline">
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
            <button className="mt-4 w-full bg-accent text-white py-3 text-[11px] uppercase font-bold tracking-[0.15em] hover:opacity-90 transition-all">
              Prepare Bundle
            </button>
            {ds.description && (
              <div className="mt-6 p-4 bg-surface-low text-xs text-muted leading-relaxed">
                {ds.description}
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  )
}
