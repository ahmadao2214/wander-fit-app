let mockClient:
  | {
      getOptions: () => { enabled?: boolean }
      getTransport: () => object | undefined
    }
  | undefined
const mockInit = jest.fn((..._args: unknown[]) => {
  mockClient = {
    getOptions: () => ({ enabled: true }),
    getTransport: () => ({ send: jest.fn() }),
  }
})
const mockSetUser = jest.fn()
const mockCaptureException = jest.fn((..._args: unknown[]) => 'evt-12345678')
const mockGetClient = jest.fn(() => mockClient)
const mockExpoRouterIntegration = jest.fn(() => ({ name: 'ExpoRouter' }))

const mockScope = {
  setTag: jest.fn(),
  setContext: jest.fn(),
  setLevel: jest.fn(),
}

const mockWithScope = jest.fn((cb: (scope: typeof mockScope) => void) => cb(mockScope))

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}))

jest.mock('@sentry/react-native', () => ({
  init: (...args: unknown[]) => mockInit(...args),
  setUser: (...args: unknown[]) => mockSetUser(...args),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  getClient: () => mockGetClient(),
  withScope: (cb: (scope: typeof mockScope) => void) => mockWithScope(cb),
  expoRouterIntegration: () => mockExpoRouterIntegration(),
}))

import {
  __resetSentryForTests,
  captureBoundaryError,
  captureVerificationEvent,
  initSentry,
  isSentryEnabled,
  setSentryAthleteContext,
} from '../sentry'

describe('lib/sentry runtime wrapper', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.clearAllMocks()
    mockClient = undefined
    process.env = { ...originalEnv }
    delete process.env.EXPO_PUBLIC_SENTRY_DSN
    delete process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT
    delete process.env.EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV
    delete process.env.EXPO_PUBLIC_SENTRY_DEBUG_TOOLS
    __resetSentryForTests()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('does not initialize Sentry when EXPO_PUBLIC_SENTRY_DSN is absent', () => {
    const status = initSentry()
    expect(status.enabled).toBe(false)
    expect(isSentryEnabled()).toBe(false)
    expect(mockInit).not.toHaveBeenCalled()

    const verifyResult = captureVerificationEvent()
    expect(verifyResult.queued).toBe(false)
    expect(verifyResult.reason).toContain('EXPO_PUBLIC_SENTRY_DSN')
  })

  it('initializes with tracing disabled and strict youth privacy defaults when enabled', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@o1.ingest.sentry.io/2'
    process.env.EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV = 'true'
    process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT = 'preview'

    const status = initSentry()
    expect(status.enabled).toBe(true)
    expect(mockInit).toHaveBeenCalledTimes(1)

    const initArgs = mockInit.mock.calls[0][0] as Record<string, unknown>
    expect(initArgs.dsn).toBe('https://public@o1.ingest.sentry.io/2')
    expect(initArgs.environment).toBe('preview')
    expect(initArgs.enableNative).toBe(false)
    expect(initArgs.enableNativeCrashHandling).toBe(false)
    expect(initArgs.enableNativeNagger).toBe(false)
    expect(initArgs.tracesSampleRate).toBe(0)
    expect(initArgs.enableAutoPerformanceTracing).toBe(false)
    expect(initArgs.sendDefaultPii).toBe(false)
    expect(initArgs.attachScreenshot).toBe(false)
    expect(initArgs.attachViewHierarchy).toBe(false)
    expect(initArgs.replaysSessionSampleRate).toBe(0)
    expect(initArgs.replaysOnErrorSampleRate).toBe(0)
    expect(typeof initArgs.beforeSend).toBe('function')
    expect(typeof initArgs.beforeBreadcrumb).toBe('function')
  })

  it('sets only pseudonymous athlete id and clears on sign-out', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@o1.ingest.sentry.io/2'
    process.env.EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV = 'true'
    initSentry()

    setSentryAthleteContext('user_clerk_123')
    expect(mockSetUser).toHaveBeenCalledWith({ id: 'user_clerk_123' })

    // Never accept an email address as pseudonymous ID
    setSentryAthleteContext('teen@example.com')
    expect(mockSetUser).toHaveBeenLastCalledWith(null)

    setSentryAthleteContext(null)
    expect(mockSetUser).toHaveBeenLastCalledWith(null)
  })

  it('deduplicates boundary errors by Error instance and tags boundary metadata', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@o1.ingest.sentry.io/2'
    process.env.EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV = 'true'
    initSentry()

    const err = new Error('First Run render failure')
    const id1 = captureBoundaryError(err, {
      boundary: 'first-run',
      componentStack: '\n  at RevealScreen',
      route: '/(first-run)',
    })
    const id2 = captureBoundaryError(err, { boundary: 'first-run' })

    expect(id1).toBe('evt-12345678')
    expect(id2).toBeUndefined()
    expect(mockCaptureException).toHaveBeenCalledTimes(1)
    expect(mockScope.setTag).toHaveBeenCalledWith('error_boundary', 'first-run')
    expect(mockScope.setTag).toHaveBeenCalledWith('route', '/(first-run)')
    expect(mockScope.setContext).toHaveBeenCalledWith('react', {
      componentStack: '\n  at RevealScreen',
    })
  })

  it('refuses to report queued when no Sentry client or transport is active', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@o1.ingest.sentry.io/2'
    process.env.EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV = 'true'
    // Intentionally skip initSentry() so getClient() returns undefined

    expect(isSentryEnabled()).toBe(false)
    expect(captureVerificationEvent()).toEqual({
      queued: false,
      reason: 'Sentry client is not initialized.',
    })

    // Simulate malformed DSN: client exists and is enabled, but has no transport
    mockClient = {
      getOptions: () => ({ enabled: true }),
      getTransport: () => undefined,
    }
    expect(isSentryEnabled()).toBe(false)
    expect(captureVerificationEvent()).toEqual({
      queued: false,
      reason: 'Sentry client is not initialized.',
    })
    expect(mockCaptureException).not.toHaveBeenCalled()
  })

  it('queues a manual verification event when an enabled client is active', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@o1.ingest.sentry.io/2'
    process.env.EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV = 'true'
    initSentry()

    const res = captureVerificationEvent()
    expect(res).toEqual({ queued: true, eventId: 'evt-12345678' })
    expect(mockScope.setTag).toHaveBeenCalledWith('verification', 'manual')
    expect(mockScope.setTag).toHaveBeenCalledWith('platform', 'ios')
  })
})
