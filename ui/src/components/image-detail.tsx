import { useParams } from '@tanstack/react-router'
import { imageUrl, thumbUrl } from '@/lib/api'
import { AuditHistory } from '@/components/audit-history'
import { useState } from 'react'

type DetailTab = 'metadata' | 'audit'

export function ImageDetail() {
  const { imageId } = useParams({ from: '/images/$imageId' })
  const [activeTab, setActiveTab] = useState<DetailTab>('audit')

  return (
    <div className="flex flex-col lg:flex-row gap-16 p-12">
      {/* Left: Image */}
      <section className="lg:w-[55%] flex flex-col gap-12">
        <header>
          <div className="flex items-center gap-3 text-muted mb-4">
            <span className="text-[10px] uppercase tracking-[0.15em]">Asset #{imageId.slice(0, 8)}</span>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-display text-on-surface">
            Image Detail
          </h1>
        </header>

        <div className="relative aspect-[4/5] bg-surface-low overflow-hidden rounded-sm">
          <img
            alt="Image detail"
            className="w-full h-full object-cover"
            src={imageUrl(imageId)}
            onError={(e) => { (e.target as HTMLImageElement).src = thumbUrl(imageId) }}
          />
        </div>

        <div className="grid grid-cols-3 gap-8 pt-8 border-t border-border-subtle/20">
          <div>
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted mb-1">Image ID</p>
            <p className="text-sm font-medium tabular-nums">{imageId}</p>
          </div>
        </div>
      </section>

      {/* Right: Tabs */}
      <section className="lg:w-[45%] flex flex-col">
        <div className="flex gap-10 border-b border-border-subtle/10 pb-4 mb-8">
          {(['metadata', 'audit'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-[11px] tracking-[0.2em] uppercase transition-colors pb-4 -mb-[18px] ${
                activeTab === tab
                  ? 'text-on-surface border-b-2 border-on-surface font-bold'
                  : 'text-muted hover:text-on-surface'
              }`}
            >
              {tab === 'audit' ? 'Audit History' : 'Metadata'}
            </button>
          ))}
        </div>

        {activeTab === 'audit' && (
          <AuditHistory entityType="image" entityId={imageId} />
        )}

        {activeTab === 'metadata' && (
          <div className="text-muted text-sm py-8">
            Image metadata panel — coming soon
          </div>
        )}
      </section>
    </div>
  )
}
