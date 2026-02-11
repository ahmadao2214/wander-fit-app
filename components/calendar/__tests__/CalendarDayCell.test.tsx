import React from 'react'
import { render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../../tamagui.config'
import { CalendarDayCell, CalendarDayCellProps, WorkoutWithSlot } from '../CalendarDayCell'

// Mock DraggableWorkoutCard to avoid gesture handler complexities
jest.mock('../DraggableWorkoutCard', () => ({
  DraggableWorkoutCard: ({ name, phase, compact, onPress }: any) => {
    const React = require('react')
    const { Text, Pressable } = require('react-native')
    return React.createElement(
      Pressable,
      { onPress, testID: 'workout-card' },
      React.createElement(Text, null, name),
      !compact && React.createElement(Text, null, phase)
    )
  },
}))

// Wrapper for Tamagui components
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

describe('CalendarDayCell', () => {
  const mockOnWorkoutPress = jest.fn()
  const mockOnDragStart = jest.fn()
  const mockOnDragEnd = jest.fn()
  const mockOnDropZoneLayout = jest.fn()
  const mockOnDropZoneUnregister = jest.fn()

  const sampleWorkout: WorkoutWithSlot = {
    templateId: 'template-1',
    name: 'Lower Body Foundation',
    phase: 'GPP',
    week: 1,
    day: 1,
    exerciseCount: 8,
    estimatedDurationMinutes: 45,
    isCompleted: false,
    isToday: false,
    isInProgress: false,
    slotPhase: 'GPP',
    slotWeek: 1,
    slotDay: 1,
  }

  const defaultProps: CalendarDayCellProps = {
    date: new Date(2026, 1, 2), // Monday Feb 2, 2026
    dateISO: '2026-02-02',
    isToday: false,
    workouts: [],
    onWorkoutPress: mockOnWorkoutPress,
    onDragStart: mockOnDragStart,
    onDragEnd: mockOnDragEnd,
    onDropZoneLayout: mockOnDropZoneLayout,
    onDropZoneUnregister: mockOnDropZoneUnregister,
  }

  beforeEach(() => {
    mockOnWorkoutPress.mockClear()
    mockOnDragStart.mockClear()
    mockOnDragEnd.mockClear()
    mockOnDropZoneLayout.mockClear()
    mockOnDropZoneUnregister.mockClear()
  })

  describe('week view (compact=false)', () => {
    it('renders without workouts', () => {
      const { root } = render(
        <CalendarDayCell {...defaultProps} />,
        { wrapper: AllTheProviders }
      )
      expect(root).toBeTruthy()
    })

    it('renders with a single workout', () => {
      const { getByText } = render(
        <CalendarDayCell {...defaultProps} workouts={[sampleWorkout]} />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('Lower Body Foundation')).toBeTruthy()
    })

    it('renders with multiple workouts', () => {
      const workouts: WorkoutWithSlot[] = [
        sampleWorkout,
        { ...sampleWorkout, templateId: 'template-2', name: 'Upper Push' },
      ]
      const { getByText } = render(
        <CalendarDayCell {...defaultProps} workouts={workouts} />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('Lower Body Foundation')).toBeTruthy()
      expect(getByText('Upper Push')).toBeTruthy()
    })
  })

  describe('compact mode (month view)', () => {
    it('renders day number in compact mode', () => {
      const { getByText } = render(
        <CalendarDayCell {...defaultProps} compact />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('2')).toBeTruthy() // Day number
    })

    it('renders workout in compact mode', () => {
      const { getByText } = render(
        <CalendarDayCell {...defaultProps} compact workouts={[sampleWorkout]} />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('Lower Body Foundation')).toBeTruthy()
    })

    it('limits displayed workouts to 3 in compact mode', () => {
      const workouts: WorkoutWithSlot[] = [
        sampleWorkout,
        { ...sampleWorkout, templateId: 'template-2', name: 'Workout 2' },
        { ...sampleWorkout, templateId: 'template-3', name: 'Workout 3' },
        { ...sampleWorkout, templateId: 'template-4', name: 'Workout 4' },
      ]
      const { getByText, queryByText } = render(
        <CalendarDayCell {...defaultProps} compact workouts={workouts} />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('Lower Body Foundation')).toBeTruthy()
      expect(getByText('Workout 2')).toBeTruthy()
      expect(getByText('Workout 3')).toBeTruthy()
      expect(queryByText('Workout 4')).toBeNull()
      expect(getByText('+1 more')).toBeTruthy()
    })
  })

  describe('states', () => {
    it('renders isToday state correctly', () => {
      const { getByText } = render(
        <CalendarDayCell {...defaultProps} isToday compact />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('2')).toBeTruthy()
    })

    it('renders drop target state correctly', () => {
      const { root } = render(
        <CalendarDayCell {...defaultProps} isDropTarget />,
        { wrapper: AllTheProviders }
      )
      expect(root).toBeTruthy()
    })

    it('renders non-current month state correctly', () => {
      const { root } = render(
        <CalendarDayCell {...defaultProps} compact isCurrentMonth={false} />,
        { wrapper: AllTheProviders }
      )
      expect(root).toBeTruthy()
    })
  })

  describe('workout states', () => {
    it('renders completed workout', () => {
      const completedWorkout = { ...sampleWorkout, isCompleted: true }
      const { getByText } = render(
        <CalendarDayCell {...defaultProps} workouts={[completedWorkout]} />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('Lower Body Foundation')).toBeTruthy()
    })

    it('renders locked workout', () => {
      const lockedWorkout = { ...sampleWorkout, isLocked: true }
      const { getByText } = render(
        <CalendarDayCell {...defaultProps} workouts={[lockedWorkout]} />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('Lower Body Foundation')).toBeTruthy()
    })

    it('renders in-progress workout', () => {
      const inProgressWorkout = { ...sampleWorkout, isInProgress: true }
      const { getByText } = render(
        <CalendarDayCell {...defaultProps} workouts={[inProgressWorkout]} />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('Lower Body Foundation')).toBeTruthy()
    })
  })
})
