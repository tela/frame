import { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useCreateCharacter, useIngestImage } from '@/lib/api'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onClose: () => void
}

export function NewCharacterDialog({ open, onClose }: Props) {
  const navigate = useNavigate()
  const createCharacter = useCreateCharacter()
  const ingestImage = useIngestImage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [nameError, setNameError] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) {
      setNameError('Full name is required')
      return
    }
    setNameError('')
    setCreating(true)

    try {
      const character = await createCharacter.mutateAsync({
        name: name.trim(),
        display_name: displayName.trim() || name.trim().split(' ')[0],
        status: 'prospect',
      })

      // Upload initial images if any
      for (const file of files) {
        try {
          await ingestImage.mutateAsync({
            characterId: character.id,
            file,
            source: 'manual',
          })
        } catch {
          // Continue with remaining files
        }
      }

      setName('')
      setDisplayName('')
      setFiles([])
      onClose()
      navigate({ to: '/characters/$characterId', params: { characterId: character.id } })
    } catch {
      setNameError('Failed to create character')
    } finally {
      setCreating(false)
    }
  }

  const handleFiles = (newFiles: FileList | File[]) => {
    const imageFiles = Array.from(newFiles).filter(f =>
      f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024
    )
    setFiles(prev => [...prev, ...imageFiles])
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="bg-surface-lowest border-none shadow-[0_20px_40px_rgba(47,51,51,0.06)] max-w-2xl p-0 gap-0">
        {/* Header */}
        <div className="px-10 pt-10 pb-6 border-b border-surface-low">
          <h3 className="font-display text-4xl tracking-display text-on-surface">New Character Dialog</h3>
          <p className="font-body text-muted text-sm mt-4 italic max-w-md">
            Define the foundational identity within the archive. Personality attributes come later in Fig.
          </p>
        </div>

        {/* Content */}
        <div className="px-10 py-8 space-y-8">
          {/* Name inputs */}
          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-[0.15em] font-medium text-muted">
                Full Name <span className="text-accent">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError('') }}
                className={`w-full bg-surface-low border-none p-3 text-sm focus:ring-1 focus:ring-on-surface transition-all placeholder:text-muted/50 ${
                  nameError ? 'ring-1 ring-accent' : ''
                }`}
                placeholder="e.g. Alistair Thorne"
                autoFocus
              />
              {nameError && (
                <span className="text-accent text-[11px]">{nameError}</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-[0.15em] font-medium text-muted">
                Display Name
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-surface-low border-none p-3 text-sm focus:ring-1 focus:ring-on-surface transition-all placeholder:text-muted/50"
                placeholder="e.g. Thorne"
              />
            </div>
          </div>

          {/* Image drop zone */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-[0.15em] font-medium text-muted">
              Initial Images
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => { if (e.target.files) handleFiles(e.target.files) }}
            />
            <div
              className="border border-dashed border-outline-variant/40 bg-surface-low/30 h-48 flex flex-col items-center justify-center group hover:bg-surface-low transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files) }}
            >
              {files.length === 0 ? (
                <>
                  <span className="material-symbols-outlined text-muted text-[32px] mb-3">photo_library</span>
                  <p className="font-body text-sm text-muted">
                    Drag files to upload or <span className="text-on-surface border-b border-on-surface/20">browse</span>
                  </p>
                  <p className="text-[9px] uppercase tracking-[0.15em] text-muted mt-2">Maximum file size: 10MB</p>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-primary text-[32px] mb-3">check_circle</span>
                  <p className="font-body text-sm text-on-surface">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
                  <p className="text-[9px] uppercase tracking-[0.15em] text-muted mt-2">
                    Click to add more · <button onClick={(e) => { e.stopPropagation(); setFiles([]) }} className="text-accent hover:underline">Clear</button>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-6 flex items-center justify-between bg-surface-low/50">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted">* Required fields</span>
          <div className="flex gap-6 items-center">
            <button
              onClick={onClose}
              className="text-[11px] uppercase tracking-[0.15em] text-muted hover:text-on-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="bg-on-surface text-surface py-3 px-10 text-[11px] uppercase tracking-[0.15em] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
