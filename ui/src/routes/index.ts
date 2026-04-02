import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
} from '@tanstack/react-router'
import { RootLayout } from './root'
import { CharacterLibrary } from '@/components/character-library'
import { CharacterDetail } from '@/components/character-detail'
import { EraWorkspace } from '@/components/era-workspace'
import { TriageQueue } from '@/components/triage-queue'
import { Studio } from '@/components/studio'
import { MediaLibrary } from '@/components/media-library'
import { ImageSearch } from '@/components/image-search'
import { PromptTemplates } from '@/components/prompt-templates'
import { TagManager } from '@/components/tag-manager'
import { DatasetManager } from '@/components/dataset-manager'
import { DatasetDetail } from '@/components/dataset-detail'
import { ImportScreen } from '@/components/import-screen'
import { ImagePreprocessor } from '@/components/image-preprocessor'
import { ImageDetail } from '@/components/image-detail'
import { Wardrobe } from '@/components/wardrobe'
import { HairCatalog } from '@/components/hair-catalog'
import { ReferenceBuilder } from '@/components/reference-builder'

// Root
const rootRoute = createRootRoute({
  component: RootLayout,
})

// Index → redirect to characters
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/characters' })
  },
})

// Characters
const charactersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/characters',
  component: CharacterLibrary,
})

const characterDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/characters/$characterId',
  component: CharacterDetail,
})

// Era
const eraWorkspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/characters/$characterId/eras/$eraId',
  component: EraWorkspace,
  validateSearch: (search: Record<string, unknown>): { shoot?: string } => ({
    shoot: (search.shoot as string) || undefined,
  }),
})

const triageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/characters/$characterId/eras/$eraId/triage',
  component: TriageQueue,
})

const studioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/characters/$characterId/eras/$eraId/studio',
  component: Studio,
  validateSearch: (search: Record<string, unknown>) => ({
    source: (search.source as string) || undefined,
  }),
})

const refsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/characters/$characterId/eras/$eraId/refs',
  component: ReferenceBuilder,
})

// Media
const mediaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/media',
  component: MediaLibrary,
})

// Wardrobe
const wardrobeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wardrobe',
  component: Wardrobe,
})

// Hair
const hairRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hair',
  component: HairCatalog,
})

// Search
const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/search',
  component: ImageSearch,
})

// Templates
const templatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/templates',
  component: PromptTemplates,
})

// Tags
const tagsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tags',
  component: TagManager,
})

// Datasets
const datasetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/datasets',
  component: DatasetManager,
})

const datasetDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/datasets/$datasetId',
  component: DatasetDetail,
})

// Import
const importRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/import',
  component: ImportScreen,
})

// Preprocessor
const preprocessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/preprocess/$imageId',
  component: ImagePreprocessor,
})

// Image detail
const imageDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/images/$imageId',
  component: ImageDetail,
})

// Route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  charactersRoute,
  characterDetailRoute,
  eraWorkspaceRoute,
  triageRoute,
  studioRoute,
  refsRoute,
  mediaRoute,
  wardrobeRoute,
  hairRoute,
  searchRoute,
  templatesRoute,
  tagsRoute,
  datasetsRoute,
  datasetDetailRoute,
  importRoute,
  preprocessRoute,
  imageDetailRoute,
])

export const router = createRouter({ routeTree })

// Type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
