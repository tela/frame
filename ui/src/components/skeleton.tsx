export function SkeletonCard({ aspectRatio = 'square' }: { aspectRatio?: 'square' | 'video' | 'portrait' }) {
  const aspect = aspectRatio === 'video' ? 'aspect-video' : aspectRatio === 'portrait' ? 'aspect-[3/4]' : 'aspect-square'
  return (
    <div className={`${aspect} bg-surface-low animate-pulse rounded-sm`} />
  )
}

export function SkeletonGrid({ count = 8, columns = 4, aspectRatio = 'square' }: {
  count?: number
  columns?: number
  aspectRatio?: 'square' | 'video' | 'portrait'
}) {
  const colClass = columns === 2 ? 'grid-cols-2' :
    columns === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
    columns === 5 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' :
    'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'

  return (
    <div className={`grid ${colClass} gap-8`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} aspectRatio={aspectRatio} />
      ))}
    </div>
  )
}

export function SkeletonText({ width = 'w-32', height = 'h-4' }: { width?: string; height?: string }) {
  return <div className={`${width} ${height} bg-surface-low animate-pulse rounded-sm`} />
}

export function SkeletonHero() {
  return (
    <div className="flex flex-col md:flex-row gap-12 mt-4 mb-20 items-start animate-pulse">
      <div className="flex-1 max-w-2xl">
        <div className="w-24 h-5 bg-surface-low rounded-sm mb-4" />
        <div className="w-96 h-16 bg-surface-low rounded-sm mb-6" />
        <div className="w-64 h-4 bg-surface-low rounded-sm mb-8" />
        <div className="grid grid-cols-3 gap-12 pt-8 border-t border-border-subtle">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="w-16 h-3 bg-surface-low rounded-sm mb-2" />
              <div className="w-8 h-7 bg-surface-low rounded-sm" />
            </div>
          ))}
        </div>
      </div>
      <div className="w-[160px] h-[200px] bg-surface-low rounded-sm hidden md:block" />
    </div>
  )
}
