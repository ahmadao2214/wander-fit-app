import { useState, useEffect } from 'react'
import { YStack, XStack, H2, Text, Card, Button, ScrollView, Input, Spinner } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import {
  ChevronRight,
  ChevronLeft,
  Dumbbell,
  Info,
} from '@tamagui/lucide-icons'
import { useAuth } from '../../hooks/useAuth'

const MAX_1RM = 2000

function validateWeight(value: string): string | null {
  if (!value) return null // Empty is valid (will be skipped)
  const num = parseFloat(value)
  if (isNaN(num)) return 'Enter a valid number'
  if (num <= 0) return 'Must be greater than 0'
  if (num > MAX_1RM) return `Maximum is ${MAX_1RM} lbs`
  return null
}

/**
 * Maxes Screen
 *
 * Step 3.5 of intake flow (between results preview and program creation).
 * Collects optional 1RM values for core compound lifts.
 * Encouraged but skippable - users can set these later.
 */
export default function MaxesScreen() {
  const router = useRouter()
  const { hasCompletedIntake } = useAuth()
  const { sportId, yearsOfExperience, trainingDays, weeksUntilSeason } = useLocalSearchParams<{
    sportId: string
    yearsOfExperience: string
    trainingDays: string
    weeksUntilSeason: string
  }>()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [maxValues, setMaxValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  // Fetch core lift exercises with any existing maxes
  const coreLiftExercises = useQuery(api.userMaxes.getCoreLiftExercises)

  // Mutations
  const setMultipleMaxes = useMutation(api.userMaxes.setMultipleMaxes)
  const completeIntake = useMutation(api.userPrograms.completeIntake)

  // Redirect back if missing params
  if (!sportId || !yearsOfExperience || !trainingDays || !weeksUntilSeason) {
    router.replace('/(intake)/sport')
    return null
  }

  const years = parseInt(yearsOfExperience, 10)
  const days = parseInt(trainingDays, 10)
  const weeks = parseInt(weeksUntilSeason, 10)

  // Initialize max values when exercises load
  useEffect(() => {
    if (coreLiftExercises) {
      const initial: Record<string, string> = {}
      for (const ex of coreLiftExercises) {
        initial[ex.slug] = ex.currentMax?.toString() || ''
      }
      setMaxValues(initial)
    }
  }, [coreLiftExercises])

  const handleBack = () => {
    router.back()
  }

  // Validate on input change
  const handleValueChange = (slug: string, value: string) => {
    setMaxValues((prev) => ({ ...prev, [slug]: value }))
    setErrors((prev) => ({ ...prev, [slug]: validateWeight(value) }))
  }

  // Check if form has any errors
  const hasErrors = Object.values(errors).some((e) => e !== null)

  const handleContinue = async () => {
    // Validate all fields before submitting
    const newErrors: Record<string, string | null> = {}
    for (const [slug, value] of Object.entries(maxValues)) {
      newErrors[slug] = validateWeight(value)
    }
    setErrors(newErrors)

    if (Object.values(newErrors).some((e) => e !== null)) {
      return // Don't submit if there are validation errors
    }

    setIsSubmitting(true)

    // Build maxes array, filtering out empty values
    const maxes = Object.entries(maxValues)
      .filter(([_, value]) => value && parseFloat(value) > 0)
      .map(([slug, value]) => ({
        exerciseSlug: slug,
        oneRepMax: parseFloat(value),
      }))

    // Try to save maxes first (non-blocking - we continue even if this fails)
    if (maxes.length > 0) {
      try {
        await setMultipleMaxes({ maxes })
      } catch (error) {
        // Log but don't block program creation
        console.warn('Failed to save maxes, continuing with program creation:', error)
      }
    }

    // Always try to complete intake - this is the critical path
    try {
      await completeIntake({
        sportId: sportId as Id<"sports">,
        yearsOfExperience: years,
        preferredTrainingDaysPerWeek: days,
        weeksUntilSeason: weeks,
      })
      setIsSuccess(true)
    } catch (error) {
      console.error('Failed to complete intake:', error)
      alert('Failed to create program. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleSkip = async () => {
    setIsSubmitting(true)
    try {
      // Skip maxes, just complete intake
      await completeIntake({
        sportId: sportId as Id<"sports">,
        yearsOfExperience: years,
        preferredTrainingDaysPerWeek: days,
        weeksUntilSeason: weeks,
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

  // Check if any maxes have been entered
  const hasAnyMaxes = Object.values(maxValues).some(v => v && parseFloat(v) > 0)

  // Show loading while fetching exercises
  if (coreLiftExercises === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text color="$gray11">Loading...</Text>
      </YStack>
    )
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
          pt="$10"
          pb="$8"
          maxW={600}
          width="100%"
          self="center"
        >
          {/* Header */}
          <YStack gap="$2" items="center">
            <Dumbbell size={48} color="$primary" />
            <H2 text="center">Know Your Starting Point</H2>
            <Text color="$color11" fontSize="$4" text="center">
              If you know your max lifts, enter them below. This helps us calculate the right weight for every workout.
            </Text>
          </YStack>

          {/* Info Card */}
          <Card p="$4" bg="$blue2" borderColor="$blue6" borderWidth={1}>
            <XStack items="flex-start" gap="$3">
              <Info size={20} color="$blue10" style={{ marginTop: 2 }} />
              <YStack flex={1} gap="$1">
                <Text fontSize="$3" fontWeight="600" color="$blue11">
                  What's a 1RM?
                </Text>
                <Text fontSize="$3" color="$blue11" lineHeight="$3">
                  Your one rep max (1RM) is the heaviest weight you can lift for a single rep with good form. Don't know yours? No problem — you can skip this and set them later.
                </Text>
              </YStack>
            </XStack>
          </Card>

          {/* Core Lifts Input */}
          <Card p="$5" borderColor="$gray6" borderWidth={1}>
            <YStack gap="$5">
              <Text fontSize="$5" fontWeight="600">
                Core Lifts
              </Text>

              {coreLiftExercises.map((exercise) => {
                const fieldError = errors[exercise.slug]
                return (
                  <YStack key={exercise.slug} gap="$2">
                    <Text fontWeight="600" fontSize="$4" color="$color12">
                      {exercise.name}
                    </Text>
                    <XStack items="center" gap="$3">
                      <Input
                        flex={1}
                        size="$5"
                        placeholder="—"
                        keyboardType="numeric"
                        value={maxValues[exercise.slug] || ''}
                        onChangeText={(text) => handleValueChange(exercise.slug, text)}
                        fontFamily="$body"
                        fontSize={18}
                        borderColor={fieldError ? '$red8' : undefined}
                      />
                      <Text fontSize="$4" color="$color9" width={40}>
                        lbs
                      </Text>
                    </XStack>
                    {fieldError && (
                      <Text fontSize="$2" color="$red10">
                        {fieldError}
                      </Text>
                    )}
                  </YStack>
                )
              })}

              {coreLiftExercises.length === 0 && (
                <Text color="$color10" fontSize="$3">
                  No exercises available. You can set these later in your profile.
                </Text>
              )}
            </YStack>
          </Card>
        </YStack>
      </ScrollView>

      {/* Bottom Actions */}
      <YStack
        px="$4"
        py="$4"
        borderTopWidth={1}
        borderTopColor="$gray5"
        bg="$background"
        gap="$3"
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
            bg={hasErrors ? '$color6' : '$primary'}
            color="white"
            onPress={handleContinue}
            iconAfter={ChevronRight}
            fontWeight="700"
            disabled={isSubmitting || hasErrors}
            opacity={hasErrors ? 0.6 : 1}
          >
            {isSubmitting ? (
              <XStack items="center" gap="$2">
                <Spinner size="small" color="white" />
                <Text color="white" fontWeight="700">Creating...</Text>
              </XStack>
            ) : hasAnyMaxes ? (
              'Save & Start'
            ) : (
              'Start My Program'
            )}
          </Button>
        </XStack>

        {!hasAnyMaxes && (
          <Button
            size="$3"
            chromeless
            color="$color10"
            onPress={handleSkip}
            disabled={isSubmitting}
          >
            I'll set these later
          </Button>
        )}
      </YStack>
    </YStack>
  )
}
