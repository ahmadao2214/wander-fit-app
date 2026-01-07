import { useEffect, useRef, useCallback } from 'react'
import { analytics } from '../lib/analytics'

interface UseOnboardingAnalyticsProps {
  screenIndex: number
  screenName: string
  isRevisit?: boolean
}

/**
 * Hook for tracking onboarding screen analytics
 *
 * Automatically tracks:
 * - Screen view on mount
 * - Time spent on screen
 *
 * Returns functions for:
 * - trackScreenComplete: Call when user moves to next screen
 * - trackSkip: Call when user skips onboarding
 */
export function useOnboardingAnalytics({
  screenIndex,
  screenName,
  isRevisit = false,
}: UseOnboardingAnalyticsProps) {
  const screenStartTime = useRef<number>(Date.now())

  // Track screen view on mount
  useEffect(() => {
    screenStartTime.current = Date.now()
    analytics.trackOnboardingScreenView(screenIndex, screenName, isRevisit)
  }, [screenIndex, screenName, isRevisit])

  // Track screen completion
  const trackScreenComplete = useCallback(() => {
    const timeOnScreen = Date.now() - screenStartTime.current
    analytics.trackOnboardingScreenComplete(screenIndex, screenName, timeOnScreen, isRevisit)
  }, [screenIndex, screenName, isRevisit])

  // Track skip action
  const trackSkip = useCallback(() => {
    analytics.trackOnboardingSkipped(screenIndex, screenName)
  }, [screenIndex, screenName])

  return {
    trackScreenComplete,
    trackSkip,
  }
}

/**
 * Screen name constants for consistent tracking
 */
export const ONBOARDING_SCREEN_NAMES = {
  0: 'welcome',
  1: 'phases_overview',
  2: 'why_it_works',
  3: 'gpp_detail',
  4: 'spp_detail',
  5: 'ssp_detail',
  6: 'personal_timeline',
  7: 'commitment',
  8: 'progression',
  9: 'first_workout',
} as const
