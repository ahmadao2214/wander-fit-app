import { createDraftStore, DRAFT_KEY, parseDraft, type DraftStorage } from '../firstRunDraft'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  const storage: DraftStorage = {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value)
    },
    removeItem: async (key) => {
      data.delete(key)
    },
  }
  return { storage, data }
}

function brokenStorage(): DraftStorage {
  const fail = async () => {
    throw new Error('storage unavailable')
  }
  return { getItem: fail, setItem: fail, removeItem: fail }
}

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('createDraftStore', () => {
  it('creates an empty draft with firstLaunchAt on first load', async () => {
    const { storage, data } = memoryStorage()
    const draft = await createDraftStore(storage, () => 1000).load()
    expect(draft).toEqual({ answers: {}, lastStep: 'promise', firstLaunchAt: 1000 })
    expect(data.has(DRAFT_KEY)).toBe(true)
  })

  it('round-trips answers and the last step across app launches', async () => {
    const { storage } = memoryStorage()
    const first = createDraftStore(storage, () => 1000)
    await first.save({ answers: { sportId: 's1' }, lastStep: 'season' })
    await first.save({ answers: { seasonStart: null, trainingDays: [1, 3, 5] }, lastStep: 'days' })

    const reopened = await createDraftStore(storage, () => 9999).load()
    expect(reopened).toEqual({
      answers: { sportId: 's1', seasonStart: null, trainingDays: [1, 3, 5] },
      lastStep: 'days',
      firstLaunchAt: 1000,
    })
  })

  it('never changes firstLaunchAt once it is set', async () => {
    const { storage } = memoryStorage()
    let clock = 1000
    const store = createDraftStore(storage, () => clock)
    await store.load()
    clock = 5000
    const saved = await store.save({
      answers: { years: '3+' },
      // A caller can't smuggle a new time in through the patch.
      ...({ firstLaunchAt: 42 } as object),
    })
    expect(saved.firstLaunchAt).toBe(1000)
    expect((await createDraftStore(storage, () => clock).load()).firstLaunchAt).toBe(1000)
  })

  it('keeps every answer when saves arrive together', async () => {
    const { storage } = memoryStorage()
    const store = createDraftStore(storage, () => 1000)
    await Promise.all([
      store.save({ answers: { sportId: 's1' } }),
      store.save({ answers: { ageGroup: '18-35' } }),
      store.save({ answers: { years: 'new' }, lastStep: 'about' }),
    ])
    const reopened = await createDraftStore(storage).load()
    expect(reopened.answers).toEqual({ sportId: 's1', ageGroup: '18-35', years: 'new' })
    expect(reopened.lastStep).toBe('about')
  })

  it('shows a saved answer before slow storage finishes writing', async () => {
    const { storage, data } = memoryStorage()
    const store = createDraftStore(storage, () => 1000)
    await store.load()
    let finishWrite = () => {}
    storage.setItem = (key, value) =>
      new Promise<void>((resolve) => {
        finishWrite = () => {
          data.set(key, value)
          resolve()
        }
      })
    const seen: (number[] | undefined)[] = []
    store.subscribe(() => seen.push(store.current()?.answers.trainingDays))
    const saving = store.save({ answers: { trainingDays: [1, 3, 5, 6] } })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(seen).toEqual([[1, 3, 5, 6]])
    finishWrite()
    await saving
    expect(JSON.parse(data.get(DRAFT_KEY)!).answers.trainingDays).toEqual([1, 3, 5, 6])
  })

  it('clear removes everything', async () => {
    const { storage, data } = memoryStorage()
    const store = createDraftStore(storage, () => 1000)
    await store.save({ answers: { sportId: 's1' }, lastStep: 'reveal' })
    await store.clear()
    expect(data.has(DRAFT_KEY)).toBe(false)
  })

  it('keeps cleared answers gone when the delete fails', async () => {
    const { storage } = memoryStorage()
    const store = createDraftStore(
      {
        ...storage,
        removeItem: async () => {
          throw new Error('keychain busy')
        },
      },
      () => 1000
    )
    await store.save({ answers: { sportId: 's1' }, lastStep: 'reveal' })
    await store.clear()
    expect(await store.load()).toMatchObject({ answers: {}, lastStep: 'promise' })
    expect((await createDraftStore(storage).load()).answers).toEqual({})
  })

  it('tells subscribers about loads, saves and clears', async () => {
    const { storage } = memoryStorage()
    const store = createDraftStore(storage, () => 1000)
    const seen: (string | null)[] = []
    const unsubscribe = store.subscribe(() => seen.push(store.current()?.lastStep ?? null))
    expect(store.current()).toBeNull()
    await store.load()
    await store.save({ lastStep: 'sport' })
    await store.clear()
    unsubscribe()
    await store.load()
    expect(seen).toEqual(['promise', 'sport', null])
  })

  it('loads corrupt data as an empty draft', async () => {
    const { storage } = memoryStorage({ [DRAFT_KEY]: '{not json' })
    const draft = await createDraftStore(storage, () => 2000).load()
    expect(draft).toEqual({ answers: {}, lastStep: 'promise', firstLaunchAt: 2000 })
  })

  it('does not write over stored answers when a read fails', async () => {
    const { storage, data } = memoryStorage()
    await createDraftStore(storage, () => 1000).save({ answers: { sportId: 's1' }, lastStep: 'days' })
    const saved = data.get(DRAFT_KEY)
    const flaky: DraftStorage = {
      ...storage,
      getItem: async () => {
        throw new Error('keychain locked')
      },
    }
    const draft = await createDraftStore(flaky, () => 5000).load()
    expect(draft.answers).toEqual({})
    expect(data.get(DRAFT_KEY)).toBe(saved)
  })

  it('reads again after a failed read instead of saving an empty draft over it', async () => {
    const { storage, data } = memoryStorage()
    await createDraftStore(storage, () => 1000).save({ answers: { sportId: 's1' }, lastStep: 'days' })
    let failures = 1
    const flaky: DraftStorage = {
      ...storage,
      getItem: async (key) => {
        if (failures-- > 0) throw new Error('keychain locked')
        return storage.getItem(key)
      },
    }
    const store = createDraftStore(flaky, () => 5000)
    expect((await store.load()).answers).toEqual({})
    // The promise screen reaching its step on launch
    const saved = await store.save({ lastStep: 'promise' })
    expect(saved.answers).toEqual({ sportId: 's1' })
    expect(JSON.parse(data.get(DRAFT_KEY)!).answers).toEqual({ sportId: 's1' })
  })

  it('does not write over storage it still cannot read, then merges once it can', async () => {
    const { storage, data } = memoryStorage()
    await createDraftStore(storage, () => 1000).save({
      answers: { sportId: 's1', seasonStart: null, trainingDays: [1, 3, 5] },
      lastStep: 'about',
    })
    const saved = data.get(DRAFT_KEY)
    let failures = 3
    const flaky: DraftStorage = {
      ...storage,
      getItem: async (key) => {
        if (failures-- > 0) throw new Error('keychain locked')
        return storage.getItem(key)
      },
    }
    const store = createDraftStore(flaky, () => 5000)
    await store.load()
    await store.save({ lastStep: 'promise' })
    await store.save({ answers: { sportId: 's2' } })
    expect(data.get(DRAFT_KEY)).toBe(saved)

    await store.save({ answers: { ageGroup: '18-35' } })
    expect(JSON.parse(data.get(DRAFT_KEY)!)).toEqual({
      answers: { sportId: 's2', seasonStart: null, trainingDays: [1, 3, 5], ageGroup: '18-35' },
      lastStep: 'about',
      firstLaunchAt: 1000,
    })
  })

  it('falls back to an empty draft when storage fails', async () => {
    const store = createDraftStore(brokenStorage(), () => 3000)
    expect(await store.load()).toEqual({ answers: {}, lastStep: 'promise', firstLaunchAt: 3000 })
    const saved = await store.save({ answers: { sportId: 's1' } })
    expect(saved.answers).toEqual({ sportId: 's1' })
    await expect(store.clear()).resolves.toBeUndefined()
  })
})

describe('parseDraft', () => {
  it('drops answers that are not well formed', () => {
    const draft = parseDraft(
      JSON.stringify({
        firstLaunchAt: 1000,
        lastStep: 'nowhere',
        answers: {
          sportId: 's1',
          seasonStart: 'next spring',
          trainingDays: [1, 9],
          ageGroup: '10-13',
          years: '3+',
        },
      })
    )
    expect(draft).toEqual({ answers: { sportId: 's1', years: '3+' }, lastStep: 'promise', firstLaunchAt: 1000 })
  })

  it('keeps "No set season" and a real date', () => {
    expect(parseDraft(JSON.stringify({ firstLaunchAt: 1, answers: { seasonStart: null } }))?.answers).toEqual({
      seasonStart: null,
    })
    expect(
      parseDraft(JSON.stringify({ firstLaunchAt: 1, answers: { seasonStart: '2027-03-01' } }))?.answers
    ).toEqual({ seasonStart: '2027-03-01' })
  })

  it('rejects a draft with no first launch time', () => {
    expect(parseDraft(JSON.stringify({ answers: {} }))).toBeNull()
    expect(parseDraft('null')).toBeNull()
    expect(parseDraft(null)).toBeNull()
  })
})
