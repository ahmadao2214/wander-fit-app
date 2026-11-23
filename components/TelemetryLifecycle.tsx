import { useEffect, useLayoutEffect, useRef } from 'react'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { useSegments } from 'expo-router'
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { useAuth } from '../hooks/useAuth'
import { analytics, type TelemetryPlatform } from '../lib/analytics'
import { normalizeRouteSegments } from '../lib/analyticsRoutes'
import type { AthleteAgeGroup } from '../lib/sessionReplayGate'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

function currentPlatform(): TelemetryPlatform {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS
  return 'web'
}

/**
 * Headless root lifecycle bridge for PostHog telemetry (ADR 0005).
 *
 * Responsibilities:
 * 1. Defers SDK initialization and holds capture off until auth + persisted
 *    consent (`users.analyticsOptOut`) resolve on cold launch (S3).
 * 2. Applies persisted Convex `analyticsOptOut` BEFORE `identify(user._id)`.
 * 3. Resets PostHog on sign-out while preserving opt-out state.
 * 4. Tracks normalized route-pattern screen views via `useSegments()` (never raw IDs).
 * 5. Synchronously reconciles consent, readiness, and the 7-condition adult Web
 *    session replay gate in a single ordered layout effect so simultaneous
 *    preference changes never race and excluded routes stop before paint (S4, S17).
 */
export function TelemetryLifecycle() {
  const segments = useSegments()
  const { user, isAuthenticated, isLoading, needsSetup, hasCompletedIntake } = useAuth()

  const programState = useQuery(api.userPrograms.getCurrentProgramState, user ? {} : 'skip')

  const wasSignedInRef = useRef(false)
  const lastOptOutRef = useRef(false)

  // Hold SDK init and capture until auth + persisted opt-out resolve on cold launch (S3).
  // A signed-in athlete with no Convex user row yet (needsSetup) has no persisted
  // preference, so they capture anonymously; identify and replay stay gated on user._id (S19).
  const authResolved = !isLoading && (!isAuthenticated || Boolean(user?._id) || needsSetup)
  const routeSegments = segments as readonly string[]
  const normalizedRoute = normalizeRouteSegments(routeSegments)
  const ageGroup = (programState?.ageGroup ?? undefined) as AthleteAgeGroup | undefined
  const envEnabled = process.env.EXPO_PUBLIC_POSTHOG_REPLAY_ENABLED === '1'
  const analyticsOptOut = user?.analyticsOptOut === true
  const sessionReplayOptIn = user?.sessionReplayOptIn === true

  // Configure runtime context before the ordered effect below (layout effects run in
  // declaration order) and guarantee cleanup on unmount (S17)
  useIsomorphicLayoutEffect(() => {
    analytics.setRuntimeContext({
      platform: currentPlatform(),
      app_version: Constants.expoConfig?.version ?? 'unknown',
    })

    return () => {
      analytics.setCaptureReady(false)
      analytics.syncSessionReplay({
        platform: currentPlatform(),
        envEnabled: false,
        isAuthenticated: false,
        hasCompletedIntake: false,
        ageGroup: undefined,
        analyticsOptOut: true,
        sessionReplayOptIn: false,
        normalizedRoute: '/',
      })
    }
  }, [])

  // Single ordered layout effect:
  // 1) Apply consent / deferred init / identity / reset first
  // 2) Immediately reconcile replay gate with the up-to-date opt-out & readiness state (S17)
  useIsomorphicLayoutEffect(() => {
    const platform = currentPlatform()

    if (!authResolved) {
      analytics.setCaptureReady(false)
      analytics.syncSessionReplay({
        platform,
        envEnabled: false,
        isAuthenticated: false,
        hasCompletedIntake: false,
        ageGroup: undefined,
        analyticsOptOut: true,
        sessionReplayOptIn: false,
        normalizedRoute,
      })
      return
    }

    if (user?._id) {
      lastOptOutRef.current = analyticsOptOut
      wasSignedInRef.current = true

      if (analyticsOptOut) {
        analytics.setOptOut(true)
        analytics.setCaptureReady(true)
      } else {
        // Initialize SDK only after consent is confirmed opted-in (S3)
        analytics.setOptOut(false)
        analytics.init()
        analytics.setCaptureReady(true)
        analytics.identify(user._id)
      }
    } else if (wasSignedInRef.current && !isAuthenticated) {
      wasSignedInRef.current = false
      analytics.reset({ keepOptOut: lastOptOutRef.current })
      analytics.setCaptureReady(true)
    } else if (isAuthenticated && needsSetup) {
      // A new signed-in account with no user row has no saved preference, so an
      // opt-out kept from a previous account on this device does not apply (S19)
      analytics.setOptOut(false)
      analytics.init()
      analytics.setCaptureReady(true)
    } else {
      // Confirmed signed-out on cold launch (First Run / Sign In)
      if (!analytics.isOptedOut()) {
        analytics.init()
      }
      analytics.setCaptureReady(true)
    }

    analytics.syncSessionReplay({
      platform,
      envEnabled,
      isAuthenticated: Boolean(isAuthenticated && user?._id),
      hasCompletedIntake,
      ageGroup,
      analyticsOptOut,
      sessionReplayOptIn,
      normalizedRoute,
    })
  }, [
    authResolved,
    envEnabled,
    isAuthenticated,
    user?._id,
    hasCompletedIntake,
    ageGroup,
    analyticsOptOut,
    sessionReplayOptIn,
    needsSetup,
    normalizedRoute,
  ])

  // Track route-pattern screen views only after auth & opt-out have resolved
  useEffect(() => {
    if (!authResolved || routeSegments.length === 0) return
    analytics.trackScreen(routeSegments)
  }, [authResolved, normalizedRoute, routeSegments])

  return null
}
