/**
 * Shared pieces for First Run screen tests. Lives outside app/ so Expo
 * Router never treats it as a route.
 */
import React from 'react'
import { TamaguiProvider } from 'tamagui'
import config from '../tamagui.config'
import { createDraftStore, type DraftStorage, type DraftStore } from '../lib/firstRunDraft'

export const memory = new Map<string, string>()

export const memoryStorage: DraftStorage = {
  getItem: async (k) => memory.get(k) ?? null,
  setItem: async (k, v) => {
    memory.set(k, v)
  },
  removeItem: async (k) => {
    memory.delete(k)
  },
}

let store: DraftStore = createDraftStore(memoryStorage, () => 1000)

/** The store the mocked `lib/firstRunStorage` hands out. */
export const testDraft = {
  get current() {
    return store
  },
  reset() {
    memory.clear()
    store = createDraftStore(memoryStorage, () => 1000)
  },
  /** A fresh reader, as after a relaunch. */
  reopen() {
    return createDraftStore(memoryStorage).load()
  },
  /** Writes a draft as if an earlier session had. */
  seed(patch: Parameters<DraftStore['save']>[0]) {
    return createDraftStore(memoryStorage, () => 1000).save(patch)
  },
}

export const SPORTS = [
  { _id: 'basketball', name: 'Basketball', gppCategoryId: 2 },
  { _id: 'baseball', name: 'Baseball', gppCategoryId: 3 },
  { _id: 'soccer', name: 'Soccer', gppCategoryId: 1 },
  { _id: 'fitness', name: 'General Fitness', gppCategoryId: 4 },
]

export const CATEGORIES = [
  { categoryId: 1, shortName: 'Endurance' },
  { categoryId: 2, shortName: 'Power' },
  { categoryId: 3, shortName: 'Rotation' },
  { categoryId: 4, shortName: 'Strength' },
]

export function Wrapper({ children }: { children: React.ReactNode }) {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}
