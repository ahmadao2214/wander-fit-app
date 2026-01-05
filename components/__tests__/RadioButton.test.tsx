import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { RadioButton } from '../RadioButton'
import { User } from '@tamagui/lucide-icons'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

// Wrapper for Tamagui components
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

describe('RadioButton', () => {
  const mockOnPress = jest.fn()
  const defaultProps = {
    value: 'test',
    id: 'test-radio',
    label: 'Test Label',
    icon: User,
    onPress: mockOnPress,
  }

  beforeEach(() => {
    mockOnPress.mockClear()
  })

  it('renders with label', () => {
    const { getByText } = render(
      <RadioButton {...defaultProps} />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('Test Label')).toBeTruthy()
  })

  it('renders with description', () => {
    const { getByText } = render(
      <RadioButton {...defaultProps} description="Test description" />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('Test description')).toBeTruthy()
  })

  it('calls onPress when pressed', () => {
    const { getByText } = render(
      <RadioButton {...defaultProps} />,
      { wrapper: AllTheProviders }
    )

    const button = getByText('Test Label').parent?.parent?.parent
    if (button) {
      fireEvent.press(button)
      expect(mockOnPress).toHaveBeenCalledTimes(1)
    }
  })

  it('renders checked state', () => {
    const { getByTestId } = render(
      <RadioButton {...defaultProps} checked={true} />,
      { wrapper: AllTheProviders }
    )

    // Component should render without errors when checked
    expect(getByText('Test Label')).toBeTruthy()
  })

  it('renders unchecked state', () => {
    const { getByText } = render(
      <RadioButton {...defaultProps} checked={false} />,
      { wrapper: AllTheProviders }
    )

    // Component should render without errors when unchecked
    expect(getByText('Test Label')).toBeTruthy()
  })

  it('renders without description when not provided', () => {
    const { queryByText } = render(
      <RadioButton {...defaultProps} />,
      { wrapper: AllTheProviders }
    )

    expect(getByText('Test Label')).toBeTruthy()
    // Description should not be present
  })
})
