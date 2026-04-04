import { useAuditLog, type AuditEvent } from '@/lib/api'
import { useState } from 'react'

const ENTITY_TYPES = [
  { value: '', label: 'All Entities' },
  { value: 'character', label: 'Character' },
  { value: 'image', label: 'Image' },
  { value: 'dataset', label: 'Dataset' },
  { value: 'lora', label: 'LoRA' },
  { value: 'look', label: 'Look' },
  { value: 'hairstyle', label: 'Hairstyle' },
  { value: 'media', label: 'Media' },
  { value: 'pose_set', label: 'Pose Set' },
]

const ENTITY_ICONS: Record<string, string> = {
  character: 'person',
  image: 'image',
  dataset: 'folder',
  lora: 'model_training',
  look: 'style',
  hairstyle: 'content_cut',
  media: 'photo_library',
  pose_set: 'accessibility_new',
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatAction(event: AuditEvent): string {
  const action = event.action.replace(/_/g, ' ')
  const entityShort = event.entity_id.slice(0, 8)

  // Check context for a name
  const name = event.context?.name || event.context?.character_name
  const entityLabel = name ? `${event.entity_type} "${name}"` : `${event.entity_type} #${entityShort}`

  return `${action.charAt(0).toUpperCase() + action.slice(1)} on ${entityLabel}`
}

export function AuditTrail() {
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 50

  const { data, isLoading } = useAuditLog({
    entity_type: entityType || undefined,
    action: action || undefined,
    q: search || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    limit: pageSize,
    offset: page * pageSize,
  })

  const events = data?.events ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  const selectClass = "bg-transparent border border-border-subtle py-2 px-3 text-[13px] focus:border-on-surface focus:ring-0 focus:outline-none"

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <section className="px-12 py-12">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-display text-5xl italic text-on-surface">Audit Trail</h1>
            <p className="text-muted text-[13px] mt-1">Activity history across all entities</p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl text-on-surface tabular-nums">{total.toLocaleString()}</p>
            <p className="text-muted text-[10px] uppercase tracking-widest font-bold">Total Events</p>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="mx-12 mb-8 bg-surface-low p-4 flex flex-wrap items-center gap-3">
        <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(0) }} className={selectClass}>
          {ENTITY_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(0) }}
          placeholder="Filter by action..."
          className={selectClass + ' w-48'}
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
          className={selectClass}
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
          className={selectClass}
          title="To date"
        />
        <div className="ml-auto">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search entity ID..."
            className={selectClass + ' w-48'}
          />
        </div>
      </section>

      {/* Event List */}
      <section className="mx-12 flex-1 pb-12">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-surface-low" />
                <div className="flex-1">
                  <div className="w-64 h-4 bg-surface-low rounded-sm mb-2" />
                  <div className="w-40 h-3 bg-surface-low rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-20 text-center">
            <span className="material-symbols-outlined text-[48px] text-muted/30 mb-4 block">history</span>
            <p className="text-muted text-[15px]">No audit events match your filters</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {events.map(event => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mx-12 pb-12 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-[13px] text-muted hover:text-on-surface disabled:opacity-30 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            Previous
          </button>
          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            const pageNum = page < 3 ? i : page > totalPages - 4 ? totalPages - 5 + i : page - 2 + i
            if (pageNum < 0 || pageNum >= totalPages) return null
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`w-8 h-8 text-[13px] transition-colors ${
                  pageNum === page ? 'bg-on-surface text-background' : 'text-muted hover:text-on-surface'
                }`}
              >
                {pageNum + 1}
              </button>
            )
          })}
          {totalPages > 5 && page < totalPages - 3 && (
            <span className="text-muted text-[13px]">...</span>
          )}
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="text-[13px] text-muted hover:text-on-surface disabled:opacity-30 flex items-center gap-1"
          >
            Next
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  )
}

function EventRow({ event }: { event: AuditEvent }) {
  const icon = ENTITY_ICONS[event.entity_type] || 'history'

  return (
    <div className="flex gap-4 py-3 border-b border-surface-low hover:bg-surface-low/50 transition-colors">
      {/* Icon */}
      <div className="w-8 h-8 rounded-full bg-surface-low flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-[16px] text-primary">{icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-on-surface">{formatAction(event)}</p>
        {event.field && (
          <p className="text-[12px] text-muted mt-0.5">
            {event.field}: {event.old_value ?? '—'} → {event.new_value ?? '—'}
          </p>
        )}
        {Object.keys(event.context).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(event.context).map(([k, v]) => (
              <span key={k} className="text-[10px] text-muted bg-surface-low px-1.5 py-0.5">
                {k}: {v.length > 16 ? v.slice(0, 16) + '...' : v}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div className="flex-shrink-0 w-24 text-right" title={new Date(event.created_at).toLocaleString()}>
        <span className="text-[11px] text-muted">{relativeTime(event.created_at)}</span>
      </div>
    </div>
  )
}
