import * as Sentry from '@sentry/react-native'
import { Platform } from 'react-native'
import {
  resolveSentryConfig,
  scrubSentryBreadcrumb,
  scrubSentryEvent,
  sanitizeSentryUser,
  type ResolvedSentryConfig,
} from './sentryPii'

export interface BoundaryErrorContext {
  boundary: string
  componentStack?: string | null
  route?: string
}

export interface VerificationEventResult {
  queued: boolean
  eventId?: string
  reason?: string
}

let initialized = false
let activeConfig: ResolvedSentryConfig | null = null
const reportedBoundaryErrors = new WeakSet<Error>()

function readRuntimeEnv(): ResolvedSentryConfig {
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production'
  return resolveSentryConfig(
    {
      EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
      EXPO_PUBLIC_SENTRY_ENVIRONMENT: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT,
      EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV: process.env.EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV,
      EXPO_PUBLIC_SENTRY_DEBUG_TOOLS: process.env.EXPO_PUBLIC_SENTRY_DEBUG_TOOLS,
    },
    isDev
  )
}

function isStaticWebRender(): boolean {
  return Platform.OS === 'web' && typeof window === 'undefined'
}

function hasActiveSentryClient(): boolean {
  const client = Sentry.getClient()
  if (!client) return false
  const options = typeof client.getOptions === 'function' ? client.getOptions() : undefined
  if (options?.enabled === false) return false
  const transport = typeof client.getTransport === 'function' ? client.getTransport() : undefined
  return Boolean(transport)
}

/**
 * Initializes Sentry once at app startup across iOS, Android, and Web.
 *
 * Safe to call unconditionally at module load time:
 * - No-ops during Expo Router static web HTML generation (Node SSR).
 * - Stays inactive until EXPO_PUBLIC_SENTRY_DSN is set.
 * - Disables tracing and enforces youth (14-17) privacy defaults (sendDefaultPii: false,
 *   no screenshots, no view hierarchy, no Sentry session replay, strict beforeSend/beforeBreadcrumb).
 */
export function initSentry(): ResolvedSentryConfig {
  if (initialized && activeConfig) {
    return activeConfig
  }

  const config = readRuntimeEnv()
  activeConfig = config

  if (!config.enabled || !config.dsn || isStaticWebRender()) {
    initialized = true
    return config
  }

  Sentry.init({
    dsn: config.dsn,
    enabled: true,
    environment: config.environment,
    // Keep all capture in the JS SDK until a native-layer privacy allowlist exists,
    // because RNSentry strips beforeSend/beforeBreadcrumb before native init.
    enableNative: false,
    enableNativeCrashHandling: false,
    enableNativeNagger: false,
    // Crash reporting only: disable performance tracing so transactions/HTTP spans
    // cannot bypass beforeSend scrubbing.
    tracesSampleRate: 0,
    enableAutoPerformanceTracing: false,
    enableAppStartTracking: false,
    enableNativeFramesTracking: false,
    enableStallTracking: false,
    // Youth 14-17 privacy posture: never collect default PII, screenshots,
    // view hierarchies (which contain athlete names/notes), or Sentry replays.
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    integrations: [Sentry.expoRouterIntegration()],
    beforeSend: scrubSentryEvent,
    beforeBreadcrumb: scrubSentryBreadcrumb,
  })

  initialized = true
  return config
}

export function getSentryStatus(): ResolvedSentryConfig {
  return activeConfig ?? readRuntimeEnv()
}

export function isSentryEnabled(): boolean {
  return getSentryStatus().enabled && !isStaticWebRender() && hasActiveSentryClient()
}

export function isSentryDiagnosticsEnabled(): boolean {
  return getSentryStatus().diagnosticsEnabled
}

/**
 * Sets pseudonymous athlete context on Sentry scope.
 * Never attaches email, name, phone, or other PII. Clears context on sign-out.
 */
export function setSentryAthleteContext(pseudonymousId: string | null | undefined): void {
  if (!isSentryEnabled()) return
  const cleanUser = pseudonymousId ? sanitizeSentryUser({ id: pseudonymousId }) : undefined
  Sentry.setUser(cleanUser ?? null)
}

/**
 * Captures an error caught by a React / Expo Router error boundary.
 * Deduplicates by Error instance so remounts do not send duplicate events.
 */
export function captureBoundaryError(
  error: Error,
  context: BoundaryErrorContext
): string | undefined {
  if (!isSentryEnabled()) return undefined
  if (reportedBoundaryErrors.has(error)) return undefined

  let eventId: string | undefined
  Sentry.withScope((scope) => {
    scope.setTag('error_boundary', context.boundary)
    if (context.route) {
      scope.setTag('route', context.route)
    }
    if (context.componentStack) {
      scope.setContext('react', {
        componentStack: context.componentStack,
      })
    }
    eventId = Sentry.captureException(error)
  })
  reportedBoundaryErrors.add(error)
  return eventId
}

/**
 * Queues a non-fatal verification event so internal testers can confirm Sentry
 * ingestion and source-map symbolication end-to-end.
 */
export function captureVerificationEvent(): VerificationEventResult {
  const status = getSentryStatus()
  if (!status.enabled) {
    const reason =
      status.disabledReason === 'missing_dsn'
        ? 'EXPO_PUBLIC_SENTRY_DSN is not configured.'
        : 'Sentry is disabled in development. Set EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV=true to test locally.'
    return { queued: false, reason }
  }

  if (isStaticWebRender() || !hasActiveSentryClient()) {
    return { queued: false, reason: 'Sentry client is not initialized.' }
  }

  const verificationError = new Error('WanderFit Sentry verification event')
  verificationError.name = 'SentryVerificationError'

  let eventId: string | undefined
  Sentry.withScope((scope) => {
    scope.setLevel('info')
    scope.setTag('verification', 'manual')
    scope.setTag('platform', Platform.OS)
    eventId = Sentry.captureException(verificationError)
  })

  return { queued: true, eventId }
}

/**
 * Test-only reset helper for unit tests.
 */
export function __resetSentryForTests(): void {
  initialized = false
  activeConfig = null
}
