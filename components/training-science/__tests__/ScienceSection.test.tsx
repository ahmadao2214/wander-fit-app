import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ScienceSection } from '../ScienceSection'
import { Layers } from '@tamagui/lucide-icons'
import { TamaguiProvider, Text } from 'tamagui'
import config from '../../../tamagui.config'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

describe('ScienceSection', () => {
  const defaultProps = {
    title: 'Test Section',
    icon: Layers,
    children: <Text>Test content</Text>,
  }

  it('renders with title in uppercase', () => {
    const { getByText } = render(
      <ScienceSection {...defaultProps} />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('TEST SECTION')).toBeTruthy()
  })

  it('renders collapsed by default', () => {
    const { queryByText } = render(
      <ScienceSection {...defaultProps} />,
      { wrapper: AllTheProviders }
    )
    // Content should not be visible when collapsed
    expect(queryByText('Test content')).toBeNull()
  })

  it('renders expanded when defaultExpanded is true', () => {
    const { getByText } = render(
      <ScienceSection {...defaultProps} defaultExpanded />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('Test content')).toBeTruthy()
  })

  it('expands when header is pressed', () => {
    const { getByText, queryByText } = render(
      <ScienceSection {...defaultProps} />,
      { wrapper: AllTheProviders }
    )

    // Initially collapsed
    expect(queryByText('Test content')).toBeNull()

    // Press the header to expand
    fireEvent.press(getByText('TEST SECTION'))

    // Now content should be visible
    expect(getByText('Test content')).toBeTruthy()
  })

  it('collapses when header is pressed again', () => {
    const { getByText, queryByText } = render(
      <ScienceSection {...defaultProps} defaultExpanded />,
      { wrapper: AllTheProviders }
    )

    // Initially expanded
    expect(getByText('Test content')).toBeTruthy()

    // Press the header to collapse
    fireEvent.press(getByText('TEST SECTION'))

    // Now content should be hidden
    expect(queryByText('Test content')).toBeNull()
  })

  it('renders with custom icon colors', () => {
    const { getByText } = render(
      <ScienceSection
        {...defaultProps}
        iconColor="$accent"
        iconBgColor="$catPowerLight"
      />,
      { wrapper: AllTheProviders }
    )
    // Component should render without errors with custom colors
    expect(getByText('TEST SECTION')).toBeTruthy()
  })

  it('renders multiple children correctly', () => {
    const { getByText } = render(
      <ScienceSection {...defaultProps} defaultExpanded>
        <Text>First child</Text>
        <Text>Second child</Text>
        <Text>Third child</Text>
      </ScienceSection>,
      { wrapper: AllTheProviders }
    )

    expect(getByText('First child')).toBeTruthy()
    expect(getByText('Second child')).toBeTruthy()
    expect(getByText('Third child')).toBeTruthy()
  })
})
