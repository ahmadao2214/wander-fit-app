import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../../tamagui.config'
import { CalendarWorkoutCard, CalendarWorkoutCardProps } from '../CalendarWorkoutCard'

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
    mockFontScale.value = 1
    mockOnPress.mockClear()
    mockOnLongPress.mockClear()
  })

  describe('week view (compact=false)', () => {
    it('renders workout name', () => {
      const { getByText } = render(<CalendarWorkoutCard {...defaultProps} />, {
        wrapper: AllTheProviders,
      })
      expect(getByText('Lower Body Foundation')).toBeTruthy()
    })

    it('shows phase by color only, with no phase label on the card', () => {
      const { queryByText } = render(<CalendarWorkoutCard {...defaultProps} />, {
        wrapper: AllTheProviders,
      })
      expect(queryByText('GPP')).toBeNull()
    })

    it('names the phase, workout and time for screen readers', () => {
      const { getByLabelText } = render(<CalendarWorkoutCard {...defaultProps} isToday />, {
        wrapper: AllTheProviders,
      })
      expect(
        getByLabelText('GPP workout, Lower Body Foundation, about 45 minutes, 8 exercises, today')
      ).toBeTruthy()
    })

    it('shows how many main exercises, not a cut-off list of names', () => {
      const { getByText, queryByText } = render(<CalendarWorkoutCard {...defaultProps} />, {
        wrapper: AllTheProviders,
      })
      expect(getByText('~45 min · 8 exercises')).toBeTruthy()
      expect(queryByText(/more$/)).toBeNull()
    })

    it('shows the time alone when there is no exercise count', () => {
      const { getByText } = render(<CalendarWorkoutCard {...defaultProps} exerciseCount={0} />, {
        wrapper: AllTheProviders,
      })
      expect(getByText('~45 min')).toBeTruthy()
    })

    it('says "1 exercise" in the singular', () => {
      const { getByText } = render(<CalendarWorkoutCard {...defaultProps} exerciseCount={1} />, {
        wrapper: AllTheProviders,
      })
      expect(getByText('~45 min · 1 exercise')).toBeTruthy()
    })

    it('offers each open day to VoiceOver as a move, since dragging needs a held finger', () => {
      const onMove = jest.fn()
      const moveTargets = [
        { dateISO: '2026-11-18', label: 'Wednesday' },
        { dateISO: '2026-11-19', label: 'Thursday' },
      ]
      const { getByLabelText } = render(
        <CalendarWorkoutCard {...defaultProps} moveTargets={moveTargets} onMove={onMove} />,
        { wrapper: AllTheProviders }
      )
      const card = getByLabelText(/^GPP workout/)
      expect(card.props.accessibilityActions).toEqual([
        { name: '2026-11-18', label: 'Move to Wednesday' },
        { name: '2026-11-19', label: 'Move to Thursday' },
      ])
      fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: '2026-11-19' } })
      expect(onMove).toHaveBeenCalledWith('2026-11-19')
    })

    it("offers no moves for a done or locked workout, which can't be dragged either", () => {
      const moveTargets = [{ dateISO: '2026-11-18', label: 'Wednesday' }]
      for (const state of [{ isCompleted: true }, { isLocked: true }]) {
        const { getByLabelText, unmount } = render(
          <CalendarWorkoutCard
            {...defaultProps}
            {...state}
            moveTargets={moveTargets}
            onMove={jest.fn()}
          />,
          { wrapper: AllTheProviders }
        )
        expect({
          state,
          actions: getByLabelText(/^GPP workout/).props.accessibilityActions,
        }).toEqual({ state, actions: undefined })
        unmount()
      }
    })

    it('clamps the name to three lines, but not at accessibility text sizes', () => {
      const normal = render(<CalendarWorkoutCard {...defaultProps} />, { wrapper: AllTheProviders })
      expect(normal.getByText('Lower Body Foundation').props.numberOfLines).toBe(3)
      normal.unmount()
      mockFontScale.value = 2
      const large = render(<CalendarWorkoutCard {...defaultProps} />, { wrapper: AllTheProviders })
      expect(large.getByText('Lower Body Foundation').props.numberOfLines).toBeUndefined()
    })

    it('is a button to screen readers', () => {
      const { getByLabelText } = render(<CalendarWorkoutCard {...defaultProps} />, {
        wrapper: AllTheProviders,
      })
      expect(getByLabelText(/^GPP workout/).props.accessibilityRole).toBe('button')
    })

    it('puts SPP and SSP in the accessibility label', () => {
      const spp = render(<CalendarWorkoutCard {...defaultProps} phase="SPP" />, {
        wrapper: AllTheProviders,
      })
      expect(spp.getByLabelText(/^SPP workout/)).toBeTruthy()
      const ssp = render(<CalendarWorkoutCard {...defaultProps} phase="SSP" isLocked />, {
        wrapper: AllTheProviders,
      })
      expect(ssp.getByLabelText(/^SSP workout.*locked$/)).toBeTruthy()
    })
  })

  describe('compact mode (month view)', () => {
    it('renders workout name in compact mode', () => {
      const { getByText } = render(<CalendarWorkoutCard {...defaultProps} compact />, {
        wrapper: AllTheProviders,
      })
      expect(getByText('Lower Body Foundation')).toBeTruthy()
    })

    it('does not render exercise preview in compact mode', () => {
      const { queryByText } = render(<CalendarWorkoutCard {...defaultProps} compact />, {
        wrapper: AllTheProviders,
      })
      // Exercise preview not shown in compact mode
      expect(queryByText('Back Squat')).toBeNull()
      expect(queryByText('+3 more')).toBeNull()
    })
  })

  describe('states', () => {
    it('renders completed state', () => {
      const { getByText } = render(<CalendarWorkoutCard {...defaultProps} isCompleted />, {
        wrapper: AllTheProviders,
      })
      expect(getByText('Lower Body Foundation')).toBeTruthy()
    })

    it('renders in-progress state', () => {
      const { getByText } = render(<CalendarWorkoutCard {...defaultProps} isInProgress />, {
        wrapper: AllTheProviders,
      })
      expect(getByText('Lower Body Foundation')).toBeTruthy()
    })

    it('renders locked state', () => {
      const { getByText } = render(<CalendarWorkoutCard {...defaultProps} isLocked />, {
        wrapper: AllTheProviders,
      })
      expect(getByText('Lower Body Foundation')).toBeTruthy()
    })

    it('renders isToday state', () => {
      const { getByText } = render(<CalendarWorkoutCard {...defaultProps} isToday />, {
        wrapper: AllTheProviders,
      })
      expect(getByText('Lower Body Foundation')).toBeTruthy()
    })

    it('labels an in-progress card as in progress', () => {
      const { getByLabelText } = render(
        <CalendarWorkoutCard {...defaultProps} isToday isInProgress />,
        { wrapper: AllTheProviders }
      )
      expect(getByLabelText(/in progress$/)).toBeTruthy()
    })
  })

  describe('interactions', () => {
    it('calls onPress when pressed (unlocked)', () => {
      const { getByText } = render(<CalendarWorkoutCard {...defaultProps} />, {
        wrapper: AllTheProviders,
      })

      fireEvent.press(getByText('Lower Body Foundation'))
      expect(mockOnPress).toHaveBeenCalled()
    })

    it('renders locked card correctly (onPress is undefined when locked)', () => {
      // When isLocked is true, the component renders with onPress={undefined}
      // This test verifies the locked card renders without errors
      const { getByText } = render(<CalendarWorkoutCard {...defaultProps} isLocked />, {
        wrapper: AllTheProviders,
      })

      expect(getByText('Lower Body Foundation')).toBeTruthy()
    })
  })
})
