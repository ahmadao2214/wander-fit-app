/**
 * The First Run draft: intake answers kept on the device until the athlete
 * saves their plan. Holds the answers, the last step reached and the first
 * launch time. Platform storage is plugged in by `lib/firstRunStorage.ts`
 * (SecureStore) and `lib/firstRunStorage.web.ts` (localStorage), so this
 * file stays pure and testable.
 */
import type { FirstRunAnswers } from './firstRun'

export const FIRST_RUN_STEPS = ['promise', 'sport', 'season', 'days', 'about', 'reveal'] as const
export type FirstRunStep = (typeof FIRST_RUN_STEPS)[number]

export interface FirstRunDraft {
  answers: FirstRunAnswers
  lastStep: FirstRunStep
  /** Milliseconds since epoch. Set on the first load and never changed. */
  firstLaunchAt: number
}

/** The subset of a key-value store the draft needs. Any method may throw. */
export interface DraftStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

/** SecureStore keys allow only letters, digits, ".", "-" and "_". */
export const DRAFT_KEY = 'wanderfit.firstRunDraft.v1'

const AGE_GROUPS = ['14-17', '18-35', '36+']
const YEARS = ['new', '1-2', '3+']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Keeps only well-formed answers, so stale or tampered data can't leak in. */
function parseAnswers(raw: unknown): FirstRunAnswers {
  if (!raw || typeof raw !== 'object') return {}
  const r = raw as Record<string, unknown>
  const answers: FirstRunAnswers = {}
  if (typeof r.sportId === 'string' && r.sportId) answers.sportId = r.sportId
  if (r.seasonStart === null || (typeof r.seasonStart === 'string' && ISO_DATE.test(r.seasonStart))) {
    answers.seasonStart = r.seasonStart
  }
  if (Array.isArray(r.trainingDays) && r.trainingDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
    answers.trainingDays = r.trainingDays as number[]
  }
  if (typeof r.ageGroup === 'string' && AGE_GROUPS.includes(r.ageGroup)) {
    answers.ageGroup = r.ageGroup as FirstRunAnswers['ageGroup']
  }
  if (typeof r.years === 'string' && YEARS.includes(r.years)) {
    answers.years = r.years as FirstRunAnswers['years']
  }
  return answers
}

/** Returns null for anything that isn't a usable draft. */
export function parseDraft(json: string | null): FirstRunDraft | null {
  if (!json) return null
  try {
    const raw = JSON.parse(json) as Record<string, unknown>
    if (!raw || typeof raw !== 'object') return null
    if (typeof raw.firstLaunchAt !== 'number' || !Number.isFinite(raw.firstLaunchAt)) return null
    const lastStep = FIRST_RUN_STEPS.includes(raw.lastStep as FirstRunStep)
      ? (raw.lastStep as FirstRunStep)
      : 'promise'
    return { answers: parseAnswers(raw.answers), lastStep, firstLaunchAt: raw.firstLaunchAt }
  } catch {
    return null
  }
}

export interface DraftStore {
  /** Loads the draft, creating it (with `firstLaunchAt` = now) if there is none. */
  load(): Promise<FirstRunDraft>
  /** Merges answers and moves `lastStep`. `firstLaunchAt` can't be changed. */
  save(patch: { answers?: Partial<FirstRunAnswers>; lastStep?: FirstRunStep }): Promise<FirstRunDraft>
  /** Removes the draft, after the program is saved. */
  clear(): Promise<void>
  /** The draft as last loaded or saved, or null before the first load. */
  current(): FirstRunDraft | null
  /** Called after every load, save and clear. Returns an unsubscribe. */
  subscribe(listener: () => void): () => void
}

export function createDraftStore(storage: DraftStorage, now: () => number = Date.now): DraftStore {
  let cached: FirstRunDraft | null = null
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((listener) => listener())
  // Writes run one at a time so quick taps can't overwrite each other.
  let queue: Promise<unknown> = Promise.resolve()
  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task)
    queue = run.catch(() => undefined)
    return run
  }

  async function write(draft: FirstRunDraft) {
    cached = draft
    try {
      await storage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch (error) {
      // The draft is a convenience. The athlete can keep going without it.
      console.warn('First Run draft not saved:', error)
    }
  }

  async function read(): Promise<FirstRunDraft> {
    if (cached) return cached
    let stored: FirstRunDraft | null = null
    let readFailed = false
    try {
      stored = parseDraft(await storage.getItem(DRAFT_KEY))
    } catch (error) {
      readFailed = true
      console.warn('First Run draft not loaded:', error)
    }
    if (stored) {
      cached = stored
      return stored
    }
    const fresh: FirstRunDraft = { answers: {}, lastStep: 'promise', firstLaunchAt: now() }
    if (readFailed) {
      // Storage that failed to read may still hold the athlete's answers, so
      // don't write over it; the next answer saved will.
      cached = fresh
      return fresh
    }
    await write(fresh)
    return fresh
  }

  return {
    current: () => cached,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    load: () =>
      enqueue(async () => {
        const draft = await read()
        notify()
        return draft
      }),
    save: (patch) =>
      enqueue(async () => {
        const current = await read()
        const next: FirstRunDraft = {
          answers: { ...current.answers, ...patch.answers },
          lastStep: patch.lastStep ?? current.lastStep,
          firstLaunchAt: current.firstLaunchAt,
        }
        await write(next)
        notify()
        return next
      }),
    clear: () =>
      enqueue(async () => {
        cached = null
        try {
          await storage.removeItem(DRAFT_KEY)
        } catch (error) {
          console.warn('First Run draft not cleared:', error)
          // Don't let a later load bring the cleared answers back.
          await write({ answers: {}, lastStep: 'promise', firstLaunchAt: now() })
        }
        notify()
      }),
  }
}
