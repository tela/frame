import {
  createRouter,
  createRoute,
  createRootRoute,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router'
import { RootLayout } from './root'
// Eagerly load the landing page
import { CharacterLibrary } from '@/components/character-library'

// Everything else is lazy-loaded — only fetched when the route is visited

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
  component: lazyRouteComponent(() => import('@/components/character-detail'), 'CharacterDetail'),
})

// Era
const eraWorkspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/characters/$characterId/eras/$eraId',
  component: lazyRouteComponent(() => import('@/components/era-workspace'), 'EraWorkspace'),
  validateSearch: (search: Record<string, unknown>): { shoot?: string } => ({
    shoot: (search.shoot as string) || undefined,
  }),
})

const triageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/characters/$characterId/eras/$eraId/triage',
  component: lazyRouteComponent(() => import('@/components/triage-queue'), 'TriageQueue'),
})

const studioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/characters/$characterId/eras/$eraId/studio',
  component: lazyRouteComponent(() => import('@/components/studio'), 'Studio'),
  validateSearch: (search: Record<string, unknown>): { intent?: string; source?: string } => ({
    intent: (search.intent as string) || undefined,
    source: (search.source as string) || undefined,
  }),
})

const refsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/characters/$characterId/eras/$eraId/refs',
  component: lazyRouteComponent(() => import('@/components/reference-builder'), 'ReferenceBuilder'),
})

const captionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/characters/$characterId/eras/$eraId/captions',
  component: lazyRouteComponent(() => import('@/components/captioning'), 'Captioning'),
})

// Media
const mediaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/media',
  component: lazyRouteComponent(() => import('@/components/media-library'), 'MediaLibrary'),
})

// Wardrobe
const wardrobeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wardrobe',
  component: lazyRouteComponent(() => import('@/components/wardrobe'), 'Wardrobe'),
})

// Hair
const hairRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hair',
  component: lazyRouteComponent(() => import('@/components/hair-catalog'), 'HairCatalog'),
})

// Search
const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/search',
  component: lazyRouteComponent(() => import('@/components/image-search'), 'ImageSearch'),
})

// Templates
const templatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/templates',
  component: lazyRouteComponent(() => import('@/components/prompt-templates'), 'PromptTemplates'),
})

// Tags
const tagsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tags',
  component: lazyRouteComponent(() => import('@/components/tag-manager'), 'TagManager'),
})

// Datasets
const datasetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/datasets',
  component: lazyRouteComponent(() => import('@/components/dataset-manager'), 'DatasetManager'),
})

const datasetDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/datasets/$datasetId',
  component: lazyRouteComponent(() => import('@/components/dataset-detail'), 'DatasetDetail'),
})

// Audit
const auditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/audit',
  component: lazyRouteComponent(() => import('@/components/audit-trail'), 'AuditTrail'),
})

// Import
const importRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/import',
  component: lazyRouteComponent(() => import('@/components/import-screen'), 'ImportScreen'),
})

// Preprocessor
const preprocessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/preprocess/$imageId',
  component: lazyRouteComponent(() => import('@/components/image-preprocessor'), 'ImagePreprocessor'),
})

// Image detail
const imageDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/images/$imageId',
  component: lazyRouteComponent(() => import('@/components/image-detail'), 'ImageDetail'),
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
  captionsRoute,
  mediaRoute,
  wardrobeRoute,
  hairRoute,
  searchRoute,
  templatesRoute,
  tagsRoute,
  datasetsRoute,
  datasetDetailRoute,
  auditRoute,
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
