import React from 'react'
import { render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../../tamagui.config'
import { CalendarWeekView, CalendarWeekViewProps, CalendarWorkout } from '../CalendarWeekView'
import { formatDateISO, startOfWeek, addDays } from '../../../lib/calendarUtils'

// The day row is what's under test here, not the gesture-handler card
jest.mock('../DraggableWorkoutCard', () => ({
  DraggableWorkoutCard: ({ name }: { name: string }) => {
    const React = require('react')
    const { Text } = require('react-native')
    return React.createElement(Text, null, name)
  },
}))

// Jest's mocked screen reports fontScale 2; phones default to 1
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 402, height: 874, scale: 3, fontScale: 1 }),
}))

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

function workout(name: string, day: number): CalendarWorkout {
  return {
    templateId: `t-${day}`,
    name,
    phase: 'GPP',
    week: 1,
    day,
    exerciseCount: 5,
    estimatedDurationMinutes: 28,
    isCompleted: false,
    isToday: false,
    isInProgress: false,
  }
}

describe('CalendarWeekView', () => {
  // This week, so the list opens on it and "today" falls inside it
  const sunday = startOfWeek(new Date())
  const days = Array.from({ length: 7 }, (_, i) => addDays(sunday, i))
  const iso = days.map(formatDateISO)

  const calendarData: CalendarWeekViewProps['calendarData'] = {
    [iso[1]]: { date: iso[1], workouts: [workout('Lower Body Foundation', 1)] },
    [iso[3]]: { date: iso[3], workouts: [workout('Upper Push/Pull', 2)] },
    [iso[5]]: { date: iso[5], workouts: [workout('Power & Conditioning', 3)] },
  }

  const props: CalendarWeekViewProps = {
    calendarData,
    currentWeek: sunday,
    onWeekChange: jest.fn(),
    programStartDate: iso[0],
    programEndDate: iso[6],
  }

  it('lists all seven days as one week, Sunday to Saturday', () => {
    const { getAllByTestId } = render(<CalendarWeekView {...props} />, { wrapper: AllTheProviders })
    const rows = getAllByTestId(/^week-day-/).map((row) => row.props.testID)
    expect(rows).toEqual(iso.map((d) => `week-day-${d}`))
  })

  it('puts each workout on its own day and marks the other days Rest', () => {
    const { getByTestId, getAllByText } = render(<CalendarWeekView {...props} />, { wrapper: AllTheProviders })
    expect(getByTestId(`week-day-${iso[1]}`)).toHaveTextContent(/Lower Body Foundation/)
    expect(getByTestId(`week-day-${iso[3]}`)).toHaveTextContent(/Upper Push\/Pull/)
    expect(getByTestId(`week-day-${iso[5]}`)).toHaveTextContent(/Power & Conditioning/)
    expect(getAllByText('Rest', { includeHiddenElements: true })).toHaveLength(4)
  })

  it('names today for screen readers', () => {
    const today = new Date()
    const { getAllByLabelText } = render(<CalendarWeekView {...props} />, { wrapper: AllTheProviders })
    const todays = getAllByLabelText(/, today/)
    expect(todays).toHaveLength(1)
    expect(todays[0].props.accessibilityLabel).toContain(`${today.getDate()}`)
  })

  it('labels the week arrows', () => {
    // Only the arrow that has a week to go to is shown; here the program is one week
    const { queryByLabelText } = render(
      <CalendarWeekView {...props} programEndDate={formatDateISO(addDays(sunday, 13))} calendarData={{
        ...calendarData,
        [formatDateISO(addDays(sunday, 8))]: { date: '', workouts: [workout('Next Week', 4)] },
      }} />,
      { wrapper: AllTheProviders }
    )
    expect(queryByLabelText('Next week')).toBeTruthy()
    expect(queryByLabelText('Previous week')).toBeNull()
  })
})
