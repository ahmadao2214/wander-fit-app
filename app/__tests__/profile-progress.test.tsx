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
      return { phase: 'GPP', week: 1, day: 1, skillLevel: 'Novice', gppCategoryId: 2, sportName: 'Basketball' }
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
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

let mockScheme: 'chalkboard' | 'whiteboard' = 'whiteboard'
jest.mock('../../hooks/useSportScheme', () => ({ useSportScheme: () => mockScheme }))

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { _id: 'user_1', name: 'Test Athlete', email: 'athlete@example.com' }, isLoading: false }),
}))

jest.mock('../../components/SignOutButton', () => ({ SignOutButton: () => null }))
jest.mock('../../components/OneRepMaxSheet', () => ({ OneRepMaxSheet: () => null }))

import ProfilePage from '../(athlete)/profile'
import { SPORT_SCHEMES, paint, paintedColors, sportPaint } from '../../jest/sportPaint'

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

  it('states the assessment baseline in words, not a 0 tile', () => {
    mockProgress = summary(0, 0)
    mockIntakes = [{ preferredTrainingDaysPerWeek: 3, yearsOfExperience: 0, completedAt: new Date(2026, 10, 15).getTime() }]
    const { getByText, queryByText } = render(<ProfilePage />, { wrapper: AllTheProviders })
    expect(getByText('3 a week')).toBeTruthy()
    expect(getByText('New to training')).toBeTruthy()
    expect(getByText('Nov 15')).toBeTruthy()
    expect(queryByText(/Years\s+experience/)).toBeNull()
    expect(queryByText('0')).toBeNull()
  })

  it.each(SPORT_SCHEMES)('sits on the %s instrument ground, with the phase as a word', (scheme) => {
    mockScheme = scheme
    try {
      mockProgress = summary(3, 0)
      const { toJSON, getByText, queryByText } = render(<ProfilePage />, { wrapper: AllTheProviders })
      const root = toJSON() as unknown as Parameters<typeof paintedColors>[0]
      expect(paint(root).backgroundColor).toBe(sportPaint(scheme).ground)
      expect(getByText('Build')).toBeTruthy()
      expect(queryByText(/GPP|Preparedness/)).toBeNull()
      // The old phase fills (light and dark), deleted in issue #210
      const fills = ['#3B82F6', '#1D4ED8', '#1E3A8A', '#BFDBFE', '#60A5FA']
      const painted = paintedColors(root)
      expect(painted.filter((c) => [...fills, '#2563EB', '#EFF6FF', '#DBEAFE'].includes(c))).toEqual([])
    } finally {
      mockScheme = 'whiteboard'
    }
  })
})
