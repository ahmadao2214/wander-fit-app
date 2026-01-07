import { useRouter } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, XStack, Text, Spinner, ScrollView } from 'tamagui'
import { OnboardingScreen, TimelineView, createPhaseTimeline } from '../../components/onboarding'
import { Calendar, Flag } from '@tamagui/lucide-icons'

/**
 * Screen 3.1: Your Personal Timeline
 *
 * Shows the user's personalized 12-week training timeline
 * based on their intake data (season start, etc.).
 */
export default function PersonalTimelineScreen() {
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
    await advanceOnboarding({ screenIndex: 7 })
    router.push('/(onboarding)/commitment' as any)
  }

  const handleSkip = async () => {
    await skipOnboarding()
    router.replace('/(athlete)')
  }

  // Create timeline starting from today
  const startDate = new Date()
  const phases = createPhaseTimeline(startDate)

  // Calculate season start date if available
  const weeksUntilSeason = onboardingData?.weeksUntilSeason
  const seasonStartDate = weeksUntilSeason
    ? new Date(startDate.getTime() + weeksUntilSeason * 7 * 24 * 60 * 60 * 1000)
    : undefined

  // Calculate program end date (12 weeks from start)
  const programEndDate = new Date(startDate)
  programEndDate.setDate(programEndDate.getDate() + 12 * 7)

  return (
    <OnboardingScreen
      currentScreen={6}
      totalScreens={onboardingState?.totalScreens ?? 10}
      primaryButtonText="I'm Ready"
      onPrimaryPress={handleContinue}
      onSkip={handleSkip}
    >
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack flex={1} gap="$6" py="$4">
          {/* Header */}
          <YStack gap="$2" items="center">
            <Text fontSize="$7" fontWeight="bold" color="$gray12">
              Your Personal
            </Text>
            <Text fontSize="$7" fontWeight="bold" color="$green10">
              Timeline
            </Text>
          </YStack>

          {/* Summary cards */}
          <XStack gap="$3">
            <YStack
              flex={1}
              bg="$green2"
              rounded="$4"
              p="$3"
              gap="$2"
              borderWidth={1}
              borderColor="$green6"
            >
              <XStack gap="$2" items="center">
                <Calendar size={16} color="$green10" />
                <Text fontSize="$2" color="$green11" fontWeight="600">
                  STARTS
                </Text>
              </XStack>
              <Text fontSize="$4" fontWeight="bold" color="$gray12">
                {formatDate(startDate)}
              </Text>
            </YStack>

            <YStack
              flex={1}
              bg="$blue2"
              rounded="$4"
              p="$3"
              gap="$2"
              borderWidth={1}
              borderColor="$blue6"
            >
              <XStack gap="$2" items="center">
                <Flag size={16} color="$blue10" />
                <Text fontSize="$2" color="$blue11" fontWeight="600">
                  ENDS
                </Text>
              </XStack>
              <Text fontSize="$4" fontWeight="bold" color="$gray12">
                {formatDate(programEndDate)}
              </Text>
            </YStack>
          </XStack>

          {/* Training frequency note */}
          {onboardingData?.preferredDays && (
            <YStack bg="$gray2" rounded="$4" p="$4" items="center" gap="$2">
              <Text fontSize="$6" fontWeight="bold" color="$green10">
                {onboardingData.preferredDays}
              </Text>
              <Text fontSize="$3" color="$gray11">
                training days per week
              </Text>
              <Text fontSize="$2" color="$gray10">
                Based on your preferences
              </Text>
            </YStack>
          )}

          {/* Timeline visualization */}
          <YStack gap="$3">
            <Text fontSize="$4" fontWeight="600" color="$gray12">
              Your 12-Week Journey
            </Text>
            <TimelineView
              phases={phases}
              seasonStartDate={seasonStartDate}
              orientation="vertical"
            />
          </YStack>

          {/* Season alignment note */}
          {seasonStartDate && (
            <YStack bg="$orange2" rounded="$4" p="$4" borderWidth={1} borderColor="$orange6">
              <XStack gap="$2" items="center" mb="$2">
                <Text fontSize="$4">🎯</Text>
                <Text fontSize="$3" fontWeight="600" color="$orange11">
                  Season Aligned
                </Text>
              </XStack>
              <Text fontSize="$2" color="$orange11">
                Your training is timed to have you peaking right when your
                season starts on {formatDate(seasonStartDate)}.
              </Text>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </OnboardingScreen>
  )
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
