import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

const mockTrackWorkoutStarted = jest.fn()
const mockTrackWorkoutCompleted = jest.fn()
const mockTrackWorkoutPaused = jest.fn()

jest.mock('../../lib/analytics', () => ({
  analytics: {
    trackWorkoutStarted: (...args: unknown[]) => mockTrackWorkoutStarted(...args),
    trackWorkoutCompleted: (...args: unknown[]) => mockTrackWorkoutCompleted(...args),
    trackWorkoutPaused: (...args: unknown[]) => mockTrackWorkoutPaused(...args),
  },
}))

const mockComplete = jest.fn().mockResolvedValue({ success: true })
const mockPause = jest.fn().mockResolvedValue({ success: true })
const mockUpdate = jest.fn().mockResolvedValue({ success: true })
const mockMarkStarted = jest.fn().mockResolvedValue({ marked: true, alreadyStarted: false })
const mockAdvance = jest.fn().mockResolvedValue({ triggerReassessment: false })
const mockReplace = jest.fn()

let mockSession: any

jest.mock('convex/react', () => ({
  useQuery: (name: string) => (name === 'getById' ? mockSession : null),
  useMutation: (name: string) =>
    ({
      completeSession: mockComplete,
      pauseSession: mockPause,
      updateProgress: mockUpdate,
      markWorkoutStarted: mockMarkStarted,
      advanceToNextDay: mockAdvance,
    })[name] ?? jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    gppWorkoutSessions: {
      getById: 'getById',
      getLastCompletedSessionForTemplate: 'getLastCompleted',
      updateProgress: 'updateProgress',
      markWorkoutStarted: 'markWorkoutStarted',
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
  useLocalSearchParams: () => ({ id: 'session_telemetry_1' }),
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

function buildSession() {
  return {
    _id: 'session_telemetry_1',
    userProgramId: 'program_1',
    startedAt: Date.now(),
    status: 'in_progress',
    targetIntensity: 'Moderate',
    template: {
      _id: 'template_1',
      name: 'Lower Body Foundation',
      phase: 'GPP',
      week: 1,
      day: 1,
      exercises: [
        {
          exerciseId: 'warm_1',
          sets: 1,
          reps: '5',
          restSeconds: 0,
          orderIndex: 0,
          section: 'warmup',
          warmupPhase: 'mobility',
          exercise: { _id: 'warm_1', name: 'World Greatest Stretch', instructions: '' },
        },
        {
          exerciseId: 'squat_1',
          sets: 2,
          reps: '8',
          restSeconds: 60,
          orderIndex: 1,
          section: 'main',
          exercise: { _id: 'squat_1', name: 'Goblet Squat', instructions: '' },
        },
      ],
    },
    exercises: [
      {
        exerciseId: 'warm_1',
        completed: false,
        skipped: false,
        sets: [{ completed: false, skipped: false }],
      },
      {
        exerciseId: 'squat_1',
        completed: false,
        skipped: false,
        sets: [
          { completed: false, skipped: false },
          { completed: false, skipped: false },
        ],
      },
    ],
    exerciseOrder: [1],
  }
}

describe('Workout execution telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession = buildSession()
  })

  it('does NOT fire workout_started on warm-up Skip, fires once on first logged set, and emits workout_paused after pauseSession succeeds', async () => {
    const { getByTestId, findByTestId } = render(<WorkoutExecutionScreen />, {
      wrapper: AllTheProviders,
    })

    // Skipping warmup must NOT fire workout_started
    fireEvent.press(getByTestId('warmup-skip'))
    expect(mockTrackWorkoutStarted).not.toHaveBeenCalled()

    // Logging first non-skipped set fires workout_started once
    await act(async () => {
      fireEvent.press(getByTestId('set-0'))
    })
    fireEvent.press(getByTestId('set-1'))
    expect(mockTrackWorkoutStarted).toHaveBeenCalledTimes(1)
    expect(mockTrackWorkoutStarted).toHaveBeenCalledWith({
      trigger: 'first_set_logged',
      phase: 'GPP',
      week: 1,
      day: 1,
      intensity: 'Moderate',
      resumed: false,
    })

    // Pausing fires workout_paused after pauseSession resolves
    fireEvent.press(getByTestId('execute-exit'))
    const pauseBtn = await findByTestId('exit-pause')
    await act(async () => {
      fireEvent.press(pauseBtn)
    })

    expect(mockTrackWorkoutPaused).toHaveBeenCalledTimes(1)
    expect(mockTrackWorkoutPaused).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: 'GPP',
        week: 1,
        day: 1,
        sets_completed: 2,
      })
    )
  })

  it('does NOT fire workout_started when Convex reports the marker already existed (another tab or device started it) (S5)', async () => {
    mockMarkStarted.mockResolvedValueOnce({ marked: false, alreadyStarted: true })
    const { getByTestId } = render(<WorkoutExecutionScreen />, { wrapper: AllTheProviders })

    fireEvent.press(getByTestId('warmup-skip'))
    await act(async () => {
      fireEvent.press(getByTestId('set-0'))
    })

    expect(mockMarkStarted).toHaveBeenCalledWith({ sessionId: 'session_telemetry_1' })
    expect(mockTrackWorkoutStarted).not.toHaveBeenCalled()
  })

  it('retries the start marker on the next logged set when the first write fails (S20)', async () => {
    mockMarkStarted.mockRejectedValueOnce(new Error('offline'))
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { getByTestId } = render(<WorkoutExecutionScreen />, { wrapper: AllTheProviders })

    fireEvent.press(getByTestId('warmup-skip'))
    await act(async () => {
      fireEvent.press(getByTestId('set-0'))
    })
    expect(mockTrackWorkoutStarted).not.toHaveBeenCalled()

    await act(async () => {
      fireEvent.press(getByTestId('set-1'))
    })
    expect(mockMarkStarted).toHaveBeenCalledTimes(2)
    expect(mockTrackWorkoutStarted).toHaveBeenCalledTimes(1)
    errorSpy.mockRestore()
  })

  it('fires workout_started once on warm-up completion and does not double-fire when logging sets', async () => {
    const { getByTestId, getByText } = render(<WorkoutExecutionScreen />, {
      wrapper: AllTheProviders,
    })

    // Complete warmup phase and tap Let's Go!
    fireEvent.press(getByTestId('phase-toggle-mobility'))
    await act(async () => {
      fireEvent.press(getByText("Let's Go!"))
    })

    expect(mockTrackWorkoutStarted).toHaveBeenCalledTimes(1)
    expect(mockTrackWorkoutStarted).toHaveBeenCalledWith({
      trigger: 'warmup_completed',
      phase: 'GPP',
      week: 1,
      day: 1,
      intensity: 'Moderate',
      resumed: false,
    })

    // Logging a set afterwards must NOT fire workout_started a second time
    fireEvent.press(getByTestId('set-0'))
    expect(mockTrackWorkoutStarted).toHaveBeenCalledTimes(1)
  })

  it('persists dedicated workoutStartedAt marker immediately on warm-up completion and does not double-fire on reload/remount before Set 1 (S5) or mutate skipped warm-up flags on resume (S16)', async () => {
    const firstRender = render(<WorkoutExecutionScreen />, {
      wrapper: AllTheProviders,
    })

    // Complete warm-up -> fires workout_started once AND persists workoutStartedAt immediately
    fireEvent.press(firstRender.getByTestId('phase-toggle-mobility'))
    await act(async () => {
      fireEvent.press(firstRender.getByText("Let's Go!"))
    })
    expect(mockTrackWorkoutStarted).toHaveBeenCalledTimes(1)
    expect(mockMarkStarted).toHaveBeenCalledWith({ sessionId: 'session_telemetry_1' })

    firstRender.unmount()

    // Simulate reload/re-open BEFORE any main set was logged or paused —
    // persisted workoutStartedAt prevents double-firing workout_started
    mockSession = {
      ...buildSession(),
      workoutStartedAt: Date.now() - 10_000,
    }
    const reloadedRender = render(<WorkoutExecutionScreen />, {
      wrapper: AllTheProviders,
    })
    fireEvent.press(reloadedRender.getByTestId('warmup-skip'))
    fireEvent.press(reloadedRender.getByTestId('set-0'))
    expect(mockTrackWorkoutStarted).toHaveBeenCalledTimes(1)
    reloadedRender.unmount()

    // S16: Resuming a session with a logged main set where warm-up was skipped preserves skipped: true
    mockSession = {
      ...buildSession(),
      workoutStartedAt: Date.now() - 60_000,
      exercises: [
        {
          exerciseId: 'warm_1',
          completed: true,
          skipped: true,
          sets: [{ completed: true, skipped: true }],
        },
        {
          exerciseId: 'squat_1',
          completed: false,
          skipped: false,
          sets: [
            { completed: true, skipped: false, repsCompleted: 8 },
            { completed: false, skipped: false },
          ],
        },
      ],
    }
    const resumedRender = render(<WorkoutExecutionScreen />, {
      wrapper: AllTheProviders,
    })
    fireEvent.press(resumedRender.getByTestId('execute-exit'))
    const pauseBtn = await resumedRender.findByTestId('exit-pause')
    await act(async () => {
      fireEvent.press(pauseBtn)
    })
    const savedExercises = mockPause.mock.calls[0][0].exercises
    expect(savedExercises[0]).toMatchObject({
      exerciseId: 'warm_1',
      completed: true,
      skipped: true,
    })
    expect(mockTrackWorkoutStarted).toHaveBeenCalledTimes(1)
  })
})
