import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { VerificationCodeInput } from '../VerificationCodeInput'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

// Wrapper for Tamagui components
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

describe('VerificationCodeInput', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders 6 input boxes by default', () => {
    const { getAllByDisplayValue } = render(
      <VerificationCodeInput value="" onChange={mockOnChange} />,
      { wrapper: AllTheProviders }
    )

    // Should render 6 TextInputs (one for each digit)
    const inputs = getAllByDisplayValue('')
    expect(inputs).toHaveLength(6)
  })

  it('renders custom number of input boxes', () => {
    const { getAllByDisplayValue } = render(
      <VerificationCodeInput value="" onChange={mockOnChange} length={4} />,
      { wrapper: AllTheProviders }
    )

    const inputs = getAllByDisplayValue('')
    expect(inputs).toHaveLength(4)
  })

  it('displays the provided value correctly', () => {
    const { getByDisplayValue } = render(
      <VerificationCodeInput value="123456" onChange={mockOnChange} />,
      { wrapper: AllTheProviders }
    )

    // Each digit should be displayed in its own input
    expect(getByDisplayValue('1')).toBeTruthy()
    expect(getByDisplayValue('2')).toBeTruthy()
    expect(getByDisplayValue('3')).toBeTruthy()
    expect(getByDisplayValue('4')).toBeTruthy()
    expect(getByDisplayValue('5')).toBeTruthy()
    expect(getByDisplayValue('6')).toBeTruthy()
  })

  it('handles single digit input', () => {
    const { getAllByDisplayValue } = render(
      <VerificationCodeInput value="" onChange={mockOnChange} />,
      { wrapper: AllTheProviders }
    )

    const inputs = getAllByDisplayValue('')
    const firstInput = inputs[0]

    fireEvent.changeText(firstInput, '5')

    expect(mockOnChange).toHaveBeenCalledWith('5')
  })

  it('handles deletion', () => {
    const { getByDisplayValue } = render(
      <VerificationCodeInput value="5" onChange={mockOnChange} />,
      { wrapper: AllTheProviders }
    )

    const input = getByDisplayValue('5')
    fireEvent.changeText(input, '')

    expect(mockOnChange).toHaveBeenCalledWith('')
  })

  it('handles paste of full code', () => {
    const { getAllByDisplayValue } = render(
      <VerificationCodeInput value="" onChange={mockOnChange} />,
      { wrapper: AllTheProviders }
    )

    const inputs = getAllByDisplayValue('')
    const firstInput = inputs[0]

    // Simulate pasting 6 digits
    fireEvent.changeText(firstInput, '048977')

    expect(mockOnChange).toHaveBeenCalledWith('048977')
  })

  it('filters out non-numeric characters', () => {
    const { getAllByDisplayValue } = render(
      <VerificationCodeInput value="" onChange={mockOnChange} />,
      { wrapper: AllTheProviders }
    )

    const inputs = getAllByDisplayValue('')
    const firstInput = inputs[0]

    // Try to enter non-numeric text
    fireEvent.changeText(firstInput, 'abc')

    // onChange should be called with empty string (filtered)
    expect(mockOnChange).toHaveBeenCalledWith('')
  })

  it('limits paste to maximum length', () => {
    const { getAllByDisplayValue } = render(
      <VerificationCodeInput value="" onChange={mockOnChange} length={6} />,
      { wrapper: AllTheProviders }
    )

    const inputs = getAllByDisplayValue('')
    const firstInput = inputs[0]

    // Paste more than 6 digits
    fireEvent.changeText(firstInput, '12345678901234')

    // Should only take first 6 digits
    expect(mockOnChange).toHaveBeenCalledWith('123456')
  })

  it('handles partial values correctly', () => {
    const { getByDisplayValue, getAllByDisplayValue } = render(
      <VerificationCodeInput value="123" onChange={mockOnChange} />,
      { wrapper: AllTheProviders }
    )

    // First 3 inputs should have values
    expect(getByDisplayValue('1')).toBeTruthy()
    expect(getByDisplayValue('2')).toBeTruthy()
    expect(getByDisplayValue('3')).toBeTruthy()

    // Last 3 inputs should be empty
    const emptyInputs = getAllByDisplayValue('')
    expect(emptyInputs).toHaveLength(3)
  })

  it('handles numeric-only paste with extra characters', () => {
    const { getAllByDisplayValue } = render(
      <VerificationCodeInput value="" onChange={mockOnChange} />,
      { wrapper: AllTheProviders }
    )

    const inputs = getAllByDisplayValue('')
    const firstInput = inputs[0]

    // Paste code with spaces and dashes
    fireEvent.changeText(firstInput, '0 4 - 8 9 7 7')

    // Should extract only numbers
    expect(mockOnChange).toHaveBeenCalledWith('048977')
  })

  it('updates when value prop changes', () => {
    const { rerender, getByDisplayValue } = render(
      <VerificationCodeInput value="123" onChange={mockOnChange} />,
      { wrapper: AllTheProviders }
    )

    expect(getByDisplayValue('1')).toBeTruthy()

    // Update value prop
    rerender(
      <AllTheProviders>
        <VerificationCodeInput value="456" onChange={mockOnChange} />
      </AllTheProviders>
    )

    expect(getByDisplayValue('4')).toBeTruthy()
    expect(getByDisplayValue('5')).toBeTruthy()
    expect(getByDisplayValue('6')).toBeTruthy()
  })
})
