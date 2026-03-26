import { useState } from 'react'
import { useTemplates, useCreateTemplate, useDeleteTemplate, type PromptTemplate } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function PromptTemplates() {
  const { data: templates, isLoading } = useTemplates()
  const createTemplate = useCreateTemplate()
  const deleteTemplate = useDeleteTemplate()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrompt, setNewPrompt] = useState('')
  const [newNegative, setNewNegative] = useState('')

  const handleCreate = () => {
    if (!newName.trim()) return
    createTemplate.mutate(
      { name: newName.trim(), prompt_body: newPrompt, negative_prompt: newNegative },
      { onSuccess: () => { setShowCreate(false); setNewName(''); setNewPrompt(''); setNewNegative('') } }
    )
  }

  return (
    <>
      {/* Header */}
      <header className="px-12 py-12 flex justify-between items-end border-b border-border-subtle bg-background sticky top-0 z-10">
        <div>
          <h2 className="font-display text-[48px] leading-none mb-2 text-primary">Template Library</h2>
          <p className="text-[15px] text-muted">Repository for saving, versioning, and applying generative prompt frameworks.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-background text-ui text-[13px] px-6 py-3 rounded hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          New Template
        </button>
      </header>

      {/* Template Grid */}
      <div className="p-12">
        {isLoading ? (
          <p className="text-muted">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(templates ?? []).map((tmpl) => (
              <TemplateCard key={tmpl.id} template={tmpl} onDelete={() => deleteTemplate.mutate(tmpl.id)} />
            ))}

            {/* Add New Card */}
            <div
              onClick={() => setShowCreate(true)}
              className="bg-transparent border border-dashed border-border-subtle rounded p-6 flex flex-col justify-center items-center hover:border-primary hover:bg-surface transition-colors cursor-pointer h-[280px] group"
            >
              <span className="material-symbols-outlined text-[32px] text-muted group-hover:text-primary mb-2">add</span>
              <span className="text-ui text-[13px] text-muted group-hover:text-primary">Draft New Template</span>
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-background border-border-subtle max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">New Template</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <div>
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Template Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none"
                placeholder="e.g., Cinematic Close-up (35mm)"
                autoFocus
              />
            </div>
            <div>
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Prompt Body</label>
              <textarea
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none h-32 resize-none font-body"
                placeholder="35mm cinematic close-up of [SUBJECT], [LIGHTING] lighting..."
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {['SUBJECT', 'ERA', 'LIGHTING', 'OUTFIT', 'SETTING'].map((v) => (
                  <button
                    key={v}
                    onClick={() => setNewPrompt((p) => p + ` [${v}]`)}
                    className="text-[11px] px-2 py-1 border border-border-subtle rounded-sm bg-surface font-body text-muted cursor-pointer hover:border-primary hover:text-primary transition-colors"
                  >
                    + [{v}]
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-muted block mb-2">Negative Prompt</label>
              <input
                value={newNegative}
                onChange={(e) => setNewNegative(e.target.value)}
                className="w-full border border-border-subtle bg-transparent py-2.5 px-3 text-sm focus:border-on-surface focus:ring-0 focus:outline-none"
                placeholder="blurry, low quality, artifacts..."
              />
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-[11px] uppercase font-bold text-muted">Cancel</button>
              <button onClick={handleCreate} disabled={!newName.trim()} className="bg-on-surface text-background px-6 py-2 text-[11px] uppercase font-bold disabled:opacity-50">Create</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function TemplateCard({ template: tmpl, onDelete }: { template: PromptTemplate; onDelete: () => void }) {
  return (
    <div className="bg-surface border border-border-subtle rounded p-6 flex flex-col group hover:border-primary transition-colors cursor-pointer h-[280px]">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-ui text-[13px] text-primary line-clamp-2 pr-4">{tmpl.name.toUpperCase()}</h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="text-muted hover:text-primary" title="Edit">
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-muted hover:text-accent" title="Delete">
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
      <div className="flex-grow overflow-hidden">
        <p className="font-body text-[13px] leading-relaxed text-primary">
          {tmpl.prompt_body.split(/(\[[A-Z_]+\])/).map((part, i) =>
            part.match(/^\[.+\]$/) ? (
              <span key={i} className="bg-border-subtle px-1 rounded text-primary">{part}</span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </p>
      </div>
      <div className="mt-4 pt-4 border-t border-border-subtle flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[12px] text-muted tabular-nums">Used {tmpl.usage_count} times</span>
        <button className="text-ui text-[12px] text-primary hover:text-accent flex items-center gap-1">
          Use in Studio
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}
