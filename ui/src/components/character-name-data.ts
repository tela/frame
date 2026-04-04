// Character name generation data for the new character dialog.
// Separated from the dialog component to reduce file size.

export const FEMALE_NAMES = [
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

export const MALE_NAMES = [
  'Elias', 'Soren', 'Caspian', 'Orion', 'Stellan', 'Dashiell', 'Theron', 'Lennox',
  'Callum', 'Rhys', 'Felix', 'Hugo', 'Silas', 'Jasper', 'Kael', 'Atticus',
  'Bastian', 'Cassian', 'Dorian', 'Emeric', 'Finnian', 'Gideon', 'Hadrian',
  'Idris', 'Julian', 'Kai', 'Leander', 'Milo', 'Nikolai', 'Oskar', 'Rafael',
  'Severin', 'Tobias', 'Valor', 'Xavier', 'Yves', 'Zephyr', 'Ronan', 'Tarquin',
  'Alaric', 'Dante', 'Lysander', 'Phineas', 'Theo', 'Arlo', 'Remy', 'Lucian',
]

export const ALL_FIRST_NAMES = [...FEMALE_NAMES, ...MALE_NAMES]

export const LAST_NAMES = [
  'Noir', 'Vance', 'Thorne', 'Ashford', 'Blackwell', 'Crane', 'Mercer', 'Sterling',
  'Volkov', 'Delacroix', 'Graves', 'Hartwell', 'Langley', 'Mortimer', 'Sinclair', 'Wren',
  'Beaumont', 'Castellano', 'Fairfax', 'Holloway', 'Kingsley', 'Navarro', 'Prescott', 'Ravenswood',
  'Sato', 'Thornberry', 'Whitmore', 'Yi', 'Zoltan', 'Okafor', 'Chen', 'Moreau',
]

export const EYE_COLORS = ['Amber', 'Blue', 'Brown', 'Gray', 'Green', 'Hazel', 'Dark Brown', 'Black']

export const ETHNICITIES = [
  'East Asian', 'Southeast Asian', 'South Asian', 'Central Asian',
  'Middle Eastern', 'North African', 'West African', 'East African', 'Southern African',
  'Northern European', 'Southern European', 'Eastern European', 'Western European',
  'Indigenous American', 'Latin American', 'Caribbean',
  'Pacific Islander', 'Aboriginal Australian',
  'Mixed / Multiracial',
]

export const HAIR_TEXTURES = [
  { value: 'straight', label: 'Straight (Type 1)' },
  { value: 'wavy', label: 'Wavy (Type 2)' },
  { value: 'curly', label: 'Curly (Type 3)' },
  { value: 'coily', label: 'Coily (Type 4)' },
  { value: 'shaven', label: 'Alopecia / Shaven' },
]

export const HAIR_COLORS = [
  'Black', 'Dark Brown', 'Medium Brown', 'Light Brown', 'Auburn',
  'Red', 'Strawberry Blonde', 'Blonde', 'Platinum Blonde', 'Gray', 'White',
]

export const GENDERS = ['Female', 'Male', 'Non-Binary', 'Fluid'] as const

export const ERA_PRESETS = [
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

export function firstNamesForGender(gender: string): string[] {
  const g = gender.toLowerCase()
  if (g === 'female') return FEMALE_NAMES
  if (g === 'male') return MALE_NAMES
  return ALL_FIRST_NAMES
}

const usedFirstNames = new Set<string>()

export function randomFrom(arr: string[], used?: Set<string>): string {
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

export function generateRandomName(gender: string): { first: string; last: string } {
  const firstNames = firstNamesForGender(gender)
  return {
    first: randomFrom(firstNames, usedFirstNames),
    last: randomFrom(LAST_NAMES),
  }
}
