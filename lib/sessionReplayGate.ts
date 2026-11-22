import { isReplayExcludedRoute } from './analyticsRoutes'

export type TelemetryPlatform = 'ios' | 'android' | 'web'
export type AthleteAgeGroup = '14-17' | '18-35' | '36+'

export interface SessionReplayGateState {
  platform: TelemetryPlatform
  /** Build-time feature flag: EXPO_PUBLIC_POSTHOG_REPLAY_ENABLED === '1'. */
  envEnabled: boolean
  isAuthenticated: boolean
  hasCompletedIntake: boolean
  ageGroup: AthleteAgeGroup | undefined
  analyticsOptOut: boolean
  /** Explicit adult opt-in persisted on Convex users.sessionReplayOptIn (default false). */
  sessionReplayOptIn: boolean
  /** Route pattern from normalizeRouteSegments(segments). */
  normalizedRoute: string
}

export function isAdultAgeGroup(ageGroup: AthleteAgeGroup | undefined): boolean {
  return ageGroup === '18-35' || ageGroup === '36+'
}

/**
 * Returns true ONLY when the explicit adult replay opt-in toggle may be shown
 * in Settings (Phase 1: Web-only, env-flagged, signed-in adult who finished Intake).
 */
export function canShowSessionReplayOptIn(input: {
  platform: TelemetryPlatform
  envEnabled: boolean
  isAuthenticated: boolean
  hasCompletedIntake: boolean
  ageGroup: AthleteAgeGroup | undefined
}): boolean {
  return (
    input.platform === 'web' &&
    input.envEnabled &&
    input.isAuthenticated &&
    input.hasCompletedIntake &&
    isAdultAgeGroup(input.ageGroup)
  )
}

/**
 * Double-gated adult Web session replay controller (ADR 0005 / Q4-4A + Q5-5A).
 *
 * Returns true if and only if ALL 7 conditions hold:
 * 1. Platform is 'web' (native replay deferred to Phase 2).
 * 2. Build env flag EXPO_PUBLIC_POSTHOG_REPLAY_ENABLED === '1'.
 * 3. Athlete is signed in.
 * 4. Intake is complete.
 * 5. Verified adult age group ('18-35' or '36+'; '14-17' and undefined always false).
 * 6. Not opted out of analytics AND explicit Settings sessionReplayOptIn === true.
 * 7. Current route is not in the excluded route list.
 */
export function shouldRecordSessionReplay(state: SessionReplayGateState): boolean {
  if (state.platform !== 'web') return false
  if (!state.envEnabled) return false
  if (!state.isAuthenticated) return false
  if (!state.hasCompletedIntake) return false
  if (!isAdultAgeGroup(state.ageGroup)) return false
  if (state.analyticsOptOut) return false
  if (!state.sessionReplayOptIn) return false
  if (isReplayExcludedRoute(state.normalizedRoute)) return false
  return true
}
