import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, XStack, Text, Spinner, ScrollView, Button } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CommitmentButton } from '../../components/onboarding'
import { useOnboardingAnalytics, ONBOARDING_SCREEN_NAMES } from '../../hooks/useOnboardingAnalytics'
import { IntakeProgressDots, COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT } from '../../components/IntakeProgressDots'
import { analytics } from '../../lib/analytics'
import { useState } from 'react'
import { CheckCircle, ChevronRight, ChevronLeft } from '@tamagui/lucide-icons'

/**
 * Screen 9 (Combined Flow): Commitment
 *
 * YAZIO-style commitment screen with hold-to-confirm button.
 * User commits to their training journey.
 */
export default function CommitmentScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
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
        <Spinner size="large" color="$primary" />
      </YStack>
    )
  }

  const handleCommit = () => {
    analytics.trackCommitmentCompleted()
    setHasCommitted(true)
  }

  const handleBack = () => {
    router.back()
  }

  const handleContinue = () => {
    trackScreenComplete()
    // Navigate to maxes intake screen
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
          {/* Progress Dots */}
          <YStack items="center" mb="$4">
            <IntakeProgressDots total={COMBINED_FLOW_SCREEN_COUNT} current={COMBINED_FLOW_SCREENS.COMMITMENT} />
          </YStack>

          {/* Header */}
          <YStack gap="$2" items="center" mb="$6">
            <Text fontSize="$8" fontWeight="bold" color="$color12" text="center">
              Make Your
            </Text>
            <Text fontSize="$8" fontWeight="bold" color="$primary" text="center">
              Commitment
            </Text>
          </YStack>

          {/* Personal message */}
          <YStack bg="$color3" rounded="$4" p="$4" mb="$4">
            <Text fontSize="$3" color="$color11" lineHeight={22}>
              {firstName}, you're about to start a journey that will transform your
              {' '}{sportName} performance. To get the results you want, we need your
              commitment.
            </Text>
          </YStack>

          {/* Commitments list */}
          <YStack gap="$3" mb="$6">
            {commitments.map((commitment, index) => (
              <XStack
                key={index}
                bg={hasCommitted ? '$green1' : '$color2'}
                rounded="$3"
                p="$3"
                gap="$3"
                items="flex-start"
                borderWidth={1}
                borderColor={hasCommitted ? '$green4' : '$color4'}
              >
                <YStack
                  width={24}
                  height={24}
                  rounded="$10"
                  bg={hasCommitted ? '$primary' : '$color4'}
                  items="center"
                  justify="center"
                >
                  {hasCommitted ? (
                    <CheckCircle size={14} color="white" />
                  ) : (
                    <Text fontSize="$2" color="$color10" fontWeight="bold">
                      {index + 1}
                    </Text>
                  )}
                </YStack>
                <YStack flex={1} gap="$1">
                  <Text
                    fontSize="$3"
                    fontWeight="600"
                    color={hasCommitted ? '$green11' : '$color12'}
                  >
                    {commitment.text}
                  </Text>
                  <Text fontSize="$2" color="$color10">
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

      {/* Bottom Actions */}
      <YStack
        px="$4"
        py="$4"
        pb={insets.bottom + 16}
        borderTopWidth={1}
        borderTopColor="$borderColor"
        bg="$surface"
      >
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
            bg={hasCommitted ? '$primary' : '$color6'}
            color="white"
            disabled={!hasCommitted}
            onPress={handleContinue}
            iconAfter={ChevronRight}
            fontFamily="$body"
            fontWeight="700"
            rounded="$4"
            pressStyle={hasCommitted ? { opacity: 0.9, scale: 0.98 } : {}}
          >
            {hasCommitted ? "Let's Do This" : 'Make Commitment'}
          </Button>
        </XStack>
      </YStack>
    </YStack>
  )
}
