import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

let mockDiagnosticsEnabled = false
let mockSentryActive = true
const mockCaptureVerificationEvent = jest.fn()
const mockCaptureBoundaryError = jest.fn()

jest.mock('../../lib/sentry', () => ({
  isSentryDiagnosticsEnabled: () => mockDiagnosticsEnabled,
  isSentryEnabled: () => mockSentryActive,
  getSentryStatus: () => ({
    enabled: true,
    environment: 'preview',
    dsn: 'https://public@o1.ingest.sentry.io/2',
    diagnosticsEnabled: mockDiagnosticsEnabled,
    disabledReason: null,
  }),
  captureVerificationEvent: () => mockCaptureVerificationEvent(),
  captureBoundaryError: (...args: unknown[]) => mockCaptureBoundaryError(...args),
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

import { SentryDiagnosticsCard } from '../SentryDiagnosticsCard'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

describe('SentryDiagnosticsCard', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockDiagnosticsEnabled = false
    mockSentryActive = true
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('renders nothing when EXPO_PUBLIC_SENTRY_DEBUG_TOOLS is not enabled', () => {
    const { queryByTestId } = render(<SentryDiagnosticsCard />, { wrapper: AllTheProviders })
    expect(queryByTestId('sentry-diagnostics-card')).toBeNull()
  })

  it('queues a manual verification event when enabled and pressed', () => {
    mockDiagnosticsEnabled = true
    mockCaptureVerificationEvent.mockReturnValue({ queued: true, eventId: 'abcdef1234567890' })

    const { getByTestId, getByText } = render(<SentryDiagnosticsCard />, {
      wrapper: AllTheProviders,
    })

    expect(getByText('Crash reporting check')).toBeTruthy()
    expect(getByText('Active (preview)')).toBeTruthy()
    fireEvent.press(getByTestId('sentry-send-test-event'))

    expect(mockCaptureVerificationEvent).toHaveBeenCalledTimes(1)
    expect(getByTestId('sentry-diagnostics-status').props.children).toContain('Queued test event')
  })

  it('shows Inactive when env is configured but no active Sentry client/transport exists', () => {
    mockDiagnosticsEnabled = true
    mockSentryActive = false

    const { getByText } = render(<SentryDiagnosticsCard />, {
      wrapper: AllTheProviders,
    })

    expect(getByText('Inactive (client_unavailable)')).toBeTruthy()
  })

  it('recovers cleanly on Try Again after a boundary crash and allows a second check', () => {
    mockDiagnosticsEnabled = true
    mockCaptureVerificationEvent.mockReturnValue({ queued: true, eventId: 'abcdef1234567890' })

    const { getByTestId, getByText } = render(<SentryDiagnosticsCard />, {
      wrapper: AllTheProviders,
    })

    fireEvent.press(getByTestId('sentry-trigger-boundary-crash'))

    expect(getByText('Something went wrong')).toBeTruthy()
    expect(mockCaptureBoundaryError).toHaveBeenCalledTimes(1)
    expect(mockCaptureBoundaryError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'WanderFit Sentry boundary verification crash' }),
      expect.objectContaining({ boundary: 'sentry-verification' })
    )

    // Pressing Try Again must restore the card cleanly without crashing again
    fireEvent.press(getByText('Try Again'))
    expect(getByTestId('sentry-diagnostics-card')).toBeTruthy()
    expect(mockCaptureBoundaryError).toHaveBeenCalledTimes(1)

    // And a second check works
    fireEvent.press(getByTestId('sentry-send-test-event'))
    expect(mockCaptureVerificationEvent).toHaveBeenCalledTimes(1)
    expect(getByTestId('sentry-diagnostics-status').props.children).toContain('Queued test event')
  })
})
