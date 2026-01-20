import { useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, Spinner, Text } from 'tamagui'
import { analytics } from '../../lib/analytics'

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
      // Track onboarding started
      const isRevisit = onboardingState?.isRevisit ?? false
      analytics.trackOnboardingStarted(10, isRevisit)

      // For revisit mode, go directly to why-it-works (educational content)
      // This is the consolidated "Training Overview" screen
      if (isRevisit) {
        router.replace('/(onboarding)/why-it-works' as any)
        return
      }

      // If intake is not completed, redirect to intake flow
      if (!onboardingState?.intakeCompletedAt) {
        router.replace('/(intake)/sport' as any)
        return
      }

      // Only initialize if onboarding progress hasn't been set yet
      if (onboardingState?.onboardingProgress === undefined ||
          onboardingState?.onboardingProgress === null) {
        await startOnboarding()
      }

      // For normal flow after intake, go to why-it-works
      // (the new combined flow handles routing between intake and onboarding)
      router.replace('/(onboarding)/why-it-works' as any)
    }

    initAndRedirect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingState])

  return (
    <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
      <Spinner size="large" color="$primary" />
      <Text color="$gray11">Loading your journey...</Text>
    </YStack>
  )
}
