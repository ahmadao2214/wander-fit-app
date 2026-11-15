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

const template = {
  _id: 'template_1',
  name: 'Lower Body Foundation',
  phase: 'GPP',
  exercises: [exercise('goblet_squat', 'Goblet Squat', 3), exercise('romanian_deadlift', 'Romanian Deadlift', 2)],
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
      { exerciseId: 'goblet_squat', completed: false, skipped: false, sets: sets(2, 3) },
      { exerciseId: 'romanian_deadlift', completed: false, skipped: false, sets: sets(0, 2) },
    ],
    exerciseOrder: [0, 1],
    ...overrides,
  }
  return render(<WorkoutExecutionScreen />, { wrapper: AllTheProviders })
}

describe('Exiting a workout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('pauses the session with its logged sets instead of abandoning it', async () => {
    const { getByTestId, findByTestId } = renderSession()

    fireEvent.press(getByTestId('execute-exit'))
    const pause = await findByTestId('exit-pause')
    await act(async () => {
      fireEvent.press(pause)
    })

    expect(mockAbandon).not.toHaveBeenCalled()
    expect(mockPause).toHaveBeenCalledTimes(1)
    const saved = mockPause.mock.calls[0][0]
    expect(saved.sessionId).toBe('session_1')
    expect(saved.exercises[0].sets.map((s: any) => s.completed)).toEqual([true, true, false])
    expect(mockReplace).toHaveBeenCalledWith('/(athlete)')
  })

  it('tells the athlete where to pick it back up', async () => {
    const { getByTestId, findByText } = renderSession()
    fireEvent.press(getByTestId('execute-exit'))
    expect(await findByText(/Pick up where you left off from Today/)).toBeTruthy()
  })

  it('ends the pause when a paused session opens again', () => {
    renderSession({ pausedAt: Date.now() - 60_000 })
    expect(mockResume).toHaveBeenCalledWith({ sessionId: 'session_1' })
  })

  it("doesn't call resume for a session that isn't paused", () => {
    renderSession()
    expect(mockResume).not.toHaveBeenCalled()
  })
})
