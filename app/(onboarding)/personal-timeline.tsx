import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { YStack, XStack, Text, Spinner, ScrollView, Button } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TimelineView, createPhaseTimeline } from '../../components/onboarding'
import { useOnboardingAnalytics, ONBOARDING_SCREEN_NAMES } from '../../hooks/useOnboardingAnalytics'
import { IntakeProgressDots, COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT, COMBINED_FLOW_ROUTES } from '../../components/IntakeProgressDots'
import { Calendar, Flag, ChevronRight, ChevronLeft } from '@tamagui/lucide-icons'

/**
 * Screen 8 (Combined Flow): Your Personal Timeline
 *
 * Shows the user's personalized 12-week training timeline
 * based on their intake data (season start, etc.).
 */
export default function PersonalTimelineScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { sportId, ageGroup, yearsOfExperience, trainingDays, weeksUntilSeason: weeksParam } = useLocalSearchParams<{
    sportId: string
    ageGroup: string
    yearsOfExperience: string
    trainingDays: string
    weeksUntilSeason: string
  }>()

  // Get onboarding state
  const onboardingState = useQuery(api.onboarding.getOnboardingState)
  const onboardingData = useQuery(api.onboarding.getOnboardingData)

  // Mutations
  const skipOnboarding = useMutation(api.onboarding.skipOnboarding)

  // Analytics tracking
  const isRevisit = onboardingState?.isRevisit ?? false
  const { trackScreenComplete, trackSkip } = useOnboardingAnalytics({
    screenIndex: COMBINED_FLOW_SCREENS.PERSONAL_TIMELINE,
    screenName: ONBOARDING_SCREEN_NAMES[6],
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

  const handleBack = () => {
    router.back()
  }

  const handleContinue = () => {
    trackScreenComplete()
    // Navigate to maxes screen (Know Your Starting Point)
    router.push({
      pathname: '/(intake)/maxes',
      params: {
        sportId,
        ageGroup,
        yearsOfExperience,
        trainingDays,
        weeksUntilSeason: weeksParam,
      },
    } as any)
  }

  // Handle backward navigation from progress dots
  const handleProgressNavigate = (index: number) => {
    const route = COMBINED_FLOW_ROUTES[index]
    if (route) {
      router.push({
        pathname: route,
        params: { sportId, ageGroup, yearsOfExperience, trainingDays, weeksUntilSeason: weeksParam },
      } as any)
    }
  }

  // Create timeline starting from today
  const startDate = new Date()
  const phases = createPhaseTimeline(startDate)

  // Use weeksParam from route or fallback to onboardingData
  const weeksUntilSeason = weeksParam ? parseInt(weeksParam, 10) : onboardingData?.weeksUntilSeason
  const seasonStartDate = weeksUntilSeason
    ? new Date(startDate.getTime() + weeksUntilSeason * 7 * 24 * 60 * 60 * 1000)
    : undefined

  // Calculate program end date (12 weeks from start) - use immutable pattern
  const programEndDate = new Date(startDate.getTime() + 12 * 7 * 24 * 60 * 60 * 1000)

  // Use trainingDays from route params or fallback to onboardingData
  const preferredDays = trainingDays ? parseInt(trainingDays, 10) : onboardingData?.preferredDays

  return (
    <YStack flex={1} bg="$background">
      {/* Main Content */}
      <ScrollView flex={1} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
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
            <IntakeProgressDots
              total={COMBINED_FLOW_SCREEN_COUNT}
              current={COMBINED_FLOW_SCREENS.PERSONAL_TIMELINE}
              onNavigate={handleProgressNavigate}
            />
          </YStack>

          {/* Header */}
          <YStack gap="$2" items="center" mb="$6">
            <Text fontSize="$8" fontWeight="bold" color="$color12" text="center">
              Your Personal
            </Text>
            <Text fontSize="$8" fontWeight="bold" color="$primary" text="center">
              Timeline
            </Text>
          </YStack>

          {/* Summary cards */}
          <XStack gap="$3" mb="$4">
            <YStack
              flex={1}
              bg="$color3"
              rounded="$4"
              p="$3"
              gap="$2"
              borderWidth={1}
              borderColor="$color6"
            >
              <XStack gap="$2" items="center">
                <Calendar size={16} color="$primary" />
                <Text fontSize="$2" color="$color11" fontWeight="600">
                  STARTS
                </Text>
              </XStack>
              <Text fontSize="$4" fontWeight="bold" color="$color12">
                {formatDate(startDate)}
              </Text>
            </YStack>

            <YStack
              flex={1}
              bg="$color3"
              rounded="$4"
              p="$3"
              gap="$2"
              borderWidth={1}
              borderColor="$color6"
            >
              <XStack gap="$2" items="center">
                <Flag size={16} color="$primary" />
                <Text fontSize="$2" color="$color11" fontWeight="600">
                  ENDS
                </Text>
              </XStack>
              <Text fontSize="$4" fontWeight="bold" color="$color12">
                {formatDate(programEndDate)}
              </Text>
            </YStack>
          </XStack>

          {/* Training frequency note */}
          {preferredDays && (
            <YStack bg="$color3" rounded="$4" p="$4" items="center" gap="$2" mb="$4">
              <Text fontSize="$6" fontWeight="bold" color="$primary">
                {preferredDays}
              </Text>
              <Text fontSize="$3" color="$color11">
                training days per week
              </Text>
              <Text fontSize="$2" color="$color10">
                Based on your preferences
              </Text>
            </YStack>
          )}

          {/* Timeline visualization */}
          <YStack gap="$3" mb="$4">
            <Text fontSize="$4" fontWeight="600" color="$color12">
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
            bg="$primary"
            color="white"
            onPress={handleContinue}
            iconAfter={ChevronRight}
            fontFamily="$body"
            fontWeight="700"
            rounded="$4"
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
          >
            I'm Ready
          </Button>
        </XStack>
      </YStack>
    </YStack>
  )
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
