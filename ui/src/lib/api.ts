import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  Character,
  CharacterWithEras,
  Era,
  CharacterImage,
  MediaItem,
  MediaContentType,
  IngestResult,
  ReferencePackage,
  TagFamily,
  TagSummary,
  FamilyTaxonomy,
  TagNamespace,
  TagAllowedValue,
  SearchResults,
  Dataset,
  DatasetWithStats,
  DatasetImage,
} from './types'
import { SEED_CHARACTERS, SEED_CHARACTER_DETAILS, SEED_MEDIA } from './seed-data'

// ===== HTTP Helpers =====

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

async function patchJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

// ===== Characters =====

export function useCharacters() {
  return useQuery({
    queryKey: ['characters'],
    queryFn: async () => {
      const data = await fetchJSON<Character[]>('/api/v1/characters')
      return data.length > 0 ? data : SEED_CHARACTERS
    },
  })
}

export function useCharacter(id: string) {
  return useQuery({
    queryKey: ['characters', id],
    queryFn: async () => {
      if (id.startsWith('seed-')) {
        const seed = SEED_CHARACTER_DETAILS[id]
        if (seed) return seed
      }
      return fetchJSON<CharacterWithEras>(`/api/v1/characters/${id}`)
    },
    enabled: !!id,
  })
}

export function useUpdateCharacter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; display_name?: string; status?: string }) =>
      patchJSON<Character>(`/api/v1/characters/${id}`, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['characters'] })
      qc.invalidateQueries({ queryKey: ['characters', vars.id] })
    },
  })
}

// ===== Eras =====

export function useEras(characterId: string) {
  return useQuery({
    queryKey: ['characters', characterId, 'eras'],
    queryFn: () => fetchJSON<Era[]>(`/api/v1/characters/${characterId}/eras`),
    enabled: !!characterId,
  })
}

export function useCreateEra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ characterId, ...body }: { characterId: string; id: string; label: string; preliminary_description?: string; sort_order?: number }) =>
      postJSON<Era>(`/api/v1/characters/${characterId}/eras`, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['characters', vars.characterId] })
      qc.invalidateQueries({ queryKey: ['characters', vars.characterId, 'eras'] })
    },
  })
}

// ===== Image Search =====

export function useImageSearch(params: {
  character?: string
  era?: string
  tags?: string[]
  rating_min?: number
  source?: string
  set_type?: string
  triage_status?: string
  has_character?: boolean
  limit?: number
  offset?: number
}) {
  const queryString = new URLSearchParams()
  if (params.character) queryString.set('character', params.character)
  if (params.era) queryString.set('era', params.era)
  if (params.tags?.length) queryString.set('tags', params.tags.join(','))
  if (params.rating_min) queryString.set('rating_min', String(params.rating_min))
  if (params.source) queryString.set('source', params.source)
  if (params.set_type) queryString.set('set_type', params.set_type)
  if (params.triage_status) queryString.set('triage_status', params.triage_status)
  if (params.has_character !== undefined) queryString.set('has_character', String(params.has_character))
  if (params.limit) queryString.set('limit', String(params.limit))
  if (params.offset) queryString.set('offset', String(params.offset))

  return useQuery({
    queryKey: ['images', 'search', params],
    queryFn: () => fetchJSON<SearchResults>(`/api/v1/images/search?${queryString.toString()}`),
  })
}

// ===== Images =====

export function useCharacterImages(characterId: string, eraId?: string) {
  return useQuery({
    queryKey: ['characters', characterId, 'images', eraId],
    queryFn: () => {
      const params = eraId ? `?era_id=${eraId}` : ''
      return fetchJSON<CharacterImage[]>(`/api/v1/characters/${characterId}/images${params}`)
    },
    enabled: !!characterId,
  })
}

export function useUpdateCharacterImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ characterId, imageId, ...update }: {
      characterId: string
      imageId: string
      set_type?: string
      triage_status?: string
      rating?: number
      is_face_ref?: boolean
      is_body_ref?: boolean
      ref_score?: number
      ref_rank?: number
      era_id?: string
    }) => patchJSON<CharacterImage>(`/api/v1/characters/${characterId}/images/${imageId}`, update),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['characters', vars.characterId, 'images'] })
      qc.invalidateQueries({ queryKey: ['characters', vars.characterId] })
    },
  })
}

export function usePendingImages(characterId: string, eraId?: string) {
  return useQuery({
    queryKey: ['characters', characterId, 'images', 'pending', eraId],
    queryFn: () => {
      const params = eraId ? `?era_id=${eraId}` : ''
      return fetchJSON<CharacterImage[]>(`/api/v1/characters/${characterId}/images/pending${params}`)
    },
    enabled: !!characterId,
  })
}

export function useIngestImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ characterId, eraId, file, source }: {
      characterId: string
      eraId?: string
      file: File
      source?: string
    }) => {
      const formData = new FormData()
      formData.append('file', file)
      if (source) formData.append('source', source)

      const path = eraId
        ? `/api/v1/characters/${characterId}/eras/${eraId}/ingest`
        : `/api/v1/characters/${characterId}/images`

      return postFormData<IngestResult>(path, formData)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['characters'] })
    },
  })
}

// ===== Media =====

export function useMediaItems(type: MediaContentType) {
  return useQuery({
    queryKey: ['media', type],
    queryFn: async () => {
      const data = await fetchJSON<MediaItem[]>(`/api/v1/media/${type}`)
      return data.length > 0 ? data : (SEED_MEDIA[type] ?? [])
    },
  })
}

export function useMediaItem(type: MediaContentType, id: string) {
  return useQuery({
    queryKey: ['media', type, id],
    queryFn: () => fetchJSON<{ item: MediaItem; images: unknown[] }>(`/api/v1/media/${type}/${id}`),
    enabled: !!id,
  })
}

export function useCreateMediaItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, ...body }: { type: MediaContentType; id: string; name: string }) =>
      postJSON<MediaItem>(`/api/v1/media/${type}`, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['media', vars.type] })
    },
  })
}

// ===== Reference Packages =====

export function useReferencePackage(characterId: string, eraId: string) {
  return useQuery({
    queryKey: ['characters', characterId, 'eras', eraId, 'reference-package'],
    queryFn: () => fetchJSON<ReferencePackage>(`/api/v1/characters/${characterId}/eras/${eraId}/reference-package`),
    enabled: !!characterId && !!eraId,
  })
}

// ===== Generation (Bifrost) =====

export interface GenerateRequest {
  character_id: string
  era_id?: string
  prompt: string
  negative_prompt?: string
  style_prompt?: string
  width?: number
  height?: number
  steps?: number
  batch_size?: number
  seed?: number
  lora_adapter?: string
  lora_strength?: number
  content_rating?: string
  provider_name?: string
  include_refs?: boolean
  ref_image_ids?: string[]
}

export interface GenerateImageResult {
  image_id: string
  width: number
  height: number
  format: string
}

export interface GenerateResponse {
  job_id: string
  images: GenerateImageResult[]
}

export interface BifrostStatus {
  available: boolean
  reason?: string
  providers?: Array<{
    name: string
    tiers: string[]
    modalities: string[]
    tasks: string[]
    nsfw_safe: boolean
    state: string
    healthy: boolean
  }>
}

export function useGenerate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: GenerateRequest) =>
      postJSON<GenerateResponse>('/api/v1/generate', req),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['characters', vars.character_id] })
    },
  })
}

export function useBifrostStatus() {
  return useQuery({
    queryKey: ['bifrost', 'status'],
    queryFn: () => fetchJSON<BifrostStatus>('/api/v1/bifrost/status'),
    refetchInterval: 30_000, // poll every 30s
  })
}

// ===== Tag Families =====

export function useTagFamilies() {
  return useQuery({
    queryKey: ['tag-families'],
    queryFn: () => fetchJSON<TagFamily[]>('/api/v1/tag-families'),
  })
}

export function useTags(familyId?: string) {
  return useQuery({
    queryKey: ['tags', familyId],
    queryFn: () => {
      const params = familyId ? `?family=${familyId}` : ''
      return fetchJSON<TagSummary[]>(`/api/v1/tags${params}`)
    },
  })
}

export function useFamilyTaxonomy(familyId: string) {
  return useQuery({
    queryKey: ['tag-families', familyId, 'taxonomy'],
    queryFn: () => fetchJSON<FamilyTaxonomy>(`/api/v1/tag-families/${familyId}/taxonomy`),
    enabled: !!familyId,
  })
}

export function useCreateNamespace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ familyId, name, description }: { familyId: string; name: string; description?: string }) =>
      postJSON<TagNamespace>(`/api/v1/tag-families/${familyId}/namespaces`, { name, description }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tag-families', vars.familyId, 'taxonomy'] })
    },
  })
}

export function useCreateAllowedValue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ namespaceId, value, description }: { namespaceId: string; value: string; description?: string }) =>
      postJSON<TagAllowedValue>(`/api/v1/namespaces/${namespaceId}/values`, { value, description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tag-families'] })
    },
  })
}

export function useCreateTagFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; description?: string; color?: string }) =>
      postJSON<TagFamily>('/api/v1/tag-families', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tag-families'] }) },
  })
}

export function useBulkTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { image_ids: string[]; tag_namespace: string; tag_value: string; family_id?: string; action: 'add' | 'remove' }) =>
      postJSON<{ affected: number }>('/api/v1/images/bulk-tag', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }) },
  })
}

export function useRenameTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { namespace: string; old_value: string; new_value: string }) =>
      postJSON<{ affected: number }>('/api/v1/tags/rename', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }) },
  })
}

export function useMergeTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { namespace: string; from_value: string; to_value: string }) =>
      postJSON<{ affected: number }>('/api/v1/tags/merge', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }) },
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { namespace: string; value: string }) =>
      postJSON<{ affected: number }>('/api/v1/tags/delete', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }) },
  })
}

export function useImportDirectory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { path: string; character_id?: string; era_id?: string; source?: string; tags?: string[] }) =>
      postJSON<{ imported: number; skipped: number; failed: number; total: number; errors?: string[] }>('/api/v1/import/directory', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['characters'] })
    },
  })
}

// ===== Datasets =====

export function useDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: () => fetchJSON<DatasetWithStats[]>('/api/v1/datasets'),
  })
}

export function useDataset(id: string) {
  return useQuery({
    queryKey: ['datasets', id],
    queryFn: () => fetchJSON<{ dataset: Dataset; images: DatasetImage[] }>(`/api/v1/datasets/${id}`),
    enabled: !!id,
  })
}

export function useCreateDataset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; type?: string; description?: string; character_id?: string }) =>
      postJSON<Dataset>('/api/v1/datasets', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['datasets'] }) },
  })
}

export function useForkDataset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      postJSON<Dataset>(`/api/v1/datasets/${id}/fork`, { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['datasets'] }) },
  })
}

export function useAddDatasetImages() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ datasetId, imageIds }: { datasetId: string; imageIds: string[] }) =>
      postJSON<{ added: number }>(`/api/v1/datasets/${datasetId}/images`, { image_ids: imageIds }),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['datasets', vars.datasetId] }) },
  })
}

// ===== Image URLs =====

export function imageUrl(imageId: string) {
  return `/api/v1/images/${imageId}`
}

export function thumbUrl(imageId: string) {
  return `/api/v1/images/${imageId}/thumb`
}

export function avatarUrl(characterId: string) {
  return `/api/v1/characters/${characterId}/avatar`
}
