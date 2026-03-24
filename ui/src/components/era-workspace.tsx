import { Link, useParams } from '@tanstack/react-router'
import { useCharacter, useReferencePackage, useIngestImage } from '@/lib/api'
import { useState } from 'react'
import { Dropzone } from '@/components/dropzone'

export function EraWorkspace() {
  const { characterId, eraId } = useParams({ from: '/characters/$characterId/eras/$eraId' })
  const ingestImage = useIngestImage()
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const { data: character, isLoading: charLoading } = useCharacter(characterId)
  const { data: refPackage } = useReferencePackage(characterId, eraId)

  if (charLoading) {
    return <div className="p-12 text-muted text-[15px]">Loading...</div>
  }

  if (!character) {
    return <div className="p-12 text-muted text-[15px]">Character not found</div>
  }

  const era = character.eras.find((e) => e.id === eraId)
  if (!era) {
    return <div className="p-12 text-muted text-[15px]">Era not found</div>
  }

  const pendingCount = 0 // TODO: derive from image query

  const handleFileDrop = (files: File[]) => {
    setUploadStatus(`Uploading ${files.length} file(s)...`)
    let completed = 0
    for (const file of files) {
      ingestImage.mutate(
        { characterId, eraId, file, source: 'manual' },
        {
          onSuccess: () => {
            completed++
            if (completed === files.length) {
              setUploadStatus(`${completed} file(s) uploaded`)
              setTimeout(() => setUploadStatus(null), 3000)
            }
          },
          onError: () => {
            completed++
            if (completed === files.length) {
              setUploadStatus(`Upload complete (some may have failed)`)
              setTimeout(() => setUploadStatus(null), 3000)
            }
          },
        }
      )
    }
  }

  return (
    <Dropzone onFiles={handleFileDrop} accept=".png,.jpg,.jpeg,.webp" className="flex-1 flex flex-col">
      {/* Upload status toast */}
      {uploadStatus && (
        <div className="fixed bottom-6 right-6 z-50 bg-on-surface text-background px-6 py-3 shadow-lg text-sm">
          {uploadStatus}
        </div>
      )}
      {/* Workspace Header */}
      <section className="px-12 py-20 flex flex-col md:flex-row justify-between items-end gap-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-5xl md:text-7xl font-light tracking-display text-on-surface">
            {character.display_name || character.name}{' '}
            <span className="text-muted font-light">—</span>{' '}
            <span className="italic font-normal">{era.label}</span>
          </h2>
          {era.visual_description && (
            <p className="mt-6 font-body text-primary-dim max-w-lg leading-relaxed text-[15px]">
              {era.visual_description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <span className="text-ui text-[11px] tracking-[0.2em] text-muted">
            {refPackage?.face_refs.length ?? 0} Face Refs · {refPackage?.body_refs.length ?? 0} Body Refs
          </span>
          {era.prompt_prefix && (
            <span className="font-display text-lg text-on-surface">{era.prompt_prefix.slice(0, 60)}{era.prompt_prefix.length > 60 ? '...' : ''}</span>
          )}
        </div>
      </section>

      {/* Triage Status Banner */}
      {pendingCount > 0 && (
        <section className="mx-12 mb-20 bg-surface-low px-8 py-5 flex items-center justify-between group cursor-pointer hover:bg-surface transition-colors duration-300">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-ui text-xs tracking-[0.15em] text-on-surface">
              {pendingCount} Unsorted Assets — Pending Triage Queue
            </span>
          </div>
          <Link
            to="/characters/$characterId/eras/$eraId/triage"
            params={{ characterId, eraId }}
            className="text-ui text-xs tracking-[0.15em] border-b border-on-surface/20 hover:border-on-surface transition-all flex items-center gap-2"
          >
            Begin Triage <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </section>
      )}

      {/* Action Bar */}
      <section className="mx-12 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/characters/$characterId/eras/$eraId/triage"
            params={{ characterId, eraId }}
            className="text-ui text-[13px] text-muted hover:text-primary transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Triage
          </Link>
          <Link
            to="/characters/$characterId/eras/$eraId/studio"
            params={{ characterId, eraId }}
            className="text-ui text-[13px] text-muted hover:text-primary transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            Studio
          </Link>
        </div>
        <span className="text-meta">{era.image_count} assets</span>
      </section>

      {/* Masonry Grid */}
      <section className="px-12 pb-24">
        {era.image_count === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted text-[15px] mb-4">No images in this era yet.</p>
            <p className="text-muted text-[13px] mb-6">Drag and drop images here, or</p>
            <Link
              to="/characters/$characterId/eras/$eraId/studio"
              params={{ characterId, eraId }}
              className="inline-flex items-center gap-2 bg-on-surface text-background text-ui text-[13px] px-6 py-3 rounded-sm hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              Generate Images
            </Link>
          </div>
        ) : (
          <div className="masonry-grid">
            {/* Images would be rendered here from the character images query */}
            <p className="text-muted text-[13px]">Image grid will render from API data</p>
          </div>
        )}
      </section>

      {/* Masonry CSS */}
      <style>{`
        .masonry-grid {
          columns: 1;
          column-gap: 2.75rem;
        }
        @media (min-width: 768px) { .masonry-grid { columns: 2; } }
        @media (min-width: 1280px) { .masonry-grid { columns: 3; } }
        .masonry-item {
          break-inside: avoid;
          margin-bottom: 2.75rem;
        }
      `}</style>
    </Dropzone>
  )
}
