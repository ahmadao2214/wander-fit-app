import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../../tamagui.config'
import { ProfileHeader } from '../ProfileHeader'
import { MaxTiles } from '../MaxTiles'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

const program = {
  phase: 'SPP',
  week: 2,
  weeksPerPhase: 4,
  totalProgramWeeks: 12,
  skillLevel: 'Moderate',
  sportName: 'Track & Field (Throws)',
}

describe('ProfileHeader', () => {
  it('leads with the name, then level and sport', () => {
    const { getByTestId, getByText } = render(
      <ProfileHeader name="Maximiliano Fitzgerald-Okonkwo" topInset={44} program={program} />,
      { wrapper: AllTheProviders }
    )
    expect(getByTestId('profile-name').props.children).toBe('Maximiliano Fitzgerald-Okonkwo')
    expect(getByText('Moderate · Track & Field (Throws)')).toBeTruthy()
  })

  it('names the phase in full and counts the week across the whole program', () => {
    const { getByTestId, getByText } = render(
      <ProfileHeader name="Test Athlete" topInset={44} program={program} />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('Specific Physical Preparedness')).toBeTruthy()
    expect(getByTestId('profile-week').props.children).toBe('Week 6 of 12')
    expect(getByTestId('phase-track')).toBeTruthy()
  })

  it('shows only the name before there is a program', () => {
    const { getByTestId, queryByTestId } = render(
      <ProfileHeader name="Test Athlete" topInset={44} program={undefined} />,
      { wrapper: AllTheProviders }
    )
    expect(getByTestId('profile-name')).toBeTruthy()
    expect(queryByTestId('profile-week')).toBeNull()
    expect(queryByTestId('phase-track')).toBeNull()
  })

  it('leaves out a missing sport without a stray separator', () => {
    const { getByText } = render(
      <ProfileHeader name="Test Athlete" topInset={44} program={{ ...program, sportName: null }} />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('Moderate')).toBeTruthy()
  })
})

describe('MaxTiles', () => {
  const lifts = [
    { slug: 'back_squat', name: 'Back Squat', currentMax: 245 },
    { slug: 'bench_press', name: 'Bench Press', currentMax: 165 },
    { slug: 'trap_bar_deadlift', name: 'Trap Bar Deadlift', currentMax: null },
  ]

  it('shows a set max as a number with its unit', () => {
    const { getByText, getByLabelText } = render(<MaxTiles lifts={lifts} onPress={jest.fn()} />, {
      wrapper: AllTheProviders,
    })
    expect(getByText('245')).toBeTruthy()
    expect(getByLabelText('Back Squat, 245 pounds. Edit')).toBeTruthy()
  })

  it('says Add for a lift with no max, never 0', () => {
    const { getByLabelText, queryByText } = render(<MaxTiles lifts={lifts} onPress={jest.fn()} />, {
      wrapper: AllTheProviders,
    })
    expect(getByLabelText('Trap Bar Deadlift, not set. Add')).toBeTruthy()
    expect(queryByText('0')).toBeNull()
  })

  it('opens the lift that was pressed', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(<MaxTiles lifts={lifts} onPress={onPress} />, {
      wrapper: AllTheProviders,
    })
    fireEvent.press(getByTestId('max-row-bench_press'))
    expect(onPress).toHaveBeenCalledWith('bench_press')
  })
})
