import React from 'react'
import { render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

let mockProgress: any

jest.mock('convex/react', () => ({
  useQuery: (name: string) => {
    if (name === 'getProgressSummary') return mockProgress
    if (name === 'getCurrentProgramState') {
      return { phase: 'GPP', week: 1, day: 1, skillLevel: 'Novice', gppCategoryId: 2, sportName: 'Basketball' }
    }
    if (name === 'getIntakeHistory') return []
    if (name === 'getCoreLiftExercises') return []
    return undefined
  },
  useMutation: () => jest.fn(),
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    userPrograms: {
      getCurrentProgramState: 'getCurrentProgramState',
      getProgressSummary: 'getProgressSummary',
      getIntakeHistory: 'getIntakeHistory',
    },
    userMaxes: { getCoreLiftExercises: 'getCoreLiftExercises', setMax: 'setMax' },
  },
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { _id: 'user_1', name: 'Test Athlete', email: 'athlete@example.com' }, isLoading: false }),
}))

jest.mock('../../components/SignOutButton', () => ({ SignOutButton: () => null }))
jest.mock('../../components/OneRepMaxSheet', () => ({ OneRepMaxSheet: () => null }))

import ProfilePage from '../(athlete)/profile'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

const summary = (daysCompleted: number, currentStreak: number) => ({
  daysCompleted,
  currentStreak,
  uniqueExercisesPerformed: daysCompleted * 4,
})

describe('Profile progress', () => {
  it('shows no scoreboard before the first workout', () => {
    mockProgress = summary(0, 0)
    const { queryByTestId, queryByText } = render(<ProfilePage />, { wrapper: AllTheProviders })
    expect(queryByTestId('profile-progress')).toBeNull()
    expect(queryByText('PROGRESS STATS')).toBeNull()
    expect(queryByText(/Exercises\s+Tried/)).toBeNull()
  })

  it('shows one line of real progress once there is some', () => {
    mockProgress = summary(5, 3)
    const { getByText } = render(<ProfilePage />, { wrapper: AllTheProviders })
    expect(getByText('5 workouts done · 3-day streak')).toBeTruthy()
  })
})
