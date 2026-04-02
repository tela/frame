import type { Character, CharacterWithEras, EraWithStats, MediaItem } from './types'

const now = new Date().toISOString()

const base = { folder_name: '', fig_published: false, fig_character_url: '', source: 'frame', gender: '', ethnicity: '', skin_tone: '', eye_color: '', eye_shape: '', natural_hair_color: '', natural_hair_texture: '', distinguishing_features: '' }

const figBase = { ...base, fig_published: true, fig_character_url: 'http://localhost:7700/casting/cast/seed-luke', source: 'frame' }

export const SEED_CHARACTERS: Character[] = [
  { ...base, id: 'seed-eleanor', name: 'Eleanor Vance', display_name: 'Eleanor', status: 'cast', created_at: now, updated_at: now },
  { ...base, id: 'seed-theo', name: 'Theodora Crain', display_name: 'Theo', status: 'cast', created_at: now, updated_at: now },
  { ...figBase, id: 'seed-luke', name: 'Luke Sanderson', display_name: 'Luke', status: 'development', created_at: now, updated_at: now },
  { ...base, id: 'seed-montague', name: 'Dr. John Montague', display_name: 'Montague', status: 'cast', created_at: now, updated_at: now },
  { ...base, id: 'seed-dudley', name: 'Mrs. Dudley', display_name: 'Dudley', status: 'prospect', created_at: now, updated_at: now },
  { ...base, id: 'seed-prospect', name: 'Alistair Thorne', display_name: 'Thorne', status: 'prospect', created_at: now, updated_at: now },
]

export const SEED_CHARACTER_DETAILS: Record<string, CharacterWithEras> = {
  'seed-eleanor': {
    ...SEED_CHARACTERS[0],
    eras: [
      { id: 'seed-era-1', character_id: 'seed-eleanor', label: 'Young Adult', age_range: '18-24', time_period: 'Present day', description: 'Before the haunting, idealistic and searching', visual_description: 'Early 20s, dark wavy hair, sharp cheekbones, pale complexion, intense eyes', prompt_prefix: '', pipeline_settings: '{}', sort_order: 1, created_at: now, updated_at: now, image_count: 42, reference_package_ready: true } as EraWithStats,
      { id: 'seed-era-2', character_id: 'seed-eleanor', label: 'The Haunting', age_range: '25-29', time_period: 'Present day', description: 'During the events at Hill House', visual_description: 'Late 20s, haunted expression, disheveled hair, shadows under eyes', prompt_prefix: '', pipeline_settings: '{}', sort_order: 2, created_at: now, updated_at: now, image_count: 18, reference_package_ready: false } as EraWithStats,
      { id: 'seed-era-3', character_id: 'seed-eleanor', label: 'Aftermath', age_range: 'Early 30s', time_period: 'Present day', description: 'Recovery and rebuilding after Hill House', visual_description: 'Early 30s, composed but changed, shorter hair, quiet strength', prompt_prefix: '', pipeline_settings: '{}', sort_order: 3, created_at: now, updated_at: now, image_count: 7, reference_package_ready: false } as EraWithStats,
    ],
  },
  'seed-theo': {
    ...SEED_CHARACTERS[1],
    eras: [
      { id: 'seed-era-4', character_id: 'seed-theo', label: 'Bohemian', age_range: 'Mid 20s', time_period: 'Present day', description: 'Free-spirited artist phase', visual_description: 'Mid 20s, confident, colorful wardrobe, expressive face', prompt_prefix: '', pipeline_settings: '{}', sort_order: 1, created_at: now, updated_at: now, image_count: 31, reference_package_ready: true } as EraWithStats,
      { id: 'seed-era-5', character_id: 'seed-theo', label: 'Recluse', age_range: 'Late 20s', time_period: 'Present day', description: 'Withdrawal after trauma', visual_description: 'Late 20s, withdrawn, muted tones, guarded posture', prompt_prefix: '', pipeline_settings: '{}', sort_order: 2, created_at: now, updated_at: now, image_count: 12, reference_package_ready: false } as EraWithStats,
    ],
  },
  'seed-montague': {
    ...SEED_CHARACTERS[3],
    eras: [
      { id: 'seed-era-6', character_id: 'seed-montague', label: 'Academic', age_range: '50s', time_period: '1960s', description: 'Professor of parapsychology at the height of his career', visual_description: '50s, tweed, wire glasses, library settings, measured demeanor', prompt_prefix: '', pipeline_settings: '{}', sort_order: 1, created_at: now, updated_at: now, image_count: 22, reference_package_ready: true } as EraWithStats,
    ],
  },
}

export const SEED_MEDIA: Record<string, MediaItem[]> = {
  wardrobe: [
    { id: 'seed-w1', content_type: 'wardrobe', name: 'Black Evening Dress', primary_image_id: null, created_at: now, updated_at: now },
    { id: 'seed-w2', content_type: 'wardrobe', name: 'White Linen Shirt', primary_image_id: null, created_at: now, updated_at: now },
    { id: 'seed-w3', content_type: 'wardrobe', name: 'Red Sundress', primary_image_id: null, created_at: now, updated_at: now },
  ],
  prop: [
    { id: 'seed-p1', content_type: 'prop', name: 'Leather Journal', primary_image_id: null, created_at: now, updated_at: now },
  ],
  location: [
    { id: 'seed-l1', content_type: 'location', name: 'Victorian Library', primary_image_id: null, created_at: now, updated_at: now },
    { id: 'seed-l2', content_type: 'location', name: 'Overgrown Garden', primary_image_id: null, created_at: now, updated_at: now },
  ],
}
