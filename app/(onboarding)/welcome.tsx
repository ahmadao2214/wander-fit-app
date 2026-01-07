import { useRouter } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, Text, Spinner } from 'tamagui'
import { OnboardingScreen } from '../../components/onboarding'

/**
 * Screen 1.1: Welcome to Your Journey
 *
 * Hero/welcome screen that greets the user and sets the tone
 * for their 12-week transformation.
 */
export default function WelcomeScreen() {
  const router = useRouter()

  // Get onboarding state and data
  const onboardingState = useQuery(api.onboarding.getOnboardingState)
  const onboardingData = useQuery(api.onboarding.getOnboardingData)

  // Mutations
  const advanceOnboarding = useMutation(api.onboarding.advanceOnboarding)
  const skipOnboarding = useMutation(api.onboarding.skipOnboarding)

  // Loading state
  if (onboardingState === undefined || onboardingData === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center">
        <Spinner size="large" color="$green10" />
      </YStack>
    )
  }

  const handleContinue = async () => {
    await advanceOnboarding({ screenIndex: 1 })
    router.push('/(onboarding)/phases-overview' as any)
  }

  const handleSkip = async () => {
    await skipOnboarding()
    router.replace('/(athlete)')
  }

  // Get first name for personalization
  const firstName = onboardingData?.userName?.split(' ')[0] ?? 'Athlete'
  const sportName = onboardingData?.sport?.name ?? 'your sport'

  return (
    <OnboardingScreen
      currentScreen={0}
      totalScreens={onboardingState?.totalScreens ?? 10}
      primaryButtonText="Let's Go"
      onPrimaryPress={handleContinue}
      onSkip={handleSkip}
    >
      <YStack flex={1} justify="center" items="center" gap="$8">
        {/* Hero section */}
        <YStack items="center" gap="$4">
          {/* Sport-specific icon placeholder */}
          <YStack
            width={100}
            height={100}
            rounded="$10"
            bg="$green4"
            items="center"
            justify="center"
          >
            <Text fontSize={48}>🏃</Text>
          </YStack>

          {/* Welcome text */}
          <YStack items="center" gap="$2">
            <Text fontSize="$3" color="$gray10" textTransform="uppercase" letterSpacing={2}>
              Welcome, {firstName}
            </Text>
            <Text fontSize="$8" fontWeight="bold" color="$gray12">
              Your 12-Week
            </Text>
            <Text fontSize="$8" fontWeight="bold" color="$green10">
              Transformation
            </Text>
            <Text fontSize="$8" fontWeight="bold" color="$gray12">
              Starts Now
            </Text>
          </YStack>
        </YStack>

        {/* Subtext */}
        <YStack items="center" gap="$3" width={300}>
          <Text fontSize="$4" color="$gray11">
            We've built a science-backed program tailored for {sportName}.
          </Text>
          <Text fontSize="$3" color="$gray10">
            Let us show you how it works.
          </Text>
        </YStack>
      </YStack>
    </OnboardingScreen>
  )
}
