export function PromptTemplates() {
  // TODO: Replace with real data from API
  const templates = [
    { name: 'CINEMATIC CLOSE-UP', prompt: '35mm cinematic close-up of [SUBJECT], [LIGHTING] lighting, 8k resolution, photorealistic, depth of field, sharp focus, taken on Arri Alexa 65.', uses: 142 },
    { name: 'POLAROID PORTRAIT', prompt: 'Polaroid photo of [SUBJECT] wearing [OUTFIT], vintage color grading, soft focus, 1990s flash photography aesthetics, authentic light leaks.', uses: 89 },
    { name: 'HIGH-FASHION EDITORIAL', prompt: 'Stark editorial portrait of [SUBJECT], [BACKGROUND] background, high contrast lighting, Vogue style, avant-garde posing, hyper-detailed texture.', uses: 215 },
    { name: 'VINTAGE ARCHIVE', prompt: 'Sepia toned archive photo of [SUBJECT] in [SETTING], grainy, historical document style, 1920s era, scratches and dust marks, faded edges.', uses: 45 },
    { name: 'NEON NOIR', prompt: 'Cyberpunk neon noir portrait of [SUBJECT], rain-slicked streets, [COLOR] neon glow illuminating face, heavy shadows, cinematic composition.', uses: 12 },
  ]

  return (
    <>
      {/* Header */}
      <header className="px-12 py-12 flex justify-between items-end border-b border-border-subtle bg-background sticky top-0 z-10">
        <div>
          <h2 className="font-display text-[48px] leading-none mb-2 text-primary">Template Library</h2>
          <p className="text-[15px] text-muted">Repository for saving, versioning, and applying generative prompt frameworks.</p>
        </div>
        <button className="bg-primary text-background text-ui text-[13px] px-6 py-3 rounded hover:bg-primary/90 transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">add</span>
          New Template
        </button>
      </header>

      {/* Template Grid */}
      <div className="p-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates.map((tmpl) => (
            <div
              key={tmpl.name}
              className="bg-surface border border-border-subtle rounded p-6 flex flex-col group hover:border-primary transition-colors cursor-pointer h-[280px]"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-ui text-[13px] text-primary line-clamp-2 pr-4">{tmpl.name}</h3>
                <button className="text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" title="Edit Template">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
              </div>
              <div className="flex-grow overflow-hidden">
                <p className="font-body text-[13px] leading-relaxed text-primary">
                  {tmpl.prompt.split(/(\[[A-Z]+\])/).map((part, i) =>
                    part.match(/^\[.+\]$/) ? (
                      <span key={i} className="bg-border-subtle px-1 rounded text-primary">{part}</span>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-border-subtle flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[12px] text-muted tabular-nums">Used {tmpl.uses} times</span>
                <button className="text-ui text-[12px] text-primary hover:text-accent flex items-center gap-1">
                  Use in Studio
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            </div>
          ))}

          {/* Add New Card */}
          <div className="bg-transparent border border-dashed border-border-subtle rounded p-6 flex flex-col justify-center items-center hover:border-primary hover:bg-surface transition-colors cursor-pointer h-[280px] group">
            <span className="material-symbols-outlined text-[32px] text-muted group-hover:text-primary mb-2">add</span>
            <span className="text-ui text-[13px] text-muted group-hover:text-primary">Draft New Template</span>
          </div>
        </div>
      </div>
    </>
  )
}
