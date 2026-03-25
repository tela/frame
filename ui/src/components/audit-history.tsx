import { useAuditLog, type AuditEvent } from '@/lib/api'

interface AuditHistoryProps {
  entityType?: string
  entityId?: string
}

const ACTION_ICONS: Record<string, string> = {
  created: 'add_circle',
  ingested: 'cloud_download',
  rating_changed: 'star',
  status_changed: 'swap_horiz',
  tag_added: 'sell',
  tag_removed: 'label_off',
  triage_approved: 'check_circle',
  triage_rejected: 'cancel',
  triage_archived: 'archive',
  set_type_changed: 'folder',
  face_ref_promoted: 'face',
  body_ref_promoted: 'person',
  caption_changed: 'edit_note',
  favorited: 'favorite',
  unfavorited: 'heart_minus',
  dataset_added: 'assignment',
  dataset_removed: 'assignment_late',
  derivative_created: 'content_copy',
  exported: 'download',
}

function getIcon(action: string): string {
  return ACTION_ICONS[action] ?? 'info'
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function describeEvent(e: AuditEvent): string {
  switch (e.action) {
    case 'created': return `${e.entity_type} created`
    case 'ingested': return 'Asset ingested into archive'
    case 'rating_changed': return `Rating changed from ${e.old_value ?? '—'} to ${e.new_value ?? '—'}`
    case 'status_changed': return `Status changed from ${e.old_value ?? '—'} to ${e.new_value ?? '—'}`
    case 'tag_added': return `Tag added: ${e.new_value ?? ''}`
    case 'tag_removed': return `Tag removed: ${e.old_value ?? ''}`
    case 'triage_approved': return 'Approved in triage'
    case 'triage_rejected': return 'Rejected in triage'
    case 'triage_archived': return 'Archived in triage'
    case 'set_type_changed': return `Set type changed to ${e.new_value ?? '—'}`
    case 'face_ref_promoted': return 'Promoted to face reference'
    case 'body_ref_promoted': return 'Promoted to body reference'
    case 'caption_changed': return 'Caption updated'
    case 'favorited': return 'Added to lookbook'
    case 'dataset_added': return `Added to dataset${e.context?.dataset_name ? ': ' + e.context.dataset_name : ''}`
    case 'derivative_created': return 'Derivative generated'
    case 'exported': return 'Exported for training'
    default: return e.action.replace(/_/g, ' ')
  }
}

function groupByDate(events: AuditEvent[]): Map<string, AuditEvent[]> {
  const groups = new Map<string, AuditEvent[]>()
  const now = new Date()
  const today = now.toDateString()
  const yesterday = new Date(now.getTime() - 86400000).toDateString()

  for (const e of events) {
    const d = new Date(e.created_at).toDateString()
    let label: string
    if (d === today) label = 'Today'
    else if (d === yesterday) label = 'Yesterday'
    else label = new Date(e.created_at).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })

    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(e)
  }
  return groups
}

export function AuditHistory({ entityType, entityId }: AuditHistoryProps) {
  const { data, isLoading } = useAuditLog(entityType, entityId)
  const events = data?.events ?? []
  const grouped = groupByDate(events)

  if (isLoading) {
    return <div className="py-8 text-muted text-sm">Loading history...</div>
  }

  if (events.length === 0) {
    return (
      <div className="py-12 text-center">
        <span className="material-symbols-outlined text-[48px] text-muted/20 mb-4 block">history</span>
        <p className="text-muted text-sm">No activity recorded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {Array.from(grouped.entries()).map(([label, groupEvents]) => (
        <div key={label}>
          {/* Date header */}
          <div className="flex items-center gap-4 mb-8">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">{label}</span>
            <div className="h-px flex-1 bg-border-subtle/30" />
          </div>

          {/* Events */}
          <div className="space-y-8">
            {groupEvents.map((event) => (
              <div key={event.id} className="flex gap-6 items-start group">
                {/* Icon */}
                <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-surface flex items-center justify-center">
                  <span className="material-symbols-outlined text-muted text-sm">{getIcon(event.action)}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <p className="text-sm leading-relaxed text-on-surface">
                      {describeEvent(event)}
                    </p>
                    <span className="text-[10px] text-muted font-medium shrink-0">
                      {formatTime(event.created_at)}
                    </span>
                  </div>

                  {/* Field change detail */}
                  {event.field && (
                    <p className="text-xs text-muted mt-1">
                      Field: <span className="font-medium">{event.field}</span>
                    </p>
                  )}

                  {/* Context */}
                  {event.context && Object.keys(event.context).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(event.context).map(([key, value]) => (
                        <span key={key} className="bg-surface-high text-on-surface px-2 py-0.5 text-[9px] uppercase tracking-wider">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
