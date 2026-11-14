import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

// A session resumed after the athlete reordered: Romanian Deadlift (3 sets)
// was moved first. The template keeps Goblet Squat (6 sets) first.
const exercise = (id: string, name: string, sets: number, reps: string) => ({
  exerciseId: id,
  sets,
  reps,
  restSeconds: 60,
  orderIndex: 0,
  exercise: { _id: id, name, instructions: '', equipment: ['dumbbell'] },
})

const template = {
  _id: 'template_1',
  name: 'Lower Body Foundation',
  phase: 'GPP',
  exercises: [
    { ...exercise('cat_cow', 'Cat-Cow', 1, '10'), notes: 'Warmup' },
    exercise('goblet_squat', 'Goblet Squat', 6, '12'),
    exercise('romanian_deadlift', 'Romanian Deadlift', 3, '10'),
  ],
}

const freshSets = (n: number) => Array.from({ length: n }, () => ({ completed: false, skipped: false }))

let mockSession: any
const mockUpdateProgress = jest.fn().mockResolvedValue(undefined)

jest.mock('convex/react', () => ({
  useQuery: (name: string) => (name === 'getById' ? mockSession : null),
  useMutation: (name: string) => (name === 'updateProgress' ? mockUpdateProgress : jest.fn()),
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    gppWorkoutSessions: {
      getById: 'getById',
      getLastCompletedSessionForTemplate: 'getLastCompleted',
      updateProgress: 'updateProgress',
      completeSession: 'completeSession',
      abandonSession: 'abandonSession',
    },
    userPrograms: { advanceToNextDay: 'advanceToNextDay' },
  },
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'session_1' }),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

// The queue drawer pulls in Reanimated; it isn't what this test covers
jest.mock('../../components/workout/ExerciseQueue', () => ({
  ExerciseQueue: () => null,
}))

jest.mock('../../components/workout/ConfettiEffect', () => ({
  ConfettiEffect: () => null,
}))

import WorkoutExecutionScreen from '../(athlete)/workout/execute/[id]'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

function renderSession(session: any) {
  mockSession = session
  return render(<WorkoutExecutionScreen />, { wrapper: AllTheProviders })
}

describe('Workout execution after reordering', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockUpdateProgress.mockClear()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it("shows the reordered exercise with its own sets, not the first template exercise's", () => {
    const { getByText, getAllByText, queryAllByText } = renderSession({
      _id: 'session_1',
      startedAt: Date.now(),
      status: 'in_progress',
      template,
      // Warmup done, so the screen resumes on the main exercises
      exercises: [
        { exerciseId: 'cat_cow', completed: true, skipped: true, sets: [{ completed: true, skipped: true }] },
        { exerciseId: 'goblet_squat', completed: false, skipped: false, sets: freshSets(6) },
        { exerciseId: 'romanian_deadlift', completed: false, skipped: false, sets: freshSets(3) },
      ],
      exerciseOrder: [2, 1],
    })

    expect(getByText("ROMANIAN DEADLIFT")).toBeTruthy()
    expect(getByText('3 sets')).toBeTruthy()
    expect(getByText('0/3')).toBeTruthy()
    expect(getAllByText(/^SET \d( · NEXT)?$/)).toHaveLength(3)
    expect(queryAllByText('SET 6')).toHaveLength(0)
  })

  it('repairs a save that put Goblet Squat\'s sets in Romanian Deadlift\'s slot', () => {
    const { getByText, getAllByText } = renderSession({
      _id: 'session_1',
      startedAt: Date.now(),
      status: 'in_progress',
      template,
      exercises: [
        { exerciseId: 'cat_cow', completed: true, skipped: true, sets: [{ completed: true, skipped: true }] },
        { exerciseId: 'romanian_deadlift', completed: false, skipped: false, sets: freshSets(3) },
        { exerciseId: 'goblet_squat', completed: false, skipped: false, sets: freshSets(6) },
      ],
      exerciseOrder: [2, 1],
    })

    expect(getByText('ROMANIAN DEADLIFT')).toBeTruthy()
    expect(getAllByText(/^SET \d( · NEXT)?$/)).toHaveLength(3)
  })

  it('logs a set against the exercise on screen and saves it in template order', async () => {
    const { getAllByText } = renderSession({
      _id: 'session_1',
      startedAt: Date.now(),
      status: 'in_progress',
      template,
      exercises: [
        { exerciseId: 'cat_cow', completed: true, skipped: true, sets: [{ completed: true, skipped: true }] },
        { exerciseId: 'goblet_squat', completed: false, skipped: false, sets: freshSets(6) },
        { exerciseId: 'romanian_deadlift', completed: false, skipped: false, sets: freshSets(3) },
      ],
      exerciseOrder: [2, 1],
    })

    fireEvent.press(getAllByText('SET 1 · NEXT')[0])
    await act(async () => {
      jest.advanceTimersByTime(2500)
    })

    const saved = mockUpdateProgress.mock.calls.at(-1)?.[0]
    expect(saved.exerciseOrder).toEqual([2, 1])
    expect(saved.exercises.map((e: any) => e.exerciseId)).toEqual(['cat_cow', 'goblet_squat', 'romanian_deadlift'])
    expect(saved.exercises[2].sets[0].completed).toBe(true)
    expect(saved.exercises[1].sets.every((set: any) => !set.completed)).toBe(true)
  })

  it('shows every main exercise when the saved order left one out', async () => {
    const { getAllByText } = renderSession({
      _id: 'session_1',
      startedAt: Date.now(),
      status: 'in_progress',
      template,
      exercises: [
        { exerciseId: 'cat_cow', completed: true, skipped: true, sets: [{ completed: true, skipped: true }] },
        { exerciseId: 'goblet_squat', completed: false, skipped: false, sets: freshSets(6) },
        { exerciseId: 'romanian_deadlift', completed: false, skipped: false, sets: freshSets(3) },
      ],
      // The old detail screen sent main-relative positions: 0 is the warmup
      exerciseOrder: [0, 1],
    })

    // Goblet Squat first, Romanian Deadlift appended rather than dropped
    expect(getAllByText(/GOBLET SQUAT/).length).toBeGreaterThan(0)
    expect(getAllByText(/^SET \d( · NEXT)?$/)).toHaveLength(6)
    await act(async () => {
      fireEvent.press(getAllByText('Next')[0])
    })
    expect(getAllByText(/ROMANIAN DEADLIFT/).length).toBeGreaterThan(0)
    expect(getAllByText(/^SET \d( · NEXT)?$/)).toHaveLength(3)
  })
})
