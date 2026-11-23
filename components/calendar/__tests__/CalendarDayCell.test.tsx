import React from 'react'
import { render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../../tamagui.config'
import {
  CalendarDayCell,
  CalendarDayCellProps,
  WorkoutWithSlot,
  STACK_FONT_SCALE,
} from '../CalendarDayCell'

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

// Jest's mocked screen reports fontScale 2; phones default to 1
const mockFontScale = { value: 1 }
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 402, height: 874, scale: 3, fontScale: mockFontScale.value }),
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
    mockFontScale.value = 1
    mockOnWorkoutPress.mockClear()
    mockOnDragStart.mockClear()
    mockOnDragEnd.mockClear()
    mockOnDropZoneLayout.mockClear()
    mockOnDropZoneUnregister.mockClear()
  })

  describe('week view (compact=false)', () => {
    it('shows the weekday and date beside the day', () => {
      const { getByText } = render(
        <CalendarDayCell {...defaultProps} workouts={[sampleWorkout]} />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('Mon')).toBeTruthy()
      expect(getByText('2')).toBeTruthy()
    })

    it('says Rest on a day with no workout, and names it for screen readers', () => {
      const { getByText, getByLabelText } = render(<CalendarDayCell {...defaultProps} />, {
        wrapper: AllTheProviders,
      })
      // The row's label already says "rest day", so the word itself is hidden
      expect(getByText('Rest', { includeHiddenElements: true })).toBeTruthy()
      expect(getByLabelText('Monday, February 2, rest day')).toBeTruthy()
    })

    it('names today for screen readers and drops Rest on a workout day', () => {
      const { getByLabelText, queryByText } = render(
        <CalendarDayCell {...defaultProps} isToday workouts={[sampleWorkout]} />,
        { wrapper: AllTheProviders }
      )
      expect(getByLabelText('Monday, February 2, today')).toBeTruthy()
      expect(queryByText('Rest')).toBeNull()
    })

    it('puts the date on one line above the cards at accessibility text sizes', () => {
      mockFontScale.value = STACK_FONT_SCALE
      const { getByText, queryByText } = render(
        <CalendarDayCell {...defaultProps} isToday workouts={[sampleWorkout]} />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('Mon 2')).toBeTruthy()
      expect(getByText('Today')).toBeTruthy()
      expect(queryByText('Mon')).toBeNull()
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
      const { getByText } = render(<CalendarDayCell {...defaultProps} workouts={workouts} />, {
        wrapper: AllTheProviders,
      })
      expect(getByText('Lower Body Foundation')).toBeTruthy()
      expect(getByText('Upper Push')).toBeTruthy()
    })
  })

  describe('compact mode (month view)', () => {
    it('renders day number in compact mode', () => {
      const { getByText } = render(<CalendarDayCell {...defaultProps} compact />, {
        wrapper: AllTheProviders,
      })
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
      const { getByText, queryByText, getByLabelText } = render(
        <CalendarDayCell {...defaultProps} compact workouts={workouts} />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('Lower Body Foundation')).toBeTruthy()
      expect(getByText('Workout 2')).toBeTruthy()
      expect(getByText('Workout 3')).toBeTruthy()
      expect(queryByText('Workout 4')).toBeNull()
      // A 12pt "+1" fits the narrow month cell; VoiceOver hears the full phrase
      expect(getByText('+1')).toBeTruthy()
      expect(getByLabelText('1 more workout')).toBeTruthy()
    })
  })

  describe('states', () => {
    it('renders isToday state correctly', () => {
      const { getByText } = render(<CalendarDayCell {...defaultProps} isToday compact />, {
        wrapper: AllTheProviders,
      })
      expect(getByText('2')).toBeTruthy()
    })

    it('renders drop target state correctly', () => {
      const { root } = render(<CalendarDayCell {...defaultProps} isDropTarget />, {
        wrapper: AllTheProviders,
      })
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
