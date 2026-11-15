import * as SecureStore from 'expo-secure-store'
import { createDraftStore } from './firstRunDraft'

/** The First Run draft on iOS and Android, kept in SecureStore. */
export const firstRunDraft = createDraftStore({
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
})
