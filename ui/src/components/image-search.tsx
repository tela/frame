import { useImageSearch, thumbUrl } from '@/lib/api'
import { ImageSearchFilters, useSearchFilters } from '@/components/image-search-filters'
import { SkeletonGrid } from '@/components/skeleton'
import type { SearchResult } from '@/lib/types'

export function ImageSearch() {
  const { filters, setFilter, addTag, removeTag, toSearchParams } = useSearchFilters()
  const { data: results, isLoading } = useImageSearch(toSearchParams({ limit: 60 }))

  return (
    <div className="flex h-full overflow-hidden">
      {/* Filter Sidebar */}
      <aside className="w-[280px] flex-shrink-0 border-r border-border-subtle bg-background p-6 overflow-y-auto hidden lg:flex">
        <ImageSearchFilters
          filters={filters}
          setFilter={setFilter}
          addTag={addTag}
          removeTag={removeTag}
        />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 py-6 border-b border-border-subtle bg-background flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-display tracking-display text-on-surface">Image Search</h1>
            {results && (
              <span className="text-meta text-muted">{results.total} results</span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {isLoading ? (
            <SkeletonGrid count={10} columns={5} />
          ) : (results?.images.length ?? 0) === 0 ? (
            <div className="text-muted text-center py-20">
              <span className="material-symbols-outlined text-[48px] text-muted/30 mb-4 block">image_search</span>
              <p className="text-sm">No images match your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {results?.images.map((img) => (
                <SearchResultCard key={img.id} result={img} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SearchResultCard({ result }: { result: SearchResult }) {
  return (
    <div className="group relative border border-border-subtle hover:border-primary transition-colors overflow-hidden">
      <div className="aspect-square bg-surface-low overflow-hidden">
        <img
          src={thumbUrl(result.id)}
          alt={result.original_filename}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>

      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-background">
        <div className="space-y-1">
          {result.character_name && (
            <p className="text-[10px] uppercase tracking-widest">{result.character_name}</p>
          )}
          {result.era_label && (
            <p className="text-[9px] text-background/70">{result.era_label}</p>
          )}
          <div className="flex gap-1">
            {result.set_type && (
              <span className="text-[8px] uppercase tracking-wider bg-background/20 px-1.5 py-0.5">{result.set_type}</span>
            )}
            {result.ref_type && <span className="text-[8px] uppercase bg-accent/80 px-1.5 py-0.5">{result.ref_type}</span>}
          </div>
          {result.rating != null && result.rating > 0 && (
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: s <= result.rating! ? "'FILL' 1" : "'FILL' 0" }}>star</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
