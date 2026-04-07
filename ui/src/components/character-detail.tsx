import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useCharacter, useDatasets, useCreateEra, useFigStatus, usePublishToFig } from '@/lib/api'
import { useState } from 'react'
import { PoseSetDashboard } from '@/components/pose-set-dashboard'
import { GoSeeLooks } from '@/components/go-see-looks'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CharacterHero } from '@/components/character-hero'
import { ERA_PRESETS } from '@/components/character-name-data'
import { SkeletonHero, SkeletonGrid } from '@/components/skeleton'
import { ProspectView } from '@/components/prospect-view'
import { ShootsSection } from '@/components/shoots-section'
import type { EraWithStats } from '@/lib/types'

export function CharacterDetail() {
  const { characterId } = useParams({ from: '/characters/$characterId' })
  const { data: character, isLoading } = useCharacter(characterId)
  const { data: allDatasets } = useDatasets()
  const characterDatasets = (allDatasets ?? []).filter((d) => d.character_id === characterId)
  const createEra = useCreateEra()
  const { data: figStatus } = useFigStatus()
  const publishToFig = usePublishToFig()
  const [avatarVersion, setAvatarVersion] = useState(0)
  const [showCreateEra, setShowCreateEra] = useState(false)
  const [newEraLabel, setNewEraLabel] = useState('')
  const [newEraAgeRange, setNewEraAgeRange] = useState('')
  const [newEraTimePeriod, setNewEraTimePeriod] = useState('')
  const [newEraDescription, setNewEraDescription] = useState('')

  if (isLoading) {
    return (
      <div className="px-8 md:px-20 lg:px-40 flex flex-1 justify-center py-5">
        <div className="flex flex-col max-w-[1200px] flex-1 w-full">
          <SkeletonHero />
          <SkeletonGrid count={4} />
        </div>
      </div>
    )
  }

  if (!character) {
    return <div className="p-12 text-muted text-[15px]">Character not found</div>
  }

  return (
    <div className="px-8 md:px-20 lg:px-40 flex flex-1 justify-center py-5">
      <div className="flex flex-col max-w-[1200px] flex-1 w-full">
        {/* Breadcrumbs */}
        <div className="flex flex-wrap gap-2 py-4 items-center">
          <Link
            to="/characters"
            className="text-muted hover:text-primary text-[13px] uppercase tracking-ui font-medium transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Character Library
          </Link>
          <span className="text-muted text-[13px] uppercase tracking-ui font-medium">/</span>
          <span className="text-primary text-[13px] uppercase tracking-ui font-medium">
            {character.display_name || character.name}
          </span>
        </div>

        {/* Character Hero */}
        <CharacterHero character={character} figStatus={figStatus} publishToFig={publishToFig} avatarVersion={avatarVersion} />

        {/* Eras Section — show for cast and development */}
        {(character.status === 'cast' || character.status === 'development') && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[24px] font-display font-normal tracking-display text-primary">Eras</h2>
              <button
                onClick={() => { setShowCreateEra(true); setNewEraLabel(''); setNewEraAgeRange(''); setNewEraTimePeriod(''); setNewEraDescription('') }}
                className="flex items-center gap-2 text-[11px] uppercase font-bold tracking-[0.1em] text-muted hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                New Era
              </button>
            </div>

            <div className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory mb-20" style={{ scrollbarWidth: 'none' }}>
              {[...character.eras].sort((a, b) => {
                const ageA = parseInt(a.age_range) || 0
                const ageB = parseInt(b.age_range) || 0
                return ageA - ageB
              }).map((era) => (
                <EraCard key={era.id} characterId={character.id} era={era} />
              ))}
            </div>

            {/* Shoots */}
            <ShootsSection characterId={character.id} defaultEraId={character.eras[0]?.id} />

            {/* Pose Set Dashboard */}
            {character.eras.map((era) => (
              <PoseSetDashboard key={era.id} characterId={character.id} eraId={era.id} eraLabel={era.label} />
            ))}

            {/* Go-see Looks */}
            <GoSeeLooks characterId={character.id} />

            {/* Datasets */}
            {characterDatasets.length > 0 && (
              <div className="mb-12">
                <h2 className="text-[24px] font-display font-normal tracking-display text-primary mb-6">Training Datasets</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {characterDatasets.map((ds) => (
                    <Link
                      key={ds.id}
                      to="/datasets/$datasetId"
                      params={{ datasetId: ds.id }}
                      className="p-6 border border-border-subtle hover:border-primary transition-colors group"
                    >
                      <h3 className="font-display text-lg group-hover:text-accent transition-colors">{ds.name}</h3>
                      {ds.description && <p className="text-muted text-sm mt-1">{ds.description}</p>}
                      <div className="flex gap-4 mt-3 text-[11px] text-muted uppercase tracking-wider">
                        <span>{ds.type || 'general'}</span>
                        <span>{ds.image_count} images</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Create Era Dialog */}
            <CreateEraDialog
              open={showCreateEra}
              onOpenChange={setShowCreateEra}
              label={newEraLabel}
              setLabel={setNewEraLabel}
              ageRange={newEraAgeRange}
              setAgeRange={setNewEraAgeRange}
              timePeriod={newEraTimePeriod}
              setTimePeriod={setNewEraTimePeriod}
              description={newEraDescription}
              setDescription={setNewEraDescription}
              onCreate={() => {
                if (!newEraLabel.trim()) return
                createEra.mutate(
                  { characterId: character.id, label: newEraLabel.trim(), age_range: newEraAgeRange, time_period: newEraTimePeriod, description: newEraDescription },
                  { onSuccess: () => { setShowCreateEra(false); setNewEraLabel('') } }
                )
              }}
              isPending={createEra.isPending}
            />
          </>
        )}

        {/* Prospect / Development image view */}
        {(character.status === 'prospect' || character.status === 'development') && (
          <ProspectView
            characterId={character.id}
            characterName={character.display_name || character.name}
            status={character.status}
            defaultEraId={character.eras[0]?.id}
            eras={character.eras}
            onAvatarChange={() => setAvatarVersion(v => v + 1)}
          />
        )}
      </div>
    </div>
  )
}

function CreateEraDialog({ open, onOpenChange, label, setLabel, ageRange, setAgeRange, timePeriod, setTimePeriod, description, setDescription, onCreate, isPending }: {
  open: boolean; onOpenChange: (open: boolean) => void
  label: string; setLabel: (v: string) => void
  ageRange: string; setAgeRange: (v: string) => void
  timePeriod: string; setTimePeriod: (v: string) => void
  description: string; setDescription: (v: string) => void
  onCreate: () => void; isPending: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border-subtle max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Create New Era</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-4">
          <div>
            <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Label <span className="text-accent">*</span></label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none" placeholder="e.g. Young Adult, Prime" autoFocus />
          </div>
          <div>
            <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Age Range</label>
            <select value={ageRange} onChange={(e) => {
              setAgeRange(e.target.value)
              if (!label.trim()) {
                const preset = ERA_PRESETS.find(p => p.ageRange === e.target.value)
                if (preset) setLabel(preset.label)
              }
            }} className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none">
              <option value="">Select age range...</option>
              {ERA_PRESETS.map((p) => (
                <option key={p.ageRange} value={p.ageRange}>{p.label} ({p.ageRange})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Time Period</label>
            <input value={timePeriod} onChange={(e) => setTimePeriod(e.target.value)} className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none" placeholder="e.g. Present Day, 1960s" />
          </div>
          <div>
            <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none resize-none" placeholder="Narrative context for this era..." />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => onOpenChange(false)} className="px-4 py-2 text-[11px] uppercase font-bold text-muted hover:text-on-surface transition-colors">Cancel</button>
            <button onClick={onCreate} disabled={!label.trim() || isPending} className="bg-on-surface text-background px-6 py-2 text-[11px] uppercase font-bold disabled:opacity-50">
              {isPending ? 'Creating...' : 'Create Era'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EraCard({ characterId, era }: { characterId: string; era: EraWithStats }) {
  const navigate = useNavigate()
  return (
    <Link
      to="/characters/$characterId/eras/$eraId"
      params={{ characterId, eraId: era.id }}
      className="flex flex-col gap-3 min-w-[280px] md:min-w-[400px] group snap-start outline-none"
    >
      <div className="aspect-video w-full bg-surface-low rounded-sm border border-border-subtle overflow-hidden relative">
        {era.reference_package_ready && (
          <div className="absolute top-3 right-3">
            <span className="bg-background text-primary text-[10px] uppercase font-medium tracking-ui px-1.5 py-0.5 rounded-sm">
              Refs Ready
            </span>
          </div>
        )}
      </div>
      <div className="px-1">
        <div className="flex justify-between items-baseline">
          <h3 className="text-[18px] font-display tracking-display text-primary">
            {era.label}
          </h3>
          <span className="text-[12px] font-body tabular-nums text-muted">{era.image_count} Assets</span>
        </div>
        {(era.age_range || era.time_period) && (
          <p className="text-[11px] text-muted mt-1">
            {[era.age_range, era.time_period].filter(Boolean).join(' · ')}
          </p>
        )}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate({ to: '/characters/$characterId/eras/$eraId/refs', params: { characterId, eraId: era.id } }) }}
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-accent transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">collections</span>
          Build References
        </button>
      </div>
    </Link>
  )
}
