import { YStack, XStack, H2, H3, Text, Card, Button, Spinner, ScrollView } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Target,
  Trophy,
  Calendar,
  Clock,
  Activity,
  Zap,
  RefreshCw,
  Dumbbell,
  User,
} from '@tamagui/lucide-icons'

import { AgeGroup } from '../../types'
import { getSkillLevel, getTrainingPhase } from '../../lib'
import { IntakeProgressDots, COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT, COMBINED_FLOW_ROUTES } from '../../components/IntakeProgressDots'
import { TimelineView, createPhaseTimeline } from '../../components/onboarding'

/**
 * Results Screen
 *
 * Program preview step of intake flow.
 * Shows the calculated assignment and previews the program.
 * User reviews their program before making their commitment.
 */
export default function ResultsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { sportId, yearsOfExperience, trainingDays, selectedTrainingDays, weeksUntilSeason, ageGroup } = useLocalSearchParams<{
    sportId: string
    yearsOfExperience: string
    trainingDays: string
    selectedTrainingDays: string
    weeksUntilSeason: string
    ageGroup: AgeGroup
  }>()


  // Get sport details
  const sport = useQuery(
    api.sports.getById,
    sportId ? { sportId: sportId as Id<"sports"> } : "skip"
  )

  // Get category details
  const category = useQuery(
    api.sports.getCategoryById,
    sport ? { categoryId: sport.gppCategoryId } : "skip"
  )

  // Get user's saved maxes for review
  const coreLiftExercises = useQuery(api.userMaxes.getCoreLiftExercises)
  const savedMaxes = coreLiftExercises?.filter(ex => ex.currentMax !== null) ?? []

  // Redirect back if missing params
  if (!sportId || !yearsOfExperience || !trainingDays || !selectedTrainingDays || !weeksUntilSeason || !ageGroup) {
    router.replace('/(intake)/sport')
    return null
  }

  const years = parseInt(yearsOfExperience, 10)
  const days = parseInt(trainingDays, 10)
  const weeks = parseInt(weeksUntilSeason, 10)

  // Use extracted pure functions for calculations
  const trainingPhase = getTrainingPhase(weeks)
  const skillLevel = getSkillLevel(years)

  // Helper: Get category-specific colors
  const getCategoryColor = (categoryId: number) => {
    const colors = {
      1: '$catEndurance',      // Teal
      2: '$catPower',          // Purple
      3: '$catRotation',       // Orange
      4: '$catStrength',       // Blue
    }
    return colors[categoryId as keyof typeof colors] || '$catEndurance'
  }

  // Helper: Get category-specific icons
  const getCategoryIcon = (categoryId: number) => {
    const icons = {
      1: Activity,      // Endurance - continuous movement
      2: Zap,           // Power - explosive energy
      3: RefreshCw,     // Rotation - rotational movement
      4: Dumbbell,      // Strength - strength training
    }
    return icons[categoryId as keyof typeof icons] || Activity
  }

  const handleBack = () => {
    router.back()
  }

  // Navigation handler for progress dots (backward navigation only)
  const handleProgressNavigate = (index: number) => {
    const route = COMBINED_FLOW_ROUTES[index]
    if (route) {
      router.push({
        pathname: route,
        params: { sportId, yearsOfExperience, trainingDays, selectedTrainingDays, weeksUntilSeason, ageGroup },
      } as any)
    }
  }

  const handleContinue = () => {
    // Navigate to commitment screen
    router.push({
      pathname: '/(onboarding)/commitment',
      params: {
        sportId,
        yearsOfExperience,
        trainingDays,
        selectedTrainingDays,
        weeksUntilSeason,
        ageGroup,
      },
    } as any)
  }

  // Show loading while fetching sport/category (undefined = still loading)
  if (sport === undefined || category === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text color="$gray11">Calculating your program...</Text>
      </YStack>
    )
  }

  // Handle sport or category not found (null = query completed but no document)
  if (sport === null || category === null) {
    router.replace('/(intake)/sport')
    return null
  }

  return (
    <YStack flex={1} bg="$background">
      <ScrollView flex={1}>
        <YStack
          gap="$6"
          px="$4"
          pt={insets.top + 16}
          pb="$8"
          maxW={600}
          width="100%"
          self="center"
        >
          {/* Progress Dots */}
          <YStack items="center" mb="$2">
            <IntakeProgressDots
              total={COMBINED_FLOW_SCREEN_COUNT}
              current={COMBINED_FLOW_SCREENS.RESULTS}
              onNavigate={handleProgressNavigate}
            />
          </YStack>

          {/* Header */}
          <YStack gap="$2" items="center">
            <CheckCircle size={64} color="$primary" />
            <H2 text="center">Your Program is Ready!</H2>
            <Text color="$gray11" text="center" fontSize="$4">
              Here's what we've designed for you
            </Text>
          </YStack>

          {/* Training Category Hero Card */}
          <Card
            p="$6"
            bg={getCategoryColor(sport.gppCategoryId)}
            borderWidth={0}
            elevate
          >
            <YStack gap="$4" items="center">
              {(() => {
                const CategoryIcon = getCategoryIcon(sport.gppCategoryId)
                return <CategoryIcon size={48} color="white" />
              })()}

              <YStack gap="$2" items="center">
                <Text fontSize="$2" color="white" opacity={0.9} fontWeight="600">
                  Your Training Category
                </Text>
                <H2
                  fontFamily="$heading"
                  fontSize="$10"
                  color="white"
                  letterSpacing={1}
                >
                  {category.shortName.toUpperCase()}
                </H2>
              </YStack>

              {/* Category Description - Always Visible */}
              <Text
                color="white"
                fontSize="$3"
                text="center"
                lineHeight="$4"
              >
                {category.description}
              </Text>
            </YStack>
          </Card>

          {/* Program Details Card */}
          <Card p="$5" bg="$background" borderColor="$borderColor" borderWidth={1}>
            <YStack gap="$4">
              {/* Sport */}
              <XStack items="center" gap="$3">
                <Target size={24} color="$primary" />
                <YStack flex={1}>
                  <Text fontSize="$2" color="$color10">Sport</Text>
                  <Text fontSize="$5" fontWeight="700" color="$color12">
                    {sport.name}
                  </Text>
                </YStack>
              </XStack>

              {/* Age Group */}
              <XStack items="center" gap="$3">
                <User size={24} color="$primary" />
                <YStack flex={1}>
                  <Text fontSize="$2" color="$color10">Age Group</Text>
                  <Text fontSize="$5" fontWeight="700" color="$color12">
                    {ageGroup}
                  </Text>
                </YStack>
              </XStack>

              {/* Skill Level */}
              <XStack items="center" gap="$3">
                <Trophy size={24} color="$primary" />
                <YStack flex={1}>
                  <Text fontSize="$2" color="$color10">Skill Level</Text>
                  <Text fontSize="$5" fontWeight="700" color="$color12">
                    {skillLevel}
                  </Text>
                </YStack>
              </XStack>

              {/* Training Days */}
              <XStack items="center" gap="$3">
                <Calendar size={24} color="$primary" />
                <YStack flex={1}>
                  <Text fontSize="$2" color="$color10">Training Schedule</Text>
                  <Text fontSize="$5" fontWeight="700" color="$color12">
                    {days} days per week
                  </Text>
                </YStack>
              </XStack>

              {/* Training Phase */}
              <XStack items="center" gap="$3">
                <Clock size={24} color="$primary" />
                <YStack flex={1}>
                  <Text fontSize="$2" color="$color10">Current Phase</Text>
                  <Text fontSize="$5" fontWeight="700" color="$color12">
                    {trainingPhase}
                  </Text>
                  <Text fontSize="$3" color="$color11">
                    {weeks} weeks until season
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          </Card>

          {/* Saved Maxes - Only show if user entered any */}
          {savedMaxes.length > 0 && (
            <Card p="$5" bg="$background" borderColor="$borderColor" borderWidth={1}>
              <YStack gap="$4">
                <XStack items="center" gap="$2">
                  <Dumbbell size={20} color="$primary" />
                  <Text fontSize="$5" fontWeight="600" color="$color12">
                    Your Starting Maxes
                  </Text>
                </XStack>

                <YStack gap="$3">
                  {savedMaxes.map((exercise) => (
                    <XStack key={exercise.slug} items="center" justify="space-between">
                      <Text fontSize="$4" color="$color11">
                        {exercise.name}
                      </Text>
                      <Text fontSize="$4" fontWeight="700" color="$color12">
                        {exercise.currentMax} lbs
                      </Text>
                    </XStack>
                  ))}
                </YStack>

                <Text fontSize="$2" color="$color9">
                  These will be used to calculate your workout weights
                </Text>
              </YStack>
            </Card>
          )}

          {/* Training Journey - Timeline View */}
          <Card p="$4" bg="$background" borderColor="$borderColor" borderWidth={1}>
            <YStack gap="$4">
              <H3 fontSize="$5" color="$color12">Your 12-Week Journey</H3>

              {/* Timeline visualization */}
              <TimelineView
                phases={createPhaseTimeline(new Date())}
                seasonStartDate={weeks ? new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000) : undefined}
                orientation="vertical"
              />
            </YStack>
          </Card>

        </YStack>
      </ScrollView>

      {/* Bottom Actions - Fixed Footer */}
      <YStack
        px="$4"
        pt="$4"
        pb={16 + insets.bottom}
        borderTopWidth={1}
        borderTopColor="$borderColor"
        bg="$background"
      >
        <XStack gap="$3">
          <Button
            flex={1}
            size="$5"
            variant="outlined"
            onPress={handleBack}
            icon={ChevronLeft}
          >
            Back
          </Button>
          <Button
            flex={2}
            size="$5"
            bg="$primary"
            color="white"
            onPress={handleContinue}
            fontWeight="700"
            iconAfter={ChevronRight}
          >
            Continue
          </Button>
        </XStack>
      </YStack>
    </YStack>
  )
}

