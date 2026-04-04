import { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useCreateCharacter, useIngestImage, useGenerate, useDeleteCharacterImage, thumbUrl } from '@/lib/api'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import type { Character } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
}

const FEMALE_NAMES = [
  // Classic / European
  'Celeste', 'Isolde', 'Vesper', 'Freya', 'Aurelie', 'Esme', 'Neve', 'Seraphina',
  'Ingrid', 'Aria', 'Lyra', 'Petra', 'Elowen', 'Ophelia', 'Cressida', 'Evangeline',
  'Genevieve', 'Isadora', 'Leontine', 'Margaux', 'Cosette', 'Vivienne', 'Odette',
  'Sabine', 'Astrid', 'Elara', 'Dahlia', 'Coralie', 'Lucienne', 'Mirabelle',
  'Theodora', 'Cassiopeia', 'Delphine', 'Fiora', 'Giselle', 'Helena', 'Juliette',
  // Modern / Unisex-leaning
  'Marlowe', 'Wren', 'Lark', 'Maren', 'Sutton', 'Briar', 'Sloane', 'Lennon',
  'Rowan', 'Sable', 'Tatum', 'Blaise', 'Remi', 'Zoey', 'Harlow', 'Piper',
  // East Asian
  'Mei', 'Yuna', 'Sakura', 'Hana', 'Suki', 'Rin', 'Kaede', 'Aiko', 'Mina',
  // South Asian
  'Priya', 'Ananya', 'Kavya', 'Zara', 'Meera', 'Devi', 'Nisha', 'Saanvi',
  // Latin / Mediterranean
  'Valentina', 'Catalina', 'Paloma', 'Marisol', 'Solana', 'Ximena', 'Camila', 'Lúcia',
  // African
  'Amara', 'Zuri', 'Nia', 'Ayo', 'Imani', 'Kaya', 'Adaeze', 'Makena',
  // Middle Eastern / North African
  'Layla', 'Yasmin', 'Soraya', 'Farah', 'Nadira', 'Amira', 'Samira', 'Leila',
  // Eastern European
  'Katya', 'Milena', 'Anya', 'Dagny', 'Ilona', 'Mila', 'Sasha', 'Natasha',
  // Nordic / Celtic
  'Sigrid', 'Eira', 'Saoirse', 'Niamh', 'Brigid', 'Runa', 'Thora', 'Solveig',
]

const MALE_NAMES = [
  'Elias', 'Soren', 'Caspian', 'Orion', 'Stellan', 'Dashiell', 'Theron', 'Lennox',
  'Callum', 'Rhys', 'Felix', 'Hugo', 'Silas', 'Jasper', 'Kael', 'Atticus',
  'Bastian', 'Cassian', 'Dorian', 'Emeric', 'Finnian', 'Gideon', 'Hadrian',
  'Idris', 'Julian', 'Kai', 'Leander', 'Milo', 'Nikolai', 'Oskar', 'Rafael',
  'Severin', 'Tobias', 'Valor', 'Xavier', 'Yves', 'Zephyr', 'Ronan', 'Tarquin',
  'Alaric', 'Dante', 'Lysander', 'Phineas', 'Theo', 'Arlo', 'Remy', 'Lucian',
]

const ALL_FIRST_NAMES = [...FEMALE_NAMES, ...MALE_NAMES]

const LAST_NAMES = [
  'Noir', 'Vance', 'Thorne', 'Ashford', 'Blackwell', 'Crane', 'Mercer', 'Sterling',
  'Volkov', 'Delacroix', 'Graves', 'Hartwell', 'Langley', 'Mortimer', 'Sinclair', 'Wren',
  'Beaumont', 'Castellano', 'Fairfax', 'Holloway', 'Kingsley', 'Navarro', 'Prescott', 'Ravenswood',
  'Sato', 'Thornberry', 'Whitmore', 'Yi', 'Zoltan', 'Okafor', 'Chen', 'Moreau',
]

const EYE_COLORS = ['Amber', 'Blue', 'Brown', 'Gray', 'Green', 'Hazel', 'Dark Brown', 'Black']

const ETHNICITIES = [
  'East Asian', 'Southeast Asian', 'South Asian', 'Central Asian',
  'Middle Eastern', 'North African', 'West African', 'East African', 'Southern African',
  'Northern European', 'Southern European', 'Eastern European', 'Western European',
  'Indigenous American', 'Latin American', 'Caribbean',
  'Pacific Islander', 'Aboriginal Australian',
  'Mixed / Multiracial',
]

const HAIR_TEXTURES = [
  { value: 'straight', label: 'Straight (Type 1)' },
  { value: 'wavy', label: 'Wavy (Type 2)' },
  { value: 'curly', label: 'Curly (Type 3)' },
  { value: 'coily', label: 'Coily (Type 4)' },
  { value: 'shaven', label: 'Alopecia / Shaven' },
]

const HAIR_COLORS = [
  'Black', 'Dark Brown', 'Medium Brown', 'Light Brown', 'Auburn',
  'Red', 'Strawberry Blonde', 'Blonde', 'Platinum Blonde', 'Gray', 'White',
]

const GENDERS = ['Female', 'Male', 'Non-Binary', 'Fluid'] as const

const ERA_PRESETS = [
  { label: 'Young Child', ageRange: '8-9' },
  { label: 'Older Child', ageRange: '10-11' },
  { label: 'Early Teen', ageRange: '12-13' },
  { label: 'Mid Teen', ageRange: '14-15' },
  { label: 'Teen', ageRange: '16-17' },
  { label: 'Late Teen', ageRange: '18-20' },
  { label: 'Young Adult', ageRange: '21-25' },
  { label: 'Early Prime', ageRange: '26-32' },
  { label: 'Late Prime', ageRange: '33-40' },
  { label: 'Midlife', ageRange: '41-50' },
  { label: 'Senior', ageRange: '51-65' },
  { label: 'Elder', ageRange: '66+' },
] as const

function randomFrom(arr: string[], used?: Set<string>): string {
  if (used) {
    const available = arr.filter(n => !used.has(n))
    if (available.length === 0) {
      used.clear()
      return arr[Math.floor(Math.random() * arr.length)]
    }
    const pick = available[Math.floor(Math.random() * available.length)]
    used.add(pick)
    return pick
  }
  return arr[Math.floor(Math.random() * arr.length)]
}

const usedFirstNames = new Set<string>()

function firstNamesForGender(gender: string): string[] {
  if (gender === 'Female') return FEMALE_NAMES
  if (gender === 'Male') return MALE_NAMES
  return ALL_FIRST_NAMES
}

type Step = 'identity' | 'physical' | 'firstlook'

interface HeadshotImage {
  imageId: string
  status: 'generating' | 'complete'
}

export function NewCharacterDialog({ open, onClose }: Props) {
  const navigate = useNavigate()
  const createCharacter = useCreateCharacter()
  const ingestImage = useIngestImage()
  const generate = useGenerate()
  const deleteImage = useDeleteCharacterImage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [step, setStep] = useState<Step>('identity')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [displayNameOverride, setDisplayNameOverride] = useState(false)
  const [gender, setGender] = useState('Female')
  const [selectedEra, setSelectedEra] = useState(6) // Default to "Late Teen" (18-20)
  const [hasRefImages, setHasRefImages] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [ethnicity, setEthnicity] = useState('')
  const [eyeColor, setEyeColor] = useState('')
  const [hairTexture, setHairTexture] = useState('')
  const [hairColor, setHairColor] = useState('')
  const [nameError, setNameError] = useState('')
  const [creating, setCreating] = useState(false)

  // Step 3: headshot generation state
  const [headshots, setHeadshots] = useState<HeadshotImage[]>([])
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [batchSize, setBatchSize] = useState(2)
  const [generating, setGenerating] = useState(false)
  const [createdCharacter, setCreatedCharacter] = useState<Character | null>(null)

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
  const autoDisplayName = firstName.trim() + (lastName.trim() ? ` ${lastName.trim()[0]}.` : '')
  const effectiveDisplayName = displayNameOverride ? displayName : autoDisplayName

  const totalSteps = hasRefImages ? 2 : 3

  const handleNext = () => {
    if (!firstName.trim()) {
      setNameError('First name is required')
      return
    }
    if (!gender) {
      setNameError('Gender is required')
      return
    }
    setNameError('')
    setStep('physical')
  }

  const buildPrompt = () => {
    const parts: string[] = []
    if (gender) parts.push(gender.toLowerCase())
    if (ethnicity) parts.push(ethnicity)
    parts.push('person')
    if (eyeColor) parts.push(`${eyeColor.toLowerCase()} eyes`)
    if (hairTexture && hairTexture !== 'shaven') parts.push(`${hairTexture} hair`)
    if (hairTexture === 'shaven') parts.push('shaved head')
    if (hairColor && hairTexture !== 'shaven') parts.push(`${hairColor.toLowerCase()} hair color`)
    parts.push('front-facing headshot, neutral expression, studio lighting, portrait')
    return parts.join(', ')
  }

  const ensureCharacter = async (): Promise<Character> => {
    if (createdCharacter) return createdCharacter
    const era = ERA_PRESETS[selectedEra]
    const c = await createCharacter.mutateAsync({
      name: fullName,
      display_name: effectiveDisplayName,
      status: 'prospect',
      gender: gender.toLowerCase(),
      ethnicity,
      eye_color: eyeColor.toLowerCase(),
      natural_hair_texture: hairTexture,
      natural_hair_color: hairColor.toLowerCase(),
      era_label: era.label,
      era_age_range: era.ageRange,
    })
    setCreatedCharacter(c)
    return c
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const character = await ensureCharacter()
      // Get the default era ID from the character
      const charData = character as Character & { eras?: Array<{ id: string }> }
      const eraId = charData.eras?.[0]?.id

      const placeholders: HeadshotImage[] = Array.from({ length: batchSize }, () => ({
        imageId: `pending-${Math.random().toString(36).slice(2)}`,
        status: 'generating' as const,
      }))
      setHeadshots(prev => [...prev, ...placeholders])

      const result = await generate.mutateAsync({
        character_id: character.id,
        era_id: eraId,
        prompt: buildPrompt(),
        width: 768,
        height: 1024,
        batch_size: batchSize,
        content_rating: 'sfw',
      })

      // Replace placeholders with real images
      setHeadshots(prev => {
        const updated = [...prev]
        let resultIdx = 0
        for (let i = 0; i < updated.length && resultIdx < result.images.length; i++) {
          if (updated[i].status === 'generating') {
            updated[i] = { imageId: result.images[resultIdx].image_id, status: 'complete' }
            resultIdx++
          }
        }
        return updated
      })
    } catch {
      // Remove placeholders on failure
      setHeadshots(prev => prev.filter(h => h.status !== 'generating'))
    } finally {
      setGenerating(false)
    }
  }

  const handleDeleteHeadshot = async (imageId: string) => {
    if (!createdCharacter) return
    setHeadshots(prev => prev.filter(h => h.imageId !== imageId))
    if (pickedId === imageId) setPickedId(null)
    try {
      await deleteImage.mutateAsync({ characterId: createdCharacter.id, imageId })
    } catch {
      // Image already removed from UI
    }
  }

  const handlePickHeadshot = (imageId: string) => {
    setPickedId(prev => prev === imageId ? null : imageId)
  }

  // Import path: create character with uploaded files
  const handleCreateImport = async () => {
    setCreating(true)
    try {
      const character = await ensureCharacter()
      const charData = character as Character & { eras?: Array<{ id: string }> }
      const eraId = charData.eras?.[0]?.id

      for (const file of files) {
        try {
          await ingestImage.mutateAsync({
            characterId: character.id,
            eraId,
            file,
            source: 'manual',
          })
        } catch {
          // Continue with remaining
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

  // Generate path: finalize with picked headshot as face ref
  const handleCreateGenerate = async () => {
    if (!createdCharacter || !pickedId) return
    setCreating(true)
    try {
      // Set picked image as face ref
      await fetch(`/api/v1/characters/${createdCharacter.id}/images/${pickedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref_type: 'face', ref_rank: 1 }),
      })

      // Delete unpicked images
      const unpicked = headshots.filter(h => h.status === 'complete' && h.imageId !== pickedId)
      await Promise.all(
        unpicked.map(h =>
          deleteImage.mutateAsync({ characterId: createdCharacter.id, imageId: h.imageId }).catch(() => {})
        )
      )

      resetForm()
      onClose()
      navigate({ to: '/characters/$characterId', params: { characterId: createdCharacter.id } })
    } catch {
      setNameError('Failed to finalize character')
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
    setGender('Female')
    setSelectedEra(0)
    usedFirstNames.clear()
    setHasRefImages(false)
    setFiles([])
    setEthnicity('')
    setEyeColor('')
    setHairTexture('')
    setHairColor('')
    setNameError('')
    setHeadshots([])
    setPickedId(null)
    setBatchSize(2)
    setGenerating(false)
    setCreatedCharacter(null)
  }

  const handleFiles = (newFiles: FileList | File[]) => {
    const imageFiles = Array.from(newFiles).filter(f =>
      f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024
    )
    setFiles(prev => [...prev, ...imageFiles])
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { resetForm(); onClose() } }}>
      <DialogContent className="bg-surface-lowest border-none shadow-[0_20px_40px_rgba(47,51,51,0.04)] max-w-4xl p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
        <VisuallyHidden><DialogTitle>Create New Character</DialogTitle></VisuallyHidden>
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
          {/* Left Column: Visual Context */}
          <div className="lg:col-span-5 relative hidden lg:block bg-surface-low border-r border-outline-variant/10">
            <div className="relative z-10 p-12 flex flex-col h-full">
              <div className="mb-auto">
                <h2 className="font-display italic text-3xl text-on-surface leading-tight mb-12">
                  Archetype Definition
                </h2>
                <div className="relative py-8 px-6 border border-outline-variant/20 bg-background">
                  <span className="absolute -top-3 left-4 bg-surface-low px-2 text-[10px] font-bold uppercase tracking-widest text-accent">
                    Mandate 01
                  </span>
                  <p className="font-display italic text-lg leading-relaxed text-primary-dim">
                    "The physical form is the first layer of the archive. It defines the era's interaction with the subject."
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="lg:col-span-7 p-8 md:p-12 flex flex-col">
            {/* Step Indicator */}
            <header className="mb-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex gap-1">
                  {Array.from({ length: totalSteps }, (_, i) => (
                    <div
                      key={i}
                      className={`w-16 h-1 ${
                        i <= (['identity', 'physical', 'firstlook'].indexOf(step))
                          ? 'bg-on-surface'
                          : 'bg-surface-high'
                      }`}
                    />
                  ))}
                </div>
                <span className="ml-4 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-dim">
                  {step === 'identity' && `Step 1 of ${totalSteps}`}
                  {step === 'physical' && `Step 2 of ${totalSteps}`}
                  {step === 'firstlook' && `Step 3 of ${totalSteps}`}
                </span>
              </div>
              <h1 className="font-display font-bold text-4xl tracking-display text-on-surface">
                {step === 'identity' && 'Initialize New Identity'}
                {step === 'physical' && 'Define Physical Attributes'}
                {step === 'firstlook' && 'First Look'}
              </h1>
              {step === 'firstlook' && (
                <p className="text-primary-dim text-sm mt-2">Generate headshots to find your character's face.</p>
              )}
            </header>

            {/* Step 1: Identity */}
            {step === 'identity' && (
              <div className="flex-1 space-y-8">
                {/* Name inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-primary-dim flex justify-between">
                      First Name <span className="text-accent">*</span>
                    </label>
                    <div className="relative">
                      <input
                        value={firstName}
                        onChange={(e) => { setFirstName(e.target.value); setNameError('') }}
                        className="w-full bg-transparent border-0 border-b border-outline-variant focus:ring-0 focus:border-on-surface p-0 pb-2 transition-all placeholder:text-muted/50 text-sm"
                        placeholder="e.g. Celeste"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setFirstName(randomFrom(firstNamesForGender(gender), usedFirstNames))}
                        className="absolute right-0 bottom-2 material-symbols-outlined text-muted/40 hover:text-primary text-[18px] transition-colors"
                        title="Generate random first name"
                      >
                        casino
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-primary-dim">
                      Last Name
                    </label>
                    <div className="relative">
                      <input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-transparent border-0 border-b border-outline-variant focus:ring-0 focus:border-on-surface p-0 pb-2 transition-all placeholder:text-muted/50 text-sm"
                        placeholder="Optional"
                      />
                      <button
                        type="button"
                        onClick={() => setLastName(randomFrom(LAST_NAMES))}
                        className="absolute right-0 bottom-2 material-symbols-outlined text-muted/40 hover:text-primary text-[18px] transition-colors"
                        title="Generate random last name"
                      >
                        casino
                      </button>
                    </div>
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary-dim">
                    Display Name (Auto-Computed)
                  </label>
                  <div className="p-3 bg-surface-low border border-outline-variant/20 text-xs font-mono text-primary-dim">
                    {effectiveDisplayName || 'PENDING_INPUT'}
                  </div>
                </div>

                {nameError && <span className="text-accent text-[11px]">{nameError}</span>}

                {/* Gender Selection */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary-dim">
                    Gender Selection <span className="text-accent">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {GENDERS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`py-3 px-1 border text-[11px] font-bold uppercase tracking-wider transition-colors ${
                          gender === g
                            ? 'border-on-surface bg-on-surface text-background'
                            : 'border-outline-variant text-on-surface hover:bg-surface-high'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Era Assignment */}
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary-dim">
                    Initial Era Assignment
                  </label>
                  
                  {/* Childhood Eras */}
                  <div className="space-y-2">
                    <span className="font-headline text-[11px] italic text-outline uppercase tracking-wider">Childhood Eras</span>
                    <div className="grid grid-cols-5 gap-2">
                      {ERA_PRESETS.slice(0, 5).map((era, i) => (
                        <button
                          key={era.label}
                          type="button"
                          onClick={() => setSelectedEra(i)}
                          className={`flex flex-col items-center justify-center p-2 border transition-colors ${
                            selectedEra === i
                              ? 'border-on-surface bg-on-surface text-background'
                              : 'border-outline-variant hover:bg-surface-high'
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-tighter">{era.label}</span>
                          <span className={`text-[9px] ${selectedEra === i ? 'opacity-70' : 'text-outline-variant'}`}>{era.ageRange}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Early Adulthood */}
                  <div className="space-y-2">
                    <span className="font-headline text-[11px] italic text-outline uppercase tracking-wider">Early Adulthood</span>
                    <div className="grid grid-cols-4 gap-2">
                      {ERA_PRESETS.slice(5, 9).map((era, i) => {
                        const actualIndex = i + 5
                        return (
                          <button
                            key={era.label}
                            type="button"
                            onClick={() => setSelectedEra(actualIndex)}
                            className={`flex flex-col items-center justify-center p-2 border transition-colors ${
                              selectedEra === actualIndex
                                ? 'border-on-surface bg-on-surface text-background'
                                : 'border-outline-variant hover:bg-surface-high'
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-tighter">{era.label}</span>
                            <span className={`text-[9px] ${selectedEra === actualIndex ? 'opacity-70' : 'text-outline-variant'}`}>{era.ageRange}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Later Years */}
                  <div className="space-y-2">
                    <span className="font-headline text-[11px] italic text-outline uppercase tracking-wider">Later Years</span>
                    <div className="grid grid-cols-3 gap-2">
                      {ERA_PRESETS.slice(9, 12).map((era, i) => {
                        const actualIndex = i + 9
                        return (
                          <button
                            key={era.label}
                            type="button"
                            onClick={() => setSelectedEra(actualIndex)}
                            className={`flex flex-col items-center justify-center p-2 border transition-colors ${
                              selectedEra === actualIndex
                                ? 'border-on-surface bg-on-surface text-background'
                                : 'border-outline-variant hover:bg-surface-high'
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-tighter">{era.label}</span>
                            <span className={`text-[9px] ${selectedEra === actualIndex ? 'opacity-70' : 'text-outline-variant'}`}>{era.ageRange}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Reference Images Checkbox */}
                <div className="flex items-center gap-3 pt-4">
                  <input
                    type="checkbox"
                    id="hasRefImages"
                    checked={hasRefImages}
                    onChange={(e) => setHasRefImages(e.target.checked)}
                    className="appearance-none w-4 h-4 border border-outline-variant checked:bg-on-surface checked:border-on-surface cursor-pointer rounded-none focus:ring-0"
                  />
                  <label htmlFor="hasRefImages" className="text-xs text-primary-dim cursor-pointer select-none">
                    I have reference images for this character
                  </label>
                </div>

                {/* Footer */}
                <div className="mt-16 pt-8 border-t border-outline-variant/20 flex justify-end items-center gap-8">
                  <button
                    onClick={() => { resetForm(); onClose() }}
                    className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-on-surface transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!firstName.trim() || !gender}
                    className="bg-on-surface text-background px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-4 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
                  >
                    Physical Profile <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Physical Profile */}
            {step === 'physical' && (
              <div className="flex-1 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  {/* Ancestral Origin */}
                  <div className="space-y-1.5">
                    <label className="text-[0.6875rem] font-label uppercase tracking-wider text-primary-dim font-semibold">
                      Ancestral Origin
                    </label>
                    <div className="relative group">
                      <select
                        value={ethnicity}
                        onChange={(e) => setEthnicity(e.target.value)}
                        className="w-full bg-surface-low border-none text-sm py-3 px-4 focus:ring-1 focus:ring-on-surface appearance-none cursor-pointer transition-colors group-hover:bg-surface"
                      >
                        <option value="">Select heritage</option>
                        {ETHNICITIES.map((e) => (
                          <option key={e} value={e}>{e}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-lg">
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Ocular Pigment */}
                  <div className="space-y-1.5">
                    <label className="text-[0.6875rem] font-label uppercase tracking-wider text-primary-dim font-semibold">
                      Ocular Pigment
                    </label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-lg">palette</span>
                      <select
                        value={eyeColor}
                        onChange={(e) => setEyeColor(e.target.value)}
                        className="w-full bg-surface-low border-none text-sm py-3 pl-10 pr-4 focus:ring-1 focus:ring-on-surface appearance-none cursor-pointer transition-colors group-hover:bg-surface"
                      >
                        <option value="">Select shade</option>
                        {EYE_COLORS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-lg">
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Follicular Texture */}
                  <div className="space-y-1.5">
                    <label className="text-[0.6875rem] font-label uppercase tracking-wider text-primary-dim font-semibold">
                      Follicular Texture
                    </label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-lg">texture</span>
                      <select
                        value={hairTexture}
                        onChange={(e) => setHairTexture(e.target.value)}
                        className="w-full bg-surface-low border-none text-sm py-3 pl-10 pr-4 focus:ring-1 focus:ring-on-surface appearance-none cursor-pointer transition-colors group-hover:bg-surface"
                      >
                        <option value="">Select texture</option>
                        {HAIR_TEXTURES.map((h) => (
                          <option key={h.value} value={h.value}>{h.label}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-lg">
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Natural Hair Color */}
                  <div className="space-y-1.5">
                    <label className="text-[0.6875rem] font-label uppercase tracking-wider text-primary-dim font-semibold">
                      Natural Hair Color
                    </label>
                    <div className="relative group">
                      <select
                        value={hairColor}
                        onChange={(e) => setHairColor(e.target.value)}
                        className="w-full bg-surface-low border-none text-sm py-3 px-4 focus:ring-1 focus:ring-on-surface appearance-none cursor-pointer transition-colors group-hover:bg-surface"
                      >
                        <option value="">Select tone</option>
                        {HAIR_COLORS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-lg">
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Image upload — import path only */}
                  {hasRefImages && (
                    <div className="sm:col-span-2 mt-4">
                      <label className="text-[0.6875rem] font-label uppercase tracking-wider text-primary-dim font-semibold mb-1.5 block">
                        Reference Images
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
                        className="border border-dashed border-outline-variant/50 bg-surface-lowest p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-surface-low hover:border-on-surface/30 transition-all group"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files) }}
                      >
                        {files.length === 0 ? (
                          <>
                            <span className="material-symbols-outlined text-4xl text-muted group-hover:text-primary mb-3">photo_library</span>
                            <p className="text-sm text-primary-dim font-medium">
                              Drag files or <span className="text-on-surface underline underline-offset-4 decoration-outline-variant/30">browse</span>
                            </p>
                            <p className="text-[0.6875rem] text-muted mt-1 font-label uppercase tracking-tight">Maximum size: 10MB</p>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-4xl text-primary mb-3">check_circle</span>
                            <p className="text-sm text-on-surface font-medium">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
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
                  )}
                </div>

                {/* Footer */}
                <div className="mt-12 pt-8 border-t border-surface-low flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep('identity')}
                    className="text-[0.6875rem] font-label uppercase tracking-widest text-primary-dim hover:text-on-surface transition-colors inline-flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Back to identity
                  </button>
                  {hasRefImages ? (
                    <button
                      onClick={handleCreateImport}
                      disabled={creating}
                      className="bg-on-surface text-background px-8 py-3.5 flex items-center gap-3 text-[0.6875rem] font-label uppercase tracking-[0.15em] font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
                    >
                      {creating ? 'Creating...' : 'Create & Initialize Era'}
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setStep('firstlook')}
                      className="bg-on-surface text-background px-8 py-3.5 flex items-center gap-3 text-[0.6875rem] font-label uppercase tracking-[0.15em] font-bold hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                      First Look
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: First Look */}
            {step === 'firstlook' && (
              <div className="flex-1 flex flex-col">
                {/* Prompt Preview */}
                <div className="bg-surface-low p-5 mb-8">
                  <p className="text-[0.8rem] leading-relaxed text-primary-dim font-label italic">
                    {buildPrompt()}
                  </p>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    {[1, 2, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setBatchSize(n)}
                        className={`px-4 py-1.5 text-xs font-label transition-colors ${
                          batchSize === n
                            ? 'bg-on-surface text-background'
                            : 'bg-surface-high text-on-surface hover:bg-surface-dim'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex items-center gap-2 bg-on-surface text-background px-6 py-2.5 text-xs tracking-widest uppercase font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    {generating ? 'Generating...' : 'Generate'}
                  </button>
                </div>

                {/* Headshot Grid */}
                <div className="flex-1 mb-8">
                  {headshots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <span className="material-symbols-outlined text-[48px] text-muted/30 mb-4">face_retouching_natural</span>
                      <p className="text-muted text-[15px]">Choose a batch size and generate to see headshots</p>
                    </div>
                  ) : (
                    <div className={`grid gap-6 ${headshots.length === 1 ? 'grid-cols-1 max-w-[280px] mx-auto' : 'grid-cols-2'}`}>
                      {headshots.map((h) => (
                        <div key={h.imageId} className="relative aspect-[3/4] group cursor-pointer overflow-hidden">
                          {h.status === 'generating' ? (
                            <div className="w-full h-full bg-surface-low flex items-center justify-center">
                              <span className="material-symbols-outlined text-2xl text-muted animate-spin">progress_activity</span>
                            </div>
                          ) : (
                            <>
                              <img
                                src={thumbUrl(h.imageId)}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                              {pickedId === h.imageId && (
                                <>
                                  <div className="absolute inset-0 ring-2 ring-on-surface ring-inset bg-on-surface/10" />
                                  <div className="absolute top-3 left-3 bg-on-surface text-background text-[0.6rem] px-2 py-0.5 tracking-tighter font-bold uppercase">
                                    PICK
                                  </div>
                                </>
                              )}
                              {/* Hover Actions */}
                              <div className="absolute inset-0 bg-on-surface/0 group-hover:bg-on-surface/20 transition-all duration-300" />
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handlePickHeadshot(h.imageId)}
                                  className="w-10 h-10 bg-white flex items-center justify-center rounded-full shadow-lg hover:scale-110 transition-transform"
                                  title="Select as pick"
                                >
                                  <span className="material-symbols-outlined text-on-surface" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteHeadshot(h.imageId)}
                                  className="w-10 h-10 bg-white flex items-center justify-center rounded-full shadow-lg hover:scale-110 transition-transform"
                                  title="Delete"
                                >
                                  <span className="material-symbols-outlined text-on-surface">close</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="pt-8 border-t border-surface-high flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep('physical')}
                    className="text-primary-dim text-xs font-label uppercase tracking-widest hover:text-on-surface transition-colors"
                  >
                    Back to profile
                  </button>
                  <button
                    onClick={handleCreateGenerate}
                    disabled={!pickedId || creating}
                    className="flex items-center gap-3 bg-on-surface text-background px-8 py-3.5 text-xs font-bold tracking-[0.2em] uppercase hover:opacity-95 transition-all disabled:opacity-40"
                  >
                    {creating ? 'Creating...' : 'Create Character'}
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
