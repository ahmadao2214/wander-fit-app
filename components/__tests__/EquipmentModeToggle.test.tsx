import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'

import config from '../../tamagui.config'
import { EquipmentModeToggle } from '../EquipmentModeToggle'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

describe('EquipmentModeToggle', () => {
  it('renders both equipment mode options', () => {
    render(
      <EquipmentModeToggle value="gym" onChange={jest.fn()} />,
      { wrapper: AllTheProviders }
    )

    expect(screen.getByText('Gym')).toBeTruthy()
    expect(screen.getByText('Home')).toBeTruthy()
  })

  it('calls onChange when a new mode is selected', () => {
    const onChange = jest.fn()

    render(
      <EquipmentModeToggle value="gym" onChange={onChange} />,
      { wrapper: AllTheProviders }
    )

    fireEvent.press(screen.getByLabelText('Home mode'))

    expect(onChange).toHaveBeenCalledWith('home')
  })
})
