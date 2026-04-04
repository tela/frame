import { Link } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'
import { useCharacterImages, useFavorites, useToggleFavorite, useIngestImage, useDeleteCharacterImage, useDeleteCharacter, useUpdateCharacter, useImageTags, thumbUrl } from '@/lib/api'
import { useState } from 'react'
import { Dropzone } from '@/components/dropzone'
import { ImportModal } from '@/components/import-modal'
import { TagPicker } from '@/components/tag-picker'
import { Lightbox } from '@/components/lightbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { EraWithStats, CharacterImage } from '@/lib/types'

type ProspectTab = 'lookbook' | 'scrapbook'

export function ProspectView({ characterId, characterName, status, defaultEraId, eras, onAvatarChange }: {
  characterId: string; characterName: string; status: string; defaultEraId?: string; eras: EraWithStats[]; onAvatarChange?: () => void
}) {
  const [activeTab, setActiveTab] = useState<ProspectTab>('lookbook')
  const { data: allImages } = useCharacterImages(characterId)
  const { data: favorites } = useFavorites(characterId)
  const toggleFavorite = useToggleFavorite()
  const deleteImage = useDeleteCharacterImage()
  const ingestImage = useIngestImage()
  const updateCharacter = useUpdateCharacter()
  const deleteCharacter = useDeleteCharacter()
  const navigate = useNavigate()
  const [showImport, setShowImport] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [showDevelopConfirm, setShowDevelopConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [lightboxId, setLightboxId] = useState<string | null>(null)

  const images = activeTab === 'lookbook' ? (favorites ?? []) : (allImages ?? [])
  const lightboxIndex = lightboxId ? images.findIndex(i => i.image_id === lightboxId) : -1

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

      {/* Row 1: Navigation Tabs */}
      <div className="flex gap-12 border-b border-border-subtle mb-8">
        {(['lookbook', 'scrapbook'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-[13px] font-medium uppercase tracking-widest transition-all capitalize ${
              activeTab === tab
                ? 'text-on-surface border-b-2 border-on-surface'
                : 'text-muted hover:text-on-surface'
            }`}
          >
            {tab} ({tab === 'lookbook' ? (favorites ?? []).length : (allImages ?? []).length})
          </button>
        ))}
      </div>

      {/* Row 2: Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
        {/* Left: Generation segmented control */}
        <div className="flex bg-on-surface rounded-sm overflow-hidden h-10 w-full md:w-auto">
          <Link
            to="/characters/$characterId/eras/$eraId/studio"
            params={{ characterId, eraId: defaultEraId ?? 'default' }}
            search={{ intent: 'headshot' }}
            className="flex items-center gap-2.5 px-5 py-2 text-background hover:bg-primary-dim transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">portrait</span>
            <span className="text-[11px] font-bold uppercase tracking-widest">Headshot</span>
          </Link>
          <div className="w-[1px] h-full bg-background/20" />
          <Link
            to="/characters/$characterId/eras/$eraId/studio"
            params={{ characterId, eraId: defaultEraId ?? 'default' }}
            search={{ intent: 'full_body' }}
            className="flex items-center gap-2.5 px-5 py-2 text-background hover:bg-primary-dim transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
            <span className="text-[11px] font-bold uppercase tracking-widest">Full Body</span>
          </Link>
          <div className="w-[1px] h-full bg-background/20" />
          <Link
            to="/characters/$characterId/eras/$eraId/studio"
            params={{ characterId, eraId: defaultEraId ?? 'default' }}
            className="flex items-center gap-2.5 px-5 py-2 text-background hover:bg-primary-dim transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            <span className="text-[11px] font-bold uppercase tracking-widest">Studio</span>
          </Link>
        </div>

        {/* Right: Secondary actions */}
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowImport(true)}
            className="flex-1 md:flex-none h-10 px-8 flex items-center justify-center border border-surface-container bg-white hover:bg-surface-container-low transition-colors text-on-surface text-[11px] font-bold uppercase tracking-widest"
          >
            Import
          </button>
          {status === 'prospect' && (
            <>
              <button
                onClick={() => setShowDevelopConfirm(true)}
                className="flex-1 md:flex-none h-10 px-8 flex items-center justify-center border border-primary text-on-surface hover:bg-on-surface hover:text-background transition-colors text-[11px] font-bold uppercase tracking-widest"
              >
                Develop
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-none h-10 px-4 flex items-center justify-center border border-border-subtle text-muted hover:border-red-500 hover:text-red-500 transition-colors"
                title="Delete prospect"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Import Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        characterId={characterId}
        characterName={characterName}
        eras={eras}
        defaultEraId={defaultEraId}
      />

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
              }, { onSuccess: () => onAvatarChange?.() })}
              isFavorited={(favorites ?? []).some(f => f.image_id === ci.image_id)}
              onDelete={() => handleDelete(ci.image_id)}
              onClick={() => setLightboxId(ci.image_id)}
            />
          ))}
          <div className="aspect-square bg-surface-low/50 flex flex-col items-center justify-center p-8 border border-dashed border-border-subtle">
            <span className="material-symbols-outlined text-4xl text-muted mb-4">add_photo_alternate</span>
            <p className="text-muted text-[10px] font-bold uppercase tracking-widest text-center">New Concept Slot</p>
          </div>
        </div>
      )}

      <Lightbox
        imageId={lightboxId}
        onClose={() => setLightboxId(null)}
        onPrev={lightboxIndex > 0 ? () => setLightboxId(images[lightboxIndex - 1].image_id) : undefined}
        onNext={lightboxIndex < images.length - 1 ? () => setLightboxId(images[lightboxIndex + 1].image_id) : undefined}
      />

      <DevelopConfirmDialog
        open={showDevelopConfirm}
        onOpenChange={setShowDevelopConfirm}
        onConfirm={handleDevelop}
        isPending={updateCharacter.isPending}
      />

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-background border-border-subtle max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Delete Prospect?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted mt-2">
            This will permanently delete this character and all associated images, eras, and references. This cannot be undone.
          </p>
          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="text-[13px] text-muted hover:text-on-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                deleteCharacter.mutate(characterId, {
                  onSuccess: () => navigate({ to: '/characters' }),
                })
              }}
              disabled={deleteCharacter.isPending}
              className="bg-red-600 text-white px-6 py-2 text-[13px] font-medium disabled:opacity-50 hover:bg-red-700 transition-colors"
            >
              {deleteCharacter.isPending ? 'Deleting...' : 'Delete Forever'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Dropzone>
  )
}

function DevelopConfirmDialog({ open, onOpenChange, onConfirm, isPending }: {
  open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void; isPending: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border-subtle max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Move to Development?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted mt-2">
          This will transition the character from prospect to active development.
        </p>
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={() => onOpenChange(false)}
            className="text-[13px] text-muted hover:text-on-surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="bg-on-surface text-background px-6 py-2 text-[13px] font-medium disabled:opacity-50"
          >
            {isPending ? 'Updating...' : 'Confirm'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProspectImageCard({ ci, characterId, defaultEraId, onToggleFavorite, isFavorited, onDelete, onClick }: {
  ci: CharacterImage; characterId: string; defaultEraId?: string; onToggleFavorite: () => void; isFavorited: boolean; onDelete: () => void; onClick: () => void
}) {
  const [showTags, setShowTags] = useState(false)
  const { data: imageTags } = useImageTags(showTags ? ci.image_id : '')
  return (
    <>
    <div className="group relative aspect-square bg-surface-low overflow-hidden cursor-pointer" onClick={onClick}>
      <img
        src={thumbUrl(ci.image_id)}
        alt=""
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      {ci.source && ci.source !== 'manual' && (
        <span className={`absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${
          ci.source === 'comfyui' ? 'bg-on-surface/80 text-background' : 'bg-primary-dim/80 text-background'
        }`}>
          {ci.source === 'comfyui' ? 'Generated' : ci.source}
        </span>
      )}
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
          <button
            onClick={(e) => { e.stopPropagation(); setShowTags(true) }}
            className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface text-base">label</span>
          </button>
        </div>
        <div className="flex justify-center gap-2">
          <Link
            to="/characters/$characterId/eras/$eraId/studio"
            params={{ characterId, eraId: defaultEraId ?? 'default' }}
            search={{ intent: 'remix', source: ci.image_id }}
            className="px-4 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-on-surface text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-colors"
          >
            Remix
          </Link>
          <Link
            to="/characters/$characterId/eras/$eraId/studio"
            params={{ characterId, eraId: defaultEraId ?? 'default' }}
            search={{ intent: 'upscale', source: ci.image_id }}
            className="px-4 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-on-surface text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-colors"
          >
            Upscale
          </Link>
        </div>
      </div>
    </div>
    <TagPicker
      open={showTags}
      onClose={() => setShowTags(false)}
      imageIds={[ci.image_id]}
      existingTags={(imageTags ?? []).map(t => ({ namespace: t.tag_namespace, value: t.tag_value }))}
    />
    </>
  )
}
