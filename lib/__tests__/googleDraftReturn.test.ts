import { DRAFT_KEY, type FirstRunDraft } from '../firstRunDraft'

function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
}

it('restores the Google tab’s answers and leaves a competing draft available after save', async () => {
  const localStorage = storage()
  const sessionStorage = storage()
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage, sessionStorage },
  })
  try {
    const approved: FirstRunDraft = {
      firstLaunchAt: 1000,
      lastStep: 'reveal',
      answers: { sportId: 'basketball', trainingDays: [1, 3, 5] },
    }
    const competing = {
      ...approved,
      answers: { sportId: 'soccer', trainingDays: [2, 4] },
    }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(approved))
    localStorage.setItem(DRAFT_KEY, JSON.stringify(competing))
    const { firstRunDraft } =
      require('../firstRunStorage.web') as typeof import('../firstRunStorage.web')
    expect(await firstRunDraft.load()).toEqual(approved)
    await firstRunDraft.save({ lastStep: 'reveal' })
    expect(JSON.parse(localStorage.getItem(DRAFT_KEY)!)).toEqual(competing)
    await firstRunDraft.clear()
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull()
    expect(await firstRunDraft.load()).toEqual(competing)
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})
