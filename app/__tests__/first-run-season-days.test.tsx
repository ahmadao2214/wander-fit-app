import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { testDraft, Wrapper as wrapper } from '../../jest/firstRunTestUtils'
import { seasonStartForWeeks, weeksUntilSeason } from '../../lib/firstRun'

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
jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => jest.requireActual('react').useEffect(cb, [cb]),
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock('lottie-react-native', () => {
  const { View } = jest.requireActual('react-native')
  return () => <View testID="lottie" />
})
jest.mock('react-native-reanimated', () => jest.requireActual('../../jest/reanimatedMock'))
jest.mock('../../hooks/useReducedMotion', () => ({ useReducedMotion: () => true }))

// eslint-disable-next-line import/first
import FirstRunSeason, { monthBounds } from '../(first-run)/season'
// eslint-disable-next-line import/first
import FirstRunDays, { toggleDay } from '../(first-run)/days'

async function show(ui: React.ReactElement) {
  render(ui, { wrapper })
  await act(async () => {})
}

beforeEach(() => {
  testDraft.reset()
  mockPush.mockClear()
})

describe('First Run season (calendar)', () => {
  it('starts on the 12-week date and stores it on Continue', async () => {
    await show(<FirstRunSeason />)
    expect(screen.getByTestId('season-weeks').props.children).toBe(12)
    const iso = seasonStartForWeeks(12, new Date())
    expect(screen.getByTestId(`season-day-${iso}`).props.accessibilityState.selected).toBe(true)
    await act(async () => {
      fireEvent.press(screen.getByTestId('first-run-continue'))
    })
    expect((await testDraft.reopen()).answers.seasonStart).toBe(iso)
    expect(mockPush).toHaveBeenCalledWith('/(first-run)/days')
  })

  it('tapping a date sets the first game and shows the weeks away', async () => {
    await show(<FirstRunSeason />)
    const iso = seasonStartForWeeks(12, new Date())
    // A date a week later in the same visible month, or the week before.
    const [y, m, d] = iso.split('-').map(Number)
    const other = new Date(y, m - 1, d > 21 ? d - 7 : d + 7)
    const otherIso = `${other.getFullYear()}-${String(other.getMonth() + 1).padStart(2, '0')}-${String(other.getDate()).padStart(2, '0')}`
    await act(async () => {
      fireEvent.press(screen.getByTestId(`season-day-${otherIso}`))
    })
    expect((await testDraft.reopen()).answers.seasonStart).toBe(otherIso)
    expect(screen.getByTestId('season-weeks').props.children).toBe(
      weeksUntilSeason(otherIso, new Date())
    )
  })

  it('past days and today are disabled', async () => {
    await show(<FirstRunSeason />)
    // Go back to this month.
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        fireEvent.press(screen.getByTestId('season-prev-month'))
      })
    }
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    expect(screen.getByTestId(`season-day-${today}`).props.accessibilityState.disabled).toBe(true)
    expect(screen.getByTestId('season-prev-month').props.accessibilityState?.disabled ?? true).toBe(
      true
    )
  })

  it('No set season stores null, and tapping it again brings the date back', async () => {
    await show(<FirstRunSeason />)
    await act(async () => {
      fireEvent.press(screen.getByTestId('season-none'))
    })
    expect((await testDraft.reopen()).answers.seasonStart).toBeNull()
    expect(screen.getByTestId('season-none').props.accessibilityState.checked).toBe(true)
    await act(async () => {
      fireEvent.press(screen.getByTestId('season-none'))
    })
    expect((await testDraft.reopen()).answers.seasonStart).toBe(seasonStartForWeeks(12, new Date()))
  })

  it('turning No set season off brings back the date the athlete chose', async () => {
    const chosen = seasonStartForWeeks(20, new Date())
    await testDraft.seed({ answers: { seasonStart: chosen } })
    await show(<FirstRunSeason />)
    await act(async () => {
      fireEvent.press(screen.getByTestId('season-none'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('season-none'))
    })
    expect((await testDraft.reopen()).answers.seasonStart).toBe(chosen)
  })

  it('opens on the month of a saved date that loads after the first render', async () => {
    const chosen = seasonStartForWeeks(30, new Date())
    await testDraft.seed({ answers: { seasonStart: chosen } })
    await show(<FirstRunSeason />)
    expect(screen.getByTestId(`season-day-${chosen}`).props.accessibilityState.selected).toBe(true)
  })

  it('keeps the months between now and a year out', () => {
    const b = monthBounds(new Date(2026, 10, 15))
    expect(b.first).toEqual({ y: 2026, m: 10 })
    expect(b.last).toEqual({ y: 2027, m: 10 })
  })
})

describe('First Run days', () => {
  it('starts on Mon/Wed/Fri and says so', async () => {
    await show(<FirstRunDays />)
    expect(screen.getByTestId('days-count').props.children).toBe('3 SESSIONS A WEEK')
    expect(screen.getByTestId('days-list').props.children).toBe('Mon / Wed / Fri')
    expect(screen.getByTestId('day-Mon').props.accessibilityState.checked).toBe(true)
    expect(screen.getByTestId('day-Tue').props.accessibilityState.checked).toBe(false)
  })

  it('toggles a day and stores the days on Continue', async () => {
    await show(<FirstRunDays />)
    await act(async () => {
      fireEvent.press(screen.getByTestId('day-Tue'))
    })
    expect(screen.getByTestId('days-count').props.children).toBe('4 SESSIONS A WEEK')
    await act(async () => {
      fireEvent.press(screen.getByTestId('first-run-continue'))
    })
    expect((await testDraft.reopen()).answers.trainingDays).toEqual([1, 2, 3, 5])
    expect(mockPush).toHaveBeenCalledWith('/(first-run)/about')
  })

  it('never leaves zero days', async () => {
    await testDraft.seed({ answers: { trainingDays: [3] } })
    await show(<FirstRunDays />)
    await act(async () => {
      fireEvent.press(screen.getByTestId('day-Wed'))
    })
    expect(screen.getByTestId('day-Wed').props.accessibilityState.checked).toBe(true)
    expect(screen.getByTestId('day-Wed').props.accessibilityHint).toBe('Keep at least one day')
  })
})

describe('toggleDay', () => {
  it('adds in order, removes, and keeps the last day', () => {
    expect(toggleDay([1, 5], 3)).toEqual([1, 3, 5])
    expect(toggleDay([1, 3, 5], 3)).toEqual([1, 5])
    expect(toggleDay([3], 3)).toEqual([3])
  })
})
