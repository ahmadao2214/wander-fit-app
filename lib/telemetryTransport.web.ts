import posthog, { type PostHog, type PostHogConfig } from 'posthog-js'
import {
  NOOP_TELEMETRY_TRANSPORT,
  type SanitizedProperties,
  type TelemetryTransport,
  type TelemetryTransportConfig,
} from './telemetryTypes'
import {
  normalizeWebUrlToRoutePattern,
  scrubWebPostHogPayload,
  WEB_POSTHOG_PROPERTY_DENYLIST,
  type WebPayloadFilterState,
} from './telemetryWebPayload'

export function buildWebPostHogConfig(
  host: string,
  state: WebPayloadFilterState
): Partial<PostHogConfig> {
  return {
    api_host: host,
    persistence: 'memory',
    person_profiles: 'identified_only',
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_exceptions: false,
    capture_performance: false,
    disable_session_recording: true,
    enable_recording_console_log: false,
    save_referrer: false,
    // Disable feature flags & non-replay extensions while still allowing
    // PostHog remote config to authorize session recording on opted-in browsers (S14).
    advanced_disable_feature_flags: true,
    advanced_disable_feature_flags_on_first_load: true,
    disable_surveys: true,
    disable_surveys_automatic_display: true,
    disable_product_tours: true,
    disable_conversations: true,
    ip: false,
    get_current_url: (defaultUrl) => normalizeWebUrlToRoutePattern(defaultUrl),
    property_denylist: WEB_POSTHOG_PROPERTY_DENYLIST,
    before_send: (event) => scrubWebPostHogPayload(event, state),
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
      blockSelector: '[data-ph-no-capture], .ph-no-capture',
      recordCrossOriginIframes: false,
      // Explicitly lock down sensitive replay channels against remote config overrides (S15)
      recordHeaders: false,
      recordBody: false,
      streamNetworkBody: false,
      captureCanvas: { recordCanvas: false },
      canvasCapture: { maskRegionsFn: () => null },
    },
  }
}

/**
 * Wraps a `posthog-js` instance using strictly in-memory opt-out & replay gates.
 * Never calls `opt_out_capturing()` or `opt_in_capturing()`, avoiding both
 * localStorage consent writes and synthetic `$opt_in` events.
 */
export function createWebPostHogTransport(
  instance: PostHog,
  config: TelemetryTransportConfig,
  extraConfig?: Partial<PostHogConfig>
): TelemetryTransport {
  const state: WebPayloadFilterState = {
    optedOut: Boolean(config.defaultOptOut),
    recordingAllowed: false,
  }

  instance.init(config.apiKey, {
    ...buildWebPostHogConfig(config.host, state),
    ...extraConfig,
  })

  return {
    isActive: true,
    supportsSessionReplay: true,
    capture(event: string, properties?: SanitizedProperties) {
      if (state.optedOut) return
      instance.capture(event, properties)
    },
    identify(distinctId: string) {
      if (state.optedOut) return
      // Zero person properties — opaque Convex users._id only.
      instance.identify(distinctId)
    },
    reset() {
      state.recordingAllowed = false
      instance.stopSessionRecording()
      instance.reset()
    },
    optOut() {
      state.optedOut = true
      state.recordingAllowed = false
      instance.stopSessionRecording()
    },
    optIn() {
      state.optedOut = false
    },
    getSessionId() {
      if (state.optedOut) return undefined
      const id = instance.get_session_id()
      return id && id.length > 0 ? id : undefined
    },
    startSessionRecording() {
      if (state.optedOut) return
      state.recordingAllowed = true
      instance.startSessionRecording()
    },
    stopSessionRecording() {
      state.recordingAllowed = false
      instance.stopSessionRecording()
    },
  }
}

/**
 * Web PostHog transport (ADR 0005 — Phase 1).
 *
 * - `persistence: 'memory'` + in-memory opt-out gate: zero cookies, zero localStorage.
 * - `before_send` strips URLs, pathnames, query strings, referrers, `$set`/`$set_once`,
 *   and normalizes rrweb snapshot `data.href` to route patterns.
 * - `disable_session_recording: true` by default; recording starts ONLY when
 *   `shouldRecordSessionReplay()` passes all 7 adult opt-in gates, with all text
 *   and inputs masked (`maskAllInputs: true`, `maskTextSelector: '*'`),
 *   console/network/canvas channels locked OFF locally, and excluded routes
 *   blocked at the DOM boundary (`[data-ph-no-capture]`).
 */
export function createTelemetryTransport(config: TelemetryTransportConfig): TelemetryTransport {
  if (
    !config.apiKey ||
    typeof window === 'undefined' ||
    process.env.JEST_WORKER_ID !== undefined
  ) {
    return NOOP_TELEMETRY_TRANSPORT
  }

  try {
    return createWebPostHogTransport(posthog, config)
  } catch (error) {
    if (__DEV__) {
      console.warn('[Analytics] Failed to initialize web PostHog client:', error)
    }
    return NOOP_TELEMETRY_TRANSPORT
  }
}
