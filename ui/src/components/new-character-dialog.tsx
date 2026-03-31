import { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useCreateCharacter, useIngestImage } from '@/lib/api'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onClose: () => void
}

const FIRST_NAMES = [
  'Celeste', 'Elias', 'Marlowe', 'Soren', 'Isolde', 'Caspian', 'Vesper', 'Orion',
  'Freya', 'Stellan', 'Aurelie', 'Dashiell', 'Esme', 'Theron', 'Neve', 'Lennox',
  'Seraphina', 'Callum', 'Ingrid', 'Rhys', 'Aria', 'Felix', 'Lyra', 'Hugo',
  'Petra', 'Silas', 'Wren', 'Jasper', 'Lark', 'Maren', 'Kael', 'Elowen',
]

const LAST_NAMES = [
  'Noir', 'Vance', 'Thorne', 'Ashford', 'Blackwell', 'Crane', 'Mercer', 'Sterling',
  'Volkov', 'Delacroix', 'Graves', 'Hartwell', 'Langley', 'Mortimer', 'Sinclair', 'Wren',
  'Beaumont', 'Castellano', 'Fairfax', 'Holloway', 'Kingsley', 'Navarro', 'Prescott', 'Ravenswood',
  'Sato', 'Thornberry', 'Whitmore', 'Yi', 'Zoltan', 'Okafor', 'Chen', 'Moreau',
]

const SKIN_TONES = [
  { value: 'fair', color: '#F6E3D4' },
  { value: 'light', color: '#E8C0A0' },
  { value: 'medium', color: '#C69076' },
  { value: 'tan', color: '#A06840' },
  { value: 'brown', color: '#8D5524' },
  { value: 'dark brown', color: '#6B3A1F' },
  { value: 'deep', color: '#4B2C20' },
]

const EYE_COLORS = ['Amber', 'Blue', 'Brown', 'Gray', 'Green', 'Hazel', 'Dark Brown', 'Black']

const HAIR_TEXTURES = [
  { value: 'straight', label: 'Straight (Type 1)' },
  { value: 'wavy', label: 'Wavy (Type 2)' },
  { value: 'curly', label: 'Curly (Type 3)' },
  { value: 'coily', label: 'Coily (Type 4)' },
  { value: 'shaven', label: 'Alopecia / Shaven' },
]

const GENDERS = ['Female', 'Male', 'Non-Binary', 'Fluid']

function randomFrom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

type Step = 'identity' | 'physical'

export function NewCharacterDialog({ open, onClose }: Props) {
  const navigate = useNavigate()
  const createCharacter = useCreateCharacter()
  const ingestImage = useIngestImage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('identity')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [displayNameOverride, setDisplayNameOverride] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [gender, setGender] = useState('')
  const [ethnicity, setEthnicity] = useState('')
  const [skinTone, setSkinTone] = useState('')
  const [eyeColor, setEyeColor] = useState('')
  const [hairTexture, setHairTexture] = useState('')
  const [nameError, setNameError] = useState('')
  const [creating, setCreating] = useState(false)

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
  const autoDisplayName = firstName.trim() + (lastName.trim() ? ` ${lastName.trim()[0]}.` : '')
  const effectiveDisplayName = displayNameOverride ? displayName : autoDisplayName

  const handleNext = () => {
    if (!firstName.trim()) {
      setNameError('First name is required')
      return
    }
    setNameError('')
    setStep('physical')
  }

  const handleBack = () => {
    setStep('identity')
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const character = await createCharacter.mutateAsync({
        name: fullName,
        display_name: effectiveDisplayName,
        status: 'prospect',
        gender: gender.toLowerCase(),
        ethnicity,
        skin_tone: skinTone,
        eye_color: eyeColor.toLowerCase(),
        natural_hair_texture: hairTexture,
      })

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

      resetForm()
      onClose()
      navigate({ to: '/characters/$characterId', params: { characterId: character.id } })
    } catch {
      setNameError('Failed to create character')
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setStep('identity')
    setFirstName('')
    setLastName('')
    setDisplayName('')
    setDisplayNameOverride(false)
    setFiles([])
    setGender('')
    setEthnicity('')
    setSkinTone('')
    setEyeColor('')
    setHairTexture('')
    setNameError('')
  }

  const handleFiles = (newFiles: FileList | File[]) => {
    const imageFiles = Array.from(newFiles).filter(f =>
      f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024
    )
    setFiles(prev => [...prev, ...imageFiles])
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { resetForm(); onClose() } }}>
      <DialogContent className="bg-surface-lowest border-none shadow-[0_20px_40px_rgba(47,51,51,0.04)] max-w-4xl p-0 gap-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
          {/* Left Column: Visual Context */}
          <div className="lg:col-span-5 relative hidden lg:block bg-surface-low border-r border-outline-variant/10">
            <div className="relative z-10 p-12 flex flex-col h-full">
              <div className="mb-auto">
                <span className="font-label text-[0.6875rem] uppercase tracking-widest text-primary-dim">
                  Protocol 075
                </span>
                <h2 className="font-display italic text-4xl mt-4 leading-tight text-on-surface">
                  Archetype Definition
                </h2>
              </div>
              <div className="mt-auto space-y-6">
                <div className="p-6 bg-background/80 backdrop-blur-sm border border-outline-variant/20">
                  <p className="font-display italic text-lg text-primary-dim leading-relaxed">
                    "The physical form is the first layer of the archive. It defines the era's interaction with the subject."
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-px w-8 bg-primary-dim/30" />
                    <span className="font-label text-[0.625rem] uppercase tracking-widest text-primary-dim">
                      Archival Manual
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="lg:col-span-7 p-8 md:p-12 flex flex-col">
            {/* Header with step indicator */}
            <header className="mb-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex gap-1">
                  <div className={`w-8 h-1 ${step === 'identity' ? 'bg-on-surface' : 'bg-on-surface'}`} />
                  <div className={`w-8 h-1 ${step === 'physical' ? 'bg-on-surface' : 'bg-surface-high'}`} />
                </div>
                <span className="font-label text-[0.6875rem] uppercase tracking-widest text-primary-dim">
                  {step === 'identity' ? 'Step 01: Identity' : 'Step 02: Physical Profile'}
                </span>
              </div>
              <h1 className="font-display font-bold text-4xl tracking-display text-on-surface">
                Initialize New Identity
              </h1>
            </header>

            {/* Step 1: Identity */}
            {step === 'identity' && (
              <div className="flex-1 space-y-8">
                {/* Name inputs */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="font-label text-[0.6875rem] uppercase tracking-widest text-primary-dim ml-1">
                      First Name <span className="text-accent">*</span>
                    </label>
                    <div className="relative">
                      <input
                        value={firstName}
                        onChange={(e) => { setFirstName(e.target.value); setNameError('') }}
                        className={`w-full bg-surface-low border-none p-4 pr-9 text-sm focus:ring-1 focus:ring-on-surface transition-all placeholder:text-primary-dim/40 ${
                          nameError ? 'ring-1 ring-accent' : ''
                        }`}
                        placeholder="e.g. Celeste"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setFirstName(randomFrom(FIRST_NAMES))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary-dim/40 hover:text-primary text-[18px] transition-colors"
                        title="Generate random first name"
                      >
                        casino
                      </button>
                    </div>
                    {nameError && <span className="text-accent text-[11px]">{nameError}</span>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-label text-[0.6875rem] uppercase tracking-widest text-primary-dim ml-1">
                      Last Name
                    </label>
                    <div className="relative">
                      <input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-surface-low border-none p-4 pr-9 text-sm focus:ring-1 focus:ring-on-surface transition-all placeholder:text-primary-dim/40"
                        placeholder="e.g. Noir"
                      />
                      <button
                        type="button"
                        onClick={() => setLastName(randomFrom(LAST_NAMES))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary-dim/40 hover:text-primary text-[18px] transition-colors"
                        title="Generate random last name"
                      >
                        casino
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-label text-[0.6875rem] uppercase tracking-widest text-primary-dim ml-1">
                      Display Name
                    </label>
                    <input
                      value={displayNameOverride ? displayName : autoDisplayName}
                      onChange={(e) => { setDisplayName(e.target.value); setDisplayNameOverride(true) }}
                      onBlur={() => { if (displayName.trim() === '' || displayName === autoDisplayName) setDisplayNameOverride(false) }}
                      className="w-full bg-surface-low border-none p-4 text-sm focus:ring-1 focus:ring-on-surface transition-all placeholder:text-primary-dim/40"
                      placeholder="e.g. Celeste"
                    />
                  </div>
                </div>

                {fullName && (
                  <p className="text-[12px] text-muted">
                    Full name: <span className="text-on-surface font-medium">{fullName}</span>
                    {' · Display: '}<span className="text-on-surface font-medium">{effectiveDisplayName}</span>
                  </p>
                )}

                {/* Image drop zone */}
                <div className="flex flex-col gap-2">
                  <label className="font-label text-[0.6875rem] uppercase tracking-widest text-primary-dim ml-1">
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
                    className="border border-dashed border-outline-variant/40 bg-surface-low/30 h-36 flex flex-col items-center justify-center group hover:bg-surface-low transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files) }}
                  >
                    {files.length === 0 ? (
                      <>
                        <span className="material-symbols-outlined text-muted text-[28px] mb-2">photo_library</span>
                        <p className="font-body text-sm text-muted">
                          Drag files or <span className="text-on-surface border-b border-on-surface/20">browse</span>
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-primary text-[28px] mb-2">check_circle</span>
                        <p className="font-body text-sm text-on-surface">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFiles([]) }}
                          className="text-[9px] uppercase tracking-[0.15em] text-accent mt-1 hover:underline"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-6 flex items-center justify-end gap-6 border-t border-surface">
                  <button
                    onClick={onClose}
                    className="font-label text-[0.6875rem] uppercase tracking-widest text-primary-dim hover:text-on-surface transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!firstName.trim()}
                    className="px-10 py-4 bg-on-surface text-background font-label text-[0.75rem] uppercase tracking-[0.15em] hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-3"
                  >
                    Physical Profile
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Physical Profile */}
            {step === 'physical' && (
              <div className="flex-1 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                  {/* Gender */}
                  <div className="flex flex-col gap-2">
                    <label className="font-label text-[0.6875rem] uppercase tracking-widest text-primary-dim ml-1">
                      Gender Identification
                    </label>
                    <div className="relative">
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full bg-surface-low border-none p-4 text-sm focus:ring-1 focus:ring-on-surface transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Select Identity</option>
                        {GENDERS.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary-dim">
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Ethnicity */}
                  <div className="flex flex-col gap-2">
                    <label className="font-label text-[0.6875rem] uppercase tracking-widest text-primary-dim ml-1">
                      Ancestral Origin
                    </label>
                    <input
                      value={ethnicity}
                      onChange={(e) => setEthnicity(e.target.value)}
                      className="w-full bg-surface-low border-none p-4 text-sm focus:ring-1 focus:ring-on-surface transition-all placeholder:text-primary-dim/40"
                      placeholder="Specify Ethnicity"
                    />
                  </div>

                  {/* Skin Tone */}
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="font-label text-[0.6875rem] uppercase tracking-widest text-primary-dim ml-1">
                      Skin Tone Spectrum
                    </label>
                    <div className="flex gap-3 flex-wrap p-2">
                      {SKIN_TONES.map((tone) => (
                        <button
                          key={tone.value}
                          type="button"
                          onClick={() => setSkinTone(tone.value)}
                          className={`w-10 h-10 rounded-full border transition-transform hover:scale-110 ${
                            skinTone === tone.value
                              ? 'ring-2 ring-on-surface ring-offset-2 border-on-surface scale-110'
                              : 'border-outline-variant/20'
                          }`}
                          style={{ backgroundColor: tone.color }}
                          title={tone.value}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Eye Color */}
                  <div className="flex flex-col gap-2">
                    <label className="font-label text-[0.6875rem] uppercase tracking-widest text-primary-dim ml-1">
                      Ocular Pigment
                    </label>
                    <div className="relative">
                      <select
                        value={eyeColor}
                        onChange={(e) => setEyeColor(e.target.value)}
                        className="w-full bg-surface-low border-none p-4 text-sm focus:ring-1 focus:ring-on-surface transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Select Eye Color</option>
                        {EYE_COLORS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary-dim">
                        palette
                      </span>
                    </div>
                  </div>

                  {/* Hair Texture */}
                  <div className="flex flex-col gap-2">
                    <label className="font-label text-[0.6875rem] uppercase tracking-widest text-primary-dim ml-1">
                      Follicular Texture
                    </label>
                    <div className="relative">
                      <select
                        value={hairTexture}
                        onChange={(e) => setHairTexture(e.target.value)}
                        className="w-full bg-surface-low border-none p-4 text-sm focus:ring-1 focus:ring-on-surface transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Select Hair Type</option>
                        {HAIR_TEXTURES.map((h) => (
                          <option key={h.value} value={h.value}>{h.label}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary-dim">
                        texture
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-6 flex items-center justify-between gap-6 border-t border-surface">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="font-label text-[0.6875rem] uppercase tracking-widest text-primary-dim hover:text-on-surface transition-colors"
                  >
                    ← Back to identity
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="px-10 py-4 bg-on-surface text-background font-label text-[0.75rem] uppercase tracking-[0.15em] hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-3"
                  >
                    {creating ? 'Creating...' : 'Create & Initialize Era'}
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
