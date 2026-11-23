import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

let mockProgram: any
let mockLifts: any

jest.mock('convex/react', () => ({
  useQuery: (name: string) => {
    if (name === 'getCurrentProgramState') return mockProgram
    if (name === 'getIntakeHistory') return []
    if (name === 'getCoreLiftExercises') return mockLifts
    return undefined
  },
  useMutation: () => jest.fn(),
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    userPrograms: {
      getCurrentProgramState: 'getCurrentProgramState',
      getIntakeHistory: 'getIntakeHistory',
    },
    userMaxes: { getCoreLiftExercises: 'getCoreLiftExercises' },
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

// Stand in for the sheet: say which mode opened, and for which lifts
jest.mock('../../components/OneRepMaxSheet', () => {
  const { Text } = require('react-native')
  return {
    OneRepMaxSheet: ({ mode, exercise, exercises }: any) => (
      <Text testID={`max-sheet-${mode}`}>
        {mode === 'bulk' ? exercises.map((e: any) => e.slug).join(',') : exercise.slug}
      </Text>
    ),
  }
})

import ProfilePage from '../(athlete)/profile'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

const program = { phase: 'GPP', week: 1, day: 1, skillLevel: 'Novice', sportName: 'Basketball' }
const lift = (slug: string, name: string, currentMax: number | null) => ({
  _id: `ex_${slug}`,
  slug,
  name,
  currentMax,
})

describe('Profile maxes', () => {
  it('holds the phase block and the maxes card in place while the program loads', () => {
    mockProgram = undefined
    mockLifts = undefined
    const { getByTestId, queryByTestId } = render(<ProfilePage />, { wrapper: AllTheProviders })
    expect(getByTestId('profile-phase-loading')).toBeTruthy()
    expect(getByTestId('max-tiles-loading')).toBeTruthy()
    expect(queryByTestId('phase-track')).toBeNull()
  })

  it('shows neither once it knows there is no program', () => {
    mockProgram = null
    mockLifts = [lift('back_squat', 'Back Squat', null)]
    const { queryByTestId } = render(<ProfilePage />, { wrapper: AllTheProviders })
    expect(queryByTestId('profile-phase-loading')).toBeNull()
    expect(queryByTestId('max-tiles-loading')).toBeNull()
    expect(queryByTestId('max-add-all')).toBeNull()
  })

  it('opens all three lifts at once when none has a max', () => {
    mockProgram = program
    mockLifts = [
      lift('back_squat', 'Back Squat', null),
      lift('bench_press', 'Bench Press', null),
      lift('trap_bar_deadlift', 'Trap Bar Deadlift', null),
    ]
    const { getByTestId } = render(<ProfilePage />, { wrapper: AllTheProviders })
    fireEvent.press(getByTestId('max-add-all'))
    expect(getByTestId('max-sheet-bulk').props.children).toBe(
      'back_squat,bench_press,trap_bar_deadlift'
    )
  })

  it('opens one lift from its tile once any max is set', () => {
    mockProgram = program
    mockLifts = [
      lift('back_squat', 'Back Squat', 245),
      lift('bench_press', 'Bench Press', null),
      lift('trap_bar_deadlift', 'Trap Bar Deadlift', null),
    ]
    const { getByTestId, queryByTestId } = render(<ProfilePage />, { wrapper: AllTheProviders })
    expect(queryByTestId('max-add-all')).toBeNull()
    fireEvent.press(getByTestId('max-row-bench_press'))
    expect(getByTestId('max-sheet-single').props.children).toBe('bench_press')
  })
})
