import { useRouter } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, XStack, Text, Spinner, ScrollView } from 'tamagui'
import { OnboardingScreen, PHASE_DATA } from '../../components/onboarding'
import { useOnboardingAnalytics, ONBOARDING_SCREEN_NAMES } from '../../hooks/useOnboardingAnalytics'
import { Target, TrendingUp, Activity, Award } from '@tamagui/lucide-icons'

/**
 * Screen 2.2: SPP Explained
 *
 * Deep dive into Specific Physical Preparedness phase.
 * Explains how SPP bridges general fitness to sport-specific performance.
 */
export default function SppDetailScreen() {
  const router = useRouter()

  // Get onboarding state
  const onboardingState = useQuery(api.onboarding.getOnboardingState)
  const onboardingData = useQuery(api.onboarding.getOnboardingData)

  // Mutations
  const advanceOnboarding = useMutation(api.onboarding.advanceOnboarding)
  const skipOnboarding = useMutation(api.onboarding.skipOnboarding)

  // Analytics tracking
  const isRevisit = onboardingState?.isRevisit ?? false
  const { trackScreenComplete, trackSkip } = useOnboardingAnalytics({
    screenIndex: 4,
    screenName: ONBOARDING_SCREEN_NAMES[4],
    isRevisit,
  })

  // Loading state
  if (onboardingState === undefined || onboardingData === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center">
        <Spinner size="large" color="$green10" />
      </YStack>
    )
  }

  const handleContinue = async () => {
    trackScreenComplete()
    await advanceOnboarding({ screenIndex: 5 })
    router.push('/(onboarding)/ssp-detail' as any)
  }

  const handleSkip = async () => {
    trackSkip()
    await skipOnboarding()
    router.replace('/(athlete)')
  }

  const sppBenefits = [
    {
      icon: Target,
      title: 'Sport-Specific Movements',
      description: 'Train patterns that directly transfer to your sport',
    },
    {
      icon: TrendingUp,
      title: 'Progressive Intensity',
      description: 'Gradually increase training loads and complexity',
    },
    {
      icon: Activity,
      title: 'Energy System Training',
      description: 'Develop the specific energy systems your sport demands',
    },
    {
      icon: Award,
      title: 'Skill Integration',
      description: 'Combine strength with sport-specific technique',
    },
  ]

  return (
    <OnboardingScreen
      currentScreen={4}
      totalScreens={onboardingState?.totalScreens ?? 10}
      primaryButtonText="Next Phase"
      onPrimaryPress={handleContinue}
      onSkip={handleSkip}
    >
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack flex={1} gap="$6" py="$4">
          {/* Header */}
          <YStack gap="$2">
            <XStack items="center" gap="$2">
              <YStack bg="$blue4" px="$2" py="$1" rounded="$2">
                <Text fontSize="$1" color="$blue11" fontWeight="600">
                  PHASE 2
                </Text>
              </YStack>
              <Text fontSize="$2" color="$gray9">
                {PHASE_DATA.SPP.duration}
              </Text>
            </XStack>

            <Text fontSize="$7" fontWeight="bold" color="$blue10">
              {PHASE_DATA.SPP.name}
            </Text>

            <Text fontSize="$5" fontWeight="600" color="$gray12">
              {PHASE_DATA.SPP.tagline}
            </Text>
          </YStack>

          {/* Main explanation */}
          <YStack bg="$gray2" rounded="$4" p="$4" gap="$3">
            <Text fontSize="$3" color="$gray11" lineHeight={22}>
              SPP is where the magic happens. Now that you've built your foundation,
              it's time to channel that fitness into movements that directly improve
              your sport performance.
            </Text>
            <Text fontSize="$3" color="$gray11" lineHeight={22}>
              The exercises become more specific to your sport, the intensity
              increases, and you'll start to feel the direct transfer to your
              athletic abilities.
            </Text>
          </YStack>

          {/* Benefits list */}
          <YStack gap="$3">
            <Text fontSize="$4" fontWeight="600" color="$gray12">
              What You'll Achieve
            </Text>

            <YStack gap="$3">
              {sppBenefits.map((benefit, index) => (
                <XStack
                  key={index}
                  bg="$gray1"
                  rounded="$3"
                  p="$3"
                  gap="$3"
                  items="flex-start"
                  borderWidth={1}
                  borderColor="$gray4"
                >
                  <YStack
                    width={40}
                    height={40}
                    rounded="$10"
                    bg="$blue4"
                    items="center"
                    justify="center"
                  >
                    <benefit.icon size={20} color="$blue10" />
                  </YStack>
                  <YStack flex={1} gap="$1">
                    <Text fontSize="$3" fontWeight="600" color="$gray12">
                      {benefit.title}
                    </Text>
                    <Text fontSize="$2" color="$gray10">
                      {benefit.description}
                    </Text>
                  </YStack>
                </XStack>
              ))}
            </YStack>
          </YStack>

          {/* Sport-specific note */}
          {onboardingData?.sport && (
            <YStack bg="$blue2" rounded="$4" p="$4" borderWidth={1} borderColor="$blue6">
              <Text fontSize="$3" color="$blue11" fontWeight="500">
                For {onboardingData.sport.name}, SPP will include exercises that
                mimic the demands and movements of your sport at higher intensities.
              </Text>
            </YStack>
          )}

          {/* Transition note */}
          <XStack bg="$gray3" rounded="$3" p="$3" gap="$2" items="center">
            <Text fontSize="$5">🔄</Text>
            <Text fontSize="$2" color="$gray11" flex={1}>
              The transition from GPP to SPP is gradual - you won't feel overwhelmed.
            </Text>
          </XStack>
        </YStack>
      </ScrollView>
    </OnboardingScreen>
  )
}
