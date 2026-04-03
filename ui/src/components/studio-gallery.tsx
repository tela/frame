import { useState } from 'react'
import { useDeleteCharacterImage, useToggleFavorite, useImageTags } from '@/lib/api'
import { TagPicker } from '@/components/tag-picker'
import { Lightbox } from '@/components/lightbox'
import type { GeneratedImage } from '@/components/studio-types'

export function StudioGallery({ characterId, sessionImages, setSessionImages, onRefineImage }: {
  characterId: string
  sessionImages: GeneratedImage[]
  setSessionImages: React.Dispatch<React.SetStateAction<GeneratedImage[]>>
  onRefineImage: (imageId: string) => void
}) {
  const deleteImage = useDeleteCharacterImage()
  const toggleFavorite = useToggleFavorite()
  const [lightboxId, setLightboxId] = useState<string | null>(null)

  const completedImages = sessionImages.filter(i => i.status === 'complete')
  const lightboxIndex = lightboxId ? completedImages.findIndex(i => i.id === lightboxId) : -1

  return (
    <section className="flex-1 flex flex-col bg-surface overflow-hidden relative">
      <div className="h-[73px] border-b border-border-subtle bg-background flex items-center justify-between px-8 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Session History</span>
          <span className="text-xs text-muted bg-surface px-2 py-1 border border-border-subtle">
            {sessionImages.length} Items
          </span>
        </div>
        <button
          onClick={() => setSessionImages([])}
          className="text-[11px] uppercase tracking-[0.1em] font-bold border border-border-subtle px-4 py-2 hover:bg-surface transition-colors"
        >
          Clear Session
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {sessionImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted gap-4">
            <span className="material-symbols-outlined text-[48px]">auto_awesome</span>
            <p className="text-sm">Generated images will appear here</p>
          </div>
        ) : (
          <div className={`grid gap-6 ${
            sessionImages.length === 1 ? 'grid-cols-1 max-w-[500px] mx-auto' :
            sessionImages.length <= 4 ? 'grid-cols-2' :
            'grid-cols-2 xl:grid-cols-3'
          }`}>
            {sessionImages.map((img) => (
              <div key={img.id} className="aspect-[3/4] relative overflow-hidden border border-border-subtle group cursor-pointer bg-background">
                {img.status === 'generating' ? (
                  <>
                    <div className="absolute inset-0 bg-muted/10 backdrop-blur-md" />
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-background overflow-hidden">
                      <div className="h-full w-full bg-accent" style={{ animation: 'studioProgress 2s infinite linear' }} />
                    </div>
                    <div className="relative z-10 flex flex-col items-center justify-center h-full text-muted gap-3">
                      <span className="material-symbols-outlined text-[32px] animate-pulse">model_training</span>
                      <span className="text-xs uppercase tracking-[0.15em] animate-pulse">Processing...</span>
                    </div>
                  </>
                ) : (
                  <>
                    <img
                      alt="Generated image"
                      className="w-full h-full object-cover cursor-pointer"
                      src={img.url}
                      onClick={() => setLightboxId(img.id)}
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            deleteImage.mutate({ characterId, imageId: img.id })
                            setSessionImages(prev => prev.filter(s => s.id !== img.id))
                          }}
                          className="bg-background/90 text-primary p-1.5 hover:text-accent transition-colors"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                        <button
                          onClick={() => toggleFavorite.mutate({ characterId, imageId: img.id, favorited: true })}
                          className="bg-accent/90 text-white p-1.5 hover:bg-accent transition-colors"
                          title="Favorite"
                        >
                          <span className="material-symbols-outlined text-[18px]">favorite</span>
                        </button>
                        <SessionImageTagButton imageId={img.id} />
                      </div>
                      <div className="flex justify-center">
                        <button
                          onClick={() => onRefineImage(img.id)}
                          className="px-4 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-on-surface text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-colors"
                        >
                          Refine
                        </button>
                      </div>
                      <div className="text-white">
                        <div className="text-xs font-body opacity-80 mb-1">{img.timestamp} · Seed: {img.seed}</div>
                        <div className="text-sm line-clamp-2 leading-tight">{img.prompt}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Lightbox
        imageId={lightboxId}
        onClose={() => setLightboxId(null)}
        onPrev={lightboxIndex > 0 ? () => setLightboxId(completedImages[lightboxIndex - 1].id) : undefined}
        onNext={lightboxIndex < completedImages.length - 1 ? () => setLightboxId(completedImages[lightboxIndex + 1].id) : undefined}
      />

      <style>{`
        @keyframes studioProgress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </section>
  )
}

function SessionImageTagButton({ imageId }: { imageId: string }) {
  const [showTags, setShowTags] = useState(false)
  const { data: imageTags } = useImageTags(showTags ? imageId : '')
  return (
    <>
      <button
        onClick={() => setShowTags(true)}
        className="bg-background/90 text-primary p-1.5 hover:text-accent transition-colors"
        title="Tag"
      >
        <span className="material-symbols-outlined text-[18px]">label</span>
      </button>
      <TagPicker
        open={showTags}
        onClose={() => setShowTags(false)}
        imageIds={[imageId]}
        existingTags={(imageTags ?? []).map(t => ({ namespace: t.tag_namespace, value: t.tag_value }))}
      />
    </>
  )
}
