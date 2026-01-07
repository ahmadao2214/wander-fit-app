import { useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, Spinner, Text } from 'tamagui'
import { analytics } from '../../lib/analytics'

/**
 * Onboarding Index - Entry Point & Router
 *
 * Redirects to the appropriate onboarding screen based on progress.
 * If user has progress, resume from there. Otherwise start from welcome.
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

      // Only initialize if onboarding progress hasn't been set yet
      // This prevents unnecessary database writes
      if (onboardingState?.onboardingProgress === undefined ||
          onboardingState?.onboardingProgress === null) {
        await startOnboarding()
      }

      // Determine which screen to show based on progress
      const progress = onboardingState?.onboardingProgress ?? 0

      // Map progress to screen routes
      const screenRoutes = [
        '/(onboarding)/welcome',         // 0
        '/(onboarding)/phases-overview',  // 1
        '/(onboarding)/why-it-works',     // 2
        '/(onboarding)/gpp-detail',       // 3
        '/(onboarding)/spp-detail',       // 4
        '/(onboarding)/ssp-detail',       // 5
        '/(onboarding)/personal-timeline', // 6
        '/(onboarding)/commitment',       // 7
        '/(onboarding)/progression',      // 8
        '/(onboarding)/first-workout',    // 9
      ]

      const targetRoute = screenRoutes[progress] ?? screenRoutes[0]
      router.replace(targetRoute as any)
    }

    initAndRedirect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingState])

  return (
    <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
      <Spinner size="large" color="$green10" />
      <Text color="$gray11">Loading your journey...</Text>
    </YStack>
  )
}
