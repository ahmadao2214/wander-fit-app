import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

const mockUseQuery = jest.fn()
const mockNavigate = jest.fn()

// The progress summary is answered on its own; mockUseQuery answers the rest
let mockProgress: { daysCompleted: number; weeksOnPlan: number } | null = null
jest.mock('convex/react', () => ({
  useQuery: (name: string, ...args: any[]) =>
    name === 'userPrograms.getProgressSummary' ? mockProgress : mockUseQuery(name, ...args),
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    gppWorkoutSessions: { getHistory: 'gppWorkoutSessions.getHistory' },
    userPrograms: { getProgressSummary: 'userPrograms.getProgressSummary' },
    workoutSessions: { getHistory: 'workoutSessions.getHistory' },
  },
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: mockNavigate, push: jest.fn(), back: jest.fn() }),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

let mockScheme: 'chalkboard' | 'whiteboard' = 'whiteboard'
jest.mock('../../hooks/useSportScheme', () => ({ useSportScheme: () => mockScheme }))

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { _id: 'user_1', name: 'Test Athlete' }, isLoading: false }),
}))

import HistoryPage from '../(athlete)/history'
import { SPORT_SCHEMES, buttonFace, paint, sportPaint } from '../../jest/sportPaint'

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

  it.each(SPORT_SCHEMES)("paints Go to today's workout on the %s neutral face", (scheme) => {
    const colors = sportPaint(scheme)
    mockScheme = scheme
    const { getByText } = render(<HistoryPage />, { wrapper: AllTheProviders })
    mockScheme = 'whiteboard'
    const go = getByText("Go to today's workout")
    expect([paint(go).color, buttonFace(go)]).toEqual([colors.ground, colors.button])
  })
})
