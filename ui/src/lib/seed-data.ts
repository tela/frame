import type { Character, CharacterWithEras, MediaItem } from './types'

const now = new Date().toISOString()

export const SEED_CHARACTERS: Character[] = [
  { id: 'seed-eleanor', name: 'Eleanor Vance', display_name: 'Eleanor', status: 'cast', created_at: now, updated_at: now },
  { id: 'seed-theo', name: 'Theodora Crain', display_name: 'Theo', status: 'cast', created_at: now, updated_at: now },
  { id: 'seed-luke', name: 'Luke Sanderson', display_name: 'Luke', status: 'development', created_at: now, updated_at: now },
  { id: 'seed-montague', name: 'Dr. John Montague', display_name: 'Montague', status: 'cast', created_at: now, updated_at: now },
  { id: 'seed-dudley', name: 'Mrs. Dudley', display_name: 'Dudley', status: 'scouted', created_at: now, updated_at: now },
]

export const SEED_CHARACTER_DETAILS: Record<string, CharacterWithEras> = {
  'seed-eleanor': {
    ...SEED_CHARACTERS[0],
    eras: [
      { id: 'seed-era-1', character_id: 'seed-eleanor', label: 'Young Adult', visual_description: 'Early 20s, dark wavy hair, sharp cheekbones, pale complexion, intense eyes', prompt_prefix: '', pipeline_settings: '{}', sort_order: 1, created_at: now, updated_at: now, image_count: 42, reference_package_ready: true },
      { id: 'seed-era-2', character_id: 'seed-eleanor', label: 'The Haunting', visual_description: 'Late 20s, haunted expression, disheveled hair, shadows under eyes', prompt_prefix: '', pipeline_settings: '{}', sort_order: 2, created_at: now, updated_at: now, image_count: 18, reference_package_ready: false },
      { id: 'seed-era-3', character_id: 'seed-eleanor', label: 'Aftermath', visual_description: 'Early 30s, composed but changed, shorter hair, quiet strength', prompt_prefix: '', pipeline_settings: '{}', sort_order: 3, created_at: now, updated_at: now, image_count: 7, reference_package_ready: false },
    ],
  },
  'seed-theo': {
    ...SEED_CHARACTERS[1],
    eras: [
      { id: 'seed-era-4', character_id: 'seed-theo', label: 'Bohemian', visual_description: 'Mid 20s, confident, colorful wardrobe, expressive face', prompt_prefix: '', pipeline_settings: '{}', sort_order: 1, created_at: now, updated_at: now, image_count: 31, reference_package_ready: true },
      { id: 'seed-era-5', character_id: 'seed-theo', label: 'Recluse', visual_description: 'Late 20s, withdrawn, muted tones, guarded posture', prompt_prefix: '', pipeline_settings: '{}', sort_order: 2, created_at: now, updated_at: now, image_count: 12, reference_package_ready: false },
    ],
  },
  'seed-montague': {
    ...SEED_CHARACTERS[3],
    eras: [
      { id: 'seed-era-6', character_id: 'seed-montague', label: 'Academic', visual_description: '50s, tweed, wire glasses, library settings, measured demeanor', prompt_prefix: '', pipeline_settings: '{}', sort_order: 1, created_at: now, updated_at: now, image_count: 22, reference_package_ready: true },
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
