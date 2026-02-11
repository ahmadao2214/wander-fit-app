import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../../tamagui.config'
import { CalendarWorkoutCard, CalendarWorkoutCardProps } from '../CalendarWorkoutCard'

// Wrapper for Tamagui components
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

describe('CalendarWorkoutCard', () => {
  const mockOnPress = jest.fn()
  const mockOnLongPress = jest.fn()

  const defaultProps: CalendarWorkoutCardProps = {
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
    onPress: mockOnPress,
    onLongPress: mockOnLongPress,
  }

  beforeEach(() => {
    mockOnPress.mockClear()
    mockOnLongPress.mockClear()
  })

  describe('week view (compact=false)', () => {
    it('renders workout name', () => {
      const { getByText } = render(
        <CalendarWorkoutCard {...defaultProps} />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('Lower Body Foundation')).toBeTruthy()
    })

    it('renders phase badge', () => {
      const { getByText } = render(
        <CalendarWorkoutCard {...defaultProps} />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('GPP')).toBeTruthy()
    })

    it('renders exercise count', () => {
      const { getByText } = render(
        <CalendarWorkoutCard {...defaultProps} />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('8 exercises')).toBeTruthy()
    })

    it('renders duration', () => {
      const { getByText } = render(
        <CalendarWorkoutCard {...defaultProps} />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('~45m')).toBeTruthy()
    })

    it('renders SPP phase correctly', () => {
      const { getByText } = render(
        <CalendarWorkoutCard {...defaultProps} phase="SPP" />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('SPP')).toBeTruthy()
    })

    it('renders SSP phase correctly', () => {
      const { getByText } = render(
        <CalendarWorkoutCard {...defaultProps} phase="SSP" />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('SSP')).toBeTruthy()
    })
  })

  describe('compact mode (month view)', () => {
    it('renders workout name in compact mode', () => {
      const { getByText } = render(
        <CalendarWorkoutCard {...defaultProps} compact />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('Lower Body Foundation')).toBeTruthy()
    })

    it('does not render exercise count in compact mode', () => {
      const { queryByText } = render(
        <CalendarWorkoutCard {...defaultProps} compact />,
        { wrapper: AllTheProviders }
      )
      expect(queryByText('8 exercises')).toBeNull()
    })
  })

  describe('states', () => {
    it('renders completed state', () => {
      const { getByText } = render(
        <CalendarWorkoutCard {...defaultProps} isCompleted />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('Lower Body Foundation')).toBeTruthy()
    })

    it('renders in-progress state', () => {
      const { getByText } = render(
        <CalendarWorkoutCard {...defaultProps} isInProgress />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('Lower Body Foundation')).toBeTruthy()
    })

    it('renders locked state', () => {
      const { getByText } = render(
        <CalendarWorkoutCard {...defaultProps} isLocked />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('Lower Body Foundation')).toBeTruthy()
    })

    it('renders isToday state', () => {
      const { getByText } = render(
        <CalendarWorkoutCard {...defaultProps} isToday />,
        { wrapper: AllTheProviders }
      )
      expect(getByText('Lower Body Foundation')).toBeTruthy()
    })
  })

  describe('interactions', () => {
    it('calls onPress when pressed (unlocked)', () => {
      const { getByText } = render(
        <CalendarWorkoutCard {...defaultProps} />,
        { wrapper: AllTheProviders }
      )

      fireEvent.press(getByText('Lower Body Foundation'))
      expect(mockOnPress).toHaveBeenCalled()
    })

    it('renders locked card correctly (onPress is undefined when locked)', () => {
      // When isLocked is true, the component renders with onPress={undefined}
      // This test verifies the locked card renders without errors
      const { getByText } = render(
        <CalendarWorkoutCard {...defaultProps} isLocked />,
        { wrapper: AllTheProviders }
      )

      expect(getByText('Lower Body Foundation')).toBeTruthy()
      expect(getByText('GPP')).toBeTruthy()
    })
  })
})
