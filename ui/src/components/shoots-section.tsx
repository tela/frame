import { useNavigate } from '@tanstack/react-router'
import { useShoots, useCreateShoot, useShootImages, thumbUrl } from '@/lib/api'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Shoot } from '@/lib/types'

export function ShootsSection({ characterId, defaultEraId }: { characterId: string; defaultEraId?: string }) {
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
