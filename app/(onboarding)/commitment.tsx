import { useState, useEffect } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { Id } from 'convex/_generated/dataModel'
import { YStack, XStack, Text, Spinner, ScrollView, Button, H2 } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CommitmentButton } from '../../components/onboarding'
import { useOnboardingAnalytics, ONBOARDING_SCREEN_NAMES } from '../../hooks/useOnboardingAnalytics'
import { IntakeProgressDots, COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT } from '../../components/IntakeProgressDots'
import { analytics } from '../../lib/analytics'
import { CheckCircle, ChevronLeft, Dumbbell } from '@tamagui/lucide-icons'
import type { AgeGroup } from '../../types'

/**
 * Screen 10 (Combined Flow): Commitment
 *
 * Final step - YAZIO-style commitment screen with hold-to-confirm button.
 * User commits to their training journey and program is created.
 */
export default function CommitmentScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { sportId, ageGroup, yearsOfExperience, trainingDays: trainingDaysParam, weeksUntilSeason } = useLocalSearchParams<{
    sportId: string
    ageGroup: AgeGroup
    yearsOfExperience: string
    trainingDays: string
    weeksUntilSeason: string
  }>()
  const [hasCommitted, setHasCommitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Get onboarding state
  const onboardingState = useQuery(api.onboarding.getOnboardingState)
  const onboardingData = useQuery(api.onboarding.getOnboardingData)

  // Mutations
  const completeIntake = useMutation(api.userPrograms.completeIntake)
  const completeOnboarding = useMutation(api.onboarding.completeOnboarding)

  // Analytics tracking
  const isRevisit = onboardingState?.isRevisit ?? false
  const { trackScreenComplete, trackSkip } = useOnboardingAnalytics({
    screenIndex: COMBINED_FLOW_SCREENS.COMMITMENT,
    screenName: ONBOARDING_SCREEN_NAMES[7],
    isRevisit,
  })

  // Parse params for intake completion
  const years = parseInt(yearsOfExperience || '0', 10)
  const days = parseInt(trainingDaysParam || '4', 10)
  const weeks = parseInt(weeksUntilSeason || '12', 10)

  // Navigate to athlete dashboard after success
  useEffect(() => {
    if (isSuccess) {
      const timeout = setTimeout(() => {
        router.replace('/(athlete)')
      }, 1500)
      return () => clearTimeout(timeout)
    }
  }, [isSuccess, router])

  // Loading state
  if (onboardingState === undefined || onboardingData === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center">
        <Spinner size="large" color="$primary" />
      </YStack>
    )
  }

  const handleCommit = async () => {
    analytics.trackCommitmentCompleted()
    setHasCommitted(true)
    setIsSubmitting(true)

    try {
      // Complete both intake and onboarding
      await completeIntake({
        sportId: sportId as Id<"sports">,
        yearsOfExperience: years,
        preferredTrainingDaysPerWeek: days,
        weeksUntilSeason: weeks,
        ageGroup: ageGroup as "10-13" | "14-17" | "18+",
      })
      await completeOnboarding()
      trackScreenComplete()
      analytics.trackOnboardingCompleted(false)
      setIsSuccess(true)
    } catch (error) {
      console.error('Failed to complete intake:', error)
      alert('Failed to create program. Please try again.')
      setIsSubmitting(false)
      setHasCommitted(false)
    }
  }

  const handleBack = () => {
    router.back()
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
                bg={hasCommitted ? '$color3' : '$color2'}
                rounded="$3"
                p="$3"
                gap="$3"
                items="flex-start"
                borderWidth={1}
                borderColor={hasCommitted ? '$primary' : '$color4'}
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
                    color={hasCommitted ? '$primary' : '$color12'}
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
                disabled={isSubmitting}
              />
            </YStack>
          ) : isSuccess ? (
            <YStack
              bg="$color3"
              rounded="$4"
              p="$6"
              items="center"
              gap="$3"
              borderWidth={2}
              borderColor="$primary"
            >
              <Dumbbell size={48} color="$primary" />
              <Text fontSize="$6" fontWeight="bold" color="$primary">
                Let's Go!
              </Text>
              <Text fontSize="$4" color="$color11" text="center">
                Your personalized program is ready.
              </Text>
              <Spinner size="small" color="$primary" />
              <Text fontSize="$3" color="$color10">
                Taking you to your dashboard...
              </Text>
            </YStack>
          ) : (
            <YStack
              bg="$color3"
              rounded="$4"
              p="$4"
              items="center"
              gap="$2"
              borderWidth={2}
              borderColor="$primary"
            >
              <Text fontSize="$6">🎉</Text>
              <Text fontSize="$4" fontWeight="bold" color="$primary">
                You're Committed!
              </Text>
              <XStack items="center" gap="$2">
                <Spinner size="small" color="$primary" />
                <Text fontSize="$3" color="$color11">
                  Creating your program...
                </Text>
              </XStack>
            </YStack>
          )}
        </YStack>
      </ScrollView>

      {/* Bottom Actions - Only show before commitment */}
      {!hasCommitted && (
        <YStack
          px="$4"
          py="$4"
          pb={insets.bottom + 16}
          borderTopWidth={1}
          borderTopColor="$borderColor"
          bg="$surface"
        >
          <Button
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
        </YStack>
      )}
    </YStack>
  )
}
