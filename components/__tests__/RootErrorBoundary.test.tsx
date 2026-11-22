import React from 'react'
import { Text } from 'react-native'
import { fireEvent, render } from '@testing-library/react-native'

const mockCaptureBoundaryError = jest.fn()

jest.mock('../../lib/sentry', () => ({
  captureBoundaryError: (...args: unknown[]) => mockCaptureBoundaryError(...args),
}))

jest.mock('expo-router', () => {
  const ReactLocal = require('react')
  const { Text: RNText } = require('react-native')
  return {
    ErrorBoundary: ({ error }: { error: Error }) =>
      ReactLocal.createElement(RNText, { testID: 'expo-router-dev-boundary' }, error.message),
  }
})

import { RootErrorBoundary } from '../RootErrorBoundary'

describe('RootErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('reports the error to Sentry and delegates to Expo Router ErrorBoundary in dev', () => {
    const err = new Error('Root crash in dev')
    const retry = jest.fn(() => Promise.resolve())

    const { getByTestId } = render(<RootErrorBoundary error={err} retry={retry} />)

    expect(getByTestId('expo-router-dev-boundary').props.children).toBe('Root crash in dev')
    expect(mockCaptureBoundaryError).toHaveBeenCalledWith(err, { boundary: 'root' })
  })

  it('renders a standalone fallback without Tamagui/SafeArea providers in production and retries', () => {
    const err = new Error('Root crash in prod')
    const retry = jest.fn(() => Promise.resolve())

    const { getByTestId, getByText } = render(
      <RootErrorBoundary error={err} retry={retry} forceProductionFallback />
    )

    expect(getByTestId('root-error-fallback')).toBeTruthy()
    expect(getByText('Something went wrong')).toBeTruthy()
    expect(mockCaptureBoundaryError).toHaveBeenCalledWith(err, { boundary: 'root' })

    fireEvent.press(getByText('Try again'))
    expect(retry).toHaveBeenCalledTimes(1)
  })
})
