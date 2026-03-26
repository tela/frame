import { Link, useParams } from '@tanstack/react-router'
import { useCharacter, useDatasets, useCharacterImages, useFavorites, useToggleFavorite, useIngestImage, avatarUrl, thumbUrl } from '@/lib/api'
import { useState } from 'react'
import { Dropzone } from '@/components/dropzone'
import type { EraWithStats, CharacterImage } from '@/lib/types'

export function CharacterDetail() {
  const { characterId } = useParams({ from: '/characters/$characterId' })
  const { data: character, isLoading } = useCharacter(characterId)
  const { data: allDatasets } = useDatasets()
  const characterDatasets = (allDatasets ?? []).filter((d) => d.character_id === characterId)

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
            {/* Fig status + ID */}
            <div className="flex items-center gap-4 mt-3 mb-4">
              <span className="text-[10px] uppercase tracking-[0.15em] bg-surface-high text-on-surface px-2 py-0.5">{character.status}</span>
              {character.fig_published && (
                <span className="flex items-center gap-1.5 text-[11px] text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Published to Fig
                </span>
              )}
              {character.fig_character_url && (
                <a href={character.fig_character_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:text-accent flex items-center gap-1">
                  Open in Fig <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                </a>
              )}
              <span className="text-[10px] text-muted tabular-nums ml-auto">ID: {character.id}</span>
            </div>
            {/* Vitals Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-8">
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

        {/* Eras Section — show for cast and development (if eras exist) */}
        {(character.status === 'cast' || (character.status === 'development' && character.eras.length > 0)) && (
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

        {/* Datasets Section */}
        {(character.status === 'cast' || character.status === 'development') && characterDatasets.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[24px] font-display font-normal tracking-display text-primary">Datasets</h2>
              <Link to="/datasets" className="text-ui text-[13px] text-muted hover:text-primary transition-colors">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {characterDatasets.map((ds) => (
                <Link
                  key={ds.id}
                  to="/datasets/$datasetId"
                  params={{ datasetId: ds.id }}
                  className="group border border-border-subtle hover:border-primary p-4 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest bg-on-surface text-background">
                      {ds.type}
                    </span>
                    <span className="text-meta text-muted">{ds.image_count} images</span>
                  </div>
                  <h3 className="text-sm font-medium text-primary group-hover:text-accent transition-colors">
                    {ds.name}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Lookbook view — prospect always, development always */}
        {(character.status === 'prospect' || character.status === 'development') && (
          <ProspectView characterId={character.id} status={character.status} />
        )}

        {/* Scouted state (from Fig) */}
        {character.status === 'scouted' && (
          <div className="py-12">
            <p className="text-muted text-[15px]">
              This character was scouted in Fig. Visual identity curation is available after development.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

type ProspectTab = 'lookbook' | 'scrapbook'

function ProspectView({ characterId, status }: {
  characterId: string; status: string
}) {
  const [activeTab, setActiveTab] = useState<ProspectTab>('lookbook')
  const { data: allImages } = useCharacterImages(characterId)
  const { data: favorites } = useFavorites(characterId)
  const toggleFavorite = useToggleFavorite()
  const ingestImage = useIngestImage()
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)

  const images = activeTab === 'lookbook' ? (favorites ?? []) : (allImages ?? [])

  const handleDrop = (files: File[]) => {
    setUploadStatus(`Uploading ${files.length} file(s)...`)
    let completed = 0
    for (const file of files) {
      ingestImage.mutate(
        { characterId, file, source: 'manual' },
        {
          onSettled: () => {
            completed++
            if (completed === files.length) {
              setUploadStatus(null)
            }
          },
        }
      )
    }
  }

  return (
    <Dropzone onFiles={handleDrop} accept=".png,.jpg,.jpeg,.webp" className="relative">
      {uploadStatus && (
        <div className="fixed bottom-6 right-6 z-50 bg-on-surface text-background px-6 py-3 shadow-lg text-sm">
          {uploadStatus}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-6 mb-8 border-b border-border-subtle">
        {(['lookbook', 'scrapbook'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-[13px] uppercase tracking-[0.1em] font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab ? 'text-primary border-primary' : 'text-muted border-transparent hover:text-primary'
            }`}
          >
            {tab} {tab === 'lookbook' ? `(${(favorites ?? []).length})` : `(${(allImages ?? []).length})`}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-3">
          <Link
            to="/characters/$characterId/eras/$eraId/studio"
            params={{ characterId, eraId: 'default' }}
            className="bg-on-surface text-background py-2 px-5 text-[11px] uppercase tracking-[0.1em] font-medium hover:opacity-90 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            Generate
          </Link>
        </div>
        {status === 'prospect' && (
          <button className="border border-primary text-primary py-2 px-5 text-[11px] uppercase tracking-[0.1em] font-medium hover:bg-primary hover:text-background transition-colors">
            Develop Character
          </button>
        )}
      </div>

      {/* Image grid */}
      {images.length === 0 ? (
        <div className="py-20 text-center">
          <span className="material-symbols-outlined text-[48px] text-muted/30 mb-4 block">
            {activeTab === 'lookbook' ? 'favorite' : 'photo_library'}
          </span>
          <p className="text-muted text-[15px] mb-2">
            {activeTab === 'lookbook'
              ? 'No favorites yet. Star images from the scrapbook to build the lookbook.'
              : 'No images yet. Drag and drop images here or generate new ones.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((ci) => (
            <ProspectImageCard
              key={ci.image_id}
              ci={ci}
              characterId={characterId}
              onToggleFavorite={() => toggleFavorite.mutate({
                characterId,
                imageId: ci.image_id,
                favorited: !((favorites ?? []).some(f => f.image_id === ci.image_id)),
              })}
              isFavorited={(favorites ?? []).some(f => f.image_id === ci.image_id)}
            />
          ))}
        </div>
      )}
    </Dropzone>
  )
}

function ProspectImageCard({ ci, characterId, onToggleFavorite, isFavorited }: {
  ci: CharacterImage; characterId: string; onToggleFavorite: () => void; isFavorited: boolean
}) {
  return (
    <div className="group relative overflow-hidden border border-border-subtle hover:border-primary transition-colors">
      <div className="aspect-square bg-surface-low overflow-hidden">
        <img
          src={thumbUrl(ci.image_id)}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>
      {/* Overlay */}
      <div className="absolute inset-0 bg-on-surface/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-between p-3">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
          className="material-symbols-outlined text-[20px] text-white hover:text-accent transition-colors"
          style={{ fontVariationSettings: isFavorited ? "'FILL' 1" : "'FILL' 0" }}
        >
          favorite
        </button>
        <Link
          to="/characters/$characterId/eras/$eraId/studio"
          params={{ characterId, eraId: 'default' }}
          className="bg-background/80 text-on-surface p-1.5 rounded-sm hover:bg-background text-[10px] uppercase tracking-wider flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
          Remix
        </Link>
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
