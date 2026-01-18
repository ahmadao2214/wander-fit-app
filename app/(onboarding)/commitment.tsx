import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, XStack, Text, Spinner, ScrollView } from 'tamagui'
import { OnboardingScreen, CommitmentButton } from '../../components/onboarding'
import { useOnboardingAnalytics, ONBOARDING_SCREEN_NAMES } from '../../hooks/useOnboardingAnalytics'
import { COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT } from '../../components/IntakeProgressDots'
import { analytics } from '../../lib/analytics'
import { useState } from 'react'
import { CheckCircle } from '@tamagui/lucide-icons'

/**
 * Screen 9 (Combined Flow): Commitment
 *
 * YAZIO-style commitment screen with hold-to-confirm button.
 * User commits to their training journey.
 */
export default function CommitmentScreen() {
  const router = useRouter()
  const { sportId, ageGroup, yearsOfExperience, trainingDays: trainingDaysParam, weeksUntilSeason } = useLocalSearchParams<{
    sportId: string
    ageGroup: string
    yearsOfExperience: string
    trainingDays: string
    weeksUntilSeason: string
  }>()
  const [hasCommitted, setHasCommitted] = useState(false)

  // Get onboarding state
  const onboardingState = useQuery(api.onboarding.getOnboardingState)
  const onboardingData = useQuery(api.onboarding.getOnboardingData)

  // Mutations
  const advanceOnboarding = useMutation(api.onboarding.advanceOnboarding)
  const skipOnboarding = useMutation(api.onboarding.skipOnboarding)

  // Analytics tracking
  const isRevisit = onboardingState?.isRevisit ?? false
  const { trackScreenComplete, trackSkip } = useOnboardingAnalytics({
    screenIndex: COMBINED_FLOW_SCREENS.COMMITMENT,
    screenName: ONBOARDING_SCREEN_NAMES[7],
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

  const handleCommit = () => {
    analytics.trackCommitmentCompleted()
    setHasCommitted(true)
  }

  const handleContinue = async () => {
    trackScreenComplete()
    // Navigate to maxes intake screen (skip progression screen)
    router.push({
      pathname: '/(intake)/maxes',
      params: {
        sportId,
        ageGroup,
        yearsOfExperience,
        trainingDays: trainingDaysParam,
        weeksUntilSeason,
      },
    } as any)
  }

  const handleSkip = async () => {
    trackSkip()
    await skipOnboarding()
    router.replace('/(athlete)')
  }

  const firstName = onboardingData?.userName?.split(' ')[0] ?? 'Athlete'
  const sportName = onboardingData?.sport?.name ?? 'your sport'
  const trainingDays = trainingDaysParam ? parseInt(trainingDaysParam, 10) : (onboardingData?.preferredDays ?? 4)

  const commitments = [
    {
      text: `Train ${trainingDays} days per week`,
      subtext: 'Consistency is key to progress',
    },
    {
      text: 'Follow the program as designed',
      subtext: 'Trust the process',
    },
    {
      text: 'Track your workouts',
      subtext: "What gets measured gets managed",
    },
    {
      text: 'Stay committed for 12 weeks',
      subtext: 'Real transformation takes time',
    },
  ]

  return (
    <OnboardingScreen
      currentScreen={COMBINED_FLOW_SCREENS.COMMITMENT}
      totalScreens={COMBINED_FLOW_SCREEN_COUNT}
      primaryButtonText={hasCommitted ? "Let's Do This" : 'Make Your Commitment'}
      onPrimaryPress={hasCommitted ? handleContinue : undefined}
      onSkip={handleSkip}
      primaryButtonDisabled={!hasCommitted}
    >
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack flex={1} gap="$6" py="$4" items="center">
          {/* Header */}
          <YStack gap="$2" items="center">
            <Text fontSize="$7" fontWeight="bold" color="$gray12">
              Make Your
            </Text>
            <Text fontSize="$7" fontWeight="bold" color="$green10">
              Commitment
            </Text>
          </YStack>

          {/* Personal message */}
          <YStack bg="$gray2" rounded="$4" p="$4" width="100%">
            <Text fontSize="$3" color="$gray11" lineHeight={22}>
              {firstName}, you're about to start a journey that will transform your
              {' '}{sportName} performance. To get the results you want, we need your
              commitment.
            </Text>
          </YStack>

          {/* Commitments list */}
          <YStack gap="$3" width="100%">
            {commitments.map((commitment, index) => (
              <XStack
                key={index}
                bg={hasCommitted ? '$green1' : '$gray1'}
                rounded="$3"
                p="$3"
                gap="$3"
                items="flex-start"
                borderWidth={1}
                borderColor={hasCommitted ? '$green4' : '$gray4'}
              >
                <YStack
                  width={24}
                  height={24}
                  rounded="$10"
                  bg={hasCommitted ? '$green10' : '$gray4'}
                  items="center"
                  justify="center"
                >
                  {hasCommitted ? (
                    <CheckCircle size={14} color="white" />
                  ) : (
                    <Text fontSize="$2" color="$gray10" fontWeight="bold">
                      {index + 1}
                    </Text>
                  )}
                </YStack>
                <YStack flex={1} gap="$1">
                  <Text
                    fontSize="$3"
                    fontWeight="600"
                    color={hasCommitted ? '$green11' : '$gray12'}
                  >
                    {commitment.text}
                  </Text>
                  <Text fontSize="$2" color="$gray10">
                    {commitment.subtext}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>

          {/* Commitment button */}
          {!hasCommitted ? (
            <YStack items="center" gap="$4" py="$4">
              <CommitmentButton
                onCommit={handleCommit}
                holdDuration={2000}
                size={140}
                label="I Commit"
                instruction="Hold for 2 seconds to commit"
              />
            </YStack>
          ) : (
            <YStack
              bg="$green2"
              rounded="$4"
              p="$4"
              width="100%"
              items="center"
              gap="$2"
              borderWidth={2}
              borderColor="$green8"
            >
              <Text fontSize="$6">🎉</Text>
              <Text fontSize="$4" fontWeight="bold" color="$green11">
                You're Committed!
              </Text>
              <Text fontSize="$3" color="$green10">
                Let's make the next 12 weeks count.
              </Text>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </OnboardingScreen>
  )
}
