import React from 'react'
import { Text } from 'react-native'
import { fireEvent, render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

const mockCaptureBoundaryError = jest.fn()
const mockReplace = jest.fn()

jest.mock('../../lib/sentry', () => ({
  captureBoundaryError: (...args: unknown[]) => mockCaptureBoundaryError(...args),
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

import { FlowErrorBoundary } from '../FlowErrorBoundary'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

let shouldThrow = true
function FlakyChild() {
  if (shouldThrow) {
    throw new Error('First Run exploded')
  }
  return <Text>Recovered screen</Text>
}

describe('FlowErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    shouldThrow = true
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('captures thrown render errors in Sentry with flowName and componentStack, and allows retry', () => {
    const { getByText } = render(
      <FlowErrorBoundary
        flowName="first-run"
        fallbackRoute="/(first-run)"
        errorMessage="Custom First Run recovery message"
      >
        <FlakyChild />
      </FlowErrorBoundary>,
      { wrapper: AllTheProviders }
    )

    expect(getByText('Something went wrong')).toBeTruthy()
    expect(getByText('Custom First Run recovery message')).toBeTruthy()
    expect(mockCaptureBoundaryError).toHaveBeenCalledTimes(1)
    expect(mockCaptureBoundaryError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'First Run exploded' }),
      expect.objectContaining({
        boundary: 'first-run',
        route: '/(first-run)',
        componentStack: expect.any(String),
      })
    )

    shouldThrow = false
    fireEvent.press(getByText('Try Again'))
    expect(getByText('Recovered screen')).toBeTruthy()
  })

  it('navigates to fallbackRoute when Go Home is pressed', () => {
    const { getByText } = render(
      <FlowErrorBoundary fallbackRoute="/(first-run)">
        <FlakyChild />
      </FlowErrorBoundary>,
      { wrapper: AllTheProviders }
    )

    fireEvent.press(getByText('Go Home'))
    expect(mockReplace).toHaveBeenCalledWith('/(first-run)')
  })
})
