import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

const exercise = (id: string, name: string, sets: number) => ({
  exerciseId: id,
  sets,
  reps: '10',
  restSeconds: 60,
  orderIndex: 0,
  exercise: { _id: id, name, instructions: '', equipment: ['dumbbell'] },
})

const warmup = (id: string, name: string) => ({
  ...exercise(id, name, 1),
  section: 'warmup',
  warmupPhase: 'foam_rolling',
})

const template = {
  _id: 'template_1',
  name: 'Lower Body Foundation',
  phase: 'GPP',
  exercises: [
    warmup('foam_roll_quads', 'Foam Roll Quads'),
    { ...exercise('goblet_squat', 'Goblet Squat', 3), section: 'main' },
    { ...exercise('romanian_deadlift', 'Romanian Deadlift', 2), section: 'main' },
  ],
}

/** The warmup as every save after the first auto-save stores it */
const warmupPlaceholder = {
  exerciseId: 'foam_roll_quads',
  completed: true,
  skipped: true,
  sets: [{ completed: true, skipped: true }],
}

const sets = (logged: number, total: number) =>
  Array.from({ length: total }, (_, i) =>
    i < logged ? { completed: true, skipped: false, repsCompleted: 10 } : { completed: false, skipped: false }
  )

let mockSession: any
const mockPause = jest.fn().mockResolvedValue({ success: true })
const mockResume = jest.fn().mockResolvedValue({ success: true })
const mockAbandon = jest.fn().mockResolvedValue({ success: true })
const mockReplace = jest.fn()

jest.mock('convex/react', () => ({
  useQuery: (name: string) => (name === 'getById' ? mockSession : null),
  useMutation: (name: string) =>
    ({ pauseSession: mockPause, resumeSession: mockResume, abandonSession: mockAbandon })[name] ??
    jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    gppWorkoutSessions: {
      getById: 'getById',
      getLastCompletedSessionForTemplate: 'getLastCompleted',
      updateProgress: 'updateProgress',
      completeSession: 'completeSession',
      pauseSession: 'pauseSession',
      resumeSession: 'resumeSession',
      abandonSession: 'abandonSession',
    },
    userPrograms: { advanceToNextDay: 'advanceToNextDay' },
  },
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: mockReplace }),
  useLocalSearchParams: () => ({ id: 'session_1' }),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

jest.mock('../../components/workout/ExerciseQueue', () => ({ ExerciseQueue: () => null }))
jest.mock('../../components/workout/ConfettiEffect', () => ({ ConfettiEffect: () => null }))

import WorkoutExecutionScreen from '../(athlete)/workout/execute/[id]'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

function renderSession(overrides: Record<string, unknown> = {}) {
  mockSession = {
    _id: 'session_1',
    startedAt: Date.now(),
    status: 'in_progress',
    template,
    exercises: [
      warmupPlaceholder,
      { exerciseId: 'goblet_squat', completed: false, skipped: false, sets: sets(0, 3) },
      { exerciseId: 'romanian_deadlift', completed: false, skipped: false, sets: sets(0, 2) },
    ],
    exerciseOrder: [1, 2],
    ...overrides,
  }
  return render(<WorkoutExecutionScreen />, { wrapper: AllTheProviders })
}

describe('Resuming a workout with a warmup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows the warmup again when only the warmup placeholders were saved (regression)', () => {
    // The first auto-save writes the warmup as done-and-skipped; an athlete
    // who left during the warmup used to come back past it
    const { queryByTestId } = renderSession()
    expect(queryByTestId('warmup-skip')).toBeTruthy()
    expect(queryByTestId('execute-exercise-name')).toBeNull()
  })

  it('skips the warmup once a set of the workout is logged', () => {
    const { queryByTestId } = renderSession({
      exercises: [
        warmupPlaceholder,
        { exerciseId: 'goblet_squat', completed: false, skipped: false, sets: sets(1, 3) },
        { exerciseId: 'romanian_deadlift', completed: false, skipped: false, sets: sets(0, 2) },
      ],
    })
    expect(queryByTestId('warmup-skip')).toBeNull()
    expect(queryByTestId('execute-exercise-name')).toBeTruthy()
  })

  it('shows the warmup on a fresh start', () => {
    const { queryByTestId } = renderSession({
      exercises: [
        { exerciseId: 'foam_roll_quads', completed: false, skipped: false, sets: [] },
        { exerciseId: 'goblet_squat', completed: false, skipped: false, sets: [] },
        { exerciseId: 'romanian_deadlift', completed: false, skipped: false, sets: [] },
      ],
    })
    expect(queryByTestId('warmup-skip')).toBeTruthy()
  })
})
