import { useState, useEffect } from 'react'
import { YStack, XStack, H2, Text, Card, Button, ScrollView, Input, Spinner } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import {
  ChevronRight,
  ChevronLeft,
  Dumbbell,
  TrendingUp,
  Minus,
  TrendingDown,
} from '@tamagui/lucide-icons'

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
 * Maxes Re-Test Screen
 *
 * Third screen of reassessment flow.
 * Allows users to update their 1RM values.
 * Shows previous values for comparison.
 */
export default function MaxesScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { difficulty, energy, notes } = useLocalSearchParams<{
    difficulty: string
    energy: string
    notes: string
  }>()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [maxValues, setMaxValues] = useState<Record<string, string>>({})
  const [originalValues, setOriginalValues] = useState<Record<string, number | null>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  // Fetch core lift exercises with any existing maxes
  const coreLiftExercises = useQuery(api.userMaxes.getCoreLiftExercises)

  // Mutations
  const setMultipleMaxes = useMutation(api.userMaxes.setMultipleMaxes)

  // Initialize max values when exercises load
  useEffect(() => {
    if (coreLiftExercises) {
      const initial: Record<string, string> = {}
      const original: Record<string, number | null> = {}
      for (const ex of coreLiftExercises) {
        initial[ex.slug] = ex.currentMax?.toString() || ''
        original[ex.slug] = ex.currentMax
      }
      setMaxValues(initial)
      setOriginalValues(original)
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

  // Calculate if any max changed
  const getMaxChange = (slug: string): { changed: boolean; diff: number; direction: 'up' | 'down' | 'same' } => {
    const original = originalValues[slug]
    const current = maxValues[slug] ? parseFloat(maxValues[slug]) : null

    if (original === null && current === null) {
      return { changed: false, diff: 0, direction: 'same' }
    }
    if (original === null && current !== null) {
      return { changed: true, diff: current, direction: 'up' }
    }
    if (original !== null && current === null) {
      return { changed: true, diff: -original, direction: 'down' }
    }
    if (original !== null && current !== null) {
      const diff = current - original
      if (diff === 0) return { changed: false, diff: 0, direction: 'same' }
      return { changed: true, diff, direction: diff > 0 ? 'up' : 'down' }
    }
    return { changed: false, diff: 0, direction: 'same' }
  }

  // Check if any maxes were updated
  const hasAnyUpdates = Object.keys(maxValues).some((slug) => {
    const change = getMaxChange(slug)
    return change.changed
  })

  const handleContinue = async () => {
    setIsSubmitting(true)
    try {
      // Save any entered maxes
      const maxes = Object.entries(maxValues)
        .filter(([_, value]) => value && parseFloat(value) > 0)
        .map(([slug, value]) => ({
          exerciseSlug: slug,
          oneRepMax: parseFloat(value),
        }))

      // Track if save actually succeeded
      let saveSucceeded = false
      if (maxes.length > 0 && hasAnyUpdates) {
        try {
          await setMultipleMaxes({ maxes })
          saveSucceeded = true
        } catch (maxError) {
          console.error('Failed to save maxes (continuing):', maxError)
          // saveSucceeded remains false
        }
      }

      // Navigate to results screen with all collected data
      router.push({
        pathname: '/(reassessment)/results',
        params: {
          difficulty,
          energy,
          notes,
          maxesUpdated: saveSucceeded ? 'true' : 'false',
        },
      })
    } catch (error) {
      console.error('Failed to save maxes:', error)
      alert('Failed to save. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    router.push({
      pathname: '/(reassessment)/results',
      params: {
        difficulty,
        energy,
        notes,
        maxesUpdated: 'false',
      },
    })
  }

  // Show loading while fetching exercises
  if (coreLiftExercises === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text color="$color10">Loading...</Text>
      </YStack>
    )
  }

  return (
    <YStack flex={1} bg="$background">
      <ScrollView flex={1}>
        <YStack
          gap="$6"
          px="$4"
          pt={insets.top + 20}
          pb="$8"
          maxW={600}
          width="100%"
          self="center"
        >
          {/* Header */}
          <YStack gap="$2">
            <Text fontSize={14} color="$primary" fontWeight="600">
              STEP 2 OF 3
            </Text>
            <H2 fontSize={28} color="$color12">
              Update Your Maxes
            </H2>
            <Text fontSize={15} color="$color11" lineHeight={22}>
              Have your lifts improved? Update your 1RM values to get accurate workout weights.
            </Text>
          </YStack>

          {/* Core Lifts Input */}
          <Card p="$5" borderColor="$borderColor" borderWidth={1} bg="$surface">
            <YStack gap="$5">
              <XStack items="center" gap="$2">
                <Dumbbell size={20} color="$primary" />
                <Text fontSize={16} fontWeight="600" color="$color12">
                  Core Lifts
                </Text>
              </XStack>

              {coreLiftExercises.map((exercise) => {
                const fieldError = errors[exercise.slug]
                const change = getMaxChange(exercise.slug)
                const originalValue = originalValues[exercise.slug]

                return (
                  <YStack key={exercise.slug} gap="$2">
                    <XStack items="center" justify="space-between">
                      <Text fontWeight="600" fontSize={15} color="$color12">
                        {exercise.name}
                      </Text>
                      {originalValue !== null && (
                        <Text fontSize={13} color="$color10">
                          Previous: {originalValue} lbs
                        </Text>
                      )}
                    </XStack>

                    <XStack items="center" gap="$3">
                      <Input
                        flex={1}
                        size="$5"
                        placeholder={originalValue ? originalValue.toString() : '—'}
                        keyboardType="numeric"
                        value={maxValues[exercise.slug] || ''}
                        onChangeText={(text) => handleValueChange(exercise.slug, text)}
                        fontFamily="$body"
                        fontSize={18}
                        borderColor={fieldError ? '$red8' : change.changed ? '$primary' : undefined}
                        bg="$background"
                      />
                      <Text fontSize={15} color="$color9" width={40}>
                        lbs
                      </Text>

                      {/* Change indicator */}
                      {change.changed && !fieldError && (
                        <XStack items="center" gap="$1" minWidth={70}>
                          {change.direction === 'up' ? (
                            <>
                              <TrendingUp size={16} color="$green10" />
                              <Text fontSize={13} color="$green10" fontWeight="600">
                                +{change.diff}
                              </Text>
                            </>
                          ) : change.direction === 'down' ? (
                            <>
                              <TrendingDown size={16} color="$red10" />
                              <Text fontSize={13} color="$red10" fontWeight="600">
                                {change.diff}
                              </Text>
                            </>
                          ) : (
                            <>
                              <Minus size={16} color="$color10" />
                              <Text fontSize={13} color="$color10">
                                Same
                              </Text>
                            </>
                          )}
                        </XStack>
                      )}
                    </XStack>

                    {fieldError && (
                      <Text fontSize={12} color="$red10">
                        {fieldError}
                      </Text>
                    )}
                  </YStack>
                )
              })}

              {coreLiftExercises.length === 0 && (
                <Text color="$color10" fontSize={14}>
                  No exercises available.
                </Text>
              )}
            </YStack>
          </Card>

          {/* Summary Card */}
          {hasAnyUpdates && (
            <Card p="$4" bg="$green2" borderColor="$green6" borderWidth={1} rounded="$4">
              <XStack items="center" gap="$3">
                <TrendingUp size={24} color="$green10" />
                <YStack flex={1}>
                  <Text fontSize={14} fontWeight="600" color="$green11">
                    Nice Progress!
                  </Text>
                  <Text fontSize={13} color="$green11">
                    Your updated maxes will be used to calculate workout weights.
                  </Text>
                </YStack>
              </XStack>
            </Card>
          )}

          {/* Info Card */}
          <Card p="$4" bg="$brand1" borderWidth={0} rounded="$4">
            <YStack gap="$2">
              <Text fontSize={13} fontWeight="600" color="$primary">
                NOT SURE ABOUT YOUR MAX?
              </Text>
              <Text fontSize={14} color="$color11" lineHeight={20}>
                It's okay to leave values unchanged or skip this step. You can always update your maxes later from your profile.
              </Text>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>

      {/* Bottom Actions */}
      <YStack
        px="$4"
        pt="$4"
        pb={16 + insets.bottom}
        borderTopWidth={1}
        borderTopColor="$borderColor"
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
            fontWeight="700"
            disabled={isSubmitting || hasErrors}
            opacity={hasErrors ? 0.6 : 1}
          >
            {isSubmitting ? (
              <XStack items="center" gap="$2">
                <Spinner size="small" color="white" />
                <Text color="white" fontWeight="700">Saving...</Text>
              </XStack>
            ) : (
              <XStack items="center" gap="$2">
                <Text color="white" fontWeight="700">
                  {hasAnyUpdates ? 'Save & Continue' : 'Continue'}
                </Text>
                <ChevronRight size={20} color="white" />
              </XStack>
            )}
          </Button>
        </XStack>

        <Button
          size="$3"
          chromeless
          color="$color10"
          onPress={handleSkip}
          disabled={isSubmitting}
        >
          Skip for now
        </Button>
      </YStack>
    </YStack>
  )
}
