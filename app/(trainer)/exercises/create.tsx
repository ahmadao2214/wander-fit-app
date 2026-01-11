import { useState } from 'react'
import { YStack, XStack, Text, Button, Card, Spinner, ScrollView, styled, Input, TextArea } from 'tamagui'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../../hooks/useAuth'
import { useRouter, Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ArrowLeft,
  Dumbbell,
  Check,
  Plus,
  X,
  AlertCircle,
} from '@tamagui/lucide-icons'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontSize: 24,
  letterSpacing: 0.5,
  color: '$color12',
})

const SectionLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: '$color10',
})

const FieldLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 14,
  color: '$color11',
})

const TagBadge = styled(XStack, {
  px: '$2',
  py: '$1',
  rounded: '$2',
  bg: '$brand2',
  items: 'center',
  gap: '$1',
})

// ─────────────────────────────────────────────────────────────────────────────
// COMMON TAGS
// ─────────────────────────────────────────────────────────────────────────────

const COMMON_TAGS = [
  'upper_body',
  'lower_body',
  'core',
  'push',
  'pull',
  'squat',
  'hinge',
  'lunge',
  'carry',
  'rotation',
  'unilateral',
  'bilateral',
  'compound',
  'isolation',
  'plyometric',
  'cardio',
  'mobility',
  'warmup',
  'cooldown',
]

const EQUIPMENT_OPTIONS = [
  'bodyweight',
  'barbell',
  'dumbbell',
  'kettlebell',
  'cable',
  'machine',
  'resistance_band',
  'medicine_ball',
  'foam_roller',
  'box',
  'bench',
  'pull_up_bar',
]

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function CreateExercisePage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [name, setName] = useState('')
  const [instructions, setInstructions] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | undefined>()
  const [customTag, setCustomTag] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const createExercise = useMutation(api.exercises.createAsTrainer)

  const handleSubmit = async () => {
    if (!user) {
      setError('You must be logged in')
      return
    }

    if (!name.trim()) {
      setError('Exercise name is required')
      return
    }

    if (selectedTags.length === 0) {
      setError('Please select at least one tag')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await createExercise({
        trainerId: user._id,
        name: name.trim(),
        instructions: instructions.trim() || undefined,
        tags: selectedTags,
        equipment: selectedEquipment.length > 0 ? selectedEquipment : undefined,
        difficulty,
      })

      setSuccess(true)

      // Redirect after a brief delay
      setTimeout(() => {
        router.back()
      }, 1500)
    } catch (err) {
      console.error('Error creating exercise:', err)
      setError(err instanceof Error ? err.message : 'Failed to create exercise')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const toggleEquipment = (eq: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq]
    )
  }

  const addCustomTag = () => {
    const tag = customTag.trim().toLowerCase().replace(/\s+/g, '_')
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags((prev) => [...prev, tag])
      setCustomTag('')
    }
  }

  if (authLoading) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text color="$color10" fontFamily="$body">
          Loading...
        </Text>
      </YStack>
    )
  }

  // Success state
  if (success) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <YStack flex={1} bg="$background" px="$4" pt={insets.top + 16}>
          <Card
            p="$6"
            bg="$green2"
            rounded="$5"
            borderWidth={1}
            borderColor="$green8"
            mt="$10"
          >
            <YStack items="center" gap="$4">
              <YStack bg="$green5" p="$4" rounded="$10">
                <Check size={40} color="$green11" />
              </YStack>
              <YStack items="center" gap="$2">
                <Text fontFamily="$body" fontWeight="700" color="$green11" fontSize={18}>
                  Exercise Created!
                </Text>
                <Text text="center" color="$green11" fontFamily="$body" fontSize={14}>
                  "{name}" has been added to the exercise library.
                </Text>
              </YStack>
              <Text fontSize={12} color="$green10" fontFamily="$body">
                Redirecting...
              </Text>
            </YStack>
          </Card>
        </YStack>
      </>
    )
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <YStack flex={1} bg="$background">
        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          <YStack
            gap="$5"
            px="$4"
            pt={insets.top + 16}
            pb={insets.bottom + 100}
            maxW={600}
            width="100%"
            self="center"
          >
            {/* Header */}
            <XStack items="center" gap="$3">
              <Button
                size="$3"
                bg="$surface"
                borderWidth={1}
                borderColor="$borderColor"
                icon={ArrowLeft}
                onPress={() => router.back()}
                circular
              />
              <YStack flex={1}>
                <DisplayHeading>NEW EXERCISE</DisplayHeading>
                <Text color="$color10" fontFamily="$body" fontSize={14}>
                  Add to the exercise library
                </Text>
              </YStack>
            </XStack>

            {/* Error Message */}
            {error && (
              <Card p="$3" bg="$red2" borderColor="$red8" borderWidth={1}>
                <XStack items="center" gap="$2">
                  <AlertCircle size={18} color="$red11" />
                  <Text color="$red11" fontSize={14} fontFamily="$body" flex={1}>
                    {error}
                  </Text>
                </XStack>
              </Card>
            )}

            {/* Exercise Name */}
            <YStack gap="$2">
              <FieldLabel>Exercise Name *</FieldLabel>
              <Input
                placeholder="e.g. Bulgarian Split Squat"
                value={name}
                onChangeText={setName}
                size="$4"
                bg="$surface"
                borderColor="$borderColor"
                fontFamily="$body"
              />
            </YStack>

            {/* Instructions */}
            <YStack gap="$2">
              <FieldLabel>Instructions</FieldLabel>
              <TextArea
                placeholder="Describe how to perform the exercise..."
                value={instructions}
                onChangeText={setInstructions}
                size="$4"
                bg="$surface"
                borderColor="$borderColor"
                fontFamily="$body"
                minHeight={120}
              />
              <Text fontSize={12} color="$color9" fontFamily="$body">
                Supports markdown formatting
              </Text>
            </YStack>

            {/* Difficulty */}
            <YStack gap="$2">
              <FieldLabel>Difficulty</FieldLabel>
              <XStack gap="$2">
                {(['beginner', 'intermediate', 'advanced'] as const).map((diff) => (
                  <Button
                    key={diff}
                    flex={1}
                    size="$4"
                    bg={difficulty === diff ? '$primary' : '$surface'}
                    borderWidth={1}
                    borderColor={difficulty === diff ? '$primary' : '$borderColor'}
                    color={difficulty === diff ? 'white' : '$color11'}
                    fontFamily="$body"
                    fontWeight="500"
                    rounded="$3"
                    onPress={() => setDifficulty(difficulty === diff ? undefined : diff)}
                  >
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </Button>
                ))}
              </XStack>
            </YStack>

            {/* Tags */}
            <YStack gap="$3">
              <FieldLabel>Tags *</FieldLabel>
              <Text fontSize={12} color="$color9" fontFamily="$body">
                Select tags that describe this exercise
              </Text>

              <XStack gap="$2" flexWrap="wrap">
                {COMMON_TAGS.map((tag) => (
                  <Button
                    key={tag}
                    size="$3"
                    bg={selectedTags.includes(tag) ? '$primary' : '$surface'}
                    borderWidth={1}
                    borderColor={selectedTags.includes(tag) ? '$primary' : '$borderColor'}
                    color={selectedTags.includes(tag) ? 'white' : '$color10'}
                    fontFamily="$body"
                    fontSize={12}
                    rounded="$2"
                    onPress={() => toggleTag(tag)}
                  >
                    {tag.replace(/_/g, ' ')}
                  </Button>
                ))}
              </XStack>

              {/* Custom Tag Input */}
              <XStack gap="$2">
                <Input
                  flex={1}
                  placeholder="Add custom tag..."
                  value={customTag}
                  onChangeText={setCustomTag}
                  size="$3"
                  bg="$surface"
                  borderColor="$borderColor"
                  fontFamily="$body"
                />
                <Button
                  size="$3"
                  bg="$surface"
                  borderWidth={1}
                  borderColor="$borderColor"
                  icon={Plus}
                  onPress={addCustomTag}
                  disabled={!customTag.trim()}
                />
              </XStack>

              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <XStack gap="$2" flexWrap="wrap" pt="$2">
                  {selectedTags.map((tag) => (
                    <TagBadge key={tag}>
                      <Text fontSize={12} color="$primary" fontFamily="$body" fontWeight="500">
                        {tag.replace(/_/g, ' ')}
                      </Text>
                      <Button
                        size="$1"
                        bg="transparent"
                        icon={X}
                        circular
                        onPress={() => toggleTag(tag)}
                      />
                    </TagBadge>
                  ))}
                </XStack>
              )}
            </YStack>

            {/* Equipment */}
            <YStack gap="$3">
              <FieldLabel>Equipment</FieldLabel>
              <Text fontSize={12} color="$color9" fontFamily="$body">
                Select required equipment (optional)
              </Text>

              <XStack gap="$2" flexWrap="wrap">
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <Button
                    key={eq}
                    size="$3"
                    bg={selectedEquipment.includes(eq) ? '$intensityLow5' : '$surface'}
                    borderWidth={1}
                    borderColor={selectedEquipment.includes(eq) ? '$intensityLow6' : '$borderColor'}
                    color={selectedEquipment.includes(eq) ? '$intensityLow6' : '$color10'}
                    fontFamily="$body"
                    fontSize={12}
                    rounded="$2"
                    onPress={() => toggleEquipment(eq)}
                  >
                    {eq.replace(/_/g, ' ')}
                  </Button>
                ))}
              </XStack>
            </YStack>

            {/* Submit Button */}
            <YStack gap="$3" pt="$4">
              <Button
                size="$5"
                bg="$primary"
                color="white"
                fontFamily="$body"
                fontWeight="700"
                rounded="$4"
                pressStyle={{ opacity: 0.9, scale: 0.98 }}
                onPress={handleSubmit}
                disabled={isSubmitting || !name.trim() || selectedTags.length === 0}
                icon={isSubmitting ? Spinner : Dumbbell}
              >
                {isSubmitting ? 'Creating...' : 'Create Exercise'}
              </Button>

              <Button
                size="$4"
                bg="$surface"
                borderWidth={1}
                borderColor="$borderColor"
                fontFamily="$body"
                fontWeight="600"
                color="$color11"
                rounded="$4"
                onPress={() => router.back()}
              >
                Cancel
              </Button>
            </YStack>
          </YStack>
        </ScrollView>
      </YStack>
    </>
  )
}
