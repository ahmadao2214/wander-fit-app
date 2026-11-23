import React from 'react'
import { render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

let mockProgress: any
let mockIntakes: any[] = []

jest.mock('convex/react', () => ({
  useQuery: (name: string) => {
    if (name === 'getProgressSummary') return mockProgress
    if (name === 'getCurrentProgramState') {
      return {
        phase: 'GPP',
        week: 1,
        day: 1,
        skillLevel: 'Novice',
        gppCategoryId: 2,
        sportName: 'Basketball',
      }
    }
    if (name === 'getIntakeHistory') return mockIntakes
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
  useIsFocused: () => true,
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { _id: 'user_1', name: 'Test Athlete', email: 'athlete@example.com' },
    isLoading: false,
  }),
}))

jest.mock('../../components/SignOutButton', () => ({ SignOutButton: () => null }))
jest.mock('../../components/OneRepMaxSheet', () => ({ OneRepMaxSheet: () => null }))

import ProfilePage from '../(athlete)/profile'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

const summary = (daysCompleted: number, weeksOnPlan: number) => ({
  daysCompleted,
  weeksOnPlan,
  uniqueExercisesPerformed: daysCompleted * 4,
})

// Design audit F06: Profile holds settings and baseline facts, not a
// dashboard. Progress lives on History.
describe('Profile', () => {
  beforeEach(() => {
    mockIntakes = []
  })

  it('shows no progress scoreboard, even with workouts done', () => {
    mockProgress = summary(5, 3)
    const { queryByTestId, queryByText } = render(<ProfilePage />, { wrapper: AllTheProviders })
    expect(queryByTestId('profile-progress')).toBeNull()
    expect(queryByText(/workouts done|on plan/)).toBeNull()
    expect(queryByText(/Exercises\s+Tried/)).toBeNull()
  })

  it('leads with the name and says where the program is, in words', () => {
    mockProgress = summary(0, 0)
    const { getByTestId, getByText } = render(<ProfilePage />, { wrapper: AllTheProviders })
    expect(getByTestId('profile-name').props.children).toBe('Test Athlete')
    expect(getByText('Novice · Basketball')).toBeTruthy()
    expect(getByTestId('profile-week').props.children).toBe('Week 1 of 12 · Day 1')
    // The email moved out of the header into the Training rows
    expect(getByText('athlete@example.com')).toBeTruthy()
  })

  it('states the assessment baseline in words, not a 0 tile', () => {
    mockProgress = summary(0, 0)
    mockIntakes = [
      {
        preferredTrainingDaysPerWeek: 3,
        yearsOfExperience: 0,
        completedAt: new Date(2026, 10, 15).getTime(),
      },
    ]
    const { getByText, queryByText } = render(<ProfilePage />, { wrapper: AllTheProviders })
    expect(getByText('3 a week')).toBeTruthy()
    expect(getByText('New to training')).toBeTruthy()
    expect(getByText('Nov 15')).toBeTruthy()
    expect(queryByText(/Years\s+experience/)).toBeNull()
    expect(queryByText('0')).toBeNull()
  })
})
