import { useRouter } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, XStack, Text, Spinner, ScrollView } from 'tamagui'
import { OnboardingScreen, PHASE_DATA } from '../../components/onboarding'
import { Dumbbell, Heart, Zap, Target } from '@tamagui/lucide-icons'

/**
 * Screen 2.1: GPP Explained
 *
 * Deep dive into General Physical Preparedness phase.
 * Explains what GPP is and why it's the foundation.
 */
export default function GppDetailScreen() {
  const router = useRouter()

  // Get onboarding state
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
    await advanceOnboarding({ screenIndex: 4 })
    router.push('/(onboarding)/spp-detail' as any)
  }

  const handleSkip = async () => {
    await skipOnboarding()
    router.replace('/(athlete)')
  }

  const gppBenefits = [
    {
      icon: Dumbbell,
      title: 'Build Strength',
      description: 'Develop overall muscular strength and work capacity',
    },
    {
      icon: Heart,
      title: 'Improve Conditioning',
      description: 'Enhance cardiovascular fitness and endurance',
    },
    {
      icon: Zap,
      title: 'Movement Quality',
      description: 'Master fundamental movement patterns',
    },
    {
      icon: Target,
      title: 'Injury Prevention',
      description: 'Create a resilient body that can handle training loads',
    },
  ]

  return (
    <OnboardingScreen
      currentScreen={3}
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
              <YStack bg="$green4" px="$2" py="$1" rounded="$2">
                <Text fontSize="$1" color="$green11" fontWeight="600">
                  PHASE 1
                </Text>
              </YStack>
              <Text fontSize="$2" color="$gray9">
                {PHASE_DATA.GPP.duration}
              </Text>
            </XStack>

            <Text fontSize="$7" fontWeight="bold" color="$green10">
              {PHASE_DATA.GPP.name}
            </Text>

            <Text fontSize="$5" fontWeight="600" color="$gray12">
              {PHASE_DATA.GPP.tagline}
            </Text>
          </YStack>

          {/* Main explanation */}
          <YStack bg="$gray2" rounded="$4" p="$4" gap="$3">
            <Text fontSize="$3" color="$gray11" lineHeight={22}>
              GPP is where your athletic journey begins. During these first 4 weeks,
              you'll build the physical foundation that everything else is built upon.
            </Text>
            <Text fontSize="$3" color="$gray11" lineHeight={22}>
              Think of it like building a house - you can't put up walls until you
              have a solid foundation. GPP is that foundation for your athletic
              performance.
            </Text>
          </YStack>

          {/* Benefits list */}
          <YStack gap="$3">
            <Text fontSize="$4" fontWeight="600" color="$gray12">
              What You'll Achieve
            </Text>

            <YStack gap="$3">
              {gppBenefits.map((benefit, index) => (
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
                    bg="$green4"
                    items="center"
                    justify="center"
                  >
                    <benefit.icon size={20} color="$green10" />
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
            <YStack bg="$green2" rounded="$4" p="$4" borderWidth={1} borderColor="$green6">
              <Text fontSize="$3" color="$green11" fontWeight="500">
                For {onboardingData.sport.name}, GPP will focus on the movement
                patterns and energy systems most important for your sport.
              </Text>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </OnboardingScreen>
  )
}
