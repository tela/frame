import { usePoseSetStatus, useUpdatePoseSetImage, useStandardOutfits, thumbUrl } from '@/lib/api'
import type { PoseSetEntry } from '@/lib/api'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

const CATEGORY_ORDER = ['sfw_standard', 'nsfw_standard', 'anatomical_detail'] as const

export function PoseSetDashboard({ characterId, eraId, eraLabel }: { characterId: string; eraId: string; eraLabel?: string }) {
  const { data: poseSet } = usePoseSetStatus(characterId, eraId)
  const { data: outfits } = useStandardOutfits()
  const updatePoseSet = useUpdatePoseSetImage()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    nsfw_standard: true,
    anatomical_detail: true,
  })

  if (!poseSet) return null

  // Group poses by category
  const grouped: Record<string, PoseSetEntry[]> = {}
  for (const entry of poseSet.poses) {
    if (!grouped[entry.category]) grouped[entry.category] = []
    grouped[entry.category].push(entry)
  }

  const pendingCount = poseSet.generated - poseSet.accepted
  const missingCount = poseSet.total - poseSet.generated

  const handleAccept = (entry: PoseSetEntry) => {
    updatePoseSet.mutate({ characterId, era_id: eraId, pose_id: entry.pose_id, outfit_id: entry.outfit_id, status: 'accepted' })
  }

  const handleReject = (entry: PoseSetEntry) => {
    updatePoseSet.mutate({ characterId, era_id: eraId, pose_id: entry.pose_id, outfit_id: entry.outfit_id, status: 'rejected' })
  }

  const toggleSection = (cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }

  return (
    <div>
      {/* Hero Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="font-display text-[40px] tracking-display">
            Reference Set — {eraLabel || 'Standard Era'}
          </h2>
        </div>
        <div className="flex gap-3 items-center">
          <button className="bg-on-surface text-background px-6 py-2.5 text-[11px] uppercase font-bold tracking-[0.15em] hover:opacity-90 transition-opacity">
            Generate All Missing
          </button>
        </div>
      </div>

      {/* Progress & Stats */}
      <div className="flex items-center justify-between mb-16">
        <div className="flex flex-col gap-2 w-72">
          <div className="flex justify-between text-[10px] uppercase tracking-[0.15em] text-muted">
            <span>Completion</span>
            <span className="font-bold text-on-surface">{poseSet.accepted} of {poseSet.total} complete</span>
          </div>
          <div className="h-1 w-full bg-surface-high overflow-hidden">
            <div className="h-full bg-on-surface transition-all duration-1000" style={{ width: `${(poseSet.accepted / poseSet.total) * 100}%` }} />
          </div>
        </div>
        <div className="flex gap-12">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">Accepted</p>
            <p className="font-display text-xl">{String(poseSet.accepted).padStart(2, '0')}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">Pending</p>
            <p className="font-display text-xl">{String(pendingCount).padStart(2, '0')}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">Missing</p>
            <p className="font-display text-xl">{String(missingCount).padStart(2, '0')}</p>
          </div>
        </div>
      </div>

      {/* Category Sections */}
      <div className="space-y-20">
        {CATEGORY_ORDER.map((category) => {
          const entries = grouped[category]
          if (!entries?.length) return null

          const isSFW = category === 'sfw_standard'
          const isCollapsed = collapsed[category] ?? false

          // Unique poses preserving order
          const poseIds: string[] = []
          const poseNames: Record<string, string> = {}
          for (const e of entries) {
            if (!poseIds.includes(e.pose_id)) {
              poseIds.push(e.pose_id)
              poseNames[e.pose_id] = e.pose_name
            }
          }

          const columns = isSFW
            ? (outfits ?? []).map((o) => ({ id: o.id, label: o.name }))
            : [{ id: 'nude', label: 'Nude' }]

          const colCount = columns.length

          return (
            <div key={category} className={isCollapsed ? 'opacity-60' : ''}>
              {/* Section Header */}
              <div className="flex items-center gap-4 mb-8">
                <h3 className="font-display text-2xl italic">{
                  category === 'sfw_standard' ? 'SFW Standard' :
                  category === 'nsfw_standard' ? 'NSFW Standard' :
                  'Anatomical Detail'
                }</h3>
                <div className="h-px flex-1 bg-surface-high" />
                <button onClick={() => toggleSection(category)} className="text-on-surface hover:opacity-70 transition-opacity">
                  <span className="material-symbols-outlined">
                    {isCollapsed ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}
                  </span>
                </button>
              </div>

              {!isCollapsed && (
                <div
                  className="gap-y-6"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `180px repeat(${colCount}, minmax(0, 200px))`,
                  }}
                >
                  {/* Column Headers */}
                  <div /> {/* Empty corner */}
                  {columns.map((col) => (
                    <div key={col.id} className="flex justify-center py-2">
                      <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted">{col.label}</span>
                    </div>
                  ))}

                  {/* Rows */}
                  {poseIds.map((poseId) => (
                    <>
                      <div key={`label-${poseId}`} className="flex items-center text-[11px] uppercase tracking-[0.15em] text-muted">
                        {poseNames[poseId]}
                      </div>
                      {columns.map((col) => {
                        const entry = entries.find((e) => e.pose_id === poseId && e.outfit_id === col.id)
                        return (
                          <div key={`${poseId}-${col.id}`} className="px-3">
                            <PoseCell
                              entry={entry}
                              characterId={characterId}
                              eraId={eraId}
                              onAccept={entry ? () => handleAccept(entry) : undefined}
                              onReject={entry ? () => handleReject(entry) : undefined}
                            />
                          </div>
                        )
                      })}
                    </>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PoseCell({
  entry,
  characterId,
  eraId,
  onAccept,
  onReject,
}: {
  entry?: PoseSetEntry
  characterId: string
  eraId: string
  onAccept?: () => void
  onReject?: () => void
}) {
  const status = entry?.status ?? 'missing'
  const imageId = entry?.image_id

  if (status === 'missing' || !imageId) {
    return (
      <Link
        to="/characters/$characterId/eras/$eraId/studio"
        params={{ characterId, eraId }}
        className="block aspect-[3/4] border-2 border-dashed border-surface-high flex items-center justify-center hover:bg-surface-low transition-colors cursor-pointer group"
      >
        <span className="material-symbols-outlined text-muted/30 group-hover:text-on-surface transition-colors">add</span>
      </Link>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="relative aspect-[3/4] bg-surface-low overflow-hidden">
        <img src={thumbUrl(imageId)} alt="" className="w-full h-full object-cover grayscale brightness-50 contrast-75 opacity-40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-[36px] text-accent/60">block</span>
        </div>
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />
      </div>
    )
  }

  return (
    <div className="relative group aspect-[3/4] bg-surface-low overflow-hidden cursor-pointer">
      <img
        src={thumbUrl(imageId)}
        alt=""
        className={`w-full h-full object-cover transition-all duration-300 ${
          status === 'generated' ? 'grayscale brightness-95 opacity-80 group-hover:grayscale-0' : 'grayscale brightness-95 group-hover:grayscale-0'
        }`}
      />
      {/* Status dot */}
      {status === 'accepted' && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500" style={{ boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
      )}
      {status === 'generated' && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      )}
      {/* Hover actions */}
      {status === 'generated' && (
        <div className="absolute inset-0 bg-on-surface/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={(e) => { e.preventDefault(); onReject?.() }}
            className="bg-background/90 text-on-surface p-2 hover:text-accent transition-colors"
            title="Reject"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
          <button
            onClick={(e) => { e.preventDefault(); onAccept?.() }}
            className="bg-on-surface text-background p-2 hover:bg-accent transition-colors"
            title="Accept"
          >
            <span className="material-symbols-outlined text-[18px]">check</span>
          </button>
        </div>
      )}
      {status === 'accepted' && (
        <div className="absolute inset-0 bg-on-surface/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Link
            to="/characters/$characterId/eras/$eraId/studio"
            params={{ characterId, eraId }}
            className="bg-background/90 text-on-surface p-2 hover:text-accent transition-colors"
            title="Replace"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </Link>
        </div>
      )}
    </div>
  )
}
