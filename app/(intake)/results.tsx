import { useState, useEffect } from 'react'
import { YStack, XStack, H2, H3, Text, Card, Button, Spinner, ScrollView } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
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

import { PHASE_NAMES, AgeGroup } from '../../types'
import { useAuth } from '../../hooks/useAuth'
import { getSkillLevel, getTrainingPhase } from '../../lib'
import { IntakeProgressDots, INTAKE_SCREENS } from '../../components/IntakeProgressDots'

/**
 * Results Screen
 *
 * Final step of intake flow.
 * Shows the calculated assignment and previews the program.
 * User confirms to create their program and complete intake.
 */
export default function ResultsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { hasCompletedIntake } = useAuth()
  const { sportId, yearsOfExperience, trainingDays, weeksUntilSeason, ageGroup } = useLocalSearchParams<{
    sportId: string
    yearsOfExperience: string
    trainingDays: string
    weeksUntilSeason: string
    ageGroup: AgeGroup
  }>()

  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Mutation to complete intake
  const completeIntake = useMutation(api.userPrograms.completeIntake)

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
  if (!sportId || !yearsOfExperience || !trainingDays || !weeksUntilSeason || !ageGroup) {
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

  // Helper: Toggle phase expansion
  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev)
      if (next.has(phase)) {
        next.delete(phase)
      } else {
        next.add(phase)
      }
      return next
    })
  }

  // Get phase descriptions
  const getPhaseDescription = (phase: 'GPP' | 'SPP' | 'SSP') => {
    const descriptions = {
      GPP: 'Foundation phase focusing on overall fitness, movement quality, and work capacity.',
      SPP: 'Sport-specific movements that transfer directly to your athletic demands.',
      SSP: 'Peak performance preparation while maintaining gains and reducing fatigue.',
    }
    return descriptions[phase]
  }

  const handleBack = () => {
    router.back()
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await completeIntake({
        sportId: sportId as Id<"sports">,
        yearsOfExperience: years,
        preferredTrainingDaysPerWeek: days,
        weeksUntilSeason: weeks,
        ageGroup: ageGroup as "10-13" | "14-17" | "18+",
      })
      setIsSuccess(true)
    } catch (error) {
      console.error('Failed to complete intake:', error)
      alert('Failed to create program. Please try again.')
      setIsSubmitting(false)
    }
  }

  // Navigate to athlete dashboard once intake is marked complete
  useEffect(() => {
    if (isSuccess && hasCompletedIntake) {
      router.replace('/(athlete)')
    }
  }, [isSuccess, hasCompletedIntake, router])

  // Fallback navigation after a short delay
  useEffect(() => {
    if (isSuccess) {
      const timeout = setTimeout(() => {
        router.replace('/(athlete)')
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [isSuccess, router])

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

  // Show success state while waiting for redirect
  if (isSuccess) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$6" px="$4">
        <YStack items="center" gap="$4">
          <Dumbbell size={72} color="$primary" />
          <H2 text="center" color="$color12">Let's Go!</H2>
          <Text color="$gray11" text="center" fontSize="$4">
            Your personalized program is ready.
          </Text>
          <Text color="$gray11" text="center" fontSize="$4">
            Taking you to your dashboard...
          </Text>
        </YStack>
        <Spinner size="large" color="$primary" />
      </YStack>
    )
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
            <IntakeProgressDots total={7} current={INTAKE_SCREENS.RESULTS} />
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

          {/* Training Journey - With Inline Accordions */}
          <Card p="$4" bg="$background" borderColor="$borderColor" borderWidth={1}>
            <YStack gap="$3">
              <H3 fontSize="$5" color="$color12">Your Training Journey</H3>

              <YStack gap="$3">
                {/* GPP Phase */}
                <Card
                  p="$3"
                  bg="$background"
                  borderColor="$borderColor"
                  borderWidth={1}
                  pressStyle={{ bg: '$backgroundHover' }}
                  onPress={() => togglePhase('GPP')}
                >
                  <YStack gap="$2">
                    <XStack items="center" gap="$3">
                      <Card bg="$primary" width={28} height={28} rounded={14} items="center" justify="center">
                        <Text color="white" fontSize="$2" fontWeight="700">1</Text>
                      </Card>
                      <YStack flex={1}>
                        <Text fontWeight="600" fontSize="$4" color="$color12">
                          {PHASE_NAMES.GPP}
                        </Text>
                        <Text fontSize="$2" color="$color10">
                          4 weeks • Foundation phase
                        </Text>
                      </YStack>
                      {expandedPhases.has('GPP') ? (
                        <ChevronUp size={20} color="$color10" />
                      ) : (
                        <ChevronDown size={20} color="$color10" />
                      )}
                    </XStack>

                    {expandedPhases.has('GPP') && (
                      <Text fontSize="$3" color="$color11" paddingLeft="$10">
                        {getPhaseDescription('GPP')}
                      </Text>
                    )}
                  </YStack>
                </Card>

                {/* SPP Phase */}
                <Card
                  p="$3"
                  bg="$background"
                  borderColor="$borderColor"
                  borderWidth={1}
                  pressStyle={{ bg: '$backgroundHover' }}
                  onPress={() => togglePhase('SPP')}
                >
                  <YStack gap="$2">
                    <XStack items="center" gap="$3">
                      <Card bg="$primary" width={28} height={28} rounded={14} items="center" justify="center">
                        <Text color="white" fontSize="$2" fontWeight="700">2</Text>
                      </Card>
                      <YStack flex={1}>
                        <Text fontWeight="600" fontSize="$4" color="$color12">
                          {PHASE_NAMES.SPP}
                        </Text>
                        <Text fontSize="$2" color="$color10">
                          4 weeks • Sport-specific phase
                        </Text>
                      </YStack>
                      {expandedPhases.has('SPP') ? (
                        <ChevronUp size={20} color="$color10" />
                      ) : (
                        <ChevronDown size={20} color="$color10" />
                      )}
                    </XStack>

                    {expandedPhases.has('SPP') && (
                      <Text fontSize="$3" color="$color11" paddingLeft="$10">
                        {getPhaseDescription('SPP')}
                      </Text>
                    )}
                  </YStack>
                </Card>

                {/* SSP Phase */}
                <Card
                  p="$3"
                  bg="$background"
                  borderColor="$borderColor"
                  borderWidth={1}
                  pressStyle={{ bg: '$backgroundHover' }}
                  onPress={() => togglePhase('SSP')}
                >
                  <YStack gap="$2">
                    <XStack items="center" gap="$3">
                      <Card bg="$primary" width={28} height={28} rounded={14} items="center" justify="center">
                        <Text color="white" fontSize="$2" fontWeight="700">3</Text>
                      </Card>
                      <YStack flex={1}>
                        <Text fontWeight="600" fontSize="$4" color="$color12">
                          {PHASE_NAMES.SSP}
                        </Text>
                        <Text fontSize="$2" color="$color10">
                          4 weeks • Peak performance phase
                        </Text>
                      </YStack>
                      {expandedPhases.has('SSP') ? (
                        <ChevronUp size={20} color="$color10" />
                      ) : (
                        <ChevronDown size={20} color="$color10" />
                      )}
                    </XStack>

                    {expandedPhases.has('SSP') && (
                      <Text fontSize="$3" color="$color11" paddingLeft="$10">
                        {getPhaseDescription('SSP')}
                      </Text>
                    )}
                  </YStack>
                </Card>
              </YStack>
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
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            flex={2}
            size="$5"
            bg="$primary"
            color="white"
            onPress={handleConfirm}
            fontWeight="700"
            disabled={isSubmitting}
          >
            <XStack items="center" justify="center" gap="$2">
              {isSubmitting ? (
                <>
                  <Spinner size="small" color="white" />
                  <Text color="white" fontWeight="700">Creating...</Text>
                </>
              ) : (
                <>
                  <Text color="white" fontWeight="700">Start My Program</Text>
                  <CheckCircle size={20} color="white" />
                </>
              )}
            </XStack>
          </Button>
        </XStack>
      </YStack>
    </YStack>
  )
}

