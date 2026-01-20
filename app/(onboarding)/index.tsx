import { useEffect, useRef } from 'react'
import { useRouter, Href } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, Spinner, Text } from 'tamagui'
import { analytics } from '../../lib/analytics'

// Route constants for type-safe navigation
const ROUTES = {
  WHY_IT_WORKS: '/(onboarding)/why-it-works' as Href,
  INTAKE_SPORT: '/(intake)/sport' as Href,
} as const

/**
 * Onboarding Index - Entry Point & Router
 *
 * This route is used for:
 * 1. Revisit mode - When users want to review educational content
 * 2. Edge cases - If somehow users end up here
 *
 * The main flow uses the interleaved intake/onboarding flow starting at /(intake)/sport
 */
export default function OnboardingIndex() {
  const router = useRouter()
  const hasInitialized = useRef(false)

  // Get onboarding state
  const onboardingState = useQuery(api.onboarding.getOnboardingState)
  const startOnboarding = useMutation(api.onboarding.startOnboarding)

  useEffect(() => {
    // Wait for query to load
    if (onboardingState === undefined) return

    // Prevent running more than once
    if (hasInitialized.current) return
    hasInitialized.current = true

    const initAndRedirect = async () => {
      const isRevisit = onboardingState?.isRevisit ?? false
      analytics.trackOnboardingStarted(10, isRevisit)

      // Redirect to intake if not completed
      if (!onboardingState?.intakeCompletedAt) {
        router.replace(ROUTES.INTAKE_SPORT)
        return
      }

      // Initialize onboarding progress if not set
      if (onboardingState?.onboardingProgress == null) {
        await startOnboarding()
      }

      // Go to why-it-works (educational content / training overview)
      router.replace(ROUTES.WHY_IT_WORKS)
    }

    initAndRedirect()
  }, [onboardingState, router, startOnboarding])

  return (
    <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
      <Spinner size="large" color="$primary" />
      <Text color="$gray11">Loading your journey...</Text>
    </YStack>
  )
}
