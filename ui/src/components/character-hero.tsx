import { useCharacterImages, useUpdateCharacter, useUpdateEra, avatarUrl } from '@/lib/api'
import { useState, useRef, useEffect } from 'react'
import type { EraWithStats } from '@/lib/types'

type DetailsTab = 'identity' | 'physicality'

export function CharacterHero({ character, figStatus, publishToFig, avatarVersion }: {
  character: { id: string; name: string; display_name: string; status: string; fig_published: boolean; fig_character_url: string; gender: string; ethnicity: string; skin_tone: string; eye_color: string; eye_shape: string; natural_hair_texture: string; natural_hair_color: string; distinguishing_features: string; eras: EraWithStats[] }
  figStatus: { available: boolean } | undefined
  publishToFig: { mutate: (id: string) => void; isPending: boolean }
  avatarVersion?: number
}) {
  const [showDetails, setShowDetails] = useState(false)
  const [detailsTab, setDetailsTab] = useState<DetailsTab>('identity')
  const { data: allImages } = useCharacterImages(character.id)
  const updateCharacter = useUpdateCharacter()
  const updateEra = useUpdateEra()
  const defaultEra = character.eras[0]
  const hasFaceRef = defaultEra?.reference_package_ready

  const saveCharField = (field: string) => (val: string) => {
    updateCharacter.mutate({ id: character.id, [field]: val })
  }
  const saveEraField = (field: string) => (val: string) => {
    if (!defaultEra) return
    const v = ['height_cm', 'weight_kg'].includes(field) ? (val ? Number(val) : null)
      : ['waist_hip_ratio', 'head_body_ratio', 'leg_torso_ratio', 'shoulder_hip_ratio'].includes(field) ? (val ? Number(val) : null)
      : val
    updateEra.mutate({ eraId: defaultEra.id, characterId: character.id, [field]: v })
  }

  const totalImages = (allImages ?? []).length || character.eras.reduce((sum, e) => sum + e.image_count, 0)

  return (
    <div className="flex flex-col md:flex-row gap-12 mt-4 mb-20 items-start">
      <div className="flex-1 max-w-2xl">
        {/* Status + Era */}
        <div className="flex items-center gap-4 mb-4">
          <span className="bg-surface-low text-on-surface text-[10px] font-bold px-3 py-1 tracking-widest uppercase">{character.status}</span>
          {defaultEra && (
            <span className="text-muted text-[10px] font-medium uppercase tracking-widest">
              {defaultEra.label} · {defaultEra.age_range}
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
            <span className="material-symbols-outlined text-base">{showDetails ? 'expand_less' : 'help_outline'}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Character Sheet</span>
          </button>
        </div>

        {/* Character Sheet Panel */}
        {showDetails && (
          <CharacterSheet
            character={character}
            defaultEra={defaultEra}
            detailsTab={detailsTab}
            setDetailsTab={setDetailsTab}
            saveCharField={saveCharField}
            saveEraField={saveEraField}
          />
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
        <div className="w-[160px] h-[200px] bg-surface-low overflow-hidden ring-1 ring-black/5 flex items-center justify-center">
          {totalImages > 0 ? (
            <img
              src={`${avatarUrl(character.id)}?v=${avatarVersion ?? 0}`}
              alt={character.display_name || character.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <span className="material-symbols-outlined text-4xl text-muted/30">person</span>
          )}
        </div>
      </div>
    </div>
  )
}

function CharacterSheet({ character, defaultEra, detailsTab, setDetailsTab, saveCharField, saveEraField }: {
  character: { gender: string; ethnicity: string; eye_color: string; eye_shape: string; natural_hair_texture: string; natural_hair_color: string; skin_tone: string; distinguishing_features: string }
  defaultEra: EraWithStats | undefined
  detailsTab: DetailsTab
  setDetailsTab: (tab: DetailsTab) => void
  saveCharField: (field: string) => (val: string) => void
  saveEraField: (field: string) => (val: string) => void
}) {
  return (
    <div className="bg-surface-low mb-8">
      <div className="flex border-b border-outline-variant/20">
        {(['identity', 'physicality'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setDetailsTab(tab)}
            className={`px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${
              detailsTab === tab
                ? 'text-on-surface border-b-2 border-on-surface'
                : 'text-muted hover:text-on-surface'
            }`}
          >
            {tab}
          </button>
        ))}
        {defaultEra && (
          <span className="ml-auto px-4 py-3 text-[10px] text-muted uppercase tracking-wider self-center">
            Era: {defaultEra.label}
          </span>
        )}
      </div>

      {detailsTab === 'identity' && (
        <div className="p-4 grid grid-cols-2 gap-x-8 gap-y-1">
          <EditableField label="Gender" value={character.gender} onSave={saveCharField('gender')} options={['female', 'male', 'non-binary', 'fluid']} />
          <EditableField label="Ethnicity" value={character.ethnicity} onSave={saveCharField('ethnicity')} />
          <EditableField label="Eye Color" value={character.eye_color} onSave={saveCharField('eye_color')} options={['amber', 'blue', 'brown', 'gray', 'green', 'hazel', 'dark brown', 'black']} />
          <EditableField label="Eye Shape" value={character.eye_shape} onSave={saveCharField('eye_shape')} options={['almond', 'round', 'hooded', 'monolid', 'upturned', 'downturned', 'deep-set', 'wide-set']} />
          <EditableField label="Hair Texture" value={character.natural_hair_texture} onSave={saveCharField('natural_hair_texture')} options={['straight', 'wavy', 'curly', 'coily', 'shaven']} />
          <EditableField label="Hair Color" value={character.natural_hair_color} onSave={saveCharField('natural_hair_color')} />
          <EditableField label="Skin Tone" value={character.skin_tone} onSave={saveCharField('skin_tone')} />
          <EditableField label="Distinguishing" value={character.distinguishing_features} onSave={saveCharField('distinguishing_features')} />
        </div>
      )}

      {detailsTab === 'physicality' && defaultEra && (
        <div className="p-4 space-y-4">
          <FieldGroup title="Body">
            <EditableField label="Height (cm)" value={defaultEra.height_cm} onSave={saveEraField('height_cm')} />
            <EditableField label="Weight (kg)" value={defaultEra.weight_kg} onSave={saveEraField('weight_kg')} />
            <EditableField label="Build" value={defaultEra.build} onSave={saveEraField('build')} options={['petite', 'slim', 'athletic', 'average', 'curvy', 'full', 'muscular']} />
            <EditableField label="Hip Shape" value={defaultEra.hip_shape} onSave={saveEraField('hip_shape')} options={['narrow', 'moderate', 'wide', 'heart-shaped']} />
            <EditableField label="Breast Size" value={defaultEra.breast_size} onSave={saveEraField('breast_size')} options={['flat', 'small', 'medium', 'large', 'very large']} />
            <EditableField label="Gynecoid Stage" value={defaultEra.gynecoid_stage} onSave={saveEraField('gynecoid_stage')} />
            <EditableField label="Waist-Hip Ratio" value={defaultEra.waist_hip_ratio} onSave={saveEraField('waist_hip_ratio')} />
          </FieldGroup>
          <FieldGroup title="Face">
            <EditableField label="Face Shape" value={defaultEra.face_shape} onSave={saveEraField('face_shape')} options={['round', 'oval', 'heart', 'square', 'oblong']} />
            <EditableField label="Buccal Fat" value={defaultEra.buccal_fat} onSave={saveEraField('buccal_fat')} options={['full', 'moderate', 'slim', 'hollow']} />
            <EditableField label="Jaw" value={defaultEra.jaw_definition} onSave={saveEraField('jaw_definition')} options={['soft', 'moderate', 'defined', 'angular']} />
            <EditableField label="Brow Ridge" value={defaultEra.brow_ridge} onSave={saveEraField('brow_ridge')} options={['subtle', 'moderate', 'prominent']} />
            <EditableField label="Nasolabial" value={defaultEra.nasolabial_depth} onSave={saveEraField('nasolabial_depth')} options={['absent', 'faint', 'moderate', 'defined']} />
          </FieldGroup>
          <FieldGroup title="Skin">
            <EditableField label="Texture" value={defaultEra.skin_texture} onSave={saveEraField('skin_texture')} options={['smooth', 'clear', 'fine_lines', 'textured']} />
            <EditableField label="Pore Visibility" value={defaultEra.skin_pore_visibility} onSave={saveEraField('skin_pore_visibility')} options={['absent', 'fine', 'visible']} />
            <EditableField label="Under-Eye" value={defaultEra.under_eye} onSave={saveEraField('under_eye')} options={['smooth', 'faint_hollow', 'defined_hollow']} />
          </FieldGroup>
          <FieldGroup title="Hair (Era)">
            <EditableField label="Color" value={defaultEra.hair_color} onSave={saveEraField('hair_color')} />
            <EditableField label="Length" value={defaultEra.hair_length} onSave={saveEraField('hair_length')} options={['buzzed', 'short', 'chin-length', 'shoulder', 'mid-back', 'waist', 'longer']} />
            <EditableField label="Pubic Style" value={defaultEra.pubic_hair_style} onSave={saveEraField('pubic_hair_style')} options={['natural', 'trimmed', 'landing_strip', 'brazilian', 'shaved']} />
          </FieldGroup>
          <FieldGroup title="Intimate">
            <EditableField label="Areola Size" value={defaultEra.areola_size} onSave={saveEraField('areola_size')} options={['small', 'medium', 'large']} />
            <EditableField label="Areola Color" value={defaultEra.areola_color} onSave={saveEraField('areola_color')} options={['light', 'medium', 'dark']} />
            <EditableField label="Areola Shape" value={defaultEra.areola_shape} onSave={saveEraField('areola_shape')} options={['flat', 'puffy', 'raised', 'pronounced']} />
            <EditableField label="Labia Majora" value={defaultEra.labia_majora} onSave={saveEraField('labia_majora')} options={['flat', 'moderate', 'full']} />
            <EditableField label="Labia Minora" value={defaultEra.labia_minora} onSave={saveEraField('labia_minora')} options={['minimal', 'visible', 'protruding']} />
            <EditableField label="Labia Color" value={defaultEra.labia_color} onSave={saveEraField('labia_color')} options={['light', 'medium', 'dark']} />
          </FieldGroup>
          <FieldGroup title="Proportions">
            <EditableField label="Head:Body" value={defaultEra.head_body_ratio} onSave={saveEraField('head_body_ratio')} />
            <EditableField label="Leg:Torso" value={defaultEra.leg_torso_ratio} onSave={saveEraField('leg_torso_ratio')} />
            <EditableField label="Shoulder:Hip" value={defaultEra.shoulder_hip_ratio} onSave={saveEraField('shoulder_hip_ratio')} />
          </FieldGroup>
        </div>
      )}
    </div>
  )
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">{title}</h4>
      <div className="grid grid-cols-2 gap-x-8 gap-y-1">
        {children}
      </div>
    </div>
  )
}

function EditableField({ label, value, onSave, options }: {
  label: string
  value: string | number | undefined | null
  onSave: (val: string) => void
  options?: string[]
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  const display = value != null && value !== '' ? String(value) : '—'

  const startEdit = () => {
    setDraft(value != null && value !== '' ? String(value) : '')
    setEditing(true)
  }

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  const commit = () => {
    setEditing(false)
    if (draft !== (value ?? '')) onSave(draft)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <div className="flex justify-between items-center py-1 group">
      <span className="text-muted text-[11px] uppercase tracking-wider">{label}</span>
      {editing ? (
        options ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); }}
            onBlur={commit}
            className="bg-background border-b border-on-surface text-[13px] text-on-surface py-0 px-1 focus:ring-0 focus:outline-none w-36 text-right appearance-none capitalize"
          >
            <option value="">—</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            className="bg-background border-b border-on-surface text-[13px] text-on-surface py-0 px-1 focus:ring-0 focus:outline-none w-36 text-right"
          />
        )
      ) : (
        <span
          onClick={startEdit}
          className="text-on-surface text-[13px] capitalize cursor-pointer hover:border-b hover:border-dashed hover:border-muted transition-all"
        >
          {display}
        </span>
      )}
    </div>
  )
}
