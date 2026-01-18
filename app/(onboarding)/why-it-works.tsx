import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, XStack, Text, Spinner } from 'tamagui'
import { OnboardingScreen } from '../../components/onboarding'
import { useOnboardingAnalytics, ONBOARDING_SCREEN_NAMES } from '../../hooks/useOnboardingAnalytics'
import { COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT } from '../../components/IntakeProgressDots'

/**
 * Screen 2 (Combined Flow): Why This Works
 *
 * Social proof and education about periodization training.
 * Explains why the GPP→SPP→SSP model is effective.
 */
export default function WhyItWorksScreen() {
  const router = useRouter()
  const { sportId } = useLocalSearchParams<{ sportId: string }>()

  // Get onboarding state
  const onboardingState = useQuery(api.onboarding.getOnboardingState)

  // Mutations
  const advanceOnboarding = useMutation(api.onboarding.advanceOnboarding)
  const skipOnboarding = useMutation(api.onboarding.skipOnboarding)

  // Analytics tracking
  const isRevisit = onboardingState?.isRevisit ?? false
  const { trackScreenComplete, trackSkip } = useOnboardingAnalytics({
    screenIndex: COMBINED_FLOW_SCREENS.WHY_IT_WORKS,
    screenName: ONBOARDING_SCREEN_NAMES[2],
    isRevisit,
  })

  // Loading state
  if (onboardingState === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center">
        <Spinner size="large" color="$green10" />
      </YStack>
    )
  }

  const handleContinue = async () => {
    trackScreenComplete()
    // Navigate to phases-overview (skip gpp-detail, spp-detail, ssp-detail)
    router.push({
      pathname: '/(onboarding)/phases-overview',
      params: { sportId },
    } as any)
  }

  const handleSkip = async () => {
    trackSkip()
    await skipOnboarding()
    router.replace('/(athlete)')
  }

  return (
    <OnboardingScreen
      currentScreen={COMBINED_FLOW_SCREENS.WHY_IT_WORKS}
      totalScreens={COMBINED_FLOW_SCREEN_COUNT}
      primaryButtonText="Continue"
      onPrimaryPress={handleContinue}
      onSkip={handleSkip}
    >
      <YStack flex={1} justify="center" gap="$8">
        {/* Header */}
        <YStack items="center" gap="$2">
          <Text fontSize="$7" fontWeight="bold" color="$gray12">
            Science-Backed
          </Text>
          <Text fontSize="$7" fontWeight="bold" color="$green10">
            Training
          </Text>
        </YStack>

        {/* Main content */}
        <YStack gap="$6">
          {/* Explanation */}
          <YStack bg="$gray2" rounded="$4" p="$5" gap="$3">
            <Text fontSize="$4" color="$gray12" fontWeight="600">
              What is Periodization?
            </Text>
            <Text fontSize="$3" color="$gray11" lineHeight={22}>
              Periodization is the systematic planning of athletic training.
              It involves progressive cycling of various aspects of a training
              program during a specific period.
            </Text>
            <Text fontSize="$3" color="$gray11" lineHeight={22}>
              This approach is used by Olympic athletes, professional sports
              teams, and anyone who wants to maximize their performance while
              minimizing injury risk.
            </Text>
          </YStack>

          {/* Stats/proof points */}
          <XStack gap="$4" justify="center">
            <StatCard
              value="12"
              label="Weeks"
              sublabel="Full Program"
            />
            <StatCard
              value="3"
              label="Phases"
              sublabel="Progressive"
            />
            <StatCard
              value="100%"
              label="Tailored"
              sublabel="To Your Sport"
            />
          </XStack>
        </YStack>

        {/* Endorsement */}
        <YStack items="center" gap="$2">
          <Text fontSize="$3" color="$gray10">
            Used by elite athletes and coaches worldwide
          </Text>
        </YStack>
      </YStack>
    </OnboardingScreen>
  )
}

interface StatCardProps {
  value: string
  label: string
  sublabel: string
}

function StatCard({ value, label, sublabel }: StatCardProps) {
  return (
    <YStack
      flex={1}
      bg="$green2"
      rounded="$4"
      p="$3"
      items="center"
      gap="$1"
      borderWidth={1}
      borderColor="$green6"
    >
      <Text fontSize="$7" fontWeight="bold" color="$green10">
        {value}
      </Text>
      <Text fontSize="$3" fontWeight="600" color="$gray12">
        {label}
      </Text>
      <Text fontSize="$2" color="$gray10">
        {sublabel}
      </Text>
    </YStack>
  )
}
