import React from 'react'
import { render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

const mockUseQuery = jest.fn()

// The progress summary is answered on its own; mockUseQuery answers the rest
let mockProgress: { daysCompleted: number; weeksOnPlan: number } | null = null
const mockProgressArgs: unknown[] = []
jest.mock('convex/react', () => ({
  useQuery: (name: string, ...args: any[]) => {
    if (name !== 'userPrograms.getProgressSummary') return mockUseQuery(name, ...args)
    mockProgressArgs.push(args[0])
    return mockProgress
  },
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    gppWorkoutSessions: { getHistory: 'gppWorkoutSessions.getHistory' },
    userPrograms: { getProgressSummary: 'userPrograms.getProgressSummary' },
    workoutSessions: { getHistory: 'workoutSessions.getHistory' },
  },
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: jest.fn(), push: jest.fn(), back: jest.fn() }),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { _id: 'user_1', name: 'Test Athlete' },
    isLoading: false,
  }),
}))

import HistoryPage from '../(athlete)/history'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

const session = (overrides: Record<string, unknown>) => ({
  _id: 'session_1',
  startedAt: new Date(2026, 10, 10, 9).getTime(),
  status: 'completed',
  templateName: 'Lower Body Foundation',
  templateSnapshot: {
    name: 'Lower Body Foundation',
    phase: 'GPP',
    week: 1,
    day: 1,
    workoutDate: 0,
  },
  ...overrides,
})

describe('History tab', () => {
  beforeEach(() => {
    mockUseQuery.mockReset()
    mockProgress = null
  })

  it('reads GPP sessions, not the removed trainer-era sessions', () => {
    mockUseQuery.mockReturnValue([])
    render(<HistoryPage />, { wrapper: AllTheProviders })
    expect(mockUseQuery.mock.calls.map((call) => call[0])).toEqual([
      'gppWorkoutSessions.getHistory',
    ])
  })

  // Design audit F06: progress lives on History, as one truthful line
  it('says how many workouts are done and how many weeks in a row were on plan', () => {
    mockProgress = { daysCompleted: 5, weeksOnPlan: 3 }
    mockUseQuery.mockReturnValue([session({ totalDurationSeconds: 42 * 60 })])
    const { getByTestId } = render(<HistoryPage />, { wrapper: AllTheProviders })
    expect(getByTestId('history-progress').props.children).toBe('5 workouts done · 3 weeks on plan')
  })

  it('leaves weeks on plan out until there are two, with no zero or lost-streak copy', () => {
    mockProgress = { daysCompleted: 4, weeksOnPlan: 1 }
    mockUseQuery.mockReturnValue([session({ totalDurationSeconds: 42 * 60 })])
    const { getByTestId, queryByText } = render(<HistoryPage />, { wrapper: AllTheProviders })
    expect(getByTestId('history-progress').props.children).toBe('4 workouts done')
    expect(queryByText(/streak|on plan/i)).toBeNull()
  })

  it("asks for weeks on plan by the athlete's local day", () => {
    mockProgressArgs.length = 0
    mockUseQuery.mockReturnValue([])
    render(<HistoryPage />, { wrapper: AllTheProviders })
    expect(mockProgressArgs[0]).toEqual({
      today: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    })
  })

  it('lists finished GPP sessions with their name, phase slot and duration', () => {
    mockUseQuery.mockReturnValue([session({ totalDurationSeconds: 42 * 60 })])
    const { getByText } = render(<HistoryPage />, { wrapper: AllTheProviders })
    expect(getByText('Lower Body Foundation')).toBeTruthy()
    expect(getByText('GPP W1D1')).toBeTruthy()
    expect(getByText('42 min')).toBeTruthy()
  })

  it('falls back to the template name when a session has no snapshot', () => {
    mockUseQuery.mockReturnValue([
      session({ templateSnapshot: undefined, templateName: 'Upper Push/Pull' }),
    ])
    const { getByText } = render(<HistoryPage />, { wrapper: AllTheProviders })
    expect(getByText('Upper Push/Pull')).toBeTruthy()
  })

  it('marks an unfinished session in plain words and leaves completed ones unbadged', () => {
    mockUseQuery.mockReturnValue([
      session({ _id: 'done', status: 'completed' }),
      session({
        _id: 'quit',
        status: 'abandoned',
        templateSnapshot: undefined,
        templateName: 'Upper Push/Pull',
      }),
    ])
    const { getAllByTestId, queryByText } = render(<HistoryPage />, { wrapper: AllTheProviders })
    expect(getAllByTestId('history-not-finished')).toHaveLength(1)
    // The completed row has no chip, so its check is what a screen reader hears
    expect(getAllByTestId('history-completed')).toHaveLength(1)
    expect(getAllByTestId('history-completed')[0].props.accessibilityLabel).toBe('Completed')
    expect(queryByText(/abandoned/i)).toBeNull()
    expect(queryByText(/^completed$/i)).toBeNull()
  })

  it('leaves a session still in progress out of the log', () => {
    mockUseQuery.mockReturnValue([session({ status: 'in_progress' })])
    const { queryByText, getByText } = render(<HistoryPage />, { wrapper: AllTheProviders })
    expect(queryByText('Lower Body Foundation')).toBeNull()
    expect(getByText(/no workouts yet/i)).toBeTruthy()
  })
})
