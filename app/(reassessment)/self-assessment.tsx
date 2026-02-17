import { useState } from 'react'
import {
  YStack,
  XStack,
  Text,
  Button,
  Card,
  ScrollView,
  TextArea,
  Spinner,
} from 'tamagui'
import { useRouter } from 'expo-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { ArrowLeft, TrendingUp } from '@tamagui/lucide-icons'
import Animated, { FadeInUp } from 'react-native-reanimated'

type Difficulty = 'too_easy' | 'just_right' | 'challenging' | 'too_hard'
type EnergyLevel = 'low' | 'moderate' | 'high'

const DIFFICULTY_OPTIONS = [
  {
    value: 'too_easy' as Difficulty,
    label: 'Too Easy',
    description: 'I could have done much more',
    color: '$green10' as const,
    bgColor: '$green2' as const,
  },
  {
    value: 'just_right' as Difficulty,
    label: 'Just Right',
    description: 'The workouts were appropriately challenging',
    color: '$blue10' as const,
    bgColor: '$blue2' as const,
  },
  {
    value: 'challenging' as Difficulty,
    label: 'Challenging',
    description: 'I had to push myself hard',
    color: '$orange10' as const,
    bgColor: '$orange2' as const,
  },
  {
    value: 'too_hard' as Difficulty,
    label: 'Too Hard',
    description: "I couldn't complete many workouts",
    color: '$red10' as const,
    bgColor: '$red2' as const,
  },
]

const ENERGY_OPTIONS: { value: EnergyLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
]

/**
 * Self-Assessment Screen — Screen 2 of Reassessment Flow
 *
 * Captures how the phase felt: difficulty, energy, notes.
 * Data passed to results screen via route params.
 */
export default function SelfAssessmentScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()

  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [energy, setEnergy] = useState<EnergyLevel | null>(null)
  const [notes, setNotes] = useState('')

  const reassessmentStatus = useQuery(
    api.userPrograms.getReassessmentStatus,
    user ? {} : 'skip'
  )

  if (reassessmentStatus === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text fontFamily="$body" color="$color10">Loading...</Text>
      </YStack>
    )
  }

  const canUpgrade =
    reassessmentStatus?.canUpgradeSkillLevel &&
    difficulty !== null &&
    (difficulty === 'too_easy' || difficulty === 'just_right')

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
      enabled={Platform.OS === 'ios'}
    >
      <YStack flex={1} bg="$background">
        <ScrollView
          flex={1}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 } as any}
          showsVerticalScrollIndicator={false}
        >
          <YStack
            px="$4"
            pt={insets.top + 16}
            pb={insets.bottom + 24}
            gap="$5"
            maxW={600}
            width="100%"
            self="center"
          >
            {/* Header */}
            <XStack items="center" gap="$3">
              <Button
                size="$3"
                variant="outlined"
                icon={ArrowLeft}
                onPress={() => router.back()}
                circular
              />
              <YStack flex={1}>
                <Text fontFamily="$heading" fontSize={28} letterSpacing={0.5} color="$color12">
                  HOW DID IT GO?
                </Text>
                <Text fontFamily="$body" color="$color10" fontSize={14}>
                  Tell us about your {reassessmentStatus?.pendingForPhase} experience
                </Text>
              </YStack>
            </XStack>

            {/* Difficulty Section */}
            <YStack gap="$3">
              <Text fontFamily="$body" fontWeight="600" fontSize={16} color="$color12">
                How did this phase feel?
              </Text>
              {DIFFICULTY_OPTIONS.map((option, index) => (
                <Animated.View
                  key={option.value}
                  entering={FadeInUp.delay(index * 50).duration(250)}
                >
                  <Card
                    p="$4"
                    bg={difficulty === option.value ? option.bgColor : '$surface'}
                    borderWidth={2}
                    borderColor={difficulty === option.value ? option.color : '$borderColor'}
                    borderCurve="continuous"
                    rounded="$4"
                    pressStyle={{ scale: 0.98 }}
                    onPress={() => setDifficulty(option.value)}
                    role="button"
                    accessibilityLabel={option.label}
                  >
                    <YStack gap="$1">
                      <Text
                        fontFamily="$body"
                        fontWeight="700"
                        fontSize={16}
                        color={difficulty === option.value ? option.color : '$color12'}
                      >
                        {option.label}
                      </Text>
                      <Text
                        fontFamily="$body"
                        fontSize={13}
                        color={difficulty === option.value ? option.color : '$color10'}
                      >
                        {option.description}
                      </Text>
                    </YStack>
                  </Card>
                </Animated.View>
              ))}
            </YStack>

            {/* Energy Section */}
            <YStack gap="$3">
              <Text fontFamily="$body" fontWeight="600" fontSize={16} color="$color12">
                Energy level throughout the phase?
              </Text>
              <XStack gap="$2">
                {ENERGY_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    flex={1}
                    size="$4"
                    bg={energy === option.value ? '$primary' : '$surface'}
                    color={energy === option.value ? 'white' : '$color11'}
                    borderWidth={1}
                    borderColor={energy === option.value ? '$primary' : '$borderColor'}
                    fontFamily="$body"
                    fontWeight="600"
                    rounded="$3"
                    onPress={() =>
                      setEnergy(energy === option.value ? null : option.value)
                    }
                  >
                    {option.label}
                  </Button>
                ))}
              </XStack>
              <Text fontFamily="$body" fontSize={12} color="$color9">
                Optional
              </Text>
            </YStack>

            {/* Notes */}
            <YStack gap="$2">
              <Text fontFamily="$body" fontWeight="600" fontSize={16} color="$color12">
                Any notes?
              </Text>
              <TextArea
                placeholder="Optional — injuries, schedule changes, etc."
                value={notes}
                onChangeText={setNotes}
                numberOfLines={3}
                bg="$surface"
                borderWidth={1}
                borderColor="$borderColor"
                rounded="$3"
                fontFamily="$body"
                fontSize={14}
              />
            </YStack>

            {/* Skill Upgrade Preview */}
            {canUpgrade && reassessmentStatus?.nextSkillLevel && (
              <Card p="$4" bg="$brand1" borderColor="$brand3" borderWidth={1} rounded="$4">
                <XStack items="center" gap="$3">
                  <TrendingUp size={24} color="$primary" />
                  <YStack flex={1}>
                    <Text fontFamily="$body" fontWeight="700" color="$brand9">
                      Skill Level Upgrade Available
                    </Text>
                    <Text fontFamily="$body" fontSize={13} color="$brand8">
                      {reassessmentStatus.currentSkillLevel} → {reassessmentStatus.nextSkillLevel}
                    </Text>
                  </YStack>
                </XStack>
              </Card>
            )}

            {/* Continue */}
            <Button
              width="100%"
              size="$5"
              bg="$primary"
              color="white"
              fontFamily="$body"
              fontWeight="700"
              rounded="$4"
              pressStyle={{ opacity: 0.9, scale: 0.98 }}
              disabled={!difficulty}
              opacity={difficulty ? 1 : 0.5}
              onPress={() => {
                router.push({
                  pathname: '/(reassessment)/maxes' as any,
                  params: {
                    difficulty,
                    energy: energy ?? '',
                    notes,
                  },
                })
              }}
            >
              Continue
            </Button>
          </YStack>
        </ScrollView>
      </YStack>
    </KeyboardAvoidingView>
  )
}
