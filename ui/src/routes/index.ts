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
})

// Media
const mediaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/media',
  component: MediaLibrary,
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

// Route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  charactersRoute,
  characterDetailRoute,
  eraWorkspaceRoute,
  triageRoute,
  studioRoute,
  mediaRoute,
  searchRoute,
  templatesRoute,
  tagsRoute,
])

export const router = createRouter({ routeTree })

// Type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
