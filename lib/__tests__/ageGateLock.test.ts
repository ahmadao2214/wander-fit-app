import { AGE_GATE_LOCK_KEY, createAgeGateLock, type LockStorage } from '../ageGateLock'

function memoryStorage(
  map = new Map<string, string>()
): LockStorage & { map: Map<string, string> } {
  return {
    map,
    getItem: async (k) => map.get(k) ?? null,
    setItem: async (k, v) => {
      map.set(k, v)
    },
  }
}

describe('createAgeGateLock', () => {
  it('starts unlocked, and stays locked across a relaunch once locked', async () => {
    const storage = memoryStorage()
    const lock = createAgeGateLock(storage)
    expect(await lock.isLocked()).toBe(false)
    await lock.lock()
    expect(await lock.isLocked()).toBe(true)
    expect(await createAgeGateLock(storage).isLocked()).toBe(true)
  })

  it('stores an opaque flag under the versioned key, with no age or date', async () => {
    const storage = memoryStorage()
    await createAgeGateLock(storage).lock()
    expect([...storage.map.entries()]).toEqual([[AGE_GATE_LOCK_KEY, '1']])
    expect(AGE_GATE_LOCK_KEY).toBe('wanderfit.ageGateBlocked.v1')
  })

  it('stays locked for the session when storage fails to save', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    const lock = createAgeGateLock({
      getItem: async () => {
        throw new Error('locked keychain')
      },
      setItem: async () => {
        throw new Error('locked keychain')
      },
    })
    expect(await lock.isLocked()).toBe(false)
    await lock.lock()
    expect(await lock.isLocked()).toBe(true)
  })
})
