import { Link } from '@tanstack/react-router'
import { useCharacters, avatarUrl } from '@/lib/api'
import { useState } from 'react'
import { NewCharacterDialog } from '@/components/new-character-dialog'
import type { Character, CharacterStatus } from '@/lib/types'

const STATUS_OPTIONS: { value: CharacterStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'prospect', label: 'Prospects' },
  { value: 'development', label: 'Development' },
  { value: 'cast', label: 'Cast' },
]

export function CharacterLibrary() {
  const { data: characters, isLoading } = useCharacters()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CharacterStatus | 'all'>('all')
  const [showNewChar, setShowNewChar] = useState(false)

  const filtered = (characters ?? []).filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.display_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalCount = (characters ?? []).length

  return (
    <>
      {/* Header */}
      <header className="h-24 px-8 md:px-12 flex items-center justify-between border-b border-border-subtle sticky top-0 glass-header z-10">
        <button
          onClick={() => setShowNewChar(true)}
          className="bg-on-surface text-background py-2.5 px-6 text-[11px] uppercase tracking-[0.15em] font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          New Entry
        </button>
        <div className="flex-1 max-w-md ml-auto relative group">
          <span className="material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 text-muted text-[18px]">search</span>
          <input
            className="w-full bg-transparent border-b border-transparent focus:border-primary pl-8 py-2 text-[15px] placeholder-muted focus:outline-none transition-colors"
            placeholder="Search talent..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {/* Gallery Area */}
      <div className="p-8 md:p-12 flex-1">
        {/* Section Header */}
        <div className="mb-8 flex items-baseline justify-between">
          <h2 className="font-display text-[32px] md:text-[40px] tracking-display font-medium">Talent</h2>
          <span className="text-ui text-[13px] text-muted">{totalCount} on roster</span>
        </div>

        {/* Status Filter */}
        <div className="flex gap-3 mb-10">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-4 py-1.5 text-[11px] uppercase font-bold tracking-[0.1em] border transition-colors ${
                statusFilter === opt.value
                  ? 'bg-on-surface text-background border-on-surface'
                  : 'bg-transparent text-muted border-border-subtle hover:border-on-surface hover:text-on-surface'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-muted text-[15px]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <span className="material-symbols-outlined text-[48px] text-muted/30 mb-4 block">group</span>
            <p className="text-muted text-[15px]">
              {search || statusFilter !== 'all' ? 'No talent matches your filters' : 'No talent on the roster yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
            {filtered.map((character) => (
              <CharacterCard key={character.id} character={character} />
            ))}
          </div>
        )}
      </div>

      <NewCharacterDialog open={showNewChar} onClose={() => setShowNewChar(false)} />
    </>
  )
}

function CharacterCard({ character }: { character: Character }) {
  const isSeed = character.id.startsWith('seed-')

  if (isSeed) {
    return (
      <div className="flex flex-col gap-4 opacity-50">
        <div className="w-full aspect-[3/4] bg-surface overflow-hidden rounded relative">
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[48px] text-muted/20">person</span>
          </div>
        </div>
        <div>
          <h3 className="font-display text-[18px] tracking-display font-medium text-muted">
            {character.display_name || character.name}
          </h3>
          <p className="text-[10px] text-muted/60 uppercase tracking-[0.1em]">Sample data</p>
        </div>
      </div>
    )
  }

  return (
    <Link
      to="/characters/$characterId"
      params={{ characterId: character.id }}
      className="group cursor-pointer flex flex-col gap-4"
    >
      <div className="w-full aspect-[3/4] bg-surface-low overflow-hidden rounded relative">
        <img
          alt={`Portrait of ${character.display_name || character.name}`}
          className="w-full h-full object-cover"
          src={avatarUrl(character.id)}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
        <div className="absolute bottom-3 left-3">
          <span className="bg-background/90 text-primary text-[10px] uppercase font-medium tracking-[0.1em] px-2 py-1 rounded-sm">
            {character.status}
          </span>
        </div>
        {character.fig_published && (
          <div className="absolute bottom-3 right-3">
            <span className="w-2 h-2 rounded-full bg-green-500" title="Published to Fig" />
          </div>
        )}
      </div>
      <div>
        <h3 className="font-display text-[18px] tracking-display font-medium text-primary">
          {character.display_name || character.name}
        </h3>
      </div>
    </Link>
  )
}
