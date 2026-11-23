import * as SecureStore from 'expo-secure-store'
import { createAgeGateLock } from './ageGateLock'

/** The age gate lock on iOS and Android, kept in SecureStore. */
export const ageGateLock = createAgeGateLock({
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
})
