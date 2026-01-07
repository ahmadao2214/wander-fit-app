/**
 * Analytics Service for WanderFit
 *
 * This module provides a simple analytics tracking interface.
 * Currently logs events to console in development.
 *
 * Future: Can be integrated with:
 * - Mixpanel
 * - Amplitude
 * - PostHog
 * - Firebase Analytics
 */

// Event types for type safety
export type OnboardingEvent =
  | 'onboarding_started'
  | 'onboarding_screen_viewed'
  | 'onboarding_screen_completed'
  | 'onboarding_skipped'
  | 'onboarding_completed'
  | 'onboarding_revisit_started'
  | 'onboarding_commitment_started'
  | 'onboarding_commitment_completed'

export interface OnboardingEventProperties {
  screen_index?: number
  screen_name?: string
  total_screens?: number
  is_revisit?: boolean
  time_on_screen_ms?: number
  sport_id?: string
  skill_level?: string
}

export type AnalyticsEvent = OnboardingEvent

export interface EventProperties extends OnboardingEventProperties {
  [key: string]: string | number | boolean | undefined
}

class AnalyticsService {
  private isEnabled: boolean

  constructor() {
    // Enable analytics in production, log in development
    this.isEnabled = true
  }

  /**
   * Track an analytics event
   */
  track(event: AnalyticsEvent, properties?: EventProperties): void {
    if (!this.isEnabled) return

    const timestamp = new Date().toISOString()
    const eventData = {
      event,
      properties: properties || {},
      timestamp,
    }

    // In development, log to console
    if (__DEV__) {
      console.log('[Analytics]', event, properties || {})
    }

    // Future: Send to analytics provider
    // this.sendToProvider(eventData)
  }

  /**
   * Track onboarding screen view
   */
  trackOnboardingScreenView(screenIndex: number, screenName: string, isRevisit: boolean = false): void {
    this.track('onboarding_screen_viewed', {
      screen_index: screenIndex,
      screen_name: screenName,
      is_revisit: isRevisit,
    })
  }

  /**
   * Track onboarding screen completion (moving to next)
   */
  trackOnboardingScreenComplete(
    screenIndex: number,
    screenName: string,
    timeOnScreenMs: number,
    isRevisit: boolean = false
  ): void {
    this.track('onboarding_screen_completed', {
      screen_index: screenIndex,
      screen_name: screenName,
      time_on_screen_ms: timeOnScreenMs,
      is_revisit: isRevisit,
    })
  }

  /**
   * Track onboarding started
   */
  trackOnboardingStarted(totalScreens: number, isRevisit: boolean = false): void {
    if (isRevisit) {
      this.track('onboarding_revisit_started', {
        total_screens: totalScreens,
        is_revisit: true,
      })
    } else {
      this.track('onboarding_started', {
        total_screens: totalScreens,
        is_revisit: false,
      })
    }
  }

  /**
   * Track onboarding skipped
   */
  trackOnboardingSkipped(screenIndex: number, screenName: string): void {
    this.track('onboarding_skipped', {
      screen_index: screenIndex,
      screen_name: screenName,
    })
  }

  /**
   * Track onboarding completed
   */
  trackOnboardingCompleted(isRevisit: boolean = false): void {
    this.track('onboarding_completed', {
      is_revisit: isRevisit,
    })
  }

  /**
   * Track commitment button interactions
   */
  trackCommitmentStarted(): void {
    this.track('onboarding_commitment_started')
  }

  trackCommitmentCompleted(): void {
    this.track('onboarding_commitment_completed')
  }
}

// Export singleton instance
export const analytics = new AnalyticsService()

// Export hook for use in components
export function useAnalytics() {
  return analytics
}
