import { Link, useParams, useNavigate } from '@tanstack/react-router'
import { useCharacter, useDatasets, useCharacterImages, useFavorites, useToggleFavorite, useIngestImage, useDeleteCharacterImage, useUpdateCharacter, useCreateEra, useFigStatus, usePublishToFig, useShoots, useCreateShoot, useShootImages, avatarUrl, thumbUrl } from '@/lib/api'
import { useState } from 'react'
import { Dropzone } from '@/components/dropzone'
import { PoseSetDashboard } from '@/components/pose-set-dashboard'
import { GoSeeLooks } from '@/components/go-see-looks'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { EraWithStats, CharacterImage, Shoot } from '@/lib/types'

export function CharacterDetail() {
  const { characterId } = useParams({ from: '/characters/$characterId' })
  const { data: character, isLoading } = useCharacter(characterId)
  const { data: allDatasets } = useDatasets()
  const characterDatasets = (allDatasets ?? []).filter((d) => d.character_id === characterId)
  const createEra = useCreateEra()
  const { data: figStatus } = useFigStatus()
  const publishToFig = usePublishToFig()
  const [showCreateEra, setShowCreateEra] = useState(false)
  const [newEraLabel, setNewEraLabel] = useState('')
  const [newEraAgeRange, setNewEraAgeRange] = useState('')
  const [newEraTimePeriod, setNewEraTimePeriod] = useState('')
  const [newEraDescription, setNewEraDescription] = useState('')

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
        <CharacterHero character={character} figStatus={figStatus} publishToFig={publishToFig} />

        {/* Eras Section — show for cast and development */}
        {(character.status === 'cast' || character.status === 'development') && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[24px] font-display font-normal tracking-display text-primary">Chronological Eras</h2>
            </div>

            <div className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
              {character.eras.map((era) => (
                <EraCard key={era.id} characterId={character.id} era={era} />
              ))}
              {/* Add Era */}
              <button
                onClick={() => { setShowCreateEra(true); setNewEraLabel('') }}
                className="flex flex-col gap-3 min-w-[280px] md:min-w-[400px] group snap-start outline-none text-left"
              >
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

        {/* Shoots Section */}
        {(character.status === 'cast' || character.status === 'development') && (
          <ShootsSection characterId={character.id} defaultEraId={character.eras[0]?.id} />
        )}

        {/* Go-See Looks Section */}
        {(character.status === 'cast' || character.status === 'development') && (
          <div className="mb-12">
            <GoSeeLooks characterId={character.id} />
          </div>
        )}

        {/* Pose Set Dashboard */}
        {(character.status === 'cast' || character.status === 'development') && character.eras.length > 0 && (
          <div className="mb-12">
            <PoseSetDashboard characterId={character.id} eraId={character.eras[0].id} eraLabel={`${character.eras[0].label} (${character.eras[0].age_range || '20'})`} />
          </div>
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
          <ProspectView characterId={character.id} status={character.status} defaultEraId={character.eras[0]?.id} />
        )}


      </div>

      {/* Create Era Dialog */}
      <Dialog open={showCreateEra} onOpenChange={setShowCreateEra}>
        <DialogContent className="bg-background border-border-subtle max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Initialize New Era</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <div>
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Era Label <span className="text-accent">*</span></label>
              <input
                value={newEraLabel}
                onChange={(e) => setNewEraLabel(e.target.value)}
                className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none"
                placeholder="e.g. Young Adult, The Haunting, Aftermath"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Age Range</label>
                <select
                  value={newEraAgeRange}
                  onChange={(e) => setNewEraAgeRange(e.target.value)}
                  className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none"
                >
                  <option value="">Select...</option>
                  <option value="Child (8-9)">Child (8-9)</option>
                  <option value="Tween (10-11)">Tween (10-11)</option>
                  <option value="Early Teen (12-13)">Early Teen (12-13)</option>
                  <option value="Young Teen (14-15)">Young Teen (14-15)</option>
                  <option value="Older Teen (16-17)">Older Teen (16-17)</option>
                  <option value="Young Adult (18-24)">Young Adult (18-24)</option>
                  <option value="Late 20s (25-29)">Late 20s (25-29)</option>
                  <option value="Early 30s (30-34)">Early 30s (30-34)</option>
                  <option value="Mid 30s (35-39)">Mid 30s (35-39)</option>
                  <option value="Early 40s (40-44)">Early 40s (40-44)</option>
                  <option value="Mid 40s (45-49)">Mid 40s (45-49)</option>
                  <option value="50s (50-59)">50s (50-59)</option>
                  <option value="60s (60-69)">60s (60-69)</option>
                  <option value="70+ (70+)">70+ (70+)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Time Period</label>
                <input
                  value={newEraTimePeriod}
                  onChange={(e) => setNewEraTimePeriod(e.target.value)}
                  className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none"
                  placeholder="e.g. 1950s, Present day"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Description</label>
              <textarea
                value={newEraDescription}
                onChange={(e) => setNewEraDescription(e.target.value)}
                className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none h-20 resize-none"
                placeholder="Narrative context for this era..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateEra(false)}
                className="px-4 py-2 text-[11px] uppercase font-bold text-muted hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newEraLabel.trim()) return
                  createEra.mutate(
                    {
                      characterId,
                      label: newEraLabel.trim(),
                      age_range: newEraAgeRange.trim() || undefined,
                      time_period: newEraTimePeriod.trim() || undefined,
                      description: newEraDescription.trim() || undefined,
                    } as any,
                    {
                      onSuccess: () => {
                        setShowCreateEra(false)
                        setNewEraLabel('')
                        setNewEraAgeRange('')
                        setNewEraTimePeriod('')
                        setNewEraDescription('')
                      },
                    }
                  )
                }}
                disabled={!newEraLabel.trim() || createEra.isPending}
                className="bg-on-surface text-background px-6 py-2 text-[11px] uppercase font-bold disabled:opacity-50"
              >
                {createEra.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type ProspectTab = 'lookbook' | 'scrapbook'

function ProspectView({ characterId, status, defaultEraId }: {
  characterId: string; status: string; defaultEraId?: string
}) {
  const [activeTab, setActiveTab] = useState<ProspectTab>('lookbook')
  const { data: allImages } = useCharacterImages(characterId)
  const { data: favorites } = useFavorites(characterId)
  const toggleFavorite = useToggleFavorite()
  const deleteImage = useDeleteCharacterImage()
  const ingestImage = useIngestImage()
  const updateCharacter = useUpdateCharacter()
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [showDevelopConfirm, setShowDevelopConfirm] = useState(false)

  const images = activeTab === 'lookbook' ? (favorites ?? []) : (allImages ?? [])

  const handleDrop = (files: File[]) => {
    setUploadStatus(`Uploading ${files.length} file(s)...`)
    let completed = 0
    for (const file of files) {
      ingestImage.mutate(
        { characterId, eraId: defaultEraId, file, source: 'manual' },
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

  const handleDevelop = () => {
    updateCharacter.mutate(
      { id: characterId, status: 'development' },
      { onSuccess: () => setShowDevelopConfirm(false) }
    )
  }

  const handleDelete = (imageId: string) => {
    deleteImage.mutate({ characterId, imageId })
  }

  return (
    <Dropzone onFiles={handleDrop} accept=".png,.jpg,.jpeg,.webp" className="relative">
      {uploadStatus && (
        <div className="fixed bottom-6 right-6 z-50 bg-on-surface text-background px-6 py-3 shadow-lg text-sm">
          {uploadStatus}
        </div>
      )}

      {/* Tabs + Actions */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-12">
        <div className="flex gap-12 border-b border-border-subtle w-full md:w-auto">
          {(['lookbook', 'scrapbook'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-xs font-bold uppercase tracking-widest transition-all capitalize ${
                activeTab === tab
                  ? 'text-on-surface border-b-2 border-on-surface'
                  : 'text-muted hover:text-on-surface'
              }`}
            >
              {tab} ({tab === 'lookbook' ? (favorites ?? []).length : (allImages ?? []).length})
            </button>
          ))}
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          {status === 'prospect' && (
            <button
              onClick={() => setShowDevelopConfirm(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-3 outline outline-1 outline-border-subtle hover:bg-surface-low transition-colors text-on-surface"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest">Develop Character</span>
            </button>
          )}
          <Link
            to="/characters/$characterId/eras/$eraId/studio"
            params={{ characterId, eraId: defaultEraId ?? 'default' }}
            className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-3 bg-on-surface text-background hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-lg">auto_awesome</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Generate</span>
          </Link>
        </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {images.map((ci) => (
            <ProspectImageCard
              key={ci.image_id}
              ci={ci}
              characterId={characterId}
              defaultEraId={defaultEraId}
              onToggleFavorite={() => toggleFavorite.mutate({
                characterId,
                imageId: ci.image_id,
                favorited: !((favorites ?? []).some(f => f.image_id === ci.image_id)),
              })}
              isFavorited={(favorites ?? []).some(f => f.image_id === ci.image_id)}
              onDelete={() => handleDelete(ci.image_id)}
            />
          ))}
          {/* Placeholder slot */}
          <div className="aspect-square bg-surface-low/50 flex flex-col items-center justify-center p-8 border border-dashed border-border-subtle">
            <span className="material-symbols-outlined text-4xl text-muted mb-4">add_photo_alternate</span>
            <p className="text-muted text-[10px] font-bold uppercase tracking-widest text-center">New Concept Slot</p>
          </div>
        </div>
      )}

      {/* Develop Confirmation Dialog */}
      <Dialog open={showDevelopConfirm} onOpenChange={setShowDevelopConfirm}>
        <DialogContent className="bg-background border-border-subtle max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Move to Development?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted mt-2">
            This will transition the character from prospect to active development.
          </p>
          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={() => setShowDevelopConfirm(false)}
              className="text-[13px] text-muted hover:text-on-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDevelop}
              disabled={updateCharacter.isPending}
              className="bg-on-surface text-background px-6 py-2 text-[13px] font-medium disabled:opacity-50"
            >
              {updateCharacter.isPending ? 'Updating...' : 'Confirm'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Dropzone>
  )
}

function ProspectImageCard({ ci, characterId, defaultEraId, onToggleFavorite, isFavorited, onDelete }: {
  ci: CharacterImage; characterId: string; defaultEraId?: string; onToggleFavorite: () => void; isFavorited: boolean; onDelete: () => void
}) {
  return (
    <div className="group relative aspect-square bg-surface-low overflow-hidden">
      <img
        src={thumbUrl(ci.image_id)}
        alt=""
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
            className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
          >
            <span
              className={`material-symbols-outlined text-base ${isFavorited ? 'text-red-500' : 'text-on-surface'}`}
              style={{ fontVariationSettings: isFavorited ? "'FILL' 1" : "'FILL' 0" }}
            >
              favorite
            </span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface text-base">delete</span>
          </button>
        </div>
        <div className="flex justify-center">
          <Link
            to="/characters/$characterId/eras/$eraId/studio"
            params={{ characterId, eraId: defaultEraId ?? 'default' }}
            className="px-6 py-2 bg-white/90 backdrop-blur-sm rounded-full text-on-surface text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-colors"
          >
            Remix
          </Link>
        </div>
      </div>
    </div>
  )
}

function CharacterHero({ character, figStatus, publishToFig }: {
  character: { id: string; name: string; display_name: string; status: string; fig_published: boolean; fig_character_url: string; gender: string; ethnicity: string; eye_color: string; natural_hair_texture: string; natural_hair_color: string; eras: EraWithStats[] }
  figStatus: { available: boolean } | undefined
  publishToFig: { mutate: (id: string) => void; isPending: boolean }
}) {
  const [showDetails, setShowDetails] = useState(false)
  const { data: allImages } = useCharacterImages(character.id)
  const defaultEra = character.eras[0]
  const hasFaceRef = defaultEra?.reference_package_ready

  // Use allImages length for accurate count (era stats can miss images without era_id)
  const totalImages = (allImages ?? []).length || character.eras.reduce((sum, e) => sum + e.image_count, 0)

  return (
    <div className="flex flex-col md:flex-row gap-12 mt-4 mb-20 items-start">
      <div className="flex-1 max-w-2xl">
        {/* Status + Era */}
        <div className="flex items-center gap-4 mb-4">
          <span className="bg-surface-low text-on-surface text-[10px] font-bold px-3 py-1 tracking-widest uppercase">{character.status}</span>
          {defaultEra && (
            <span className="text-muted text-[10px] font-medium uppercase tracking-widest">
              Era Indicator: {defaultEra.label} · {defaultEra.age_range}
            </span>
          )}
        </div>

        {/* Character Name */}
        <h1 className="font-display text-6xl md:text-8xl italic tracking-tight text-on-surface mb-6 leading-[0.9]">
          {character.name}
        </h1>

        {/* ID + Physical Details toggle */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 mb-8">
          <span className="text-muted text-[10px] font-medium uppercase tracking-widest tabular-nums">ID: {character.id}</span>
          {/* Fig status */}
          {character.fig_published && (
            <>
              <span className="flex items-center gap-1.5 text-[11px] text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Published to Fig
              </span>
              {character.fig_character_url && (
                <a href={character.fig_character_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:text-accent flex items-center gap-1">
                  Open in Fig <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                </a>
              )}
            </>
          )}
          {!character.fig_published && figStatus?.available && (
            <button
              onClick={() => publishToFig.mutate(character.id)}
              disabled={publishToFig.isPending}
              className="text-[11px] uppercase font-bold tracking-[0.1em] border border-border-subtle px-3 py-1 hover:border-on-surface hover:bg-surface transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">publish</span>
              {publishToFig.isPending ? 'Publishing...' : 'Publish to Fig'}
            </button>
          )}
          <button
            onClick={() => setShowDetails(v => !v)}
            className="flex items-center gap-2 text-on-surface hover:opacity-70 transition-opacity"
          >
            <span className="material-symbols-outlined text-base">help_outline</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Physical Details</span>
          </button>
        </div>

        {/* Physical Details Panel */}
        {showDetails && (
          <div className="bg-surface-low p-4 mb-8 grid grid-cols-2 gap-x-8 gap-y-2">
            {[
              ['Gender', character.gender],
              ['Ethnicity', character.ethnicity],
              ['Eye Color', character.eye_color],
              ['Hair Texture', character.natural_hair_texture],
              ['Hair Color', character.natural_hair_color],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-1">
                <span className="text-muted text-[11px] uppercase tracking-wider">{label}</span>
                <span className="text-on-surface text-[13px] capitalize">{value || '—'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Vitals */}
        <div className="grid grid-cols-3 gap-12 pt-8 border-t border-border-subtle">
          <div>
            <p className="text-muted text-[10px] font-medium uppercase tracking-widest mb-1">Eras</p>
            <p className="font-display text-2xl italic">{character.eras.length}</p>
          </div>
          <div>
            <p className="text-muted text-[10px] font-medium uppercase tracking-widest mb-1">Total Images</p>
            <p className="font-display text-2xl italic">{totalImages}</p>
          </div>
          <div>
            <p className="text-muted text-[10px] font-medium uppercase tracking-widest mb-1">Face Ref</p>
            <div className="flex items-center gap-2">
              {hasFaceRef && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              <p className="font-display text-2xl italic">{hasFaceRef ? 'Locked' : 'None'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Portrait */}
      <div className="relative group shrink-0 hidden md:block">
        <div className="w-[160px] h-[200px] bg-surface-low overflow-hidden ring-1 ring-black/5">
          <img
            src={avatarUrl(character.id)}
            alt={character.display_name || character.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      </div>
    </div>
  )
}

function ShootsSection({ characterId, defaultEraId }: { characterId: string; defaultEraId?: string }) {
  const { data: shoots } = useShoots(characterId)
  const createShoot = useCreateShoot()
  const navigate = useNavigate()
  const [showCreateShoot, setShowCreateShoot] = useState(false)
  const [newShootName, setNewShootName] = useState('')

  const handleCreate = () => {
    if (!newShootName.trim()) return
    createShoot.mutate(
      { characterId, name: newShootName.trim() },
      {
        onSuccess: () => {
          setShowCreateShoot(false)
          setNewShootName('')
        },
      }
    )
  }

  const handleShootClick = (shoot: Shoot) => {
    if (!defaultEraId) return
    navigate({
      to: '/characters/$characterId/eras/$eraId',
      params: { characterId, eraId: defaultEraId },
      search: { shoot: shoot.id },
    })
  }

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[24px] font-display font-normal tracking-display text-primary">Shoots</h2>
      </div>

      <div className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
        {(shoots ?? []).map((shoot) => (
          <ShootCard key={shoot.id} shoot={shoot} onClick={() => handleShootClick(shoot)} />
        ))}
        {/* Add Shoot */}
        <button
          onClick={() => { setShowCreateShoot(true); setNewShootName('') }}
          className="flex flex-col gap-3 min-w-[220px] group snap-start outline-none text-left"
        >
          <div className="aspect-square w-full bg-transparent rounded-sm border border-dashed border-border-subtle flex items-center justify-center transition-all duration-300 group-hover:border-primary group-hover:bg-primary/5">
            <span className="material-symbols-outlined text-[24px] text-muted group-hover:text-primary transition-colors">add</span>
          </div>
          <div className="flex justify-between items-baseline px-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <h3 className="text-[14px] font-display tracking-display text-primary">New Shoot</h3>
          </div>
        </button>
      </div>

      {/* Create Shoot Dialog */}
      <Dialog open={showCreateShoot} onOpenChange={setShowCreateShoot}>
        <DialogContent className="bg-background border-border-subtle max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Create Shoot</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <div>
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Shoot Name <span className="text-accent">*</span></label>
              <input
                value={newShootName}
                onChange={(e) => setNewShootName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none"
                placeholder="e.g. Studio Session 01, Beach Shoot"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreateShoot(false)} className="px-4 py-2 text-[11px] uppercase font-bold text-muted hover:text-on-surface transition-colors">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={!newShootName.trim() || createShoot.isPending}
                className="bg-on-surface text-background px-6 py-2 text-[11px] uppercase font-bold disabled:opacity-50"
              >
                {createShoot.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ShootCard({ shoot, onClick }: { shoot: Shoot; onClick: () => void }) {
  const { data: imageIds } = useShootImages(shoot.id)
  const firstFour = (imageIds ?? []).slice(0, 4)

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 min-w-[220px] group snap-start outline-none text-left"
    >
      <div className="aspect-square w-full bg-surface rounded-sm border border-border-subtle overflow-hidden relative transition-all duration-300 group-hover:border-primary">
        {firstFour.length > 0 ? (
          <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
            {firstFour.map((imgId) => (
              <div key={imgId} className="overflow-hidden bg-surface-low">
                <img
                  src={thumbUrl(imgId)}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
            ))}
            {/* Fill empty cells if fewer than 4 */}
            {Array.from({ length: 4 - firstFour.length }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-surface-low" />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-muted/30">photo_camera</span>
          </div>
        )}
      </div>
      <div className="px-1">
        <div className="flex justify-between items-baseline">
          <h3 className="text-[14px] font-display tracking-display text-primary group-hover:text-accent transition-colors">
            {shoot.name}
          </h3>
          <span className="text-[11px] font-body tabular-nums text-muted">{shoot.image_count}</span>
        </div>
      </div>
    </button>
  )
}

function EraCard({ characterId, era }: { characterId: string; era: EraWithStats }) {
  return (
    <Link
      to="/characters/$characterId/eras/$eraId"
      params={{ characterId, eraId: era.id }}
      className="flex flex-col gap-3 min-w-[280px] md:min-w-[400px] group snap-start outline-none"
    >
      <div className="aspect-video w-full bg-surface-low rounded-sm border border-border-subtle overflow-hidden relative">
        {/* Reference package status */}
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
        <Link
          to="/characters/$characterId/eras/$eraId/refs"
          params={{ characterId, eraId: era.id }}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-accent transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">collections</span>
          Build References
        </Link>
      </div>
    </Link>
  )
}
