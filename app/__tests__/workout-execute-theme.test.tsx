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
let mockScheme: 'chalkboard' | 'whiteboard' = 'whiteboard'
jest.mock('../../hooks/useSportScheme', () => ({ useSportScheme: () => mockScheme }))

import WorkoutExecutionScreen from '../(athlete)/workout/execute/[id]'
import { PHASE_SWATCHES } from '../../lib/phase'
import { SPORT_SCHEMES, nearestBackground, paint, paintedColors, sportPaint } from '../../jest/sportPaint'

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

// Execute moved onto the basketball sport theme (issue #209): a workout logger
// on the instrument ground, with no court and no phase colours.
describe('Workout execution on the sport theme', () => {
  afterEach(() => {
    mockScheme = 'whiteboard'
  })

  it.each(SPORT_SCHEMES)('paints the %s instrument ground and the neutral Next button', (scheme) => {
    mockScheme = scheme
    const colors = sportPaint(scheme)
    const { getByTestId, getByText } = renderSession()
    expect(paint(getByTestId('execute-screen')).backgroundColor).toBe(colors.ground)
    const next = getByText('Next')
    expect(paint(next).color).toBe(colors.ground)
    expect(nearestBackground(next)).toBe(colors.button)
  })

  it.each(SPORT_SCHEMES)('keeps phase fills, Electric Blue and the board off the %s logger', (scheme) => {
    mockScheme = scheme
    const colors = sportPaint(scheme)
    const { getByTestId, queryByTestId, queryByText } = renderSession()
    const fills = Object.values(PHASE_SWATCHES).flatMap((byPhase) => Object.values(byPhase).map((s) => s.fill))
    const painted = paintedColors(getByTestId('execute-screen'))
    expect(painted.length).toBeGreaterThan(10)
    expect(painted.filter((c) => [...fills, '#2563EB', colors.board.toUpperCase()].includes(c))).toEqual([])
    expect([queryByTestId('program-board'), queryByText(/GPP|SPP|SSP|SCORE/)]).toEqual([null, null])
  })

  it('outlines the next set in the words colour, not a phase colour', () => {
    mockScheme = 'chalkboard'
    const colors = sportPaint('chalkboard')
    const { getByTestId } = renderSession()
    const tile = paint(getByTestId('set-tile-next'))
    expect([tile.borderTopColor, tile.backgroundColor]).toEqual([colors.words, colors.ground])
  })
})
