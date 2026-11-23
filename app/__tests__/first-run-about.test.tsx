import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { testDraft, Wrapper as wrapper } from '../../jest/firstRunTestUtils'

jest.mock('../../lib/firstRunStorage', () => ({
  get firstRunDraft() {
    return jest.requireActual('../../jest/firstRunTestUtils').testDraft.current
  },
}))
jest.mock('convex/react', () => ({
  useQuery: (fn: unknown) => {
    const name = jest.requireActual('convex/server').getFunctionName(fn)
    return name === 'sports:list'
      ? jest.requireActual('../../jest/firstRunTestUtils').SPORTS
      : undefined
  },
}))
const mockPush = jest.fn()
// The latest focus callback, so a test can leave the screen and come back.
let mockFocus: (() => void | (() => void)) | null = null
jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    mockFocus = cb
    jest.requireActual('react').useEffect(cb, [cb])
  },
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock('lottie-react-native', () => {
  const { View } = jest.requireActual('react-native')
  return () => <View />
})
jest.mock('react-native-reanimated', () => jest.requireActual('../../jest/reanimatedMock'))
// The age gate lock, on an in-memory store a test can reset or pre-set.
const mockLockStore = new Map<string, string>()
jest.mock('../../lib/ageGateLockStorage', () => {
  const { createAgeGateLock } = jest.requireActual('../../lib/ageGateLock')
  return {
    get ageGateLock() {
      return createAgeGateLock({
        getItem: async (k: string) => mockLockStore.get(k) ?? null,
        setItem: async (k: string, v: string) => {
          mockLockStore.set(k, v)
        },
      })
    },
  }
})
// Reduce Motion on by default: each step happens at once, with no timers.
let mockReduced = true
jest.mock('../../hooks/useReducedMotion', () => ({ useReducedMotion: () => mockReduced }))

// eslint-disable-next-line import/first
import FirstRunAbout, { firstQuestion } from '../(first-run)/about'
// eslint-disable-next-line import/first
import { memory } from '../../jest/firstRunTestUtils'
// eslint-disable-next-line import/first
import { AGE_GATE_LOCK_KEY } from '../../lib/ageGateLock'
// eslint-disable-next-line import/first
import { analytics } from '../../lib/analytics'

const BORN_QUESTION = 'When were you born?'
const thisYear = new Date().getFullYear()

async function showAbout() {
  render(<FirstRunAbout />, { wrapper })
  await act(async () => {})
}

/** Answers the birth question. January, so the age is `thisYear - year` whatever today is. */
async function enterBirth(month: number, year: number) {
  await act(async () => {
    fireEvent.press(screen.getByTestId(`birth-month-${month}`))
  })
  fireEvent.changeText(screen.getByTestId('birth-year'), String(year))
  await act(async () => {
    fireEvent.press(screen.getByTestId('birth-continue'))
  })
}

beforeEach(async () => {
  mockReduced = true
  testDraft.reset()
  mockLockStore.clear()
  mockPush.mockClear()
  await testDraft.seed({
    answers: { sportId: 'basketball', seasonStart: null, trainingDays: [1, 3, 5] },
  })
})

describe('First Run about you (player card)', () => {
  it('asks when the athlete was born first, with an empty card and Continue off', async () => {
    await showAbout()
    expect(screen.getByTestId('about-question').props.children).toBe(BORN_QUESTION)
    expect(screen.getByTestId('card-age').props.children).toBe('—')
    expect(screen.getByTestId('card-years').props.children).toBe('—')
    expect(screen.queryByTestId('first-run-continue')).toBeNull()
    expect(screen.getByTestId('birth-continue').props.accessibilityState).toEqual({
      disabled: true,
    })
  })

  it('names no minimum age on the birth question', async () => {
    await showAbout()
    expect(screen.queryByText(/\b1[34]\b|COPPA|minimum|must be|old enough/i)).toBeNull()
    expect(screen.queryByLabelText(/\b1[34]\b|COPPA|minimum/i)).toBeNull()
  })

  it('stamps only the derived age group, then the years question takes its place', async () => {
    const trackSpy = jest.spyOn(analytics, 'trackFirstRunStepAdvanced')
    await showAbout()
    await enterBirth(1, thisYear - 20)
    expect(screen.getByTestId('card-age').props.children).toBe('18–35')
    expect(screen.getByTestId('about-question').props.children).toBe(
      'YEARS TRAINING FOR YOUR SPORT'
    )
    expect(screen.queryByTestId('birth-year')).toBeNull()
    const saved = await testDraft.reopen()
    expect(saved.answers.ageGroup).toBe('18-35')
    // The month and year never reach the device draft.
    const stored = [...memory.values()].join('\n')
    expect(stored).not.toContain(String(thisYear - 20))
    expect(stored).not.toMatch(/birth|month/i)
    await act(async () => {
      fireEvent.press(screen.getByTestId('years-new'))
    })
    expect(trackSpy).toHaveBeenCalledWith({ step: 'about', step_index: 4, age_group: '18-35' })
    trackSpy.mockRestore()
  })

  it('the second answer completes the card and starts the reveal', async () => {
    await showAbout()
    await enterBirth(1, thisYear - 15)
    expect(screen.getByTestId('card-age').props.children).toBe('14–17')
    await act(async () => {
      fireEvent.press(screen.getByTestId('years-new'))
    })
    expect(screen.getByTestId('card-years').props.children).toBe('Novice')
    expect((await testDraft.reopen()).answers.years).toBe('new')
    expect(mockPush).toHaveBeenCalledWith('/(first-run)/reveal')
  })

  it('resumes on the years question when only the age is answered', async () => {
    await testDraft.seed({ answers: { ageGroup: '36+' } })
    await showAbout()
    expect(screen.getByTestId('about-question').props.children).toBe(
      'YEARS TRAINING FOR YOUR SPORT'
    )
    expect(screen.getByTestId('card-age').props.children).toBe('36+')
  })

  it('asks to check a year that cannot be a birth year, without closing the step', async () => {
    await showAbout()
    await enterBirth(1, thisYear + 1)
    expect(screen.getByTestId('birth-year-error').props.children).toBe('Check the year.')
    expect(mockLockStore.size).toBe(0)
    expect(screen.queryByTestId('age-gate-closed')).toBeNull()
  })
})

describe('First Run about you, under the minimum age', () => {
  it('shows a calm dead end with no way to retry, and locks the device', async () => {
    await showAbout()
    await enterBirth(1, thisYear - 13)
    expect(screen.getByTestId('age-gate-closed')).toBeTruthy()
    expect(screen.getByText("WanderFit isn't available for your age group yet.")).toBeTruthy()
    expect(screen.queryByText(/try again|go back|change|\d/i)).toBeNull()
    expect(screen.queryByTestId('birth-year')).toBeNull()
    expect(screen.queryByTestId('birth-continue')).toBeNull()
    expect(screen.queryByTestId('first-run-back')).toBeNull()
    expect([...mockLockStore.entries()]).toEqual([[AGE_GATE_LOCK_KEY, '1']])
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('drops an earlier age group from the draft', async () => {
    await testDraft.seed({ answers: { ageGroup: '18-35', years: 'new' } })
    await showAbout()
    await enterBirth(1, thisYear - 12)
    expect((await testDraft.reopen()).answers.ageGroup).toBeUndefined()
  })

  it('stays on the dead end once locked, even for a birth date that would pass', async () => {
    mockLockStore.set(AGE_GATE_LOCK_KEY, '1')
    await showAbout()
    expect(screen.getByTestId('age-gate-closed')).toBeTruthy()
    expect(screen.queryByTestId('birth-month-1')).toBeNull()
  })

  it('checks the lock again on Continue, so a lock set elsewhere holds', async () => {
    await showAbout()
    await act(async () => {
      fireEvent.press(screen.getByTestId('birth-month-1'))
    })
    fireEvent.changeText(screen.getByTestId('birth-year'), String(thisYear - 25))
    mockLockStore.set(AGE_GATE_LOCK_KEY, '1')
    await act(async () => {
      fireEvent.press(screen.getByTestId('birth-continue'))
    })
    expect(screen.getByTestId('age-gate-closed')).toBeTruthy()
    expect((await testDraft.reopen()).answers.ageGroup).toBeUndefined()
  })
})

describe('First Run about you, back from the reveal', () => {
  it('starts over at the birth question, so a finished card can still be corrected', async () => {
    await showAbout()
    await enterBirth(1, thisYear - 15)
    await act(async () => {
      fireEvent.press(screen.getByTestId('years-new'))
    })
    expect(mockPush).toHaveBeenCalledWith('/(first-run)/reveal')
    expect(screen.getByTestId('about-question').props.children).toBe(
      'YEARS TRAINING FOR YOUR SPORT'
    )
    // Leave for the reveal, then come back ("Change my answers").
    await act(async () => {
      const blur = mockFocus?.()
      if (typeof blur === 'function') blur()
      mockFocus?.()
    })
    expect(screen.getByTestId('about-question').props.children).toBe(BORN_QUESTION)
    await enterBirth(1, thisYear - 40)
    expect((await testDraft.reopen()).answers.ageGroup).toBe('36+')
  })
})

describe('First Run about you, with motion', () => {
  beforeEach(() => {
    mockReduced = false
    jest.useFakeTimers()
  })
  afterEach(() => jest.useRealTimers())

  it('keeps the years question up through the beat before the reveal, resuming an age-only draft', async () => {
    await testDraft.seed({ answers: { ageGroup: '36+' } })
    await showAbout()
    await act(async () => {
      fireEvent.press(screen.getByTestId('years-new'))
    })
    expect(screen.getByTestId('about-question').props.children).toBe(
      'YEARS TRAINING FOR YOUR SPORT'
    )
    expect(mockPush).not.toHaveBeenCalled()
    await act(async () => {
      jest.advanceTimersByTime(700)
    })
    expect(mockPush).toHaveBeenCalledWith('/(first-run)/reveal')
  })

  it('holds the birth question for its stamp beat before moving on', async () => {
    await showAbout()
    await enterBirth(1, thisYear - 20)
    expect(screen.getByTestId('about-question').props.children).toBe(BORN_QUESTION)
    await act(async () => {
      jest.advanceTimersByTime(400)
    })
    expect(screen.getByTestId('about-question').props.children).toBe(
      'YEARS TRAINING FOR YOUR SPORT'
    )
  })
})

describe('firstQuestion', () => {
  it('is age unless age is answered and years is not', () => {
    expect(firstQuestion({})).toBe('age')
    expect(firstQuestion({ ageGroup: '14-17' })).toBe('years')
    expect(firstQuestion({ ageGroup: '14-17', years: 'new' })).toBe('age')
  })
})
