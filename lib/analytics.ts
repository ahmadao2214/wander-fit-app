import { normalizeRouteSegments } from './analyticsRoutes'
import {
  isCanonicalAnalyticsEvent,
  sanitizeEventProperties,
  type AuthMethod,
  type CanonicalAnalyticsEvent,
  type FeedbackKind,
  type FeedbackSubmittedProps,
  type FirstRunCompletedProps,
  type FirstRunSaveSheetOpenedProps,
  type FirstRunStepAdvancedProps,
  type FirstRunStepName,
  type FirstRunStepViewedProps,
  type ScreenViewedProps,
  type WorkoutAbandonedProps,
  type WorkoutCompletedProps,
  type WorkoutOpenedProps,
  type WorkoutPausedProps,
  type WorkoutStartedProps,
  type WorkoutStartTrigger,
} from './analyticsSanitizer'
import {
  shouldRecordSessionReplay,
  type SessionReplayGateState,
  type TelemetryPlatform,
} from './sessionReplayGate'
import { createTelemetryTransport } from './telemetryTransport'
import {
  NOOP_TELEMETRY_TRANSPORT,
  type TelemetryTransport,
  type TelemetryTransportConfig,
} from './telemetryTypes'

export type {
  AuthMethod,
  CanonicalAnalyticsEvent,
  FeedbackKind,
  FeedbackSubmittedProps,
  FirstRunCompletedProps,
  FirstRunSaveSheetOpenedProps,
  FirstRunStepAdvancedProps,
  FirstRunStepName,
  FirstRunStepViewedProps,
  ScreenViewedProps,
  SessionReplayGateState,
  TelemetryPlatform,
  WorkoutAbandonedProps,
  WorkoutCompletedProps,
  WorkoutOpenedProps,
  WorkoutPausedProps,
  WorkoutStartedProps,
  WorkoutStartTrigger,
}

export const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com'

export const FIRST_RUN_STEP_INDEX: Record<FirstRunStepName, number> = {
  promise: 0,
  sport: 1,
  season: 2,
  days: 3,
  about: 4,
  reveal: 5,
}

export interface TelemetryRuntimeContext {
  platform?: TelemetryPlatform
  app_version?: string
}

export interface AnalyticsServiceOptions {
  transportFactory?: (config: TelemetryTransportConfig) => TelemetryTransport
  getApiKey?: () => string | undefined
  getHost?: () => string | undefined
}

/**
 * Youth-safe, zero-PII PostHog analytics facade (ADR 0005).
 *
 * - Missing EXPO_PUBLIC_POSTHOG_API_KEY keeps the SDK completely off (no-op).
 * - Every event passes through `sanitizeEventProperties` (strict allowlist + PII denylist).
 * - `identify(athleteId)` sends ONLY the opaque Convex `users._id` with zero traits.
 * - `reset({ keepOptOut })` immediately re-applies opt-out because PostHog's
 *   `reset()` clears local opt-out state.
 * - Exposes `getSessionId()` and `trackFeedbackSubmitted()` for Thread B3.
 */
export class AnalyticsService {
  private transport: TelemetryTransport = NOOP_TELEMETRY_TRANSPORT
  private initialized = false
  private captureReady = true
  private optedOut = false
  private recordingActive = false
  private lastIdentifiedId: string | null = null
  private lastScreenName: string | null = null
  private runtimeContext: TelemetryRuntimeContext = {}

  private readonly transportFactory: (config: TelemetryTransportConfig) => TelemetryTransport
  private readonly getApiKey: () => string | undefined
  private readonly getHost: () => string | undefined

  constructor(options?: AnalyticsServiceOptions) {
    this.transportFactory = options?.transportFactory ?? createTelemetryTransport
    this.getApiKey = options?.getApiKey ?? (() => process.env.EXPO_PUBLIC_POSTHOG_API_KEY?.trim())
    this.getHost = options?.getHost ?? (() => process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim())
  }

  init(): void {
    if (this.initialized) return
    this.initialized = true

    const apiKey = this.getApiKey()
    if (!apiKey) {
      this.transport = NOOP_TELEMETRY_TRANSPORT
      return
    }

    const host = this.getHost() || DEFAULT_POSTHOG_HOST
    this.transport = this.transportFactory({
      apiKey,
      host,
      defaultOptOut: this.optedOut,
    })

    if (this.optedOut && this.transport.isActive) {
      this.transport.optOut()
    }
  }

  setRuntimeContext(context: TelemetryRuntimeContext): void {
    this.runtimeContext = { ...this.runtimeContext, ...context }
  }

  isActive(): boolean {
    return this.transport.isActive
  }

  isOptedOut(): boolean {
    return this.optedOut
  }

  /**
   * Holds capture until auth and persisted opt-out preferences finish loading
   * on cold launch, preventing opted-out Athletes from emitting early events.
   */
  setCaptureReady(ready: boolean): void {
    this.captureReady = ready
    if (!ready) {
      this.stopRecordingIfActive()
    }
  }

  isCaptureReady(): boolean {
    return this.captureReady
  }

  setOptOut(optedOut: boolean): void {
    this.optedOut = optedOut
    if (!this.transport.isActive) return

    if (optedOut) {
      this.stopRecordingIfActive()
      this.transport.optOut()
    } else {
      this.transport.optIn()
    }
  }

  /**
   * Identify a signed-in Athlete strictly by opaque Convex `users._id`.
   * Zero person traits or PII are ever attached.
   */
  identify(athleteId: string): void {
    const cleanId = athleteId.trim()
    if (!cleanId) return
    if (!this.captureReady || this.optedOut || !this.transport.isActive) return
    if (this.lastIdentifiedId === cleanId) return

    this.lastIdentifiedId = cleanId
    this.transport.identify(cleanId)
  }

  /**
   * Resets PostHog identity on sign-out. Always stops any active session replay
   * and re-applies opt-out if `keepOptOut` is true (since PostHog `reset()`
   * clears local opt-out state).
   */
  reset(options?: { keepOptOut?: boolean }): void {
    const keepOptOut = options?.keepOptOut ?? this.optedOut
    this.stopRecordingIfActive()
    this.lastIdentifiedId = null
    this.lastScreenName = null

    if (this.transport.isActive) {
      this.transport.reset()
      if (keepOptOut) {
        this.optedOut = true
        this.transport.optOut()
      } else {
        this.optedOut = false
      }
    } else {
      this.optedOut = keepOptOut
    }
  }

  /**
   * Synchronizes Web session replay state against the 7-condition adult opt-in gate.
   * Safe no-op on native platforms (Phase 1) and when SDK is inactive.
   */
  syncSessionReplay(gate: SessionReplayGateState): void {
    const shouldRecord =
      this.captureReady &&
      this.transport.isActive &&
      this.transport.supportsSessionReplay &&
      !this.optedOut &&
      shouldRecordSessionReplay(gate)

    if (shouldRecord && !this.recordingActive) {
      this.recordingActive = true
      this.transport.startSessionRecording()
    } else if (!shouldRecord && this.recordingActive) {
      this.stopRecordingIfActive()
    }
  }

  /**
   * Returns the current PostHog session ID when active and not opted out.
   * Consumed by Thread B3 (`bug_reports.posthogSessionId`).
   */
  getSessionId(): string | undefined {
    if (!this.captureReady || !this.transport.isActive || this.optedOut) return undefined
    const sessionId = this.transport.getSessionId()
    return sessionId && sessionId.length > 0 ? sessionId : undefined
  }

  track(event: CanonicalAnalyticsEvent, properties?: Record<string, unknown>): void {
    if (!isCanonicalAnalyticsEvent(event)) return
    if (!this.captureReady || this.optedOut || !this.transport.isActive) return

    const sanitized = sanitizeEventProperties(
      event,
      properties,
      this.runtimeContext as Record<string, unknown>
    )
    this.transport.capture(event, sanitized)
  }

  trackScreen(segments: readonly string[]): void {
    if (!this.captureReady || this.optedOut || !this.transport.isActive) return
    const screenName = normalizeRouteSegments(segments)
    if (screenName === this.lastScreenName) return
    this.lastScreenName = screenName
    this.track('$screen', { screen_name: screenName })
  }

  trackFirstRunStepViewed(props: FirstRunStepViewedProps): void {
    this.track('first_run_step_viewed', { ...props })
  }

  trackFirstRunStepAdvanced(props: FirstRunStepAdvancedProps): void {
    this.track('first_run_step_advanced', { ...props })
  }

  trackFirstRunSaveSheetOpened(props: FirstRunSaveSheetOpenedProps): void {
    this.track('first_run_save_sheet_opened', { ...props })
  }

  trackFirstRunCompleted(props: FirstRunCompletedProps): void {
    this.track('first_run_completed', { ...props })
  }

  trackWorkoutOpened(props: WorkoutOpenedProps): void {
    this.track('workout_opened', { ...props })
  }

  trackWorkoutStarted(props: WorkoutStartedProps): void {
    this.track('workout_started', { ...props })
  }

  trackWorkoutCompleted(props: WorkoutCompletedProps): void {
    this.track('workout_completed', { ...props })
  }

  trackWorkoutPaused(props: WorkoutPausedProps): void {
    this.track('workout_paused', { ...props })
  }

  trackWorkoutAbandoned(props: WorkoutAbandonedProps = {}): void {
    this.track('workout_abandoned', { ...props })
  }

  trackFeedbackSubmitted(props: FeedbackSubmittedProps): void {
    this.track('feedback_submitted', { ...props })
  }

  private stopRecordingIfActive(): void {
    if (!this.recordingActive) return
    this.recordingActive = false
    if (this.transport.isActive && this.transport.supportsSessionReplay) {
      this.transport.stopSessionRecording()
    }
  }
}

export const analytics = new AnalyticsService()

export function useAnalytics(): AnalyticsService {
  return analytics
}
