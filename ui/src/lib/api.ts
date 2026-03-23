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
