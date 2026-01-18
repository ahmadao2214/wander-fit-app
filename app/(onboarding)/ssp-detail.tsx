import { useRouter } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, XStack, Text, Spinner, ScrollView } from 'tamagui'
import { OnboardingScreen, PHASE_DATA } from '../../components/onboarding'
import { useOnboardingAnalytics, ONBOARDING_SCREEN_NAMES } from '../../hooks/useOnboardingAnalytics'
import { Trophy, Flame, Clock, Star } from '@tamagui/lucide-icons'

/**
 * Screen 2.3: SSP Explained
 *
 * Deep dive into Sport-Specific Preparedness phase.
 * Explains how SSP peaks performance for competition.
 */
export default function SspDetailScreen() {
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
    screenIndex: 5,
    screenName: ONBOARDING_SCREEN_NAMES[5],
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
    await advanceOnboarding({ screenIndex: 6 })
    router.push('/(onboarding)/personal-timeline' as any)
  }

  const handleSkip = async () => {
    trackSkip()
    await skipOnboarding()
    router.replace('/(athlete)')
  }

  const sspBenefits = [
    {
      icon: Trophy,
      title: 'Competition Ready',
      description: 'Be at your physical peak when it matters most',
    },
    {
      icon: Flame,
      title: 'Peak Performance',
      description: 'Maximize power, speed, and sport-specific abilities',
    },
    {
      icon: Clock,
      title: 'Strategic Tapering',
      description: 'Reduce volume while maintaining intensity',
    },
    {
      icon: Star,
      title: 'Mental Sharpness',
      description: 'Build confidence through proven readiness',
    },
  ]

  return (
    <OnboardingScreen
      currentScreen={5}
      totalScreens={onboardingState?.totalScreens ?? 10}
      primaryButtonText="See My Timeline"
      onPrimaryPress={handleContinue}
      onSkip={handleSkip}
    >
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack flex={1} gap="$6" py="$4">
          {/* Header */}
          <YStack gap="$2">
            <XStack items="center" gap="$2">
              <YStack bg="$orange4" px="$2" py="$1" rounded="$2">
                <Text fontSize="$1" color="$orange11" fontWeight="600">
                  PHASE 3
                </Text>
              </YStack>
              <Text fontSize="$2" color="$gray9">
                {PHASE_DATA.SSP.duration}
              </Text>
            </XStack>

            <Text fontSize="$7" fontWeight="bold" color="$orange10">
              {PHASE_DATA.SSP.name}
            </Text>

            <Text fontSize="$5" fontWeight="600" color="$gray12">
              {PHASE_DATA.SSP.tagline}
            </Text>
          </YStack>

          {/* Main explanation */}
          <YStack bg="$gray2" rounded="$4" p="$4" gap="$3">
            <Text fontSize="$3" color="$gray11" lineHeight={22}>
              SSP is the final phase where everything comes together. This is where
              you'll peak - reaching your highest level of sport-specific fitness
              right when you need it most.
            </Text>
            <Text fontSize="$3" color="$gray11" lineHeight={22}>
              Training becomes highly specific, with strategic tapering to ensure
              you're fresh, sharp, and ready to perform at your absolute best.
            </Text>
          </YStack>

          {/* Benefits list */}
          <YStack gap="$3">
            <Text fontSize="$4" fontWeight="600" color="$gray12">
              What You'll Achieve
            </Text>

            <YStack gap="$3">
              {sspBenefits.map((benefit, index) => (
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
                    bg="$orange4"
                    items="center"
                    justify="center"
                  >
                    <benefit.icon size={20} color="$orange10" />
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
            <YStack bg="$orange2" rounded="$4" p="$4" borderWidth={1} borderColor="$orange6">
              <Text fontSize="$3" color="$orange11" fontWeight="500">
                For {onboardingData.sport.name}, SSP will have you performing
                at your competitive best - stronger, faster, and more confident
                than ever.
              </Text>
            </YStack>
          )}

          {/* Summary */}
          <YStack bg="$green2" rounded="$4" p="$4" gap="$3" borderWidth={2} borderColor="$green8">
            <Text fontSize="$4" fontWeight="bold" color="$green11">
              The Complete Journey
            </Text>
            <XStack gap="$4" justify="space-between" items="center">
              <YStack items="center" flex={1}>
                <Text fontSize="$6" fontWeight="bold" color="$green10">
                  GPP
                </Text>
                <Text fontSize="$1" color="$gray10">
                  Foundation
                </Text>
              </YStack>
              <Text fontSize="$4" color="$gray8">→</Text>
              <YStack items="center" flex={1}>
                <Text fontSize="$6" fontWeight="bold" color="$blue10">
                  SPP
                </Text>
                <Text fontSize="$1" color="$gray10">
                  Transfer
                </Text>
              </YStack>
              <Text fontSize="$4" color="$gray8">→</Text>
              <YStack items="center" flex={1}>
                <Text fontSize="$6" fontWeight="bold" color="$orange10">
                  SSP
                </Text>
                <Text fontSize="$1" color="$gray10">
                  Peak
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </YStack>
      </ScrollView>
    </OnboardingScreen>
  )
}
