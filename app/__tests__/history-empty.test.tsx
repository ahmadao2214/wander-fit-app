import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

const mockUseQuery = jest.fn()
const mockNavigate = jest.fn()

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
  useRouter: () => ({ navigate: mockNavigate, push: jest.fn(), back: jest.fn() }),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { _id: 'user_1', name: 'Test Athlete' }, isLoading: false }),
}))

import HistoryPage from '../(athlete)/history'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

describe('History empty state', () => {
  beforeEach(() => {
    mockUseQuery.mockReset()
    mockNavigate.mockReset()
    mockUseQuery.mockReturnValue([])
  })

  it('says there are no workouts, without the old tagline', () => {
    const { getByText, queryByText } = render(<HistoryPage />, { wrapper: AllTheProviders })
    expect(getByText('No workouts yet')).toBeTruthy()
    expect(queryByText(/Complete your first workout/)).toBeNull()
  })

  it("sends the athlete to today's workout", () => {
    const { getByText } = render(<HistoryPage />, { wrapper: AllTheProviders })
    fireEvent.press(getByText("Go to today's workout"))
    expect(mockNavigate).toHaveBeenCalledWith('/(athlete)')
  })
})
