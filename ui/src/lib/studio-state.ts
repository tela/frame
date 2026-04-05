// Global Studio state broadcaster.
// The Studio component publishes its state here.
// The stylist drawer reads it to inject into context.

import { useSyncExternalStore } from 'react'

export interface StudioState {
  prompt: string
  negativePrompt: string
  workflow: string
  job: string
  contentRating: string
}

let currentState: StudioState | null = null
let listeners: (() => void)[] = []

function notify() {
  for (const l of listeners) l()
}

export const studioState = {
  set(state: StudioState) {
    currentState = state
    notify()
  },
  clear() {
    currentState = null
    notify()
  },
  subscribe(listener: () => void) {
    listeners = [...listeners, listener]
    return () => { listeners = listeners.filter(l => l !== listener) }
  },
  getSnapshot() {
    return currentState
  },
}

export function useStudioState() {
  return useSyncExternalStore(studioState.subscribe, studioState.getSnapshot)
}
