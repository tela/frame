import { useState } from 'react'
import { useBrowse, useImportDirectory, useCreateShoot } from '@/lib/api'
import type { EraWithStats } from '@/lib/types'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

interface Props {
  open: boolean
  onClose: () => void
  characterId: string
  characterName: string
  eras: EraWithStats[]
  defaultEraId?: string
}

type Step = 'browse' | 'context' | 'review'

interface SelectedDir {
  path: string
  name: string
  fileCount: number
}

export function ImportModal({ open, onClose, characterId, characterName, eras, defaultEraId }: Props) {
  const importDirectory = useImportDirectory()
  const createShoot = useCreateShoot()

  // Step state
  const [step, setStep] = useState<Step>('browse')

  // Browse state — empty string means "use server default"
  const [browsePath, setBrowsePath] = useState('__default__')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [selectedDirs, setSelectedDirs] = useState<SelectedDir[]>([])
  const [editingPath, setEditingPath] = useState(false)
  const [pathInput, setPathInput] = useState('')

  // Context state
  const [eraId, setEraId] = useState(defaultEraId || '')
  const [organizeAsShoot, setOrganizeAsShoot] = useState(false)
  const [shootName, setShootName] = useState('')
  const [importDirsAsShoots, setImportDirsAsShoots] = useState(false)
  const [sourceTag, setSourceTag] = useState<'manual' | 'fig' | 'comfyui'>('manual')

  // Import state
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; failed: number; total: number } | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const { data: browseData } = useBrowse(browsePath === '__default__' ? '' : browsePath)

  const totalSelected = selectedFiles.size

  const selectAllInDir = (dirPath: string, dirName: string, fileCount: number) => {
    // Toggle: if dir is already fully selected, deselect
    const dirPrefix = dirPath + '/'
    const allSelected = Array.from(selectedFiles).filter(f => f.startsWith(dirPrefix)).length >= fileCount
    if (allSelected) {
      setSelectedFiles(prev => {
        const next = new Set(prev)
        for (const f of prev) {
          if (f.startsWith(dirPrefix)) next.delete(f)
        }
        return next
      })
      setSelectedDirs(prev => prev.filter(d => d.path !== dirPath))
    } else {
      // We'll add the files when the dir is expanded and visible
      setSelectedDirs(prev => {
        if (prev.some(d => d.path === dirPath)) return prev
        return [...prev, { path: dirPath, name: dirName, fileCount }]
      })
    }
  }

  const toggleFile = (filePath: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      if (next.has(filePath)) next.delete(filePath)
      else next.add(filePath)
      return next
    })
  }

  const clearSelection = () => {
    setSelectedFiles(new Set())
    setSelectedDirs([])
  }

  const handleImport = async () => {
    setIsImporting(true)
    try {
      if (importDirsAsShoots && selectedDirs.length > 0) {
        // Import each directory as a separate shoot
        let totalImported = 0, totalSkipped = 0, totalFailed = 0, totalTotal = 0
        for (const dir of selectedDirs) {
          const shoot = await createShoot.mutateAsync({ characterId, name: dir.name })
          const result = await importDirectory.mutateAsync({
            path: dir.path,
            character_id: characterId,
            era_id: eraId || undefined,
            shoot_id: shoot.id,
            source: sourceTag,
          })
          totalImported += result.imported
          totalSkipped += result.skipped
          totalFailed += result.failed
          totalTotal += result.total
        }
        setImportResult({ imported: totalImported, skipped: totalSkipped, failed: totalFailed, total: totalTotal })
      } else if (selectedDirs.length > 0) {
        // Import directories sequentially
        let shootId: string | undefined
        if (organizeAsShoot && shootName.trim()) {
          const shoot = await createShoot.mutateAsync({ characterId, name: shootName.trim() })
          shootId = shoot.id
        }

        let totalImported = 0, totalSkipped = 0, totalFailed = 0, totalTotal = 0
        for (const dir of selectedDirs) {
          const result = await importDirectory.mutateAsync({
            path: dir.path,
            character_id: characterId,
            era_id: eraId || undefined,
            shoot_id: shootId,
            source: sourceTag,
          })
          totalImported += result.imported
          totalSkipped += result.skipped
          totalFailed += result.failed
          totalTotal += result.total
        }
        setImportResult({ imported: totalImported, skipped: totalSkipped, failed: totalFailed, total: totalTotal })
      } else {
        // Import the browsed directory (all selected files are in it)
        let shootId: string | undefined
        if (organizeAsShoot && shootName.trim()) {
          const shoot = await createShoot.mutateAsync({ characterId, name: shootName.trim() })
          shootId = shoot.id
        }
        const result = await importDirectory.mutateAsync({
          path: browseData?.path || browsePath,
          character_id: characterId,
          era_id: eraId || undefined,
          shoot_id: shootId,
          source: sourceTag,
        })
        setImportResult(result)
      }
    } catch (err) {
      setImportResult({ imported: 0, skipped: 0, failed: 1, total: 1 })
    } finally {
      setIsImporting(false)
    }
  }

  const resetAndClose = () => {
    setStep('browse')
    setBrowsePath('__default__')
    setEditingPath(false)
    setSelectedFiles(new Set())
    setSelectedDirs([])
    setEraId(defaultEraId || '')
    setOrganizeAsShoot(false)
    setShootName('')
    setImportDirsAsShoots(false)
    setSourceTag('manual')
    setImportResult(null)
    setIsImporting(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose() }}>
      <DialogContent className="bg-surface-lowest border-none shadow-2xl max-w-[960px] p-0 gap-0 overflow-hidden h-[720px] flex flex-col" aria-describedby={undefined}>
        <VisuallyHidden><DialogTitle>Import Images for {characterName}</DialogTitle></VisuallyHidden>

        {/* Header */}
        <header className="flex items-center justify-between px-10 py-8 border-b border-outline-variant/10">
          <div>
            <span className="font-label uppercase tracking-[0.2em] text-[10px] text-muted block mb-2">
              Step {step === 'browse' ? '01' : step === 'context' ? '02' : '03'} / 03
            </span>
            <h1 className="font-display italic text-3xl tracking-tight text-on-surface">
              {step === 'browse' && 'Browse & Select'}
              {step === 'context' && 'Assign Context'}
              {step === 'review' && 'Review & Import'}
            </h1>
          </div>
{/* Close button provided by DialogContent */}
        </header>

        {/* Content */}
        <div className="flex-grow flex overflow-hidden">
          {/* Step 1: Browse & Select */}
          {step === 'browse' && (
            <>
              {/* Left: Directory Browser */}
              <section className="w-5/12 bg-surface-low border-r border-outline-variant/10 flex flex-col">
                <div className="p-6 border-b border-outline-variant/5">
                  {/* Path breadcrumb — click to edit */}
                  {editingPath ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted text-sm">search</span>
                      <input
                        value={pathInput}
                        onChange={(e) => setPathInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { setBrowsePath(pathInput || '__default__'); setEditingPath(false) }
                          if (e.key === 'Escape') setEditingPath(false)
                        }}
                        onBlur={() => { if (pathInput) setBrowsePath(pathInput); setEditingPath(false) }}
                        className="w-full bg-surface-lowest border-none text-[13px] py-2 pl-10 focus:ring-1 focus:ring-on-surface transition-all"
                        placeholder="Paste or type a directory path..."
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-2">
                      {/* Up button */}
                      {browseData?.path && (
                        <button
                          onClick={() => {
                            const parent = browseData.path.split('/').slice(0, -1).join('/')
                            if (parent) setBrowsePath(parent)
                          }}
                          className="material-symbols-outlined text-muted hover:text-on-surface text-sm transition-colors"
                          title="Go up"
                        >
                          arrow_upward
                        </button>
                      )}
                      <button
                        onClick={() => { setPathInput(browseData?.path || ''); setEditingPath(true) }}
                        className="flex-1 text-left flex items-center gap-2 text-muted font-label text-[11px] tracking-wider uppercase hover:text-on-surface transition-colors truncate"
                        title="Click to edit path"
                      >
                        <span className="material-symbols-outlined text-sm">folder</span>
                        <span className="truncate">{browseData?.path || 'Loading...'}</span>
                      </button>
                      <span
                        onClick={() => { setPathInput(browseData?.path || ''); setEditingPath(true) }}
                        className="material-symbols-outlined text-muted hover:text-on-surface text-sm cursor-pointer transition-colors"
                        title="Edit path"
                      >
                        edit
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-grow overflow-y-auto p-4" style={{ scrollbarWidth: 'none' }}>
                  {browseData?.entries ? (
                    <ul className="space-y-1">
                      {/* Directories — click to navigate into */}
                      {browseData.entries.filter(e => e.is_dir).map((entry) => {
                        const dirPath = `${browseData.path}/${entry.name}`
                        const isSelected = selectedDirs.some(d => d.path === dirPath)
                        return (
                          <li key={entry.name} className="flex items-center justify-between p-2 hover:bg-surface-high cursor-pointer transition-colors group">
                            <div
                              className="flex items-center gap-2 flex-1"
                              onClick={() => setBrowsePath(dirPath)}
                            >
                              <span className="material-symbols-outlined text-muted group-hover:text-on-surface transition-colors">folder</span>
                              <span className="font-label text-sm text-primary-dim group-hover:text-on-surface">{entry.name}/</span>
                              {entry.children_count != null && entry.children_count > 0 && (
                                <span className="text-[10px] text-muted font-label">({entry.children_count})</span>
                              )}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); selectAllInDir(dirPath, entry.name, entry.children_count || 0) }}
                              className={`text-[10px] font-label uppercase tracking-wider px-2 py-1 transition-colors ${
                                isSelected ? 'text-on-surface bg-primary-container/30' : 'text-muted hover:text-on-surface'
                              }`}
                              title={isSelected ? 'Deselect all' : 'Select all images'}
                            >
                              {isSelected ? 'Selected' : 'Select All'}
                            </button>
                          </li>
                        )
                      })}
                      {/* Files — click to toggle selection */}
                      {browseData.entries.filter(e => !e.is_dir).map((entry) => {
                        const filePath = `${browseData.path}/${entry.name}`
                        const isSelected = selectedFiles.has(filePath)
                        return (
                          <li
                            key={entry.name}
                            className={`flex items-center justify-between p-2 cursor-pointer transition-colors ${
                              isSelected ? 'bg-primary-container/20' : 'hover:bg-surface-high'
                            }`}
                            onClick={() => toggleFile(filePath)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-8 bg-surface-variant overflow-hidden flex items-center justify-center">
                                <span className="material-symbols-outlined text-muted text-[14px]">image</span>
                              </div>
                              <span className={`font-label text-[12px] ${isSelected ? 'text-on-surface' : 'text-primary-dim'}`}>
                                {entry.name}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                check_circle
                              </span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="text-muted text-sm p-4">Loading...</p>
                  )}
                </div>
              </section>

              {/* Right: Selection Preview */}
              <section className="w-7/12 flex flex-col">
                <div className="flex items-center justify-between px-8 py-6 border-b border-outline-variant/10">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display italic text-2xl text-on-surface">{totalSelected}</span>
                    <span className="font-label uppercase tracking-widest text-[11px] text-muted">images selected</span>
                  </div>
                  {totalSelected > 0 && (
                    <button
                      onClick={clearSelection}
                      className="font-label uppercase tracking-widest text-[10px] text-primary-dim hover:text-accent transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">delete_sweep</span>
                      Clear Selection
                    </button>
                  )}
                </div>
                <div className="flex-grow overflow-y-auto p-8" style={{ scrollbarWidth: 'none' }}>
                  {totalSelected === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted">
                      <span className="material-symbols-outlined text-[48px] mb-4 opacity-30">photo_library</span>
                      <p className="text-sm">Select images from the directory browser</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-6">
                      {Array.from(selectedFiles).map((filePath) => {
                        const fileName = filePath.split('/').pop() || filePath
                        return (
                          <div key={filePath} className="relative aspect-[3/4] bg-surface-low group cursor-pointer overflow-hidden">
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-muted text-2xl">image</span>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-on-surface/70 px-2 py-1">
                              <span className="text-[9px] text-background truncate block">{fileName}</span>
                            </div>
                            <button
                              onClick={() => toggleFile(filePath)}
                              className="absolute top-2 right-2 w-5 h-5 bg-on-surface rounded-full flex items-center justify-center"
                            >
                              <span className="material-symbols-outlined text-[12px] text-background" style={{ fontVariationSettings: "'FILL' 1" }}>close</span>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {/* Step 2: Assign Context */}
          {step === 'context' && (
            <div className="flex-1 p-10 overflow-y-auto">
              <div className="max-w-lg mx-auto space-y-8">
                {/* Era */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary-dim">Era Assignment</label>
                  <select
                    value={eraId}
                    onChange={(e) => setEraId(e.target.value)}
                    className="w-full bg-surface-low border-none text-sm py-3 px-4 focus:ring-1 focus:ring-on-surface appearance-none cursor-pointer"
                  >
                    <option value="">No era</option>
                    {eras.map((era) => (
                      <option key={era.id} value={era.id}>{era.label} ({era.age_range})</option>
                    ))}
                  </select>
                </div>

                {/* Shoot */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary-dim">Shoot Organization</label>

                  {selectedDirs.length > 1 && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={importDirsAsShoots}
                        onChange={(e) => { setImportDirsAsShoots(e.target.checked); if (e.target.checked) setOrganizeAsShoot(false) }}
                        className="appearance-none w-4 h-4 border border-outline-variant checked:bg-on-surface checked:border-on-surface cursor-pointer rounded-none focus:ring-0"
                      />
                      <span className="text-sm text-on-surface">Import each directory as a separate shoot</span>
                    </label>
                  )}

                  {!importDirsAsShoots && (
                    <>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={organizeAsShoot}
                          onChange={(e) => setOrganizeAsShoot(e.target.checked)}
                          className="appearance-none w-4 h-4 border border-outline-variant checked:bg-on-surface checked:border-on-surface cursor-pointer rounded-none focus:ring-0"
                        />
                        <span className="text-sm text-on-surface">Organize as a shoot</span>
                      </label>
                      {organizeAsShoot && (
                        <input
                          value={shootName}
                          onChange={(e) => setShootName(e.target.value)}
                          className="w-full bg-surface-low border-none text-sm py-3 px-4 focus:ring-1 focus:ring-on-surface transition-all"
                          placeholder="Shoot name (e.g. Beach Series)"
                          autoFocus
                        />
                      )}
                    </>
                  )}
                </div>

                {/* Source tag */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary-dim">Source Tag</label>
                  <div className="flex gap-2">
                    {(['manual', 'fig', 'comfyui'] as const).map((src) => (
                      <button
                        key={src}
                        onClick={() => setSourceTag(src)}
                        className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                          sourceTag === src
                            ? 'bg-on-surface text-background border-on-surface'
                            : 'text-primary-dim border-outline-variant hover:border-on-surface'
                        }`}
                      >
                        {src}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Directory summary */}
                {selectedDirs.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-primary-dim">Directories</label>
                    <div className="bg-surface-low p-4 space-y-2">
                      {selectedDirs.map((dir) => (
                        <div key={dir.path} className="flex justify-between text-sm">
                          <span className="text-on-surface">{dir.name}/</span>
                          <span className="text-muted">{dir.fileCount} images</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Review & Import */}
          {step === 'review' && (
            <div className="flex-1 p-10 overflow-y-auto">
              <div className="max-w-lg mx-auto space-y-8">
                {/* Summary */}
                <div className="bg-surface-low p-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Character</span>
                    <span className="text-on-surface font-medium">{characterName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Era</span>
                    <span className="text-on-surface font-medium">
                      {eras.find(e => e.id === eraId)?.label || 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Organization</span>
                    <span className="text-on-surface font-medium">
                      {importDirsAsShoots ? `${selectedDirs.length} shoots (from directories)` :
                       organizeAsShoot ? `Shoot: ${shootName}` : 'Scrapbook'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Source</span>
                    <span className="text-on-surface font-medium capitalize">{sourceTag}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Images</span>
                    <span className="text-on-surface font-medium">{totalSelected || selectedDirs.reduce((s, d) => s + d.fileCount, 0)}</span>
                  </div>
                </div>

                {/* Import result */}
                {importResult && (
                  <div className="bg-surface-low p-6 space-y-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary-dim mb-3">Import Complete</h3>
                    <p className="text-sm"><strong>{importResult.imported}</strong> imported</p>
                    {importResult.skipped > 0 && <p className="text-sm text-muted">{importResult.skipped} duplicates skipped</p>}
                    {importResult.failed > 0 && <p className="text-sm text-accent">{importResult.failed} failed</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="p-8 border-t border-outline-variant/10 flex items-center justify-between">
          <div className="flex gap-2">
            {['browse', 'context', 'review'].map((s, i) => (
              <div key={s} className={`w-2 h-2 rounded-full ${
                i <= ['browse', 'context', 'review'].indexOf(step) ? 'bg-on-surface' : 'bg-surface-high'
              }`} />
            ))}
          </div>
          <div className="flex gap-4">
            {step !== 'browse' && !importResult && (
              <button
                onClick={() => setStep(step === 'review' ? 'context' : 'browse')}
                className="font-label uppercase tracking-widest text-[11px] text-primary-dim hover:text-on-surface transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back
              </button>
            )}
            {step === 'browse' && (
              <button
                onClick={() => setStep('context')}
                disabled={totalSelected === 0 && selectedDirs.length === 0}
                className="flex items-center gap-4 bg-on-surface text-background px-8 py-4 font-label uppercase tracking-[0.2em] text-[11px] hover:opacity-95 transition-opacity disabled:opacity-40"
              >
                Assign Context
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            )}
            {step === 'context' && (
              <button
                onClick={() => setStep('review')}
                className="flex items-center gap-4 bg-on-surface text-background px-8 py-4 font-label uppercase tracking-[0.2em] text-[11px] hover:opacity-95 transition-opacity"
              >
                Review & Import
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            )}
            {step === 'review' && !importResult && (
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="flex items-center gap-4 bg-on-surface text-background px-8 py-4 font-label uppercase tracking-[0.2em] text-[11px] hover:opacity-95 transition-opacity disabled:opacity-40"
              >
                {isImporting ? 'Importing...' : `Import ${totalSelected || selectedDirs.reduce((s, d) => s + d.fileCount, 0)} Images`}
              </button>
            )}
            {importResult && (
              <button
                onClick={resetAndClose}
                className="flex items-center gap-4 bg-on-surface text-background px-8 py-4 font-label uppercase tracking-[0.2em] text-[11px] hover:opacity-95 transition-opacity"
              >
                Done
              </button>
            )}
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
