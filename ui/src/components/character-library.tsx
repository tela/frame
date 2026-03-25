import { Link } from '@tanstack/react-router'
import { useCharacters, avatarUrl } from '@/lib/api'
import { useState } from 'react'
import { NewCharacterDialog } from '@/components/new-character-dialog'
import type { Character } from '@/lib/types'

export function CharacterLibrary() {
  const { data: characters, isLoading } = useCharacters()
  const [search, setSearch] = useState('')
  const [showNewChar, setShowNewChar] = useState(false)

  const filtered = (characters ?? []).filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.display_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const castCount = (characters ?? []).filter((c) => c.status === 'cast').length

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
            placeholder="Search characters..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {/* Gallery Area */}
      <div className="p-8 md:p-12 flex-1">
        {/* Section Header */}
        <div className="mb-12 flex items-baseline justify-between">
          <h2 className="font-display text-[32px] md:text-[40px] tracking-display font-medium">Active Cast</h2>
          <span className="text-ui text-[13px] text-muted">{castCount} Identities</span>
        </div>

        {isLoading ? (
          <div className="text-muted text-[15px]">Loading...</div>
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
  return (
    <Link
      to="/characters/$characterId"
      params={{ characterId: character.id }}
      className="group cursor-pointer flex flex-col gap-4"
    >
      <div className="w-full aspect-[3/4] bg-surface overflow-hidden rounded relative">
        <img
          alt={`Portrait of ${character.display_name || character.name}`}
          className="w-full h-full object-cover transition-[filter] duration-300 grayscale group-hover:grayscale-0"
          src={avatarUrl(character.id)}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
          <span className="bg-background text-primary text-[10px] uppercase font-medium tracking-ui px-1.5 py-0.5 rounded-sm">
            {character.status}
          </span>
        </div>
      </div>
      <div>
        <h3 className="font-display text-[18px] tracking-display font-medium text-primary group-hover:text-muted transition-colors">
          {character.display_name || character.name}
        </h3>
      </div>
    </Link>
  )
}
