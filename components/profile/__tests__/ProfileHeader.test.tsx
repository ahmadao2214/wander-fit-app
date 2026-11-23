import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../../tamagui.config'
import { ProfileHeader } from '../ProfileHeader'
import { MaxTiles, MaxTilesPlaceholder } from '../MaxTiles'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

const program = {
  phase: 'SPP',
  week: 2,
  weeksPerPhase: 4,
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

  it('counts to the end of the three phases, not to the season', () => {
    const { getByTestId } = render(
      <ProfileHeader
        name="Test Athlete"
        topInset={44}
        program={{ ...program, phase: 'GPP', week: 1, weeksPerPhase: 5 }}
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByTestId('profile-week').props.children).toBe('Week 1 of 15')
  })

  it('says the day when it knows it', () => {
    const { getByTestId } = render(
      <ProfileHeader name="Test Athlete" topInset={44} program={{ ...program, day: 3 }} />,
      { wrapper: AllTheProviders }
    )
    expect(getByTestId('profile-week').props.children).toBe('Week 6 of 12 · Day 3')
  })

  it("holds the phase block's place while the program loads", () => {
    const { getByTestId, queryByTestId } = render(
      <ProfileHeader name="Test Athlete" topInset={44} loading program={undefined} />,
      { wrapper: AllTheProviders }
    )
    expect(getByTestId('profile-phase-loading')).toBeTruthy()
    expect(queryByTestId('phase-track')).toBeNull()
  })

  it('keeps a long name to two lines and lets it shrink to fit', () => {
    const { getByTestId } = render(
      <ProfileHeader name="Maximiliano Fitzgerald-Okonkwo" topInset={44} program={program} />,
      { wrapper: AllTheProviders }
    )
    const name = getByTestId('profile-name')
    expect(name.props.numberOfLines).toBe(2)
    expect(name.props.adjustsFontSizeToFit).toBe(true)
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
    const { getByText, getByLabelText } = render(
      <MaxTiles lifts={lifts} onPress={jest.fn()} onAddAll={jest.fn()} />,
      {
        wrapper: AllTheProviders,
      }
    )
    expect(getByText('245')).toBeTruthy()
    expect(getByLabelText('Back Squat, 245 pounds. Edit')).toBeTruthy()
  })

  it('says Add for a lift with no max, never 0', () => {
    const { getByLabelText, queryByText } = render(
      <MaxTiles lifts={lifts} onPress={jest.fn()} onAddAll={jest.fn()} />,
      {
        wrapper: AllTheProviders,
      }
    )
    expect(getByLabelText('Trap Bar Deadlift, not set. Add')).toBeTruthy()
    expect(queryByText('0')).toBeNull()
  })

  it('opens the lift that was pressed', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(
      <MaxTiles lifts={lifts} onPress={onPress} onAddAll={jest.fn()} />,
      {
        wrapper: AllTheProviders,
      }
    )
    fireEvent.press(getByTestId('max-row-bench_press'))
    expect(onPress).toHaveBeenCalledWith('bench_press')
  })

  it('is one prompt when no max is set, and opens every lift at once', () => {
    const unset = lifts.map((lift) => ({ ...lift, currentMax: null }))
    const onAddAll = jest.fn()
    const { getByTestId, getByText, queryByTestId } = render(
      <MaxTiles lifts={unset} onPress={jest.fn()} onAddAll={onAddAll} />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('Add your maxes')).toBeTruthy()
    expect(getByText('Back Squat, Bench Press, Trap Bar Deadlift')).toBeTruthy()
    expect(queryByTestId('max-row-back_squat')).toBeNull()
    fireEvent.press(getByTestId('max-add-all'))
    expect(onAddAll).toHaveBeenCalledTimes(1)
  })

  it('has a placeholder the same shape for while the maxes load', () => {
    const { getByTestId } = render(<MaxTilesPlaceholder />, { wrapper: AllTheProviders })
    expect(getByTestId('max-tiles-loading')).toBeTruthy()
  })
})
