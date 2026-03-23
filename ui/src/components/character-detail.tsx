import { Link, useParams } from '@tanstack/react-router'
import { useCharacter, avatarUrl } from '@/lib/api'
import type { EraWithStats } from '@/lib/types'

export function CharacterDetail() {
  const { characterId } = useParams({ from: '/characters/$characterId' })
  const { data: character, isLoading } = useCharacter(characterId)

  if (isLoading) {
    return <div className="p-12 text-muted text-[15px]">Loading...</div>
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
        <div className="flex flex-col md:flex-row gap-12 mt-4 mb-16 items-end">
          <div className="flex-1">
            <h1 className="text-primary tracking-display text-[48px] md:text-[64px] font-normal font-display leading-[1.1] text-left pb-6 border-b border-border-subtle">
              {character.name}
            </h1>
            {/* Vitals Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-8">
              <div className="flex flex-col gap-1">
                <span className="text-muted text-[11px] uppercase tracking-ui font-medium">Status</span>
                <span className="text-primary text-[14px] font-body tabular-nums capitalize">{character.status}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted text-[11px] uppercase tracking-ui font-medium">Eras</span>
                <span className="text-primary text-[14px] font-body tabular-nums">{character.eras.length}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted text-[11px] uppercase tracking-ui font-medium">Total Images</span>
                <span className="text-primary text-[14px] font-body tabular-nums">
                  {character.eras.reduce((sum, e) => sum + e.image_count, 0)}
                </span>
              </div>
            </div>
          </div>
          {/* Portrait */}
          <div className="w-32 h-40 bg-surface rounded-sm border border-border-subtle flex-shrink-0 hidden md:block overflow-hidden relative">
            <img
              src={avatarUrl(character.id)}
              alt={character.display_name || character.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        </div>

        {/* Eras Section */}
        {character.status === 'cast' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[24px] font-display font-normal tracking-display text-primary">Chronological Eras</h2>
            </div>

            <div className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
              {character.eras.map((era) => (
                <EraCard key={era.id} characterId={character.id} era={era} />
              ))}
              {/* Add Era placeholder */}
              <button className="flex flex-col gap-3 min-w-[280px] md:min-w-[400px] group snap-start outline-none text-left">
                <div className="aspect-video w-full bg-transparent rounded-sm border border-dashed border-border-subtle flex items-center justify-center transition-all duration-300 group-hover:border-primary group-hover:bg-primary/5">
                  <span className="material-symbols-outlined text-[24px] text-muted group-hover:text-primary transition-colors">add</span>
                </div>
                <div className="flex justify-between items-baseline px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <h3 className="text-[18px] font-display tracking-display text-primary">Initialize New Era</h3>
                </div>
              </button>
            </div>
          </>
        )}

        {/* Pre-cast state */}
        {character.status !== 'cast' && (
          <div className="py-12">
            <p className="text-muted text-[15px]">
              This character is in <span className="capitalize">{character.status}</span> phase.
              Eras and visual identity curation are available after casting.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function EraCard({ characterId, era }: { characterId: string; era: EraWithStats }) {
  return (
    <Link
      to="/characters/$characterId/eras/$eraId"
      params={{ characterId, eraId: era.id }}
      className="flex flex-col gap-3 min-w-[280px] md:min-w-[400px] group snap-start outline-none"
    >
      <div className="aspect-video w-full bg-surface rounded-sm border border-border-subtle overflow-hidden relative transition-all duration-300 group-hover:border-primary">
        <div className="absolute inset-0 bg-gradient-to-tr from-stone-200 to-stone-100 opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out" />
        <div className="absolute inset-0 ring-1 ring-inset ring-black/5" />
        {/* Reference package status */}
        {era.reference_package_ready && (
          <div className="absolute top-3 right-3">
            <span className="bg-background text-primary text-[10px] uppercase font-medium tracking-ui px-1.5 py-0.5 rounded-sm">
              Refs Ready
            </span>
          </div>
        )}
      </div>
      <div className="flex justify-between items-baseline px-1">
        <h3 className="text-[18px] font-display tracking-display text-primary group-hover:text-accent transition-colors">
          {era.label}
        </h3>
        <span className="text-[12px] font-body tabular-nums text-muted">{era.image_count} Assets</span>
      </div>
    </Link>
  )
}
