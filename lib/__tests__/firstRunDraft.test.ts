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

  it('clear removes everything', async () => {
    const { storage, data } = memoryStorage()
    const store = createDraftStore(storage, () => 1000)
    await store.save({ answers: { sportId: 's1' }, lastStep: 'reveal' })
    await store.clear()
    expect(data.has(DRAFT_KEY)).toBe(false)
  })

  it('loads corrupt data as an empty draft', async () => {
    const { storage } = memoryStorage({ [DRAFT_KEY]: '{not json' })
    const draft = await createDraftStore(storage, () => 2000).load()
    expect(draft).toEqual({ answers: {}, lastStep: 'promise', firstLaunchAt: 2000 })
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
