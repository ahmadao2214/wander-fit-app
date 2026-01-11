import { useState } from 'react'
import { YStack, XStack, H2, Text, Card, Button, Spinner, TextArea, ScrollView } from 'tamagui'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import {
  ChevronLeft,
  ChevronRight,
  Smile,
  Meh,
  Frown,
  Zap,
  Battery,
  BatteryLow,
  BatteryFull,
  Check,
} from '@tamagui/lucide-icons'
import { PHASE_NAMES } from '../../types'

type PhaseDifficulty = 'too_easy' | 'just_right' | 'challenging' | 'too_hard'
type EnergyLevel = 'low' | 'moderate' | 'high'

interface DifficultyOption {
  value: PhaseDifficulty
  label: string
  description: string
  icon: typeof Smile
  color: string
  bgColor: string
}

interface EnergyOption {
  value: EnergyLevel
  label: string
  icon: typeof Battery
  color: string
  bgColor: string
}

const difficultyOptions: DifficultyOption[] = [
  {
    value: 'too_easy',
    label: 'Too Easy',
    description: 'Ready for more challenge',
    icon: Smile,
    color: '$green10',
    bgColor: '$green3',
  },
  {
    value: 'just_right',
    label: 'Just Right',
    description: 'Good progression',
    icon: Smile,
    color: '$blue10',
    bgColor: '$blue3',
  },
  {
    value: 'challenging',
    label: 'Challenging',
    description: 'Pushed my limits',
    icon: Meh,
    color: '$orange10',
    bgColor: '$orange3',
  },
  {
    value: 'too_hard',
    label: 'Too Hard',
    description: 'Need more time at this level',
    icon: Frown,
    color: '$red10',
    bgColor: '$red3',
  },
]

const energyOptions: EnergyOption[] = [
  {
    value: 'low',
    label: 'Low',
    icon: BatteryLow,
    color: '$red10',
    bgColor: '$red3',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    icon: Battery,
    color: '$orange10',
    bgColor: '$orange3',
  },
  {
    value: 'high',
    label: 'High',
    icon: BatteryFull,
    color: '$green10',
    bgColor: '$green3',
  },
]

/**
 * Self-Assessment Screen
 *
 * Second screen of reassessment flow.
 * Asks user how the phase felt to gauge readiness for skill upgrade.
 */
export default function SelfAssessmentScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [difficulty, setDifficulty] = useState<PhaseDifficulty | null>(null)
  const [energy, setEnergy] = useState<EnergyLevel | null>(null)
  const [notes, setNotes] = useState('')

  // Get reassessment status
  const reassessmentStatus = useQuery(api.userPrograms.getReassessmentStatus)

  const handleBack = () => {
    router.back()
  }

  const handleContinue = () => {
    if (!difficulty) return

    // Pass data to next screen via params
    router.push({
      pathname: '/(reassessment)/maxes',
      params: {
        difficulty,
        energy: energy ?? '',
        notes,
      },
    })
  }

  // Loading state
  if (reassessmentStatus === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text color="$color10">Loading...</Text>
      </YStack>
    )
  }

  const { completedPhase } = reassessmentStatus ?? {}
  const phaseName = completedPhase
    ? PHASE_NAMES[completedPhase as keyof typeof PHASE_NAMES]
    : 'Phase'

  const canContinue = difficulty !== null

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
              STEP 1 OF 3
            </Text>
            <H2 fontSize={28} color="$color12">
              How did {phaseName} feel?
            </H2>
            <Text fontSize={15} color="$color11" lineHeight={22}>
              Your feedback helps us optimize your next training phase.
            </Text>
          </YStack>

          {/* Difficulty Selection */}
          <YStack gap="$3">
            <Text fontSize={16} fontWeight="600" color="$color12">
              Overall Difficulty
            </Text>

            <YStack gap="$2">
              {difficultyOptions.map((option) => {
                const isSelected = difficulty === option.value
                const Icon = option.icon

                return (
                  <Card
                    key={option.value}
                    p="$4"
                    bg={isSelected ? option.bgColor : '$surface'}
                    borderWidth={2}
                    borderColor={isSelected ? option.color : '$borderColor'}
                    rounded="$4"
                    pressStyle={{ bg: option.bgColor, opacity: 0.8 }}
                    onPress={() => setDifficulty(option.value)}
                  >
                    <XStack items="center" gap="$3">
                      <YStack
                        width={44}
                        height={44}
                        rounded="$10"
                        bg={isSelected ? option.color : '$color4'}
                        items="center"
                        justify="center"
                      >
                        <Icon
                          size={24}
                          color={isSelected ? 'white' : '$color10'}
                        />
                      </YStack>

                      <YStack flex={1}>
                        <Text
                          fontSize={16}
                          fontWeight="600"
                          color={isSelected ? option.color : '$color12'}
                        >
                          {option.label}
                        </Text>
                        <Text fontSize={13} color="$color10">
                          {option.description}
                        </Text>
                      </YStack>

                      {isSelected && (
                        <YStack
                          width={24}
                          height={24}
                          rounded="$10"
                          bg={option.color}
                          items="center"
                          justify="center"
                        >
                          <Check size={16} color="white" />
                        </YStack>
                      )}
                    </XStack>
                  </Card>
                )
              })}
            </YStack>
          </YStack>

          {/* Energy Level Selection */}
          <YStack gap="$3">
            <XStack items="center" gap="$2">
              <Zap size={18} color="$primary" />
              <Text fontSize={16} fontWeight="600" color="$color12">
                Current Energy Level
              </Text>
              <Text fontSize={13} color="$color10">(optional)</Text>
            </XStack>

            <XStack gap="$2">
              {energyOptions.map((option) => {
                const isSelected = energy === option.value
                const Icon = option.icon

                return (
                  <Card
                    key={option.value}
                    flex={1}
                    p="$3"
                    bg={isSelected ? option.bgColor : '$surface'}
                    borderWidth={2}
                    borderColor={isSelected ? option.color : '$borderColor'}
                    rounded="$4"
                    pressStyle={{ bg: option.bgColor, opacity: 0.8 }}
                    onPress={() => setEnergy(energy === option.value ? null : option.value)}
                  >
                    <YStack items="center" gap="$2">
                      <Icon
                        size={28}
                        color={isSelected ? option.color : '$color10'}
                      />
                      <Text
                        fontSize={13}
                        fontWeight="600"
                        color={isSelected ? option.color : '$color11'}
                      >
                        {option.label}
                      </Text>
                    </YStack>
                  </Card>
                )
              })}
            </XStack>
          </YStack>

          {/* Notes */}
          <YStack gap="$3">
            <Text fontSize={16} fontWeight="600" color="$color12">
              Any additional notes? <Text color="$color10">(optional)</Text>
            </Text>

            <TextArea
              placeholder="Share any feedback about your training experience..."
              value={notes}
              onChangeText={setNotes}
              minHeight={100}
              bg="$surface"
              borderColor="$borderColor"
              borderWidth={1}
              rounded="$4"
              p="$3"
              fontSize={15}
              color="$color12"
              placeholderTextColor="$color9"
            />
          </YStack>

          {/* Info Card */}
          {difficulty && (
            <Card
              p="$4"
              bg="$brand1"
              borderWidth={0}
              rounded="$4"
            >
              <YStack gap="$2">
                <Text fontSize={13} fontWeight="600" color="$primary">
                  {difficulty === 'too_easy' || difficulty === 'just_right'
                    ? 'SKILL UPGRADE POSSIBLE'
                    : 'STAYING AT CURRENT LEVEL'}
                </Text>
                <Text fontSize={14} color="$color11" lineHeight={20}>
                  {difficulty === 'too_easy' || difficulty === 'just_right'
                    ? 'Based on your feedback, you may be ready for more challenging workouts in your next phase.'
                    : "We'll keep your training at the current intensity to help you build a stronger foundation."}
                </Text>
              </YStack>
            </Card>
          )}
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
            bg={canContinue ? '$primary' : '$color6'}
            color="white"
            onPress={handleContinue}
            disabled={!canContinue}
            fontWeight="700"
            opacity={canContinue ? 1 : 0.5}
          >
            <XStack items="center" gap="$2">
              <Text color="white" fontWeight="700">
                Continue
              </Text>
              <ChevronRight size={20} color="white" />
            </XStack>
          </Button>
        </XStack>
      </YStack>
    </YStack>
  )
}
