import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { testDraft, Wrapper as wrapper } from '../../jest/firstRunTestUtils'
import { toIsoDate, weeksUntilSeason } from '../../lib/firstRun'

jest.mock('../../lib/firstRunStorage', () => ({
  get firstRunDraft() {
    return jest.requireActual('../../jest/firstRunTestUtils').testDraft.current
  },
}))
jest.mock('convex/react', () => ({ useQuery: () => undefined }))
const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => jest.requireActual('react').useEffect(cb, [cb]),
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

// eslint-disable-next-line import/first
import FirstRunSeason from '../(first-run)/season'
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

describe('First Run season', () => {
  it('starts at 12 weeks and stores that date on Continue', async () => {
    await show(<FirstRunSeason />)
    expect(screen.getByTestId('season-weeks').props.children).toBe('12 weeks away')
    await act(async () => {
      fireEvent.press(screen.getByTestId('first-run-continue'))
    })
    const { answers } = await testDraft.reopen()
    expect(weeksUntilSeason(answers.seasonStart!, new Date())).toBe(12)
    expect(mockPush).toHaveBeenCalledWith('/(first-run)/days')
  })

  it('shows the weeks live as the athlete drags', async () => {
    await show(<FirstRunSeason />)
    const slider = screen.UNSAFE_root.findAll(
      (node) => typeof node.props.onValueChange === 'function' && node.props.max === 52
    )[0]
    await act(async () => {
      slider.props.onValueChange([20])
    })
    expect(screen.getByTestId('season-weeks').props.children).toBe('20 weeks away')
    await act(async () => {
      fireEvent.press(screen.getByTestId('first-run-continue'))
    })
    expect(weeksUntilSeason((await testDraft.reopen()).answers.seasonStart!, new Date())).toBe(20)
  })

  it('stores no date for "No set season"', async () => {
    await show(<FirstRunSeason />)
    await act(async () => {
      fireEvent.press(screen.getByTestId('season-none'))
    })
    expect(screen.getByTestId('season-none').props.accessibilityState.selected).toBe(true)
    await act(async () => {
      fireEvent.press(screen.getByTestId('first-run-continue'))
    })
    expect((await testDraft.reopen()).answers.seasonStart).toBeNull()
  })

  it('keeps a season answer through a relaunch before Continue', async () => {
    await show(<FirstRunSeason />)
    const slider = screen.UNSAFE_root.findAll(
      (node) => typeof node.props.onValueChange === 'function' && node.props.max === 52
    )[0]
    await act(async () => {
      slider.props.onValueChange([30])
    })
    expect(weeksUntilSeason((await testDraft.reopen()).answers.seasonStart!, new Date())).toBe(30)
    await act(async () => {
      fireEvent.press(screen.getByTestId('season-none'))
    })
    expect((await testDraft.reopen()).answers.seasonStart).toBeNull()
  })

  it('keeps a stored date that the athlete leaves alone', async () => {
    const stored = toIsoDate(new Date(Date.now() + 80 * 24 * 60 * 60 * 1000))
    await testDraft.seed({ answers: { seasonStart: stored }, lastStep: 'season' })
    await show(<FirstRunSeason />)
    expect(screen.getByTestId('season-weeks').props.children).toBe('12 weeks away')
    await act(async () => {
      fireEvent.press(screen.getByTestId('first-run-continue'))
    })
    expect((await testDraft.reopen()).answers.seasonStart).toBe(stored)
  })

  it('keeps the slider position through No set season and back', async () => {
    await show(<FirstRunSeason />)
    const slider = screen.UNSAFE_root.findAll(
      (node) => typeof node.props.onValueChange === 'function' && node.props.max === 52
    )[0]
    await act(async () => {
      slider.props.onValueChange([30])
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('season-none'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('season-none'))
    })
    expect(screen.getByTestId('season-weeks').props.children).toBe('30 weeks away')
  })

  it('reopens on the answer already given', async () => {
    await testDraft.seed({ answers: { seasonStart: null }, lastStep: 'season' })
    await show(<FirstRunSeason />)
    expect(screen.getByTestId('season-none').props.accessibilityState.selected).toBe(true)
  })
})

describe('First Run days', () => {
  it('preselects Mon, Wed, Fri and counts them', async () => {
    await show(<FirstRunDays />)
    for (const d of ['Mon', 'Wed', 'Fri']) {
      expect(screen.getByTestId(`day-${d}`).props.accessibilityState.checked).toBe(true)
    }
    expect(screen.getByTestId('day-Tue').props.accessibilityState.checked).toBe(false)
    expect(screen.getByTestId('days-count').props.children).toBe('3 days a week')
  })

  it('updates the count live and stores the days', async () => {
    await show(<FirstRunDays />)
    await act(async () => {
      fireEvent.press(screen.getByTestId('day-Sat'))
    })
    expect(screen.getByTestId('days-count').props.children).toBe('4 days a week')
    await act(async () => {
      fireEvent.press(screen.getByTestId('first-run-continue'))
    })
    expect((await testDraft.reopen()).answers.trainingDays).toEqual([1, 3, 5, 6])
    expect(mockPush).toHaveBeenCalledWith('/(first-run)/about')
  })

  it("can't drop to zero days", async () => {
    await testDraft.seed({ answers: { trainingDays: [3] } })
    await show(<FirstRunDays />)
    await act(async () => {
      fireEvent.press(screen.getByTestId('day-Wed'))
    })
    expect(screen.getByTestId('day-Wed').props.accessibilityState.checked).toBe(true)
    expect(screen.getByTestId('days-count').props.children).toBe('1 day a week')
  })
})

describe('toggleDay', () => {
  it('adds in week order, removes, and keeps the last day', () => {
    expect(toggleDay([1, 5], 3)).toEqual([1, 3, 5])
    expect(toggleDay([1, 3, 5], 3)).toEqual([1, 5])
    expect(toggleDay([3], 3)).toEqual([3])
  })
})
