import { usePoseSetStatus, useUpdatePoseSetImage, useStandardOutfits, thumbUrl } from '@/lib/api'
import type { PoseSetEntry } from '@/lib/api'
import { Link } from '@tanstack/react-router'

const CATEGORY_LABELS: Record<string, string> = {
  sfw_standard: 'SFW Standard',
  nsfw_standard: 'NSFW Standard',
  anatomical_detail: 'Anatomical Detail',
}

const CATEGORY_ORDER = ['sfw_standard', 'nsfw_standard', 'anatomical_detail']

export function PoseSetDashboard({ characterId, eraId }: { characterId: string; eraId: string }) {
  const { data: poseSet } = usePoseSetStatus(characterId, eraId)
  const { data: outfits } = useStandardOutfits()
  const updatePoseSet = useUpdatePoseSetImage()

  if (!poseSet) return null

  // Group poses by category
  const grouped: Record<string, PoseSetEntry[]> = {}
  for (const entry of poseSet.poses) {
    if (!grouped[entry.category]) grouped[entry.category] = []
    grouped[entry.category].push(entry)
  }

  const handleAccept = (entry: PoseSetEntry) => {
    updatePoseSet.mutate({
      characterId,
      era_id: eraId,
      pose_id: entry.pose_id,
      outfit_id: entry.outfit_id,
      status: 'accepted',
    })
  }

  const handleReject = (entry: PoseSetEntry) => {
    updatePoseSet.mutate({
      characterId,
      era_id: eraId,
      pose_id: entry.pose_id,
      outfit_id: entry.outfit_id,
      status: 'rejected',
    })
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="font-display text-2xl tracking-display">Reference Set</h3>
          <p className="text-[11px] text-muted uppercase tracking-[0.1em] mt-1">
            {poseSet.accepted} of {poseSet.total} accepted
            {poseSet.generated > poseSet.accepted && ` · ${poseSet.generated - poseSet.accepted} pending review`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="w-32 h-1.5 bg-surface-high overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(poseSet.accepted / poseSet.total) * 100}%` }}
            />
          </div>
          <span className="text-[11px] text-muted tabular-nums">{poseSet.accepted}/{poseSet.total}</span>
        </div>
      </div>

      {/* Category Sections */}
      {CATEGORY_ORDER.map((category) => {
        const entries = grouped[category]
        if (!entries?.length) return null

        const isSFW = category === 'sfw_standard'

        // Get unique poses in this category (preserving order)
        const poseIds: string[] = []
        const poseNames: Record<string, string> = {}
        for (const e of entries) {
          if (!poseIds.includes(e.pose_id)) {
            poseIds.push(e.pose_id)
            poseNames[e.pose_id] = e.pose_name
          }
        }

        // For SFW, columns are the outfit variants. For NSFW/detail, single column.
        const columns = isSFW
          ? (outfits ?? []).map((o) => ({ id: o.id, label: o.name }))
          : [{ id: 'nude', label: 'Nude' }]

        return (
          <div key={category}>
            <div className="flex items-center gap-3 mb-4">
              <h4 className="text-[11px] uppercase font-bold tracking-[0.15em] text-muted">
                {CATEGORY_LABELS[category]}
              </h4>
              {category !== 'sfw_standard' && (
                <span className="text-[9px] uppercase font-bold tracking-[0.1em] px-1.5 py-0.5 bg-accent/10 text-accent border border-accent/20">
                  NSFW
                </span>
              )}
            </div>

            {/* Grid */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="w-[140px] text-left text-[10px] uppercase font-bold tracking-[0.1em] text-muted pb-2 pr-3" />
                    {columns.map((col) => (
                      <th key={col.id} className="text-center text-[10px] uppercase font-bold tracking-[0.1em] text-muted pb-2 px-1.5" style={{ minWidth: 120 }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {poseIds.map((poseId) => (
                    <tr key={poseId}>
                      <td className="text-[12px] text-muted py-1.5 pr-3 align-top pt-2">
                        {poseNames[poseId]}
                      </td>
                      {columns.map((col) => {
                        const entry = entries.find((e) => e.pose_id === poseId && e.outfit_id === col.id)
                        return (
                          <td key={col.id} className="px-1.5 py-1.5">
                            <PoseCell
                              entry={entry}
                              characterId={characterId}
                              eraId={eraId}
                              poseId={poseId}
                              outfitId={col.id}
                              onAccept={entry ? () => handleAccept(entry) : undefined}
                              onReject={entry ? () => handleReject(entry) : undefined}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PoseCell({
  entry,
  characterId,
  eraId,
  poseId,
  outfitId,
  onAccept,
  onReject,
}: {
  entry?: PoseSetEntry
  characterId: string
  eraId: string
  poseId: string
  outfitId: string
  onAccept?: () => void
  onReject?: () => void
}) {
  const status = entry?.status ?? 'missing'
  const imageId = entry?.image_id

  // Status indicator colors
  const dotColor: Record<string, string> = {
    generated: 'bg-yellow-500',
    accepted: 'bg-green-500',
    rejected: 'bg-red-400',
  }

  if (status === 'missing' || !imageId) {
    return (
      <Link
        to="/characters/$characterId/eras/$eraId/studio"
        params={{ characterId, eraId }}
        search={{ pose_id: poseId, outfit_id: outfitId }}
        className="block aspect-[3/4] border border-dashed border-border-subtle hover:border-primary transition-colors flex items-center justify-center group"
      >
        <span className="material-symbols-outlined text-[24px] text-muted/30 group-hover:text-primary transition-colors">add</span>
      </Link>
    )
  }

  return (
    <div className={`relative aspect-[3/4] border border-border-subtle overflow-hidden group ${status === 'rejected' ? 'opacity-40' : ''}`}>
      <img
        src={thumbUrl(imageId)}
        alt=""
        className="w-full h-full object-cover"
      />
      {/* Status dot */}
      {dotColor[status] && (
        <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${dotColor[status]}`} />
      )}
      {/* Hover actions */}
      <div className="absolute inset-0 bg-on-surface/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        {status === 'generated' && (
          <>
            <button
              onClick={onReject}
              className="bg-background/90 text-primary p-1.5 hover:text-accent transition-colors"
              title="Reject"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
            <button
              onClick={onAccept}
              className="bg-accent/90 text-white p-1.5 hover:bg-accent transition-colors"
              title="Accept"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
            </button>
          </>
        )}
        {status === 'accepted' && (
          <Link
            to="/characters/$characterId/eras/$eraId/studio"
            params={{ characterId, eraId }}
            search={{ pose_id: poseId, outfit_id: outfitId }}
            className="bg-background/90 text-primary p-1.5 hover:text-accent transition-colors"
            title="Replace"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
          </Link>
        )}
        {status === 'rejected' && (
          <Link
            to="/characters/$characterId/eras/$eraId/studio"
            params={{ characterId, eraId }}
            search={{ pose_id: poseId, outfit_id: outfitId }}
            className="bg-background/90 text-primary p-1.5 hover:text-accent transition-colors"
            title="Regenerate"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
          </Link>
        )}
      </div>
    </div>
  )
}
