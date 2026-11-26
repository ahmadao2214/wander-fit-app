import React from 'react'
import { render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'
import { SportThemeProof } from '../SportThemeProof'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

describe('SportThemeProof', () => {
  it('renders both basketball themes by default', () => {
    const { getByTestId, getAllByText } = render(<SportThemeProof />, { wrapper: AllTheProviders })
    expect(getByTestId('sport-theme-proof-chalkboard')).toBeTruthy()
    expect(getByTestId('sport-theme-proof-whiteboard')).toBeTruthy()
    expect(getAllByText('Build')).toHaveLength(2)
    expect(getAllByText('Log Set')).toHaveLength(2)
  })

  it('renders one theme when named', () => {
    const { queryByTestId, getAllByText } = render(<SportThemeProof theme="whiteboard" />, {
      wrapper: AllTheProviders,
    })
    expect([
      queryByTestId('sport-theme-proof-whiteboard') !== null,
      queryByTestId('sport-theme-proof-chalkboard'),
    ]).toEqual([true, null])
    expect(getAllByText('Build')).toHaveLength(1)
  })
})
