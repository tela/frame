import { Link } from '@tanstack/react-router'
import { useDatasets } from '@/lib/api'
import { useState } from 'react'
import type { DatasetType, DatasetWithStats } from '@/lib/types'

const TYPE_COLORS: Record<string, string> = {
  lora: 'bg-on-surface text-background',
  ipadapter: 'bg-accent text-white',
  style: 'bg-primary-dim text-background',
  reference: 'bg-muted text-background',
  general: 'bg-surface-high text-on-surface',
}

export function DatasetManager() {
  const { data: datasets, isLoading } = useDatasets()
  const [typeFilter, setTypeFilter] = useState<DatasetType | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = (datasets ?? []).filter((d) => {
    if (typeFilter !== 'all' && d.type !== typeFilter) return false
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <>
      {/* Header */}
      <header className="flex justify-between items-center px-12 h-20 sticky top-0 z-10 glass-header border-b border-border-subtle/50">
        <div className="flex items-center gap-8">
          <span className="text-xl font-display text-on-surface">Dataset Manager</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-surface-low border-none focus:ring-1 focus:ring-on-surface text-sm w-64 rounded-sm transition-all placeholder-muted"
              placeholder="Search datasets..."
              type="text"
            />
          </div>
          <button className="bg-accent text-white px-6 py-2.5 text-[11px] uppercase font-bold tracking-[0.15em] hover:opacity-90 transition-all flex items-center gap-2">
            Export
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="px-12 py-10">
        <h1 className="text-4xl font-display tracking-display text-on-surface mb-8">Active Repositories</h1>

        {/* Filters */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {(['all', 'lora', 'ipadapter', 'style', 'reference', 'general'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-4 py-2 text-[11px] uppercase font-bold tracking-[0.1em] border transition-colors ${
                  typeFilter === type
                    ? 'bg-on-surface text-background border-on-surface'
                    : 'bg-transparent text-muted border-border-subtle hover:border-on-surface hover:text-on-surface'
                }`}
              >
                {type === 'all' ? 'All' : type}
              </button>
            ))}
          </div>
          <button className="bg-on-surface text-background px-6 py-2.5 text-[11px] uppercase font-bold tracking-[0.15em] hover:opacity-90 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">add</span>
            Create Dataset
          </button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <p className="text-muted">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((ds) => (
              <DatasetCard key={ds.id} dataset={ds} />
            ))}

            {/* Add placeholder */}
            <div className="border border-dashed border-border-subtle flex flex-col items-center justify-center p-8 min-h-[280px] hover:border-primary hover:bg-surface transition-colors cursor-pointer group">
              <span className="material-symbols-outlined text-[32px] text-muted group-hover:text-primary mb-2">add</span>
              <span className="text-[11px] uppercase font-bold tracking-[0.15em] text-muted group-hover:text-primary">Initialize Dataset</span>
              <span className="text-xs text-muted mt-1">Drag and drop folder or connect fig</span>
            </div>
          </div>
        )}

        {/* Footer stats */}
        <div className="mt-12 pt-6 border-t border-border-subtle/20 flex items-center gap-8 text-xs text-muted">
          <span>Total Assets: {(datasets ?? []).reduce((sum, d) => sum + d.image_count, 0).toLocaleString()}</span>
        </div>
      </div>
    </>
  )
}

function DatasetCard({ dataset }: { dataset: DatasetWithStats }) {
  const typeColor = TYPE_COLORS[dataset.type] ?? TYPE_COLORS.general
  return (
    <Link
      to="/datasets/$datasetId"
      params={{ datasetId: dataset.id }}
      className="group border border-border-subtle hover:border-on-surface bg-background p-0 transition-all cursor-pointer flex flex-col"
    >
      {/* Image preview area */}
      <div className="h-40 bg-surface-low relative overflow-hidden flex items-center justify-center">
        <span className="material-symbols-outlined text-[48px] text-muted/20">dataset</span>
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest ${typeColor}`}>
            {dataset.type}
          </span>
          <span className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest bg-surface text-on-surface">
            {dataset.image_count} images
          </span>
        </div>
      </div>
      {/* Info */}
      <div className="p-5">
        <h3 className="text-lg font-display tracking-display text-on-surface group-hover:text-accent transition-colors">
          {dataset.name}
        </h3>
        <p className="text-xs text-muted mt-1">
          {dataset.character_id ? `Character scoped` : 'Cross-character'}
          {' · '}
          Updated {new Date(dataset.updated_at).toLocaleDateString()}
        </p>
      </div>
    </Link>
  )
}
