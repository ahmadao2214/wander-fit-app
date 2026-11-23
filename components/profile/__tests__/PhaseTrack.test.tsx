import React from 'react'
import { render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../../tamagui.config'
import { PhaseTrack } from '../PhaseTrack'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

// The segments are hidden from the accessibility tree, so queries opt in
const hidden = { includeHiddenElements: true }

describe('PhaseTrack', () => {
  it('renders three segments in phase order', () => {
    const { getByTestId, getByText } = render(
      <PhaseTrack phase="GPP" week={3} weeksPerPhase={4} totalProgramWeeks={12} />,
      { wrapper: AllTheProviders }
    )
    for (const phase of ['GPP', 'SPP', 'SSP']) {
      expect(getByTestId(`phase-track-segment-${phase}`, hidden)).toBeTruthy()
      expect(getByText(phase, hidden)).toBeTruthy()
    }
  })

  it('labels the current phase by week and the others by length', () => {
    const { getByText, getAllByText } = render(
      <PhaseTrack phase="SPP" week={2} weeksPerPhase={4} totalProgramWeeks={12} />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('Week 2 of 4', hidden)).toBeTruthy()
    expect(getAllByText('4 weeks', hidden)).toHaveLength(2)
  })

  it('fills earlier phases, part of the current one, and none of the later', () => {
    const { getByTestId } = render(
      <PhaseTrack phase="SPP" week={2} weeksPerPhase={4} totalProgramWeeks={12} />,
      { wrapper: AllTheProviders }
    )
    expect(getByTestId('phase-track-fill-GPP', hidden)).toHaveStyle({ width: '100%' })
    expect(getByTestId('phase-track-fill-SPP', hidden)).toHaveStyle({ width: '50%' })
    expect(getByTestId('phase-track-fill-SSP', hidden)).toHaveStyle({ width: '0%' })
  })

  it('marks the current phase in the brighter text colour', () => {
    const { getByText } = render(
      <PhaseTrack phase="SSP" week={1} weeksPerPhase={4} totalProgramWeeks={12} />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('SSP', hidden)).toHaveStyle({ color: '#F8FAFC' })
    expect(getByText('GPP', hidden)).toHaveStyle({ color: '#94A3B8' })
  })

  it('is one progress bar with one spoken label', () => {
    const { getByRole, queryByText } = render(
      <PhaseTrack phase="GPP" week={3} weeksPerPhase={4} totalProgramWeeks={12} />,
      { wrapper: AllTheProviders }
    )
    const bar = getByRole('progressbar')
    expect(bar.props.accessibilityLabel).toBe(
      'Week 3 of 12. GPP, week 3 of 4. SPP, 4 weeks. SSP, 4 weeks.'
    )
    // The texts inside don't reach VoiceOver on their own
    expect(queryByText('Week 3 of 4')).toBeNull()
  })

  it('takes a testID', () => {
    const { getByTestId } = render(
      <PhaseTrack phase="GPP" week={1} testID="profile-phase-track" />,
      { wrapper: AllTheProviders }
    )
    expect(getByTestId('profile-phase-track')).toBeTruthy()
    expect(getByTestId('profile-phase-track-segment-SSP', hidden)).toBeTruthy()
  })
})
