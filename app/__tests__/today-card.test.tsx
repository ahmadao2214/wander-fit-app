import React from 'react'
import { render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

// A two-week phase: the athlete is in week 2, which looks up template week 4
const programState = {
  phase: 'GPP',
  week: 2,
  day: 1,
  weeksPerPhase: 2,
  sportName: 'Basketball',
  categoryShortName: 'Power',
}
const todayWorkout = {
  _id: 'template_1',
  name: 'Upper Push/Pull',
  phase: 'GPP',
  week: 4,
  day: 1,
  estimatedDurationMinutes: 35,
  exercises: [{ section: 'main' }, { section: 'main' }],
}

jest.mock('convex/react', () => ({
  useQuery: (name: string) =>
    ({
      getCurrentProgramState: programState,
      getProgressSummary: { daysCompleted: 0, currentStreak: 0 },
      getTodayWorkout: todayWorkout,
      getReassessmentStatus: null,
      getCurrentSession: null,
      getSessionForTemplate: null,
    })[name],
  useMutation: () => jest.fn(),
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    userPrograms: {
      getCurrentProgramState: 'getCurrentProgramState',
      getProgressSummary: 'getProgressSummary',
      getReassessmentStatus: 'getReassessmentStatus',
    },
    scheduleOverrides: { getTodayWorkout: 'getTodayWorkout' },
    gppWorkoutSessions: {
      getCurrentSession: 'getCurrentSession',
      getSessionForTemplate: 'getSessionForTemplate',
      startSession: 'startSession',
    },
  },
}))

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { _id: 'user_1', name: 'Test Athlete' }, isLoading: false }),
}))
jest.mock('../../components/SignOutButton', () => ({ SignOutButton: () => null }))

import AthleteDashboard from '../(athlete)/index'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

describe('Today card', () => {
  it("shows the athlete's scheduled week, not the template's lookup week", () => {
    const { getByTestId, getByText, queryByText } = render(<AthleteDashboard />, { wrapper: AllTheProviders })
    expect(getByTestId('today-workout-meta')).toBeTruthy()
    expect(getByText('GPP W2 D1')).toBeTruthy()
    expect(queryByText(/W4/)).toBeNull()
  })
})
