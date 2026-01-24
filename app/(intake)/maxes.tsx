import { useState, useEffect } from 'react'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { YStack, XStack, H2, Text, Card, Button, ScrollView, Input, Spinner } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import {
  ChevronRight,
  ChevronLeft,
  Dumbbell,
  Info,
} from '@tamagui/lucide-icons'
import { IntakeProgressDots, COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT, COMBINED_FLOW_ROUTES } from '../../components/IntakeProgressDots'

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
  const insets = useSafeAreaInsets()
  const { sportId, yearsOfExperience, trainingDays, weeksUntilSeason, ageGroup } = useLocalSearchParams<{
    sportId: string
    yearsOfExperience: string
    trainingDays: string
    weeksUntilSeason: string
    ageGroup: string
  }>()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [maxValues, setMaxValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  // Fetch core lift exercises with any existing maxes
  const coreLiftExercises = useQuery(api.userMaxes.getCoreLiftExercises)

  // Mutations
  const setMultipleMaxes = useMutation(api.userMaxes.setMultipleMaxes)

  // Redirect back if missing params
  if (!sportId || !yearsOfExperience || !trainingDays || !weeksUntilSeason || !ageGroup) {
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

  // Navigation handler for progress dots (backward navigation only)
  const handleProgressNavigate = (index: number) => {
    const route = COMBINED_FLOW_ROUTES[index]
    if (route) {
      router.push({
        pathname: route,
        params: { sportId, yearsOfExperience, trainingDays, weeksUntilSeason, ageGroup },
      } as any)
    }
  }

  // Validate on input change
  const handleValueChange = (slug: string, value: string) => {
    setMaxValues((prev) => ({ ...prev, [slug]: value }))
    setErrors((prev) => ({ ...prev, [slug]: validateWeight(value) }))
  }

  // Check if form has any errors
  const hasErrors = Object.values(errors).some((e) => e !== null)

  const handleContinue = async () => {
    setIsSubmitting(true)
    try {
      // Save any entered maxes (non-blocking - don't fail if this errors)
      const maxes = Object.entries(maxValues)
        .filter(([_, value]) => value && parseFloat(value) > 0)
        .map(([slug, value]) => ({
          exerciseSlug: slug,
          oneRepMax: parseFloat(value),
        }))

      if (maxes.length > 0) {
        try {
          await setMultipleMaxes({ maxes })
        } catch (maxError) {
          console.error('Failed to save maxes (continuing):', maxError)
          // Don't block navigation if maxes fail to save
        }
      }

      // Navigate to results screen (program preview)
      router.push({
        pathname: '/(intake)/results',
        params: {
          sportId,
          yearsOfExperience,
          trainingDays,
          weeksUntilSeason,
          ageGroup,
        },
      } as any)
    } catch (error) {
      console.error('Failed to save maxes:', error)
      alert('Failed to save. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    // Skip maxes, go to results (program preview)
    router.push({
      pathname: '/(intake)/results',
      params: {
        sportId,
        yearsOfExperience,
        trainingDays,
        weeksUntilSeason,
        ageGroup,
      },
    } as any)
  }

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

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={process.env.EXPO_OS === 'ios' ? 0 : 20}
    >
      <YStack flex={1} bg="$background">
        <ScrollView
          flex={1}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
          automaticallyAdjustKeyboardInsets={process.env.EXPO_OS === 'ios'}
          contentInsetAdjustmentBehavior="automatic"
        >
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
              current={COMBINED_FLOW_SCREENS.MAXES}
              onNavigate={handleProgressNavigate}
            />
          </YStack>

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
          pt="$4"
          pb={16 + insets.bottom}
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
                  <Text color="white" fontWeight="700">Saving...</Text>
                </XStack>
              ) : hasAnyMaxes ? (
                'Save & Continue'
              ) : (
                'Continue'
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
    </KeyboardAvoidingView>
  )
}
