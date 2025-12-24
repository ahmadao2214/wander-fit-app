import { useState, useEffect } from 'react'
import { YStack, XStack, H2, H3, Text, Card, Button, Spinner, ScrollView } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { 
  ChevronLeft,
  CheckCircle,
  Target,
  Trophy,
  Calendar,
  Zap,
  Sparkles,
} from '@tamagui/lucide-icons'
import { PHASE_NAMES } from '../../types'
import { useAuth } from '../../hooks/useAuth'

/**
 * Results Screen
 * 
 * Step 3 of intake flow.
 * Shows the calculated assignment and confirms to create the program.
 * 
 * After intake completion, the IntakeOnlyRoute wrapper automatically
 * redirects to the athlete dashboard when intakeCompletedAt is set.
 */
export default function ResultsScreen() {
  const router = useRouter()
  const { hasCompletedIntake } = useAuth()
  const { sportId, yearsOfExperience, trainingDays } = useLocalSearchParams<{
    sportId: string
    yearsOfExperience: string
    trainingDays: string
  }>()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

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

  // Complete intake mutation
  const completeIntake = useMutation(api.userPrograms.completeIntake)

  // Redirect back if missing params
  if (!sportId || !yearsOfExperience || !trainingDays) {
    router.replace('/(intake)/sport')
    return null
  }

  const years = parseInt(yearsOfExperience, 10)
  const days = parseInt(trainingDays, 10)

  // Calculate skill level
  const getSkillLevel = () => {
    if (years < 1) return 'Novice'
    if (years < 3) return 'Moderate'
    return 'Advanced'
  }

  const skillLevel = getSkillLevel()

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
      })

      // Show success state - IntakeOnlyRoute will handle redirect
      // when it detects intakeCompletedAt is set
      setIsSuccess(true)
    } catch (error) {
      console.error('Failed to complete intake:', error)
      alert('Failed to create program. Please try again.')
      setIsSubmitting(false)
    }
  }

  // Navigate to athlete dashboard once intake is marked complete
  // This handles the race condition between mutation success and auth state update
  useEffect(() => {
    if (isSuccess && hasCompletedIntake) {
      router.replace('/(athlete)')
    }
  }, [isSuccess, hasCompletedIntake, router])

  // Fallback navigation after a short delay if auth state hasn't updated yet
  // This ensures users aren't stuck on the success screen
  useEffect(() => {
    if (isSuccess) {
      const timeout = setTimeout(() => {
        // Force navigation after 2 seconds even if auth state hasn't updated
        router.replace('/(athlete)')
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [isSuccess, router])

  // Show loading while fetching sport/category (undefined = still loading)
  if (sport === undefined || category === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$green10" />
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
          <Sparkles size={72} color="$green10" />
          <H2 textAlign="center" color="$green11">Let's Go!</H2>
          <Text color="$gray11" textAlign="center" fontSize="$4">
            Your personalized program is ready.
          </Text>
          <Text color="$gray11" textAlign="center" fontSize="$4">
            Taking you to your dashboard...
          </Text>
        </YStack>
        <Spinner size="large" color="$green10" />
      </YStack>
    )
  }

  return (
    <YStack flex={1} bg="$background">
      <ScrollView flex={1}>
        <YStack
          gap="$6"
          px="$4"
          pt="$10"
          pb="$8"
          maxW={600}
          width="100%"
          alignSelf="center"
        >
          {/* Header */}
          <YStack gap="$2" items="center">
            <CheckCircle size={64} color="$green10" />
            <H2 textAlign="center">Your Program is Ready!</H2>
            <Text color="$gray11" textAlign="center" fontSize="$4">
              Here's what we've designed for you
            </Text>
          </YStack>

          {/* Assignment Card */}
          <Card p="$5" bg="$green2" borderColor="$green7" borderWidth={2}>
            <YStack gap="$4">
              {/* Sport */}
              <XStack items="center" gap="$3">
                <Target size={24} color="$green10" />
                <YStack flex={1}>
                  <Text fontSize="$2" color="$green10">Sport</Text>
                  <Text fontSize="$5" fontWeight="700" color="$green12">
                    {sport.name}
                  </Text>
                </YStack>
              </XStack>

              {/* Category */}
              <XStack items="center" gap="$3">
                <Zap size={24} color="$green10" />
                <YStack flex={1}>
                  <Text fontSize="$2" color="$green10">Training Category</Text>
                  <Text fontSize="$5" fontWeight="700" color="$green12">
                    {category.shortName}
                  </Text>
                  <Text fontSize="$3" color="$green11">
                    {category.name}
                  </Text>
                </YStack>
              </XStack>

              {/* Skill Level */}
              <XStack items="center" gap="$3">
                <Trophy size={24} color="$green10" />
                <YStack flex={1}>
                  <Text fontSize="$2" color="$green10">Skill Level</Text>
                  <Text fontSize="$5" fontWeight="700" color="$green12">
                    {skillLevel}
                  </Text>
                </YStack>
              </XStack>

              {/* Training Days */}
              <XStack items="center" gap="$3">
                <Calendar size={24} color="$green10" />
                <YStack flex={1}>
                  <Text fontSize="$2" color="$green10">Training Schedule</Text>
                  <Text fontSize="$5" fontWeight="700" color="$green12">
                    {days} days per week
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          </Card>

          {/* Program Overview */}
          <Card p="$4" bg="$background" borderColor="$gray6" borderWidth={1}>
            <YStack gap="$3">
              <H3 fontSize="$4">Your Training Journey</H3>
              
              <YStack gap="$2">
                <XStack items="center" gap="$2">
                  <Card bg="$green9" width={24} height={24} borderRadius={12} items="center" justify="center">
                    <Text color="white" fontSize="$2" fontWeight="700">1</Text>
                  </Card>
                  <YStack flex={1}>
                    <Text fontWeight="600">{PHASE_NAMES.GPP}</Text>
                    <Text fontSize="$2" color="$gray10">
                      4 weeks • Build your foundation
                    </Text>
                  </YStack>
                </XStack>

                <XStack items="center" gap="$2">
                  <Card bg="$blue9" width={24} height={24} borderRadius={12} items="center" justify="center">
                    <Text color="white" fontSize="$2" fontWeight="700">2</Text>
                  </Card>
                  <YStack flex={1}>
                    <Text fontWeight="600">{PHASE_NAMES.SPP}</Text>
                    <Text fontSize="$2" color="$gray10">
                      4 weeks • Sport-specific development
                    </Text>
                  </YStack>
                </XStack>

                <XStack items="center" gap="$2">
                  <Card bg="$purple9" width={24} height={24} borderRadius={12} items="center" justify="center">
                    <Text color="white" fontSize="$2" fontWeight="700">3</Text>
                  </Card>
                  <YStack flex={1}>
                    <Text fontWeight="600">{PHASE_NAMES.SSP}</Text>
                    <Text fontSize="$2" color="$gray10">
                      4 weeks • Peak for competition
                    </Text>
                  </YStack>
                </XStack>
              </YStack>
            </YStack>
          </Card>

          {/* Category Description */}
          <Card p="$4" bg="$blue2" borderColor="$blue6">
            <YStack gap="$2">
              <Text fontSize="$3" fontWeight="600" color="$blue11">
                About {category.shortName} Training
              </Text>
              <Text fontSize="$3" color="$blue11">
                {category.description}
              </Text>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>

      {/* Bottom Actions - Fixed Footer */}
      <YStack
        px="$4"
        py="$4"
        borderTopWidth={1}
        borderTopColor="$gray5"
        bg="$background"
        gap="$3"
      >
        <Button
          size="$5"
          bg="$green9"
          color="white"
          onPress={handleConfirm}
          disabled={isSubmitting}
          fontWeight="700"
        >
          {isSubmitting ? (
            <XStack items="center" gap="$2">
              <Spinner size="small" color="white" />
              <Text color="white" fontWeight="700">Creating Program...</Text>
            </XStack>
          ) : (
            "Start My Program"
          )}
        </Button>

        <Button
          size="$4"
          variant="outlined"
          onPress={handleBack}
          icon={ChevronLeft}
          disabled={isSubmitting}
        >
          Go Back
        </Button>
      </YStack>
    </YStack>
  )
}

