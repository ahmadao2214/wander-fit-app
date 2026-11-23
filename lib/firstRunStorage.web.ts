import { createDraftStore } from './firstRunDraft'

/** During a Google redirect, this tab keeps the plan the athlete chose.
 * Other tabs can keep editing the shared draft while the athlete signs in.
 */
export const firstRunDraft = createDraftStore({
  getItem: async (key) => window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key),
  setItem: async (key, value) => {
    const pending = window.sessionStorage.getItem(key)
    if (pending !== null) window.sessionStorage.setItem(key, value)
    if (pending === null || window.localStorage.getItem(key) === pending) {
      window.localStorage.setItem(key, value)
    }
  },
  removeItem: async (key) => {
    const pending = window.sessionStorage.getItem(key)
    if (pending === null || window.localStorage.getItem(key) === pending) {
      window.localStorage.removeItem(key)
    }
    window.sessionStorage.removeItem(key)
  },
})
