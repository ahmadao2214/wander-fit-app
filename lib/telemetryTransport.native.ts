import PostHog from 'posthog-react-native'
import {
  NOOP_TELEMETRY_TRANSPORT,
  type SanitizedProperties,
  type TelemetryTransport,
  type TelemetryTransportConfig,
} from './telemetryTypes'

/**
 * Native (iOS / Android) pure-JS PostHog transport (ADR 0005 — Phase 1).
 *
 * - Zero native modules: uses `persistence: 'memory'` so no `expo-file-system`
 *   or `async-storage` native dependency is needed, and `enableSessionReplay: false`.
 * - Disables unused feature flag preloading and remote config polling (S3).
 * - Uses an in-memory capture gate driven by Convex `users.analyticsOptOut` so
 *   synthetic `$opt_in` events are never emitted and opt-out survives `reset()`.
 * - Sentry owns error/crash tracking, so PostHog error tracking stays off.
 * - No-ops when API key is missing or inside Jest.
 */
export function createTelemetryTransport(config: TelemetryTransportConfig): TelemetryTransport {
  if (!config.apiKey || process.env.JEST_WORKER_ID !== undefined) {
    return NOOP_TELEMETRY_TRANSPORT
  }

  let optedOut = Boolean(config.defaultOptOut)
  let client: PostHog
  try {
    client = new PostHog(config.apiKey, {
      host: config.host,
      persistence: 'memory',
      personProfiles: 'identified_only',
      captureAppLifecycleEvents: false,
      enableSessionReplay: false,
      defaultOptIn: true,
      preloadFeatureFlags: false,
      disableRemoteConfig: true,
      sendFeatureFlagEvent: false,
      errorTracking: {
        autocapture: false,
        exceptionSteps: { enabled: false },
      },
      rageClickConfig: { enabled: false },
      capturePushNotificationSubscriptions: false,
    })
  } catch (error) {
    if (__DEV__) {
      console.warn('[Analytics] Failed to initialize native PostHog client:', error)
    }
    return NOOP_TELEMETRY_TRANSPORT
  }

  return {
    isActive: true,
    supportsSessionReplay: false,
    capture(event: string, properties?: SanitizedProperties) {
      if (optedOut) return
      client.capture(event, properties)
    },
    identify(distinctId: string) {
      if (optedOut) return
      // Zero person properties — opaque Convex users._id only.
      client.identify(distinctId)
    },
    reset() {
      client.reset()
    },
    optOut() {
      optedOut = true
    },
    optIn() {
      optedOut = false
    },
    getSessionId() {
      if (optedOut) return undefined
      const id = client.getSessionId()
      return id && id.length > 0 ? id : undefined
    },
    startSessionRecording() {
      // Native session replay is deferred to Phase 2 (ADR 0005 / Q4-4A).
    },
    stopSessionRecording() {
      // Native session replay is deferred to Phase 2 (ADR 0005 / Q4-4A).
    },
  }
}
