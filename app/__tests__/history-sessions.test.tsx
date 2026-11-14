import React from 'react'
import { render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

const mockUseQuery = jest.fn()

jest.mock('convex/react', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    gppWorkoutSessions: { getHistory: 'gppWorkoutSessions.getHistory' },
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
  templateSnapshot: { name: 'Lower Body Foundation', phase: 'GPP', week: 1, day: 1, workoutDate: 0 },
  ...overrides,
})

describe('History tab', () => {
  beforeEach(() => mockUseQuery.mockReset())

  it('reads GPP sessions, not the removed trainer-era sessions', () => {
    mockUseQuery.mockReturnValue([])
    render(<HistoryPage />, { wrapper: AllTheProviders })
    expect(mockUseQuery.mock.calls.map((call) => call[0])).toEqual(['gppWorkoutSessions.getHistory'])
  })

  it('lists finished GPP sessions with their name, phase slot and duration', () => {
    mockUseQuery.mockReturnValue([session({ totalDurationSeconds: 42 * 60 })])
    const { getByText } = render(<HistoryPage />, { wrapper: AllTheProviders })
    expect(getByText('Lower Body Foundation')).toBeTruthy()
    expect(getByText('GPP W1D1')).toBeTruthy()
    expect(getByText('42 min')).toBeTruthy()
  })

  it('falls back to the template name when a session has no snapshot', () => {
    mockUseQuery.mockReturnValue([session({ templateSnapshot: undefined, templateName: 'Upper Push/Pull' })])
    const { getByText } = render(<HistoryPage />, { wrapper: AllTheProviders })
    expect(getByText('Upper Push/Pull')).toBeTruthy()
  })

  it('leaves a session still in progress out of the log', () => {
    mockUseQuery.mockReturnValue([session({ status: 'in_progress' })])
    const { queryByText, getByText } = render(<HistoryPage />, { wrapper: AllTheProviders })
    expect(queryByText('Lower Body Foundation')).toBeNull()
    expect(getByText(/no workouts yet/i)).toBeTruthy()
  })
})
