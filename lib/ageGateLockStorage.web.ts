import { createAgeGateLock } from './ageGateLock'

/** The age gate lock on web, kept in localStorage. */
export const ageGateLock = createAgeGateLock({
  getItem: async (key) => window.localStorage.getItem(key),
  setItem: async (key, value) => window.localStorage.setItem(key, value),
})
