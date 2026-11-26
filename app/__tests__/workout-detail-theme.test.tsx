import React from 'react'
import { render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

const exercise = (id: string, name: string) => ({
  exerciseId: id,
  sets: 3,
  reps: '10',
  restSeconds: 60,
  orderIndex: 0,
  section: 'main',
  exercise: { _id: id, name, instructions: '', equipment: [] },
})

let mockTemplate: any = {
  _id: 'template_1',
  name: 'Lower Body Foundation',
  phase: 'SPP',
  week: 1,
  day: 1,
  estimatedDurationMinutes: 40,
  exercises: [exercise('goblet_squat', 'Goblet Squat'), exercise('romanian_deadlift', 'Romanian Deadlift')],
}
let mockUnlocked: any = { phases: ['GPP', 'SPP'] }
let mockReassessment: any = null

jest.mock('convex/react', () => ({
  useQuery: (name: string) =>
    ({
      getWorkoutWithScaling: mockTemplate,
      getUnlockedPhases: mockUnlocked,
      getReassessmentStatus: mockReassessment,
    })[name] ?? null,
  useMutation: () => jest.fn(),
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    programTemplates: { getWorkoutWithScaling: 'getWorkoutWithScaling' },
    gppWorkoutSessions: {
      getSessionForTemplate: 'getSessionForTemplate',
      getLastCompletedSessionForTemplate: 'getLastCompletedSessionForTemplate',
      getCurrentSession: 'getCurrentSession',
      startSession: 'startSession',
      reorderExercises: 'reorderExercises',
    },
    userPrograms: { getUnlockedPhases: 'getUnlockedPhases', getReassessmentStatus: 'getReassessmentStatus' },
    scheduleOverrides: { setTodayFocus: 'setTodayFocus', getTodayWorkout: 'getTodayWorkout' },
  },
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true, canDismiss: () => false }),
  useLocalSearchParams: () => ({ id: 'template_1' }),
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { _id: 'user_1', name: 'Test Athlete' }, isLoading: false }),
}))
// The worklets runtime doesn't load under Jest: a plain list stands in for the draggable one
jest.mock('react-native-reanimated', () => jest.requireActual('../../jest/reanimatedMock'))
jest.mock('react-native-draggable-flatlist', () => {
  const React = jest.requireActual('react')
  const { View } = jest.requireActual('react-native')
  const DraggableFlatList = ({ data, renderItem, ListHeaderComponent, ListFooterComponent }: any) =>
    React.createElement(
      View,
      null,
      typeof ListHeaderComponent === 'function' ? React.createElement(ListHeaderComponent) : ListHeaderComponent,
      data.map((item: any, index: number) =>
        React.createElement(View, { key: index }, renderItem({ item, drag: () => {}, isActive: false, getIndex: () => index }))
      ),
      typeof ListFooterComponent === 'function' ? React.createElement(ListFooterComponent) : ListFooterComponent
    )
  return { __esModule: true, default: DraggableFlatList, ScaleDecorator: ({ children }: any) => children }
})
let mockScheme: 'chalkboard' | 'whiteboard' = 'whiteboard'
jest.mock('../../hooks/useSportScheme', () => ({ useSportScheme: () => mockScheme }))

// eslint-disable-next-line import/first
import WorkoutDetailScreen from '../(athlete)/workout/[id]'
// eslint-disable-next-line import/first
import { SPORT_SCHEMES, buttonFace, paint, paintedColors, sportPaint } from '../../jest/sportPaint'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

describe('Workout detail on the sport theme', () => {
  afterEach(() => {
    mockScheme = 'whiteboard'
    mockUnlocked = { phases: ['GPP', 'SPP'] }
    mockReassessment = null
  })

  it.each(SPORT_SCHEMES)('paints the %s instrument with the neutral Start button and the phase as a word', (scheme) => {
    mockScheme = scheme
    const colors = sportPaint(scheme)
    const { toJSON, getByText, getByTestId, queryByText } = render(<WorkoutDetailScreen />, { wrapper: AllTheProviders })
    const root = toJSON() as unknown as Parameters<typeof paintedColors>[0]
    const start = getByText('Start')
    expect([paint(start).color, buttonFace(start)]).toEqual([colors.ground, colors.button])
    expect(getByText('Train')).toBeTruthy()
    expect(paint(getByTestId('workout-meta')).color).not.toBe('#2563EB')
    expect(queryByText(/GPP|SPP|SSP/)).toBeNull()
    // The old phase fills (light and dark), deleted in issue #210
    const fills = ['#3B82F6', '#1D4ED8', '#1E3A8A', '#BFDBFE', '#60A5FA']
    const painted = paintedColors(root)
    expect(painted.length).toBeGreaterThan(10)
    expect(painted).toContain(colors.ground.toUpperCase())
    expect(painted.filter((c) => [...fills, '#2563EB', '#EFF6FF', '#DBEAFE'].includes(c))).toEqual([])
  })

  it('names the locked phase as a word', () => {
    mockTemplate = { ...mockTemplate, phase: 'SSP' }
    try {
      const { getByText, queryByText } = render(<WorkoutDetailScreen />, { wrapper: AllTheProviders })
      expect(getByText(/complete Train to unlock/)).toBeTruthy()
      expect(queryByText(/GPP|SPP|SSP/)).toBeNull()
    } finally {
      mockTemplate = { ...mockTemplate, phase: 'SPP' }
    }
  })
})
