import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'

import config from '../../../tamagui.config'
import { EquipmentModeBadge } from '../EquipmentModeBadge'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

describe('EquipmentModeBadge', () => {
  it('renders the selected execution mode label', () => {
    render(
      <EquipmentModeBadge mode="home" />,
      { wrapper: AllTheProviders }
    )

    expect(screen.getByText('Home setup')).toBeTruthy()
  })
})
