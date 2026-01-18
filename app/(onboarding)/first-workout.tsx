import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, XStack, Text, Spinner, ScrollView, Button } from 'tamagui'
import { OnboardingScreen } from '../../components/onboarding'
import { useOnboardingAnalytics, ONBOARDING_SCREEN_NAMES } from '../../hooks/useOnboardingAnalytics'
import { COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT } from '../../components/IntakeProgressDots'
import { analytics } from '../../lib/analytics'
import { Play, CheckCircle, Clock, Dumbbell } from '@tamagui/lucide-icons'

/**
 * Screen 11 (Combined Flow): Your First Workout Preview
 *
 * Final onboarding screen showing a preview of the first workout
 * and a CTA to continue to results.
 */
export default function FirstWorkoutScreen() {
  const router = useRouter()
  const { sportId, ageGroup, yearsOfExperience, trainingDays, weeksUntilSeason } = useLocalSearchParams<{
    sportId: string
    ageGroup: string
    yearsOfExperience: string
    trainingDays: string
    weeksUntilSeason: string
  }>()

  // Get onboarding state
  const onboardingState = useQuery(api.onboarding.getOnboardingState)
  const onboardingData = useQuery(api.onboarding.getOnboardingData)

  // Mutations - don't complete onboarding yet, results will do it
  const advanceOnboarding = useMutation(api.onboarding.advanceOnboarding)

  // Analytics tracking
  const isRevisit = onboardingState?.isRevisit ?? false
  const { trackScreenComplete } = useOnboardingAnalytics({
    screenIndex: COMBINED_FLOW_SCREENS.FIRST_WORKOUT,
    screenName: ONBOARDING_SCREEN_NAMES[9],
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

  // Navigate to results screen to finalize
  const handleContinue = async () => {
    trackScreenComplete()
    router.push({
      pathname: '/(intake)/results',
      params: {
        sportId,
        ageGroup,
        yearsOfExperience,
        trainingDays,
        weeksUntilSeason,
      },
    } as any)
  }

  const firstName = onboardingData?.userName?.split(' ')[0] ?? 'Athlete'

  // Sample workout preview
  const workoutPreview = {
    name: 'GPP Day 1: Foundation',
    duration: '45-60 min',
    exercises: [
      { name: 'Dynamic Warm-Up', sets: '1', reps: '5 min' },
      { name: 'Goblet Squat', sets: '3', reps: '10' },
      { name: 'Push-Up Progression', sets: '3', reps: '8-12' },
      { name: 'Hip Hinge Pattern', sets: '3', reps: '10' },
      { name: 'Core Circuit', sets: '2', reps: '30 sec each' },
    ],
  }

  return (
    <OnboardingScreen
      currentScreen={COMBINED_FLOW_SCREENS.FIRST_WORKOUT}
      totalScreens={COMBINED_FLOW_SCREEN_COUNT}
      primaryButtonText="Continue"
      onPrimaryPress={handleContinue}
      onSkip={() => {}}
      showSkip={false}
    >
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack flex={1} gap="$6" py="$4">
          {/* Header */}
          <YStack gap="$2" items="center">
            <Text fontSize="$7" fontWeight="bold" color="$gray12">
              {firstName}, You're
            </Text>
            <Text fontSize="$7" fontWeight="bold" color="$green10">
              Ready!
            </Text>
          </YStack>

          {/* Success message */}
          <YStack bg="$green2" rounded="$4" p="$4" borderWidth={2} borderColor="$green8">
            <XStack gap="$3" items="center">
              <YStack
                width={48}
                height={48}
                rounded="$10"
                bg="$green10"
                items="center"
                justify="center"
              >
                <CheckCircle size={28} color="white" />
              </YStack>
              <YStack flex={1}>
                <Text fontSize="$4" fontWeight="bold" color="$green11">
                  Onboarding Complete!
                </Text>
                <Text fontSize="$2" color="$green10">
                  Your personalized program is ready
                </Text>
              </YStack>
            </XStack>
          </YStack>

          {/* Workout preview */}
          <YStack gap="$3">
            <Text fontSize="$4" fontWeight="600" color="$gray12">
              Your First Workout
            </Text>

            <YStack
              bg="$gray2"
              rounded="$4"
              overflow="hidden"
              borderWidth={1}
              borderColor="$gray5"
            >
              {/* Workout header */}
              <YStack bg="$green10" p="$4">
                <Text fontSize="$5" fontWeight="bold" color="white">
                  {workoutPreview.name}
                </Text>
                <XStack gap="$4" mt="$2">
                  <XStack gap="$1" items="center">
                    <Clock size={14} color="white" />
                    <Text fontSize="$2" color="white">
                      {workoutPreview.duration}
                    </Text>
                  </XStack>
                  <XStack gap="$1" items="center">
                    <Dumbbell size={14} color="white" />
                    <Text fontSize="$2" color="white">
                      {workoutPreview.exercises.length} exercises
                    </Text>
                  </XStack>
                </XStack>
              </YStack>

              {/* Exercise list */}
              <YStack p="$4" gap="$2">
                {workoutPreview.exercises.map((exercise, index) => (
                  <XStack
                    key={index}
                    py="$2"
                    borderBottomWidth={index < workoutPreview.exercises.length - 1 ? 1 : 0}
                    borderColor="$gray4"
                    justify="space-between"
                    items="center"
                  >
                    <Text fontSize="$3" color="$gray12" flex={1}>
                      {exercise.name}
                    </Text>
                    <Text fontSize="$2" color="$gray10">
                      {exercise.sets} × {exercise.reps}
                    </Text>
                  </XStack>
                ))}
              </YStack>
            </YStack>
          </YStack>

          {/* What to expect */}
          <YStack gap="$3">
            <Text fontSize="$4" fontWeight="600" color="$gray12">
              What to Expect
            </Text>

            <YStack gap="$2">
              <XStack gap="$2" items="center">
                <Text fontSize="$4">✓</Text>
                <Text fontSize="$3" color="$gray11">
                  Step-by-step exercise instructions
                </Text>
              </XStack>
              <XStack gap="$2" items="center">
                <Text fontSize="$4">✓</Text>
                <Text fontSize="$3" color="$gray11">
                  Video demonstrations for each move
                </Text>
              </XStack>
              <XStack gap="$2" items="center">
                <Text fontSize="$4">✓</Text>
                <Text fontSize="$3" color="$gray11">
                  Easy workout logging
                </Text>
              </XStack>
              <XStack gap="$2" items="center">
                <Text fontSize="$4">✓</Text>
                <Text fontSize="$3" color="$gray11">
                  Rest timers between sets
                </Text>
              </XStack>
            </YStack>
          </YStack>

        </YStack>
      </ScrollView>
    </OnboardingScreen>
  )
}
