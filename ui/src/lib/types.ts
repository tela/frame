// Character
export type CharacterStatus = 'prospect' | 'development' | 'cast'

export interface Character {
  id: string
  name: string
  display_name: string
  folder_name: string
  status: CharacterStatus
  fig_published: boolean
  fig_character_url: string
  source: string
  created_at: string
  updated_at: string
}

export interface Shoot {
  id: string
  character_id: string
  name: string
  sort_order: number
  created_at: string
  image_count: number
}

export interface EraWithStats {
  id: string
  character_id: string
  label: string
  age_range: string
  time_period: string
  description: string
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
  age_range: string
  time_period: string
  description: string
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

export type RefType = 'face' | 'body' | 'breasts' | 'vagina'

export interface CharacterImage {
  image_id: string
  character_id: string
  era_id: string | null
  set_type: SetType
  triage_status: TriageStatus
  rating: number | null
  ref_type: RefType | null
  ref_score: number | null
  ref_rank: number | null
  caption: string | null
  created_at: string
}

export interface SearchResult extends Image {
  character_id?: string
  character_name?: string
  era_id?: string
  era_label?: string
  set_type?: SetType
  triage_status?: TriageStatus
  rating?: number
  ref_type?: RefType | null
}

export interface SearchResults {
  images: SearchResult[]
  total: number
  limit: number
  offset: number
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

// Tag Taxonomy
export interface TagNamespace {
  id: string
  family_id: string
  name: string
  description: string
  ref_types: string | null
  sort_order: number
  created_at: string
}

export interface TagAllowedValue {
  id: string
  namespace_id: string
  value: string
  description: string
  sort_order: number
  created_at: string
}

export interface NamespaceWithValues extends TagNamespace {
  values: TagAllowedValue[]
}

export interface FamilyTaxonomy {
  family: TagFamily
  namespaces: NamespaceWithValues[]
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

// Tag Families
export interface TagFamily {
  id: string
  name: string
  description: string
  color: string
  sort_order: number
  created_at: string
}

export interface TagSummary {
  family_id: string | null
  tag_namespace: string
  tag_value: string
  count: number
}

// Datasets
export type DatasetType = 'lora' | 'ipadapter' | 'reference' | 'style' | 'general'

export interface Dataset {
  id: string
  name: string
  description: string
  type: DatasetType
  character_id: string | null
  era_id: string | null
  source_query: string
  export_config: string
  created_at: string
  updated_at: string
}

export interface DatasetWithStats extends Dataset {
  image_count: number
  included_count: number
}

export interface DatasetImage {
  dataset_id: string
  image_id: string
  sort_order: number
  caption: string | null
  included: boolean
  created_at: string
}

// Derivatives
export interface DerivativeOperation {
  type: string
  params: Record<string, unknown>
  timestamp: string
}

export interface Derivative {
  id: string
  source_image_id: string
  operations: DerivativeOperation[]
  created_at: string
}

export interface PreprocessPreset {
  id: string
  name: string
  operations: DerivativeOperation[]
  created_at: string
}

// Garments
export interface Garment {
  id: string
  name: string
  description: string
  category: string
  occasion_energy: string
  era: string
  aesthetic_cluster: string
  dominant_signal: string
  recessive_signal: string
  material: string
  color: string
  tags: string[]
  primary_image_id: string | null
  source: string
  provenance: string
  source_url: string
  source_site: string
  status: string
  created_at: string
  updated_at: string
  affinity_count?: number
}

export interface GarmentDetail {
  garment: Garment
  images: GarmentImage[]
  affinity: string[]
}

export interface GarmentImage {
  garment_id: string
  image_id: string
  sort_order: number
  created_at: string
}

export type FacetCounts = Record<string, number>

export interface GarmentFacets {
  category: FacetCounts
  occasion_energy: FacetCounts
  era: FacetCounts
  aesthetic_cluster: FacetCounts
  dominant_signal: FacetCounts
  material: FacetCounts
  provenance: FacetCounts
  source_site: FacetCounts
  status: FacetCounts
}

// Hairstyles
export interface Hairstyle {
  id: string
  name: string
  description: string
  length: string
  texture: string
  style: string
  color: string
  tags: string[]
  primary_image_id: string | null
  source: string
  provenance: string
  source_url: string
  source_site: string
  status: string
  created_at: string
  updated_at: string
  affinity_count?: number
}

export interface HairstyleDetail {
  hairstyle: Hairstyle
  images: HairstyleImage[]
  affinity: string[]
}

export interface HairstyleImage {
  hairstyle_id: string
  image_id: string
  sort_order: number
  created_at: string
}

export interface HairstyleFacets {
  length: FacetCounts
  texture: FacetCounts
  style: FacetCounts
  status: FacetCounts
}

// Stylist Sessions
export interface StylistSessionContext {
  screen?: string
  character_id?: string
  era_id?: string
}

export interface StylistMessage {
  id: string
  role: 'user' | 'stylist'
  content: string
  images?: StylistMessageImage[]
  tool_activity?: string
  sent_at: string
}

export interface StylistMessageImage {
  id: string
  thumb_url: string
  full_url: string
}

export interface StylistSession {
  id: string
  context: StylistSessionContext
  messages: StylistMessage[] | null
  started_at: string
  ended_at: string | null
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
  breasts_refs: RefImage[]
  vagina_refs: RefImage[]
  pipeline_settings: string
}
