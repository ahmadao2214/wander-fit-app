/**
 * The age gate's lock: once a birth date falls under the minimum age, the
 * device keeps an opaque flag and the First Run age step stays closed, even
 * if a later answer would pass. The flag holds no age or date.
 *
 * Platform storage is plugged in by `lib/ageGateLockStorage.ts` (SecureStore)
 * and `lib/ageGateLockStorage.web.ts` (localStorage), so this file stays pure.
 */

/** SecureStore keys allow only letters, digits, ".", "-" and "_". */
export const AGE_GATE_LOCK_KEY = 'wanderfit.ageGateBlocked.v1'

/** The subset of a key-value store the lock needs. Either method may throw. */
export interface LockStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

export interface AgeGateLock {
  /** True once `lock` has run on this device. */
  isLocked(): Promise<boolean>
  lock(): Promise<void>
}

export function createAgeGateLock(storage: LockStorage): AgeGateLock {
  // Held in memory too, so a storage failure can't reopen the step this session.
  let locked = false
  return {
    async isLocked() {
      if (locked) return true
      try {
        locked = (await storage.getItem(AGE_GATE_LOCK_KEY)) !== null
      } catch (error) {
        console.warn('Age gate lock not read:', error)
      }
      return locked
    },
    async lock() {
      locked = true
      try {
        await storage.setItem(AGE_GATE_LOCK_KEY, '1')
      } catch (error) {
        console.warn('Age gate lock not saved:', error)
      }
    },
  }
}
