// Character
export type CharacterStatus = 'scouted' | 'development' | 'cast'

export interface Character {
  id: string
  name: string
  display_name: string
  status: CharacterStatus
  created_at: string
  updated_at: string
}

export interface EraWithStats {
  id: string
  character_id: string
  label: string
  visual_description: string
  prompt_prefix: string
  pipeline_settings: string
  sort_order: number
  created_at: string
  updated_at: string
  image_count: number
  reference_package_ready: boolean
}

export interface CharacterWithEras extends Character {
  eras: EraWithStats[]
}

export interface Era {
  id: string
  character_id: string
  label: string
  visual_description: string
  prompt_prefix: string
  pipeline_settings: string
  sort_order: number
  created_at: string
  updated_at: string
}

// Images
export type ImageSource = 'fig' | 'comfyui' | 'manual'
export type SetType = 'staging' | 'reference' | 'curated' | 'training' | 'archive'
export type TriageStatus = 'pending' | 'approved' | 'rejected' | 'archived'

export interface Image {
  id: string
  hash: string
  original_filename: string
  format: string
  width: number
  height: number
  file_size: number
  source: ImageSource
  ingested_at: string
}

export interface CharacterImage {
  image_id: string
  character_id: string
  era_id: string | null
  set_type: SetType
  triage_status: TriageStatus
  rating: number | null
  is_face_ref: boolean
  is_body_ref: boolean
  ref_score: number | null
  ref_rank: number | null
  created_at: string
}

export interface IngestResult {
  image_id: string
  hash: string
  width: number
  height: number
  format: string
  file_size: number
  is_duplicate: boolean
}

// Tags
export interface ImageTag {
  id: number
  image_id: string
  tag_namespace: string
  tag_value: string
  source: 'manual' | 'auto'
  created_at: string
}

// Media
export type MediaContentType = 'wardrobe' | 'prop' | 'location'

export interface MediaItem {
  id: string
  content_type: MediaContentType
  name: string
  primary_image_id: string | null
  created_at: string
  updated_at: string
}

export interface MediaItemImage {
  media_item_id: string
  image_id: string
  sort_order: number
  created_at: string
}

// Reference Package
export interface RefImage {
  image_id: string
  image_url: string
  score: number | null
  rank: number | null
}

export interface ReferencePackage {
  character_id: string
  era_id: string
  character_name: string
  era_label: string
  visual_description: string
  prompt_prefix: string
  face_refs: RefImage[]
  body_refs: RefImage[]
  pipeline_settings: string
}
