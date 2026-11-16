import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { testDraft, Wrapper as wrapper } from '../../jest/firstRunTestUtils'
import { formatSeasonDate, revealProgram, seasonStartForWeeks, type CompleteFirstRunAnswers } from '../../lib/firstRun'
import { CATEGORY_HOLD_MS } from '../../lib/firstRunStory'

jest.mock('../../lib/firstRunStorage', () => ({
  get firstRunDraft() {
    return jest.requireActual('../../jest/firstRunTestUtils').testDraft.current
  },
}))

/** GPP week 1 for Power, Novice: the real names and minutes. */
const WEEK_ONE = [
  { day: 1, name: 'Lower Body A - Foundation', estimatedDurationMinutes: 28 },
  { day: 2, name: 'Upper Body A - Foundation', estimatedDurationMinutes: 28 },
  { day: 3, name: 'Power & Conditioning', estimatedDurationMinutes: 28 },
  { day: 4, name: 'Lower Body B - Foundation', estimatedDurationMinutes: 28 },
]
const mockWeekArgs: unknown[] = []
jest.mock('convex/react', () => ({
  useQuery: (fn: unknown, args: unknown) => {
    const name = jest.requireActual('convex/server').getFunctionName(fn)
    const utils = jest.requireActual('../../jest/firstRunTestUtils')
    if (name === 'sports:list') return utils.SPORTS
    if (name === 'programTemplates:getWeekOverview') {
      if (args === 'skip') return undefined
      mockWeekArgs.push(args)
      return WEEK_ONE
    }
    return undefined
  },
}))

let mockReduced: boolean | null = true
jest.mock('../../hooks/useReducedMotion', () => ({ useReducedMotion: () => mockReduced }))
jest.mock('react-native-reanimated', () => jest.requireActual('../../jest/reanimatedMock'))
jest.mock('lottie-react-native', () => {
  const { forwardRef } = jest.requireActual('react')
  const { View } = jest.requireActual('react-native')
  return forwardRef(() => <View />)
})
jest.mock('../../components/first-run/SavePlanSheet', () => ({
  SavePlanSheet: ({ open, nextLabel }: { open: boolean; nextLabel?: string }) => {
    const { Text } = jest.requireActual('react-native')
    return open ? <Text testID="sheet-open">{nextLabel}</Text> : null
  },
}))
jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => jest.requireActual('react').useEffect(cb, [cb]),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native')
    return <Text testID="redirect">{href}</Text>
  },
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

// eslint-disable-next-line import/first
import FirstRunReveal, { firstUnanswered } from '../(first-run)/reveal'

const answers: CompleteFirstRunAnswers = {
  sportId: 'basketball',
  seasonStart: seasonStartForWeeks(15, new Date()),
  trainingDays: [1, 3, 5],
  ageGroup: '14-17',
  years: 'new',
}

async function show() {
  render(<FirstRunReveal />, { wrapper })
  await act(async () => {})
}

beforeEach(async () => {
  testDraft.reset()
  mockReduced = true
  mockWeekArgs.length = 0
  await testDraft.seed({ answers })
})

describe('First Run reveal: category, then plan', () => {
  it('opens on the category: the sport trains for Power, with all four tiles', async () => {
    await show()
    expect(screen.getByTestId('reveal-category')).toBeTruthy()
    expect(screen.getByText('BASKETBALL TRAINS FOR')).toBeTruthy()
    expect(screen.getByTestId('reveal-category-name').props.children).toBe('POWER')
    for (const id of [1, 2, 3, 4]) expect(screen.getByTestId(`category-tile-${id}`)).toBeTruthy()
    expect(screen.getByTestId('category-tile-2').props.accessibilityLabel).toBe('Power, your category')
    expect(screen.getByText('Tap to see your plan')).toBeTruthy()
  })

  it('a tap skips to the plan', async () => {
    await show()
    await act(async () => {
      fireEvent.press(screen.getByTestId('reveal-category-page'))
    })
    expect(screen.getByTestId('reveal-plan')).toBeTruthy()
    expect(screen.queryByTestId('reveal-category')).toBeNull()
  })

  it('moves on to the plan by itself after the hold', async () => {
    jest.useFakeTimers()
    try {
      await show()
      await act(async () => {
        jest.advanceTimersByTime(CATEGORY_HOLD_MS + 900)
      })
      expect(screen.getByTestId('reveal-plan')).toBeTruthy()
    } finally {
      jest.useRealTimers()
    }
  })

  it('the plan shows the band, the plain-English phases, the week and the total', async () => {
    await show()
    await act(async () => {
      fireEvent.press(screen.getByTestId('reveal-category-page'))
    })
    const program = revealProgram(answers, new Date())
    expect(screen.getByTestId('reveal-title').props.children).toBe('BASKETBALL PLAN')
    expect(screen.getByTestId('reveal-countdown').props.children).toBe(
      `FIRST GAME ${formatSeasonDate(answers.seasonStart!).toUpperCase()} · 15 WEEKS`
    )
    expect(screen.getByText('Build the base')).toBeTruthy()
    expect(screen.getByText('Train for your sport')).toBeTruthy()
    expect(screen.getByText('Sharpen for the season')).toBeTruthy()
    expect(screen.getByTestId('reveal-sessions').props.accessibilityLabel).toBe(
      `${program.sessionCount} sessions over ${program.programWeeks} weeks`
    )
    // The real week 1 templates for the athlete's category and level.
    expect(mockWeekArgs[mockWeekArgs.length - 1]).toEqual({ gppCategoryId: 2, phase: 'GPP', skillLevel: 'Novice', week: 1 })
    expect(screen.getByTestId('week-day-line').props.children).toMatch(/^Day 1 · .+ · Lower Body A · About 28 min$/)
  })

  it('tapping a phase changes the caption; tapping a day changes the line', async () => {
    await show()
    await act(async () => {
      fireEvent.press(screen.getByTestId('reveal-category-page'))
    })
    expect(screen.getByTestId('phase-caption')).toHaveTextContent(/General fitness and how you move/)
    await act(async () => {
      fireEvent.press(screen.getByTestId('phase-SPP'))
    })
    expect(screen.getByTestId('phase-caption')).toHaveTextContent(/jumping, landing and stopping fast for basketball/)
    await act(async () => {
      fireEvent.press(screen.getByTestId('week-Tue'))
    })
    expect(screen.getByTestId('week-day-line').props.children).toBe('Tue · Rest day')
  })

  it('the POWER chip goes back to the category, and a tap returns to the plan', async () => {
    await show()
    await act(async () => {
      fireEvent.press(screen.getByTestId('reveal-category-page'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('reveal-category-chip'))
    })
    expect(screen.getByText('Tap to go back to your plan')).toBeTruthy()
    await act(async () => {
      fireEvent.press(screen.getByTestId('reveal-category-page'))
    })
    expect(screen.getByTestId('reveal-plan')).toBeTruthy()
  })

  it('the first story segment also returns to the category', async () => {
    await show()
    await act(async () => {
      fireEvent.press(screen.getByTestId('reveal-category-page'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('story-category'))
    })
    expect(screen.getByTestId('reveal-category')).toBeTruthy()
  })

  it('Save my plan opens the account sheet with Day 1’s day', async () => {
    await show()
    await act(async () => {
      fireEvent.press(screen.getByTestId('reveal-category-page'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('first-run-save'))
    })
    expect(screen.getByTestId('sheet-open').props.children).toMatch(/^(Today|Tomorrow|\w{3}, \w{3} \d+)$/)
  })

  it('waits for the Reduce Motion answer before starting', async () => {
    mockReduced = null
    await show()
    expect(screen.getByTestId('reveal-loading')).toBeTruthy()
  })

  it('sends an incomplete draft back to the first unanswered question', async () => {
    testDraft.reset()
    await testDraft.seed({ answers: { sportId: 'basketball' } })
    await show()
    expect(screen.getByTestId('redirect').props.children).toBe('/(first-run)/season')
  })
})

describe('firstUnanswered', () => {
  it('walks the questions in order', () => {
    expect(firstUnanswered({})).toBe('/(first-run)/sport')
    expect(firstUnanswered({ sportId: 's' })).toBe('/(first-run)/season')
    expect(firstUnanswered({ sportId: 's', seasonStart: null })).toBe('/(first-run)/days')
    expect(firstUnanswered({ sportId: 's', seasonStart: null, trainingDays: [1] })).toBe('/(first-run)/about')
  })
})
