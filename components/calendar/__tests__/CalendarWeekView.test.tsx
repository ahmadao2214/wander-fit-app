import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../../tamagui.config'
import { CalendarWeekView, CalendarWeekViewProps, CalendarWorkout, clipToViewport } from '../CalendarWeekView'
import { formatDateISO, startOfWeek, addDays } from '../../../lib/calendarUtils'

// The day row is what's under test here, not the gesture-handler card
jest.mock('../DraggableWorkoutCard', () => ({
  DraggableWorkoutCard: ({ name, moveTargets, onMove }: {
    name: string
    moveTargets?: { dateISO: string; label: string }[]
    onMove?: (dateISO: string) => void
  }) => {
    const React = require('react')
    const { Text } = require('react-native')
    return React.createElement(Text, {
      testID: `card-${name}`,
      accessibilityActions: moveTargets?.map((t) => ({ name: t.dateISO, label: `Move to ${t.label}` })),
      onAccessibilityAction: (e: { nativeEvent: { actionName: string } }) => onMove?.(e.nativeEvent.actionName),
    }, name)
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
    const rows = getAllByTestId(/^week-day-\d/).map((row) => row.props.testID)
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

  it('re-measures days when a drag starts, and only the visible part of each takes a drop', () => {
    // The list shows from y=200 to y=700. It has scrolled, so Sunday sits
    // above it, Monday is cut off at the top, and Tuesday is in full view.
    const rects: Record<string, [number, number, number, number]> = {
      'week-pages': [0, 200, 402, 500],
      [`week-day-${iso[0]}`]: [12, 100, 378, 56],
      [`week-day-${iso[1]}`]: [12, 170, 378, 56],
      [`week-day-${iso[2]}`]: [12, 300, 378, 56],
    }
    // React Native's Jest View keeps measureInWindow on its prototype
    const { View } = require('react-native')
    const measure = jest
      .spyOn(View.prototype, 'measureInWindow')
      .mockImplementation(function (this: { props: { testID?: string } }, ...args: unknown[]) {
        const cb = args[0] as (x: number, y: number, w: number, h: number) => void
        const r = this.props.testID ? rects[this.props.testID] : undefined
        if (r) cb(...r)
      })
    const onDropZoneLayout = jest.fn()
    const onDropZoneUnregister = jest.fn()
    const dragProps = { ...props, onDropZoneLayout, onDropZoneUnregister }
    try {
      const { getByTestId, rerender } = render(<CalendarWeekView {...dragProps} />, { wrapper: AllTheProviders })
      fireEvent(getByTestId('week-pages'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 402, height: 500 } } })
      onDropZoneLayout.mockClear()
      onDropZoneUnregister.mockClear()

      rerender(<CalendarWeekView {...dragProps} dragSourceSlot={{ phase: 'GPP', week: 1, day: 1 }} />)
    } finally {
      measure.mockRestore()
    }

    expect(onDropZoneUnregister).toHaveBeenCalledWith(iso[0])
    expect(onDropZoneLayout).toHaveBeenCalledWith(iso[1], { x: 12, y: 200, width: 378, height: 26 })
    expect(onDropZoneLayout).toHaveBeenCalledWith(iso[2], { x: 12, y: 300, width: 378, height: 56 })
    expect(onDropZoneLayout.mock.calls.map(([d]) => d)).not.toContain(iso[0])
  })

  it('lets VoiceOver move a workout to any other day of a future week', () => {
    // Next week, so no day is in the past
    const next = days.map((d) => addDays(d, 7))
    const nextIso = next.map(formatDateISO)
    const onMoveWorkout = jest.fn()
    const { getByTestId } = render(
      <CalendarWeekView
        {...props}
        currentWeek={next[0]}
        programStartDate={nextIso[0]}
        programEndDate={nextIso[6]}
        calendarData={{ [nextIso[3]]: { date: nextIso[3], workouts: [workout('Upper Push/Pull', 2)] } }}
        onMoveWorkout={onMoveWorkout}
      />,
      { wrapper: AllTheProviders }
    )
    const card = getByTestId('card-Upper Push/Pull')
    expect(card.props.accessibilityActions.map((a: { label: string }) => a.label)).toEqual([
      'Move to Sunday', 'Move to Monday', 'Move to Tuesday', 'Move to Thursday', 'Move to Friday', 'Move to Saturday',
    ])
    fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: nextIso[5] } })
    expect(onMoveWorkout).toHaveBeenCalledWith('GPP', 1, 2, nextIso[5])
  })

  it("doesn't offer a day whose workout is done, which the server won't swap with", () => {
    const next = days.map((d) => addDays(d, 7))
    const nextIso = next.map(formatDateISO)
    const { getByTestId } = render(
      <CalendarWeekView
        {...props}
        currentWeek={next[0]}
        programStartDate={nextIso[0]}
        programEndDate={nextIso[6]}
        calendarData={{
          [nextIso[1]]: { date: nextIso[1], workouts: [{ ...workout('Lower Body Foundation', 1), isCompleted: true }] },
          [nextIso[3]]: { date: nextIso[3], workouts: [workout('Upper Push/Pull', 2)] },
        }}
        onMoveWorkout={jest.fn()}
      />,
      { wrapper: AllTheProviders }
    )
    const labels = getByTestId('card-Upper Push/Pull').props.accessibilityActions.map((a: { label: string }) => a.label)
    expect(labels).not.toContain('Move to Monday')
    expect(labels).toContain('Move to Tuesday')
  })

  it('still offers a day where a different, rescheduled workout was finished', () => {
    // Monday's workout was finished on Tuesday, so it shows on both days.
    // Tuesday's own workout isn't done, so the server would swap with it.
    const next = days.map((d) => addDays(d, 7))
    const nextIso = next.map(formatDateISO)
    const done = { ...workout('Lower Body Foundation', 1), isCompleted: true, completedOnDate: nextIso[2] }
    const { getByTestId } = render(
      <CalendarWeekView
        {...props}
        currentWeek={next[0]}
        programStartDate={nextIso[0]}
        programEndDate={nextIso[6]}
        calendarData={{
          [nextIso[1]]: { date: nextIso[1], workouts: [done] },
          [nextIso[2]]: { date: nextIso[2], workouts: [workout('Mobility Reset', 4), done] },
          [nextIso[3]]: { date: nextIso[3], workouts: [workout('Upper Push/Pull', 2)] },
        }}
        onMoveWorkout={jest.fn()}
      />,
      { wrapper: AllTheProviders }
    )
    const labels = getByTestId('card-Upper Push/Pull').props.accessibilityActions.map((a: { label: string }) => a.label)
    expect(labels).toContain('Move to Tuesday')
    expect(labels).not.toContain('Move to Monday')
  })

  it('dims a day whose workout is done while dragging, since it takes no drop', () => {
    const next = days.map((d) => addDays(d, 7))
    const nextIso = next.map(formatDateISO)
    const { getByTestId } = render(
      <CalendarWeekView
        {...props}
        currentWeek={next[0]}
        programStartDate={nextIso[0]}
        programEndDate={nextIso[6]}
        calendarData={{
          [nextIso[1]]: { date: nextIso[1], workouts: [{ ...workout('Lower Body Foundation', 1), isCompleted: true }] },
          [nextIso[3]]: { date: nextIso[3], workouts: [workout('Upper Push/Pull', 2)] },
        }}
        dragSourceSlot={{ phase: 'GPP', week: 1, day: 2 }}
      />,
      { wrapper: AllTheProviders }
    )
    const row = (iso: string) => getByTestId(`week-day-row-${iso}`)
    expect(row(nextIso[1])).toHaveStyle({ opacity: 0.4 })
    expect(row(nextIso[2])).not.toHaveStyle({ opacity: 0.4 })
  })

  it('never offers a day that has already passed', () => {
    const { getByTestId } = render(<CalendarWeekView {...props} onMoveWorkout={jest.fn()} />, { wrapper: AllTheProviders })
    const today = new Date()
    const offered: string[] = getByTestId('card-Power & Conditioning').props.accessibilityActions?.map((a: { name: string }) => a.name) ?? []
    const past = offered.filter((iso) => iso < formatDateISO(today))
    expect(past).toEqual([])
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

describe('clipToViewport', () => {
  // The day list on screen: below the header, above the tab bar
  const viewport = { y: 200, height: 500 }

  it('keeps a row that is fully in view', () => {
    const row = { x: 12, y: 300, width: 378, height: 56 }
    expect(clipToViewport(row, viewport)).toEqual(row)
  })

  it('trims a row cut off at the top, so the header above takes no drop', () => {
    expect(clipToViewport({ x: 12, y: 170, width: 378, height: 56 }, viewport)).toEqual({ x: 12, y: 200, width: 378, height: 26 })
  })

  it('drops a row scrolled out of view, which would sit under the header or tab bar', () => {
    expect(clipToViewport({ x: 12, y: 100, width: 378, height: 56 }, viewport)).toBeNull()
    expect(clipToViewport({ x: 12, y: 760, width: 378, height: 56 }, viewport)).toBeNull()
  })

  it('passes the row through before the list has been measured', () => {
    const row = { x: 12, y: 100, width: 378, height: 56 }
    expect(clipToViewport(row, null)).toEqual(row)
  })
})
