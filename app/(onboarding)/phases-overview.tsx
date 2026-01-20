import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, XStack, Text, Spinner, ScrollView, Button } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PHASE_DATA } from '../../components/onboarding'
import { useOnboardingAnalytics, ONBOARDING_SCREEN_NAMES } from '../../hooks/useOnboardingAnalytics'
import { IntakeProgressDots, COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT, COMBINED_FLOW_ROUTES } from '../../components/IntakeProgressDots'
import { ChevronRight, ChevronLeft } from '@tamagui/lucide-icons'
import type { Phase } from '../../types'

// Revisit flow screens (subset of full onboarding)
const REVISIT_SCREEN_COUNT = 2

/**
 * Screen 3 (Combined Flow): The Three Phases
 *
 * Educational overview showing GPP → SPP → SSP timeline
 * with brief descriptions of each phase.
 *
 * Also used in revisit mode for users reviewing the educational content.
 */
export default function PhasesOverviewScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { sportId } = useLocalSearchParams<{ sportId: string }>()

  // Get onboarding state
  const onboardingState = useQuery(api.onboarding.getOnboardingState)
  const completeOnboarding = useMutation(api.onboarding.completeOnboarding)

  // Analytics tracking
  const isRevisit = onboardingState?.isRevisit ?? false
  const { trackScreenComplete } = useOnboardingAnalytics({
    screenIndex: COMBINED_FLOW_SCREENS.PHASES_OVERVIEW,
    screenName: ONBOARDING_SCREEN_NAMES[1],
    isRevisit,
  })

  // Loading state
  if (onboardingState === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center">
        <Spinner size="large" color="$primary" />
      </YStack>
    )
  }

  const handleBack = () => {
    if (isRevisit) {
      // In revisit mode, go back to athlete dashboard
      router.replace('/(athlete)')
    } else {
      router.back()
    }
  }

  const handleContinue = async () => {
    trackScreenComplete()

    if (isRevisit) {
      // In revisit mode, continue to why-it-works for more educational content
      router.push('/(onboarding)/why-it-works' as any)
    } else {
      // In normal flow, navigate back to intake flow (age-group)
      router.push({
        pathname: '/(intake)/age-group',
        params: { sportId },
      } as any)
    }
  }

  const handleDone = async () => {
    // Mark onboarding as complete and return to dashboard
    await completeOnboarding()
    router.replace('/(athlete)')
  }

  // Handle backward navigation from progress dots
  const handleProgressNavigate = (index: number) => {
    const route = COMBINED_FLOW_ROUTES[index]
    if (route) {
      router.push({
        pathname: route,
        params: { sportId },
      } as any)
    }
  }

  const phases: Phase[] = ['GPP', 'SPP', 'SSP']

  return (
    <YStack flex={1} bg="$background">
      {/* Main Content */}
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack
          px="$4"
          pt={insets.top + 16}
          pb="$4"
          maxW={600}
          width="100%"
          self="center"
        >
          {/* Progress Dots - only show in normal flow, not revisit */}
          {!isRevisit && (
            <YStack items="center" mb="$4">
              <IntakeProgressDots
                total={COMBINED_FLOW_SCREEN_COUNT}
                current={COMBINED_FLOW_SCREENS.PHASES_OVERVIEW}
                onNavigate={handleProgressNavigate}
              />
            </YStack>
          )}

          {/* Revisit Mode Header */}
          {isRevisit && (
            <YStack items="center" mb="$2">
              <Text fontSize="$2" color="$color10" fontWeight="600" textTransform="uppercase" letterSpacing={1}>
                Training Phases Review
              </Text>
            </YStack>
          )}

          {/* Header */}
          <YStack items="center" gap="$2" mb="$6">
            <Text fontSize="$8" fontWeight="bold" color="$color12" text="center">
              Your Training Has
            </Text>
            <Text fontSize="$8" fontWeight="bold" color="$primary" text="center">
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
                  bg={index === 0 ? '$primary' : '$color4'}
                  items="center"
                  justify="center"
                >
                  <Text
                    fontSize="$3"
                    fontWeight="bold"
                    color={index === 0 ? 'white' : '$color10'}
                  >
                    {index + 1}
                  </Text>
                </YStack>

                {/* Connector arrow */}
                {index < phases.length - 1 && (
                  <Text color="$color8" fontSize="$5" px="$2">
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
                bg={index === 0 ? '$blue2' : '$color3'}
                rounded="$4"
                p="$4"
                gap="$2"
                borderWidth={index === 0 ? 2 : 1}
                borderColor={index === 0 ? '$blue8' : '$color5'}
              >
                <XStack justify="space-between" items="center">
                  <Text
                    fontSize="$2"
                    color={index === 0 ? '$blue11' : '$color10'}
                    fontWeight="600"
                    textTransform="uppercase"
                    letterSpacing={1}
                  >
                    {PHASE_DATA[phase].duration}
                  </Text>
                  {index === 0 && (
                    <YStack bg="$blue4" px="$2" py="$1" rounded="$2">
                      <Text fontSize="$1" color="$blue11" fontWeight="600">
                        START HERE
                      </Text>
                    </YStack>
                  )}
                </XStack>

                {/* Full phase name */}
                <Text fontSize="$5" fontWeight="bold" color="$color12">
                  {PHASE_DATA[phase].name}
                </Text>

                {/* Phase tagline */}
                <Text fontSize="$4" fontWeight="600" color={index === 0 ? '$blue11' : '$primary'}>
                  {PHASE_DATA[phase].tagline}
                </Text>

                <Text fontSize="$3" color="$color11">
                  {getPhaseDescription(phase)}
                </Text>
              </YStack>
            ))}
          </YStack>
        </YStack>
      </ScrollView>

      {/* Bottom Actions */}
      <YStack
        px="$4"
        py="$4"
        pb={insets.bottom + 16}
        borderTopWidth={1}
        borderTopColor="$borderColor"
        bg="$surface"
      >
        {isRevisit ? (
          <XStack gap="$3">
            <Button
              flex={1}
              size="$5"
              bg="$color4"
              color="$color11"
              onPress={handleDone}
              fontFamily="$body"
              fontWeight="600"
              rounded="$4"
              pressStyle={{ opacity: 0.9, scale: 0.98 }}
            >
              Done
            </Button>
            <Button
              flex={2}
              size="$5"
              bg="$primary"
              color="white"
              onPress={handleContinue}
              iconAfter={ChevronRight}
              fontFamily="$body"
              fontWeight="700"
              rounded="$4"
              pressStyle={{ opacity: 0.9, scale: 0.98 }}
            >
              Learn More
            </Button>
          </XStack>
        ) : (
          <XStack gap="$3">
            <Button
              flex={1}
              size="$5"
              bg="$color4"
              color="$color11"
              onPress={handleBack}
              icon={ChevronLeft}
              fontFamily="$body"
              fontWeight="600"
              rounded="$4"
              pressStyle={{ opacity: 0.9, scale: 0.98 }}
            >
              Back
            </Button>
            <Button
              flex={2}
              size="$5"
              bg="$primary"
              color="white"
              onPress={handleContinue}
              iconAfter={ChevronRight}
              fontFamily="$body"
              fontWeight="700"
              rounded="$4"
              pressStyle={{ opacity: 0.9, scale: 0.98 }}
            >
              Continue
            </Button>
          </XStack>
        )}
      </YStack>
    </YStack>
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
