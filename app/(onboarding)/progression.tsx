import { useRouter } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, XStack, Text, Spinner, ScrollView } from 'tamagui'
import { OnboardingScreen } from '../../components/onboarding'
import { Lock, Unlock, TrendingUp, Award } from '@tamagui/lucide-icons'

/**
 * Screen 4.1: Unlock Your Progression
 *
 * Explains how users unlock progression and move through the program.
 * Shows the gamification/progression mechanics.
 */
export default function ProgressionScreen() {
  const router = useRouter()

  // Get onboarding state
  const onboardingState = useQuery(api.onboarding.getOnboardingState)

  // Mutations
  const advanceOnboarding = useMutation(api.onboarding.advanceOnboarding)
  const skipOnboarding = useMutation(api.onboarding.skipOnboarding)

  // Loading state
  if (onboardingState === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center">
        <Spinner size="large" color="$green10" />
      </YStack>
    )
  }

  const handleContinue = async () => {
    await advanceOnboarding({ screenIndex: 9 })
    router.push('/(onboarding)/first-workout' as any)
  }

  const handleSkip = async () => {
    await skipOnboarding()
    router.replace('/(athlete)')
  }

  const progressionSteps = [
    {
      icon: '1',
      title: 'Complete Your Workout',
      description: 'Follow the exercises as prescribed, logging your sets and reps',
      color: '$green' as const,
    },
    {
      icon: '2',
      title: 'Track Your Progress',
      description: 'Record weights, times, and how you felt during the workout',
      color: '$blue' as const,
    },
    {
      icon: '3',
      title: 'Unlock New Challenges',
      description: 'As you progress, exercises evolve and intensity increases',
      color: '$orange' as const,
    },
    {
      icon: '4',
      title: 'Advance Through Phases',
      description: 'Move from GPP to SPP to SSP as you demonstrate readiness',
      color: '$purple' as const,
    },
  ]

  return (
    <OnboardingScreen
      currentScreen={8}
      totalScreens={onboardingState?.totalScreens ?? 10}
      primaryButtonText="Start My First Workout"
      onPrimaryPress={handleContinue}
      onSkip={handleSkip}
    >
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack flex={1} gap="$6" py="$4">
          {/* Header */}
          <YStack gap="$2" items="center">
            <Text fontSize="$7" fontWeight="bold" color="$gray12">
              How You'll
            </Text>
            <Text fontSize="$7" fontWeight="bold" color="$green10">
              Progress
            </Text>
          </YStack>

          {/* Intro text */}
          <YStack bg="$gray2" rounded="$4" p="$4">
            <Text fontSize="$3" color="$gray11" lineHeight={22}>
              Your program adapts to you. As you complete workouts and demonstrate
              mastery, new challenges unlock automatically.
            </Text>
          </YStack>

          {/* Progression steps */}
          <YStack gap="$3">
            {progressionSteps.map((step, index) => (
              <XStack
                key={index}
                bg="$gray1"
                rounded="$4"
                p="$4"
                gap="$3"
                items="flex-start"
                borderWidth={1}
                borderColor="$gray4"
              >
                <YStack
                  width={36}
                  height={36}
                  rounded="$10"
                  bg={`${step.color}4`}
                  items="center"
                  justify="center"
                >
                  <Text fontSize="$4" fontWeight="bold" color={`${step.color}10`}>
                    {step.icon}
                  </Text>
                </YStack>
                <YStack flex={1} gap="$1">
                  <Text fontSize="$3" fontWeight="600" color="$gray12">
                    {step.title}
                  </Text>
                  <Text fontSize="$2" color="$gray10">
                    {step.description}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>

          {/* Unlock visualization */}
          <YStack gap="$3">
            <Text fontSize="$4" fontWeight="600" color="$gray12">
              Progression Example
            </Text>

            <XStack gap="$2" items="center" justify="center">
              <YStack items="center" gap="$1">
                <YStack
                  width={50}
                  height={50}
                  rounded="$10"
                  bg="$green10"
                  items="center"
                  justify="center"
                >
                  <Unlock size={24} color="white" />
                </YStack>
                <Text fontSize="$1" color="$gray10">
                  Week 1
                </Text>
              </YStack>

              <YStack width={30} height={2} bg="$green8" />

              <YStack items="center" gap="$1">
                <YStack
                  width={50}
                  height={50}
                  rounded="$10"
                  bg="$green10"
                  items="center"
                  justify="center"
                >
                  <TrendingUp size={24} color="white" />
                </YStack>
                <Text fontSize="$1" color="$gray10">
                  Week 4
                </Text>
              </YStack>

              <YStack width={30} height={2} bg="$gray4" />

              <YStack items="center" gap="$1">
                <YStack
                  width={50}
                  height={50}
                  rounded="$10"
                  bg="$gray4"
                  items="center"
                  justify="center"
                >
                  <Lock size={24} color="$gray8" />
                </YStack>
                <Text fontSize="$1" color="$gray10">
                  Week 8
                </Text>
              </YStack>

              <YStack width={30} height={2} bg="$gray4" />

              <YStack items="center" gap="$1">
                <YStack
                  width={50}
                  height={50}
                  rounded="$10"
                  bg="$gray4"
                  items="center"
                  justify="center"
                >
                  <Award size={24} color="$gray8" />
                </YStack>
                <Text fontSize="$1" color="$gray10">
                  Week 12
                </Text>
              </YStack>
            </XStack>
          </YStack>

          {/* Encouragement */}
          <YStack bg="$green2" rounded="$4" p="$4" borderWidth={2} borderColor="$green8">
            <XStack gap="$3" items="center">
              <Text fontSize="$6">💪</Text>
              <YStack flex={1}>
                <Text fontSize="$3" fontWeight="600" color="$green11">
                  Ready to begin?
                </Text>
                <Text fontSize="$2" color="$green10">
                  Your first workout is waiting for you.
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </YStack>
      </ScrollView>
    </OnboardingScreen>
  )
}
