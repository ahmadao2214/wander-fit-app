import React from 'react'
import { render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

const mockUseQuery = jest.fn()

jest.mock('convex/react', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}))

jest.mock('convex/_generated/api', () => ({
  api: {
    gppWorkoutSessions: {
      getHistory: 'mocked-gppWorkoutSessions-getHistory',
    },
    workoutSessions: {
      getHistory: 'mocked-legacy-workoutSessions-getHistory',
    },
  },
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

const mockUseAuth = jest.fn()

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

import HistoryPage from '../(athlete)/history'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

const renderPage = () => render(<HistoryPage />, { wrapper: AllTheProviders })

const baseSession = {
  _id: 'session-1',
  templateId: 'template-1',
  userId: 'user-1',
  userProgramId: 'program-1',
  startedAt: new Date('2026-10-20T15:00:00Z').getTime(),
  status: 'completed',
  exercises: [],
  templateName: 'Lower Body Foundation',
  phase: 'GPP',
  week: 1,
  day: 2,
}

describe('HistoryPage', () => {
  beforeEach(() => {
    mockUseQuery.mockReset()
    mockUseAuth.mockReturnValue({ user: { _id: 'user-1' }, isLoading: false })
  })

  it('reads history from the GPP sessions query, not the legacy one', () => {
    mockUseQuery.mockReturnValue([])
    renderPage()
    expect(mockUseQuery).toHaveBeenCalledWith('mocked-gppWorkoutSessions-getHistory', {})
    expect(mockUseQuery).not.toHaveBeenCalledWith(
      'mocked-legacy-workoutSessions-getHistory',
      expect.anything()
    )
  })

  it('skips the query when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false })
    mockUseQuery.mockReturnValue(undefined)
    renderPage()
    expect(mockUseQuery).toHaveBeenCalledWith('mocked-gppWorkoutSessions-getHistory', 'skip')
  })

  it('shows a spinner while sessions load instead of the empty state', () => {
    mockUseQuery.mockReturnValue(undefined)
    const { getByText, queryByText } = renderPage()
    expect(getByText('Loading history...')).toBeTruthy()
    expect(queryByText('No Workouts Yet')).toBeNull()
  })

  it('shows the empty state when there is no history', () => {
    mockUseQuery.mockReturnValue([])
    const { getByText } = renderPage()
    expect(getByText('No Workouts Yet')).toBeTruthy()
  })

  it('renders a completed session with its duration and phase', () => {
    mockUseQuery.mockReturnValue([{ ...baseSession, totalDurationSeconds: 45 * 60 }])
    const { getByText } = renderPage()
    expect(getByText('Lower Body Foundation')).toBeTruthy()
    expect(getByText('45 min')).toBeTruthy()
    expect(getByText('GPP W1D2')).toBeTruthy()
    expect(getByText('completed')).toBeTruthy()
  })

  it('prefers the template snapshot over the current template', () => {
    mockUseQuery.mockReturnValue([
      {
        ...baseSession,
        templateSnapshot: {
          name: 'Upper Push/Pull',
          phase: 'SPP',
          week: 3,
          day: 1,
          workoutDate: baseSession.startedAt,
        },
      },
    ])
    const { getByText, queryByText } = renderPage()
    expect(getByText('Upper Push/Pull')).toBeTruthy()
    expect(getByText('SPP W3D1')).toBeTruthy()
    expect(queryByText('Lower Body Foundation')).toBeNull()
  })

  it('shows abandoned sessions with their status', () => {
    mockUseQuery.mockReturnValue([
      { ...baseSession, _id: 'session-2', status: 'abandoned', totalDurationSeconds: 10 * 60 },
    ])
    const { getByText } = renderPage()
    expect(getByText('abandoned')).toBeTruthy()
    expect(getByText('10 min')).toBeTruthy()
  })

  it('omits the duration when none was recorded', () => {
    mockUseQuery.mockReturnValue([{ ...baseSession, totalDurationSeconds: 0 }])
    const { queryByText, getByText } = renderPage()
    expect(getByText('Lower Body Foundation')).toBeTruthy()
    expect(queryByText(/min$/)).toBeNull()
  })
})
