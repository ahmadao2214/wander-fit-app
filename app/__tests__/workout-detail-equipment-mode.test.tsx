import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'

import config from '../../tamagui.config'

const mockUseQuery = jest.fn()
const mockUseMutation = jest.fn()
const mockPush = jest.fn()
const mockStartSession = jest.fn()
const mockSaveEquipmentMode = jest.fn()
const mockSetTodayFocus = jest.fn()

jest.mock('convex/react', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    programTemplates: {
      getWorkoutWithScaling: 'programTemplates.getWorkoutWithScaling',
    },
    gppWorkoutSessions: {
      getSessionForTemplate: 'gppWorkoutSessions.getSessionForTemplate',
      getLastCompletedSessionForTemplate: 'gppWorkoutSessions.getLastCompletedSessionForTemplate',
      startSession: 'gppWorkoutSessions.startSession',
    },
    userPrograms: {
      getUnlockedPhases: 'userPrograms.getUnlockedPhases',
      getReassessmentStatus: 'userPrograms.getReassessmentStatus',
      setEquipmentMode: 'userPrograms.setEquipmentMode',
    },
    scheduleOverrides: {
      getTodayWorkout: 'scheduleOverrides.getTodayWorkout',
      setTodayFocus: 'scheduleOverrides.setTodayFocus',
    },
  },
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    replace: jest.fn(),
    dismiss: jest.fn(),
    canGoBack: jest.fn(() => true),
    canDismiss: jest.fn(() => false),
  }),
  useLocalSearchParams: () => ({ id: 'template-1' }),
}))

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', name: 'Test User' },
    isLoading: false,
  }),
}))

jest.mock('../../hooks/useDragReorder', () => ({
  useDragReorder: ({ exercises }: { exercises: any[] }) => ({
    orderedExercises: exercises,
    orderIndices: exercises.map((_, index) => index),
    hasCustomOrder: false,
    handleDragEnd: jest.fn(),
    triggerHaptic: jest.fn(),
  }),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('react-native-draggable-flatlist', () => {
  const React = require('react')
  const { View } = require('react-native')

  return {
    __esModule: true,
    default: ({
      data,
      renderItem,
      ListHeaderComponent,
      ListFooterComponent,
    }: any) => (
      <View>
        {ListHeaderComponent}
        {data.map((item: any, index: number) => (
          <View key={`${item.exerciseId}-${index}`}>
            {renderItem({
              item,
              drag: jest.fn(),
              isActive: false,
              getIndex: () => index,
            })}
          </View>
        ))}
        {ListFooterComponent}
      </View>
    ),
    ScaleDecorator: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

jest.mock('../../components/workout/WarmupSection', () => ({
  WarmupSection: () => null,
}))

import WorkoutDetailScreen from '../(athlete)/workout/[id]'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

const templateResponse = {
  _id: 'template-1',
  name: 'Lower Body Foundation',
  estimatedDurationMinutes: 35,
  phase: 'GPP',
  equipmentMode: 'gym',
  exercises: [
    {
      exerciseId: 'exercise-1',
      sets: 3,
      reps: '8',
      restSeconds: 90,
      orderIndex: 0,
      exercise: {
        _id: 'back-squat',
        name: 'Back Squat',
        tags: ['lower_body'],
      },
      sourceExercise: {
        _id: 'back-squat',
        name: 'Back Squat',
        tags: ['lower_body'],
      },
      sourceEquipmentMode: 'gym',
      hasEquipmentAlternative: true,
      equipmentVariants: {
        gym: {
          exercise: {
            _id: 'back-squat',
            name: 'Back Squat',
            tags: ['lower_body'],
          },
        },
        home: {
          exercise: {
            _id: 'goblet-squat',
            name: 'Goblet Squat',
            tags: ['lower_body'],
          },
        },
      },
    },
  ],
}

describe('WorkoutDetailScreen equipment mode', () => {
  beforeEach(() => {
    mockUseQuery.mockReset()
    mockUseMutation.mockReset()
    mockPush.mockReset()
    mockStartSession.mockReset()
    mockSaveEquipmentMode.mockReset()
    mockSetTodayFocus.mockReset()

    mockStartSession.mockResolvedValue({ sessionId: 'session-1' })
    mockSaveEquipmentMode.mockResolvedValue(undefined)
    mockSetTodayFocus.mockResolvedValue(undefined)

    mockUseQuery.mockImplementation((queryName: string) => {
      switch (queryName) {
        case 'programTemplates.getWorkoutWithScaling':
          return templateResponse
        case 'gppWorkoutSessions.getSessionForTemplate':
          return null
        case 'gppWorkoutSessions.getLastCompletedSessionForTemplate':
          return null
        case 'userPrograms.getUnlockedPhases':
          return { phases: ['GPP'] }
        case 'userPrograms.getReassessmentStatus':
          return { reassessmentPending: false }
        case 'scheduleOverrides.getTodayWorkout':
          return templateResponse
        default:
          return null
      }
    })

    mockUseMutation.mockImplementation((mutationName: string) => {
      switch (mutationName) {
        case 'gppWorkoutSessions.startSession':
          return mockStartSession
        case 'userPrograms.setEquipmentMode':
          return mockSaveEquipmentMode
        case 'scheduleOverrides.setTodayFocus':
          return mockSetTodayFocus
        default:
          return jest.fn()
      }
    })

    global.alert = jest.fn()
  })

  it('switches previewed exercises and starts the session with the selected mode', async () => {
    render(<WorkoutDetailScreen />, { wrapper: AllTheProviders })

    expect(screen.getByText('Back Squat')).toBeTruthy()

    fireEvent.press(screen.getByLabelText('Home mode'))

    await waitFor(() => {
      expect(mockSaveEquipmentMode).toHaveBeenCalledWith({ equipmentMode: 'home' })
    })

    expect(screen.getByText('Goblet Squat')).toBeTruthy()

    fireEvent.press(screen.getByText('Start'))

    await waitFor(() => {
      expect(mockStartSession).toHaveBeenCalledWith({
        templateId: 'template-1',
        exerciseOrder: undefined,
        equipmentMode: 'home',
      })
    })

    expect(mockPush).toHaveBeenCalled()
  })
})
