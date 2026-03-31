import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  Character,
  CharacterWithEras,
  Era,
  CharacterImage,
  Shoot,
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
import { SEED_CHARACTERS, SEED_MEDIA } from './seed-data'

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
    queryFn: () => fetchJSON<CharacterWithEras>(`/api/v1/characters/${id}`),
    enabled: !!id && !id.startsWith('seed-'),
  })
}

export function useCreateCharacter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; display_name?: string; status?: string }) =>
      postJSON<Character>('/api/v1/characters', {
        ...body,
        status: body.status || 'prospect',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['characters'] })
    },
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
    mutationFn: ({ characterId, ...body }: { characterId: string; id?: string; label: string; age_range?: string; time_period?: string; description?: string; preliminary_description?: string; sort_order?: number }) =>
      postJSON<Era>(`/api/v1/characters/${characterId}/eras`, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['characters', vars.characterId] })
      qc.invalidateQueries({ queryKey: ['characters', vars.characterId, 'eras'] })
    },
  })
}

// ===== Shoots =====

export function useShoots(characterId: string) {
  return useQuery({
    queryKey: ['characters', characterId, 'shoots'],
    queryFn: () => fetchJSON<Shoot[]>(`/api/v1/characters/${characterId}/shoots`),
    enabled: !!characterId,
  })
}

export function useCreateShoot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ characterId, name }: { characterId: string; name: string }) =>
      postJSON<Shoot>(`/api/v1/characters/${characterId}/shoots`, { name }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['characters', vars.characterId, 'shoots'] })
    },
  })
}

export function useShootImages(shootId: string) {
  return useQuery({
    queryKey: ['shoots', shootId, 'images'],
    queryFn: () => fetchJSON<string[]>(`/api/v1/shoots/${shootId}/images`),
    enabled: !!shootId,
  })
}

// ===== Favorites =====

export function useFavorites(characterId: string) {
  return useQuery({
    queryKey: ['characters', characterId, 'favorites'],
    queryFn: () => fetchJSON<CharacterImage[]>(`/api/v1/characters/${characterId}/favorites`),
    enabled: !!characterId,
  })
}

export function useToggleFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ characterId, imageId, favorited }: { characterId: string; imageId: string; favorited: boolean }) =>
      postJSON<{ favorited: boolean }>(`/api/v1/characters/${characterId}/images/${imageId}/favorite`, { favorited }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['characters', vars.characterId, 'favorites'] })
      qc.invalidateQueries({ queryKey: ['characters', vars.characterId, 'images'] })
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
      ref_type?: string | null
      ref_score?: number
      ref_rank?: number
      era_id?: string
    }) => patchJSON<CharacterImage>(`/api/v1/characters/${characterId}/images/${imageId}`, update),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['characters', vars.characterId, 'images'] })
      qc.invalidateQueries({ queryKey: ['characters', vars.characterId] })
      qc.invalidateQueries({ queryKey: ['characters', vars.characterId, 'eras'] })
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

      let path: string
      if (!characterId) {
        path = '/api/v1/images/ingest'
      } else if (eraId) {
        path = `/api/v1/characters/${characterId}/eras/${eraId}/ingest`
      } else {
        path = `/api/v1/characters/${characterId}/images`
      }

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
  tier?: string
  workflow?: string
  provider_name?: string
  include_refs?: boolean
  ref_image_ids?: string[]
  source_image_id?: string
  denoise_strength?: number
  pose_id?: string
  outfit_id?: string
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
  models?: Array<{
    id: string
    name: string
    modalities: string[]
    tasks: string[]
    tiers: string[]
    nsfw_safe: boolean
    content_policy?: Record<string, string>
  }>
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

// ===== Audit Log =====

export interface AuditEvent {
  id: string
  entity_type: string
  entity_id: string
  action: string
  field?: string
  old_value?: string
  new_value?: string
  context: Record<string, string>
  created_at: string
}

export function useAuditLog(entityType?: string, entityId?: string) {
  return useQuery({
    queryKey: ['audit', entityType, entityId],
    queryFn: () => {
      const params = new URLSearchParams()
      if (entityType) params.set('entity_type', entityType)
      if (entityId) params.set('entity_id', entityId)
      params.set('limit', '50')
      return fetchJSON<{ events: AuditEvent[]; total: number }>(`/api/v1/audit?${params.toString()}`)
    },
    enabled: !!(entityType || entityId),
  })
}

// ===== Prompt Templates =====

export interface PromptTemplate {
  id: string
  name: string
  prompt_body: string
  negative_prompt: string
  style_prompt: string
  parameters: string
  facet_tags: string
  usage_count: number
  created_at: string
  updated_at: string
}

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => fetchJSON<PromptTemplate[]>('/api/v1/templates'),
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; prompt_body?: string; negative_prompt?: string; style_prompt?: string; parameters?: string; facet_tags?: string }) =>
      postJSON<PromptTemplate>('/api/v1/templates', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }) },
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; prompt_body?: string; negative_prompt?: string }) =>
      patchJSON<{ status: string }>(`/api/v1/templates/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }) },
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      return fetch(`/api/v1/templates/${id}`, { method: 'DELETE' }).then(r => r.json())
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }) },
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

export function useUpdateTagFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; description?: string; color?: string; sort_order?: number }) =>
      patchJSON<{ status: string }>(`/api/v1/tag-families/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tag-families'] }) },
  })
}

export function useDeleteTagFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/v1/tag-families/${id}`, { method: 'DELETE' }).then(async (res) => {
        const data = await res.json().catch(() => ({ error: res.statusText }))
        if (!res.ok) throw new Error(data.error || res.statusText)
        return data
      }),
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

export function useBulkUpdateCharacterImages() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ characterId, imageIds, update }: {
      characterId: string
      imageIds: string[]
      update: {
        set_type?: string
        triage_status?: string
        rating?: number
        ref_type?: string | null
        ref_rank?: number
        era_id?: string
      }
    }) => {
      const res = fetch(`/api/v1/characters/${characterId}/images/bulk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_ids: imageIds, update }),
      })
      return res.then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || r.statusText)
        return data as { affected: number }
      })
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['characters', vars.characterId, 'images'] })
      qc.invalidateQueries({ queryKey: ['characters', vars.characterId] })
      qc.invalidateQueries({ queryKey: ['characters', vars.characterId, 'eras'] })
    },
  })
}

export function useBulkAddShootImages() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ shootId, imageIds }: { shootId: string; imageIds: string[] }) => {
      const res = fetch(`/api/v1/shoots/${shootId}/images/bulk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_ids: imageIds }),
      })
      return res.then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || r.statusText)
        return data as { added: number }
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shoots'] })
    },
  })
}

export function useCreateDatasetFromSearch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; description?: string; type?: string; search: Record<string, unknown> }) =>
      postJSON<{ dataset: Dataset; image_count: number }>('/api/v1/datasets/from-search', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['datasets'] }) },
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

// ===== Dataset Export =====

export interface ExportResult {
  dataset_id: string
  output_dir: string
  exported: number
  skipped: number
  errors: number
}

export function useExportDataset() {
  return useMutation({
    mutationFn: ({ datasetId, outputDir, format }: { datasetId: string; outputDir: string; format?: string }) =>
      postJSON<ExportResult>(`/api/v1/datasets/${datasetId}/export`, { output_dir: outputDir, format }),
  })
}

// ===== Preprocessing =====

export interface PreprocessResult {
  derivative_id: string
  image_id: string
  width: number
  height: number
  format: string
}

export interface PreprocessOperation {
  type: string
  params: Record<string, unknown>
}

export function useApplyPreprocess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { image_id: string; operations?: PreprocessOperation[]; preset_id?: string }) =>
      postJSON<PreprocessResult>('/api/v1/preprocess/apply', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['characters'] })
      qc.invalidateQueries({ queryKey: ['images'] })
    },
  })
}

// ===== LoRA Registry =====

export interface LoRA {
  id: string
  name: string
  filename: string
  source_url: string
  description: string
  category: string
  tags: string
  recommended_strength: number
  content_rating: string
  compatible_models: string
  created_at: string
  updated_at: string
}

export function useLoras(category?: string, contentRating?: string) {
  return useQuery({
    queryKey: ['loras', category, contentRating],
    queryFn: () => {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (contentRating) params.set('content_rating', contentRating)
      const qs = params.toString()
      return fetchJSON<LoRA[]>(`/api/v1/loras${qs ? '?' + qs : ''}`)
    },
  })
}

export function useCreateLora() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; filename: string; source_url?: string; description?: string; category?: string; tags?: string; recommended_strength?: number; content_rating?: string; compatible_models?: string }) =>
      postJSON<LoRA>('/api/v1/loras', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loras'] }) },
  })
}

export function useDeleteLora() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/v1/loras/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loras'] }) },
  })
}

// ===== Pose Set =====

export interface StandardPose {
  id: string
  name: string
  category: string
  framing: string
  content_rating: string
  prompt_hints: string
  sort_order: number
}

// ===== Go-See Looks =====

export interface Look {
  id: string
  character_id: string
  era_id: string
  name: string
  wardrobe_item_ids: string
  is_default: boolean
  created_at: string
}

export interface LookWithDetails extends Look {
  garment_count: number
  try_on_total: number
  try_on_complete: number
}

export function useLooks(characterId: string) {
  return useQuery({
    queryKey: ['looks', characterId],
    queryFn: () => fetchJSON<LookWithDetails[]>(`/api/v1/characters/${characterId}/looks`),
    enabled: !!characterId,
  })
}

export function useCreateLook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ characterId, ...body }: { characterId: string; name: string; era_id?: string; wardrobe_item_ids?: string[]; is_default?: boolean }) =>
      postJSON<Look>(`/api/v1/characters/${characterId}/looks`, body),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['looks', vars.characterId] }) },
  })
}

export function useUpdateLook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ lookId, ...body }: { lookId: string; name?: string; wardrobe_item_ids?: string[]; is_default?: boolean }) =>
      patchJSON<{ status: string }>(`/api/v1/looks/${lookId}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['looks'] }) },
  })
}

export function useDeleteLook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (lookId: string) =>
      fetch(`/api/v1/looks/${lookId}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['looks'] }) },
  })
}

export function useLookTryOn(lookId: string) {
  return useQuery({
    queryKey: ['looks', lookId, 'try-on'],
    queryFn: () => fetchJSON<{ look_id: string; images: string[] }>(`/api/v1/looks/${lookId}/try-on`),
    enabled: !!lookId,
  })
}

export function useGenerateLookTryOn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ lookId, prompt }: { lookId: string; prompt: string }) =>
      postJSON<{ image_id: string; width: number; height: number; format: string }>(`/api/v1/looks/${lookId}/generate`, { prompt }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['looks'] }) },
  })
}

// ===== Standard Poses & Outfits =====

export interface StandardOutfit {
  id: string
  name: string
  content_rating: string
  sort_order: number
}

export interface PoseSetEntry {
  pose_id: string
  pose_name: string
  category: string
  outfit_id: string
  status: string
  image_id: string | null
}

export interface PoseSetStatus {
  character_id: string
  era_id: string
  total: number
  generated: number
  accepted: number
  poses: PoseSetEntry[]
}

export function useStandardPoses() {
  return useQuery({
    queryKey: ['standard-poses'],
    queryFn: () => fetchJSON<StandardPose[]>('/api/v1/standard-poses'),
  })
}

export function useStandardOutfits() {
  return useQuery({
    queryKey: ['standard-outfits'],
    queryFn: () => fetchJSON<StandardOutfit[]>('/api/v1/standard-outfits'),
  })
}

export function usePoseSetStatus(characterId: string, eraId: string) {
  return useQuery({
    queryKey: ['pose-set', characterId, eraId],
    queryFn: () => fetchJSON<PoseSetStatus>(`/api/v1/characters/${characterId}/pose-set?era_id=${eraId}`),
    enabled: !!characterId && !!eraId,
  })
}

export function useUpdatePoseSetImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ characterId, ...body }: { characterId: string; era_id: string; pose_id: string; outfit_id: string; image_id?: string; status?: string }) =>
      postJSON<{ status: string }>(`/api/v1/characters/${characterId}/pose-set`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pose-set'] }) },
  })
}

// ===== Fig Integration =====

export interface FigStatus {
  available: boolean
  state?: string
  reason?: string
}

export function useFigStatus() {
  return useQuery({
    queryKey: ['fig', 'status'],
    queryFn: () => fetchJSON<FigStatus>('/api/v1/fig/status'),
    refetchInterval: 30_000,
  })
}

export function usePublishToFig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (characterId: string) =>
      postJSON<{ status: string }>(`/api/v1/characters/${characterId}/publish`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['characters'] })
    },
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

// ===== Wardrobe (Garments) =====

import type { Garment, GarmentDetail, GarmentFacets, Hairstyle, HairstyleDetail, HairstyleFacets, StylistSession, StylistSessionContext, StylistMessage } from './types'

export interface GarmentListParams {
  q?: string
  category?: string
  occasion_energy?: string
  era?: string
  aesthetic_cluster?: string
  dominant_signal?: string
  material?: string
  provenance?: string
  source_site?: string
  status?: string
  character?: string
  sort?: string
  order?: string
  limit?: number
  offset?: number
}

function garmentQueryString(params: GarmentListParams): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function useGarments(params: GarmentListParams = {}) {
  return useQuery({
    queryKey: ['garments', params],
    queryFn: () => fetchJSON<Garment[]>(`/api/v1/wardrobe${garmentQueryString(params)}`),
  })
}

export function useGarmentFacets(params: GarmentListParams = {}) {
  return useQuery({
    queryKey: ['garments', 'facets', params],
    queryFn: () => fetchJSON<GarmentFacets>(`/api/v1/wardrobe/facets${garmentQueryString(params)}`),
  })
}

export function useGarment(id: string) {
  return useQuery({
    queryKey: ['garments', id],
    queryFn: () => fetchJSON<GarmentDetail>(`/api/v1/wardrobe/${id}`),
    enabled: !!id,
  })
}

export function useCreateGarment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; category?: string; description?: string }) =>
      postJSON<Garment>('/api/v1/wardrobe', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['garments'] })
    },
  })
}

export function useUpdateGarment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<Garment>) =>
      patchJSON<Garment>(`/api/v1/wardrobe/${id}`, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['garments'] })
      qc.invalidateQueries({ queryKey: ['garments', vars.id] })
    },
  })
}

export function useDeleteGarment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/v1/wardrobe/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['garments'] })
    },
  })
}

export function useBulkUpdateGarmentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { ids: string[]; status: string }) =>
      fetch('/api/v1/wardrobe/bulk-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['garments'] })
    },
  })
}

export function useAddGarmentAffinity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ garmentId, characterId }: { garmentId: string; characterId: string }) =>
      postJSON<void>(`/api/v1/wardrobe/${garmentId}/affinity`, { character_id: characterId }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['garments', vars.garmentId] })
    },
  })
}

export function useRemoveGarmentAffinity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ garmentId, characterId }: { garmentId: string; characterId: string }) =>
      fetch(`/api/v1/wardrobe/${garmentId}/affinity/${characterId}`, { method: 'DELETE' }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['garments', vars.garmentId] })
    },
  })
}

export function useAddGarmentImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ garmentId, file }: { garmentId: string; file: File }) => {
      const fd = new FormData()
      fd.append('file', file)
      return postFormData<{ image_id: string }>(`/api/v1/wardrobe/${garmentId}/images`, fd)
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['garments', vars.garmentId] })
    },
  })
}

// ===== Hair =====

export interface HairListParams {
  q?: string
  length?: string
  texture?: string
  style?: string
  status?: string
  character?: string
  sort?: string
  order?: string
  limit?: number
  offset?: number
}

function hairQueryString(params: HairListParams): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function useHairstyles(params: HairListParams = {}) {
  return useQuery({
    queryKey: ['hairstyles', params],
    queryFn: () => fetchJSON<Hairstyle[]>(`/api/v1/hair${hairQueryString(params)}`),
  })
}

export function useHairstyleFacets(params: HairListParams = {}) {
  return useQuery({
    queryKey: ['hairstyles', 'facets', params],
    queryFn: () => fetchJSON<HairstyleFacets>(`/api/v1/hair/facets${hairQueryString(params)}`),
  })
}

export function useHairstyle(id: string) {
  return useQuery({
    queryKey: ['hairstyles', id],
    queryFn: () => fetchJSON<HairstyleDetail>(`/api/v1/hair/${id}`),
    enabled: !!id,
  })
}

export function useCreateHairstyle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; length?: string; texture?: string; style?: string; color?: string }) =>
      postJSON<Hairstyle>('/api/v1/hair', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hairstyles'] }) },
  })
}

export function useUpdateHairstyle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<Hairstyle>) =>
      patchJSON<Hairstyle>(`/api/v1/hair/${id}`, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['hairstyles'] })
      qc.invalidateQueries({ queryKey: ['hairstyles', vars.id] })
    },
  })
}

export function useDeleteHairstyle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/v1/hair/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hairstyles'] }) },
  })
}

export function useAddHairstyleImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ hairstyleId, file }: { hairstyleId: string; file: File }) => {
      const fd = new FormData()
      fd.append('file', file)
      return postFormData<{ image_id: string }>(`/api/v1/hair/${hairstyleId}/images`, fd)
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['hairstyles', vars.hairstyleId] })
    },
  })
}

export function useAddHairstyleAffinity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ hairstyleId, characterId }: { hairstyleId: string; characterId: string }) =>
      postJSON<void>(`/api/v1/hair/${hairstyleId}/affinity`, { character_id: characterId }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['hairstyles', vars.hairstyleId] })
    },
  })
}

export function useRemoveHairstyleAffinity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ hairstyleId, characterId }: { hairstyleId: string; characterId: string }) =>
      fetch(`/api/v1/hair/${hairstyleId}/affinity/${characterId}`, { method: 'DELETE' }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['hairstyles', vars.hairstyleId] })
    },
  })
}

export function useBulkUpdateHairstyleStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { ids: string[]; status: string }) =>
      fetch('/api/v1/hair/bulk-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hairstyles'] }) },
  })
}

// ===== Stylist =====

export function useStylistSessions() {
  return useQuery({
    queryKey: ['stylist', 'sessions'],
    queryFn: () => fetchJSON<StylistSession[]>('/api/v1/stylist/sessions'),
  })
}

export function useStylistSession(id: string | null) {
  return useQuery({
    queryKey: ['stylist', 'sessions', id],
    queryFn: () => fetchJSON<StylistSession>(`/api/v1/stylist/sessions/${id}`),
    enabled: !!id,
    refetchInterval: 3000,
  })
}

export function useActiveStylistSession() {
  return useQuery({
    queryKey: ['stylist', 'active'],
    queryFn: () => fetchJSON<StylistSession | null>('/api/v1/stylist/sessions/active'),
    refetchInterval: 5000,
  })
}

export function useStartStylistSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (context: StylistSessionContext) =>
      postJSON<StylistSession>('/api/v1/stylist/sessions', { context }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stylist'] })
    },
  })
}

export function useEndStylistSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/v1/stylist/sessions/${id}`, { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stylist'] })
    },
  })
}

export function useSendStylistMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, content }: { sessionId: string; content: string }) =>
      postJSON<StylistMessage>(`/api/v1/stylist/sessions/${sessionId}/messages`, { content }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['stylist', 'sessions', vars.sessionId] })
      qc.invalidateQueries({ queryKey: ['stylist', 'active'] })
    },
  })
}
