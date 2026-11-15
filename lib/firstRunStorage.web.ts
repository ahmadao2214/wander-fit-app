import { createDraftStore } from './firstRunDraft'

/**
 * The First Run draft on web, kept in localStorage. Private windows and
 * blocked storage throw; the store treats that as an empty draft.
 */
export const firstRunDraft = createDraftStore({
  getItem: async (key) => window.localStorage.getItem(key),
  setItem: async (key, value) => window.localStorage.setItem(key, value),
  removeItem: async (key) => window.localStorage.removeItem(key),
})
