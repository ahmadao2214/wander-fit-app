import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, XStack, Text, Spinner, ScrollView } from 'tamagui'
import { OnboardingScreen, PHASE_DATA } from '../../components/onboarding'
import { useOnboardingAnalytics, ONBOARDING_SCREEN_NAMES } from '../../hooks/useOnboardingAnalytics'
import { COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT } from '../../components/IntakeProgressDots'
import type { Phase } from '../../types'

/**
 * Screen 3 (Combined Flow): The Three Phases
 *
 * Educational overview showing GPP → SPP → SSP timeline
 * with brief descriptions of each phase.
 */
export default function PhasesOverviewScreen() {
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
    screenIndex: COMBINED_FLOW_SCREENS.PHASES_OVERVIEW,
    screenName: ONBOARDING_SCREEN_NAMES[1],
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
    // Navigate back to intake flow (age-group)
    router.push({
      pathname: '/(intake)/age-group',
      params: { sportId },
    } as any)
  }

  const handleSkip = async () => {
    trackSkip()
    await skipOnboarding()
    router.replace('/(athlete)')
  }

  const phases: Phase[] = ['GPP', 'SPP', 'SSP']

  return (
    <OnboardingScreen
      currentScreen={COMBINED_FLOW_SCREENS.PHASES_OVERVIEW}
      totalScreens={COMBINED_FLOW_SCREEN_COUNT}
      primaryButtonText="Continue"
      onPrimaryPress={handleContinue}
      onSkip={handleSkip}
    >
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack flex={1} gap="$6" py="$4">
          {/* Header */}
          <YStack items="center" gap="$2">
            <Text fontSize="$7" fontWeight="bold" color="$gray12">
              Your Training Has
            </Text>
            <Text fontSize="$7" fontWeight="bold" color="$green10">
              Three Chapters
            </Text>
          </YStack>

          {/* Timeline visualization */}
          <XStack justify="center" items="center" gap="$2" py="$4">
            {phases.map((phase, index) => (
              <XStack key={phase} items="center">
                {/* Phase circle */}
                <YStack
                  width={60}
                  height={60}
                  rounded="$10"
                  bg={index === 0 ? '$green10' : '$gray4'}
                  items="center"
                  justify="center"
                >
                  <Text
                    fontSize="$4"
                    fontWeight="bold"
                    color={index === 0 ? 'white' : '$gray10'}
                  >
                    {phase}
                  </Text>
                </YStack>

                {/* Connector arrow */}
                {index < phases.length - 1 && (
                  <Text color="$gray8" fontSize="$5" px="$2">
                    →
                  </Text>
                )}
              </XStack>
            ))}
          </XStack>

          {/* Phase cards */}
          <YStack gap="$4">
            {phases.map((phase, index) => (
              <YStack
                key={phase}
                bg={index === 0 ? '$green2' : '$gray2'}
                rounded="$4"
                p="$4"
                gap="$2"
                borderWidth={index === 0 ? 2 : 1}
                borderColor={index === 0 ? '$green8' : '$gray5'}
              >
                <XStack justify="space-between" items="center">
                  <Text
                    fontSize="$2"
                    color={index === 0 ? '$green11' : '$gray10'}
                    fontWeight="600"
                    textTransform="uppercase"
                    letterSpacing={1}
                  >
                    {PHASE_DATA[phase].duration}
                  </Text>
                  {index === 0 && (
                    <YStack bg="$green4" px="$2" py="$1" rounded="$2">
                      <Text fontSize="$1" color="$green11" fontWeight="600">
                        START HERE
                      </Text>
                    </YStack>
                  )}
                </XStack>

                <Text fontSize="$5" fontWeight="bold" color="$gray12">
                  {PHASE_DATA[phase].tagline}
                </Text>

                <Text fontSize="$3" color="$gray11">
                  {getPhaseDescription(phase)}
                </Text>
              </YStack>
            ))}
          </YStack>
        </YStack>
      </ScrollView>
    </OnboardingScreen>
  )
}

function getPhaseDescription(phase: Phase): string {
  switch (phase) {
    case 'GPP':
      return 'Build your athletic foundation with movements that improve overall strength, mobility, and work capacity.'
    case 'SPP':
      return 'Transfer your fitness gains to sport-specific movements that directly enhance your performance.'
    case 'SSP':
      return 'Peak your performance with competition-ready training while maintaining your hard-earned gains.'
  }
}
