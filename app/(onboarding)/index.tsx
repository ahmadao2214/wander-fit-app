import { useRouter } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, Text, Button, Spinner, XStack, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Onboarding Index - Entry Point & Router
 *
 * This is a placeholder screen that will be replaced with the full
 * multi-screen onboarding flow in subsequent PRs.
 *
 * Current functionality:
 * - Shows loading state
 * - Allows skip to dashboard
 * - Shows basic onboarding state
 */
export default function OnboardingIndex() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  // Get onboarding state
  const onboardingState = useQuery(api.onboarding.getOnboardingState)
  const onboardingData = useQuery(api.onboarding.getOnboardingData)

  // Mutations
  const skipOnboarding = useMutation(api.onboarding.skipOnboarding)
  const completeOnboarding = useMutation(api.onboarding.completeOnboarding)

  // Loading state
  if (onboardingState === undefined || onboardingData === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$green10" />
        <Text color="$gray11">Loading...</Text>
      </YStack>
    )
  }

  const handleSkip = async () => {
    await skipOnboarding()
    router.replace('/(athlete)')
  }

  const handleComplete = async () => {
    await completeOnboarding()
    router.replace('/(athlete)')
  }

  return (
    <YStack
      flex={1}
      bg="$background"
      pt={insets.top}
      pb={insets.bottom}
      px="$4"
    >
      {/* Header with Skip */}
      <XStack justify="flex-end" py="$3">
        <Button
          size="$3"
          chromeless
          onPress={handleSkip}
        >
          <Text color="$gray11">Skip for now</Text>
        </Button>
      </XStack>

      {/* Main Content */}
      <YStack flex={1} justify="center" items="center" gap="$6">
        <YStack gap="$3" items="center">
          <Text fontSize="$8" fontWeight="bold" color="$gray12">
            Welcome to Your Journey
          </Text>
          <Text fontSize="$5" color="$gray11">
            {onboardingData?.userName
              ? `Hi ${onboardingData.userName.split(' ')[0]}!`
              : 'Hi there!'}
          </Text>
        </YStack>

        {/* Placeholder content */}
        <View
          bg="$gray3"
          br="$4"
          p="$5"
          gap="$3"
          width="100%"
          maxWidth={400}
        >
          <Text color="$gray12" fontWeight="600">
            Your 12-Week Transformation
          </Text>
          <Text color="$gray11" fontSize="$3">
            Sport: {onboardingData?.sport?.name ?? 'Not selected'}
          </Text>
          <Text color="$gray11" fontSize="$3">
            Skill Level: {onboardingData?.skillLevel ?? 'Unknown'}
          </Text>
          <Text color="$gray11" fontSize="$3">
            Training Days: {onboardingData?.preferredDays ?? 0} days/week
          </Text>
          {onboardingData?.weeksUntilSeason && (
            <Text color="$gray11" fontSize="$3">
              Season Starts: {onboardingData.weeksUntilSeason} weeks
            </Text>
          )}
        </View>

        <YStack gap="$2" items="center">
          <Text color="$gray10" fontSize="$2">
            Screen {(onboardingState?.onboardingProgress ?? 0) + 1} of{' '}
            {onboardingState?.totalScreens ?? 10}
          </Text>
          <Text color="$gray9" fontSize="$1">
            Full onboarding flow coming soon...
          </Text>
        </YStack>
      </YStack>

      {/* Footer with Action */}
      <YStack gap="$3" pb="$4">
        <Button
          size="$5"
          bg="$green10"
          pressStyle={{ bg: '$green11' }}
          onPress={handleComplete}
        >
          <Text color="white" fontWeight="600">
            Start Training
          </Text>
        </Button>
      </YStack>
    </YStack>
  )
}
