import { useState, useEffect } from 'react'
import { YStack, XStack, H2, Text, Card, Button, Spinner, ScrollView } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import {
  ChevronLeft,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  Star,
  Dumbbell,
  Rocket,
} from '@tamagui/lucide-icons'
import { PHASE_NAMES } from '../../types'

type PhaseDifficulty = 'too_easy' | 'just_right' | 'challenging' | 'too_hard'
type EnergyLevel = 'low' | 'moderate' | 'high'

/**
 * Results Screen
 *
 * Final screen of reassessment flow.
 * Shows summary of changes and completes the reassessment.
 */
export default function ResultsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { difficulty, energy, notes, maxesUpdated } = useLocalSearchParams<{
    difficulty: PhaseDifficulty
    energy: string
    notes: string
    maxesUpdated: string
  }>()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [result, setResult] = useState<{
    skillLevelChanged: boolean
    previousSkillLevel: string
    newSkillLevel: string
    nextPhase: string
    isFullCycleComplete: boolean
  } | null>(null)

  // Get reassessment status for preview
  const reassessmentStatus = useQuery(api.userPrograms.getReassessmentStatus)

  // Mutation to complete reassessment
  const completeReassessment = useMutation(api.userPrograms.completeReassessment)

  const handleBack = () => {
    router.back()
  }

  const handleComplete = async () => {
    if (!difficulty) return

    setIsSubmitting(true)
    try {
      // Convert empty string to undefined for optional energy param
      const energyLevel = energy && ['low', 'moderate', 'high'].includes(energy)
        ? (energy as EnergyLevel)
        : undefined

      const response = await completeReassessment({
        phaseDifficulty: difficulty,
        energyLevel,
        notes: notes || undefined,
        maxesUpdated: maxesUpdated === 'true',
      })

      setResult({
        skillLevelChanged: response.skillLevelChanged,
        previousSkillLevel: response.previousSkillLevel,
        newSkillLevel: response.newSkillLevel,
        nextPhase: response.nextPhase,
        isFullCycleComplete: response.isFullCycleComplete,
      })
      setIsSuccess(true)
    } catch (error) {
      console.error('Failed to complete reassessment:', error)
      alert('Failed to complete. Please try again.')
      setIsSubmitting(false)
    }
  }

  // Navigate to dashboard after success
  useEffect(() => {
    if (isSuccess) {
      const timeout = setTimeout(() => {
        router.replace('/(athlete)')
      }, 3000)
      return () => clearTimeout(timeout)
    }
  }, [isSuccess, router])

  // Loading state
  if (reassessmentStatus === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text color="$color10">Loading...</Text>
      </YStack>
    )
  }

  // Success state
  if (isSuccess && result) {
    const nextPhaseName = PHASE_NAMES[result.nextPhase as keyof typeof PHASE_NAMES]

    return (
      <YStack
        flex={1}
        bg="$background"
        items="center"
        justify="center"
        gap="$6"
        px="$4"
      >
        <YStack items="center" gap="$4">
          <YStack
            width={100}
            height={100}
            rounded="$10"
            bg="$green3"
            items="center"
            justify="center"
          >
            <Rocket size={56} color="$green10" />
          </YStack>

          <YStack gap="$2" items="center">
            <H2 text="center" color="$color12">
              {result.isFullCycleComplete ? 'New Cycle Started!' : 'Ready for ' + nextPhaseName + '!'}
            </H2>

            {result.skillLevelChanged && (
              <Card p="$4" bg="$primary" rounded="$4" mt="$2">
                <XStack items="center" gap="$3">
                  <Star size={24} color="white" />
                  <YStack>
                    <Text fontSize={12} color="white" opacity={0.9}>
                      SKILL LEVEL UPGRADED
                    </Text>
                    <Text fontSize={18} fontWeight="700" color="white">
                      {result.previousSkillLevel} → {result.newSkillLevel}
                    </Text>
                  </YStack>
                </XStack>
              </Card>
            )}

            <Text
              text="center"
              fontSize={15}
              color="$color11"
              maxW={300}
              mt="$2"
            >
              {result.isFullCycleComplete
                ? 'Starting a fresh 12-week cycle. Keep up the great work!'
                : `Your next phase is ready. Let's keep building!`}
            </Text>
          </YStack>
        </YStack>

        <YStack items="center" gap="$2">
          <Spinner size="small" color="$primary" />
          <Text fontSize={14} color="$color10">
            Taking you to your dashboard...
          </Text>
        </YStack>
      </YStack>
    )
  }

  const {
    completedPhase,
    nextPhase,
    isFullCycleComplete,
    currentSkillLevel,
    canUpgradeSkillLevel,
    nextSkillLevel,
    completionStats,
  } = reassessmentStatus ?? {}

  const phaseName = completedPhase
    ? PHASE_NAMES[completedPhase as keyof typeof PHASE_NAMES]
    : 'Phase'
  const nextPhaseName = nextPhase
    ? PHASE_NAMES[nextPhase as keyof typeof PHASE_NAMES]
    : 'Phase'

  // Predict skill upgrade based on difficulty
  const willUpgrade =
    canUpgradeSkillLevel &&
    (difficulty === 'too_easy' || difficulty === 'just_right') &&
    (completionStats?.rate ?? 0) >= (currentSkillLevel === 'Novice' ? 75 : 80)

  const getDifficultyLabel = (d: PhaseDifficulty) => {
    const labels = {
      too_easy: 'Too Easy',
      just_right: 'Just Right',
      challenging: 'Challenging',
      too_hard: 'Too Hard',
    }
    return labels[d]
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
              STEP 3 OF 3
            </Text>
            <H2 fontSize={28} color="$color12">
              Review & Continue
            </H2>
            <Text fontSize={15} color="$color11" lineHeight={22}>
              Here's a summary of your check-in. Ready to move forward?
            </Text>
          </YStack>

          {/* Summary Card */}
          <Card p="$5" bg="$surface" borderWidth={1} borderColor="$borderColor" rounded="$4">
            <YStack gap="$4">
              <Text fontSize={14} fontWeight="600" color="$color10">
                CHECK-IN SUMMARY
              </Text>

              {/* Phase Completed */}
              <XStack items="center" gap="$3">
                <YStack
                  width={40}
                  height={40}
                  rounded="$10"
                  bg="$green3"
                  items="center"
                  justify="center"
                >
                  <CheckCircle size={22} color="$green10" />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize={13} color="$color10">
                    Phase Completed
                  </Text>
                  <Text fontSize={16} fontWeight="600" color="$color12">
                    {phaseName}
                  </Text>
                </YStack>
              </XStack>

              {/* Self Assessment */}
              <XStack items="center" gap="$3">
                <YStack
                  width={40}
                  height={40}
                  rounded="$10"
                  bg="$blue3"
                  items="center"
                  justify="center"
                >
                  <Star size={22} color="$blue10" />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize={13} color="$color10">
                    Difficulty Rating
                  </Text>
                  <Text fontSize={16} fontWeight="600" color="$color12">
                    {getDifficultyLabel(difficulty)}
                  </Text>
                </YStack>
              </XStack>

              {/* Maxes Updated */}
              <XStack items="center" gap="$3">
                <YStack
                  width={40}
                  height={40}
                  rounded="$10"
                  bg={maxesUpdated === 'true' ? '$green3' : '$color4'}
                  items="center"
                  justify="center"
                >
                  <Dumbbell
                    size={22}
                    color={maxesUpdated === 'true' ? '$green10' : '$color9'}
                  />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize={13} color="$color10">
                    Maxes
                  </Text>
                  <Text fontSize={16} fontWeight="600" color="$color12">
                    {maxesUpdated === 'true' ? 'Updated' : 'No changes'}
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          </Card>

          {/* Skill Upgrade Preview */}
          {willUpgrade && (
            <Card p="$5" bg="$primary" borderWidth={0} rounded="$4">
              <YStack gap="$3">
                <XStack items="center" gap="$2">
                  <TrendingUp size={20} color="white" />
                  <Text fontSize={14} fontWeight="700" color="white">
                    SKILL LEVEL UPGRADE
                  </Text>
                </XStack>

                <XStack items="center" justify="center" gap="$3" py="$2">
                  <YStack items="center" gap="$1">
                    <Text fontSize={12} color="white" opacity={0.8}>
                      CURRENT
                    </Text>
                    <Text fontSize={20} fontWeight="700" color="white">
                      {currentSkillLevel}
                    </Text>
                  </YStack>

                  <ArrowRight size={24} color="white" />

                  <YStack items="center" gap="$1">
                    <Text fontSize={12} color="white" opacity={0.8}>
                      NEW
                    </Text>
                    <Text fontSize={20} fontWeight="700" color="white">
                      {nextSkillLevel}
                    </Text>
                  </YStack>
                </XStack>

                <Text fontSize={13} color="white" opacity={0.9} text="center">
                  Based on your feedback and {completionStats?.rate}% completion rate
                </Text>
              </YStack>
            </Card>
          )}

          {/* What's Next */}
          <Card p="$5" bg="$brand1" borderWidth={0} rounded="$4">
            <YStack gap="$3">
              <Text fontSize={14} fontWeight="600" color="$primary">
                {isFullCycleComplete ? 'STARTING NEW CYCLE' : "WHAT'S NEXT"}
              </Text>

              <XStack items="center" gap="$3">
                <YStack
                  width={48}
                  height={48}
                  rounded="$10"
                  bg="$brand2"
                  items="center"
                  justify="center"
                >
                  <Rocket size={26} color="$primary" />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize={18} fontWeight="700" color="$color12">
                    {nextPhaseName}
                  </Text>
                  <Text fontSize={14} color="$color11">
                    {isFullCycleComplete
                      ? 'Fresh start with optimized programming'
                      : '4 weeks of focused training ahead'}
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          </Card>

          {/* Notes Preview (if any) */}
          {notes && (
            <Card p="$4" bg="$surface" borderWidth={1} borderColor="$borderColor" rounded="$4">
              <YStack gap="$2">
                <Text fontSize={13} fontWeight="600" color="$color10">
                  YOUR NOTES
                </Text>
                <Text fontSize={14} color="$color11" lineHeight={20}>
                  "{notes}"
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
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            flex={2}
            size="$5"
            bg="$primary"
            color="white"
            onPress={handleComplete}
            fontWeight="700"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <XStack items="center" gap="$2">
                <Spinner size="small" color="white" />
                <Text color="white" fontWeight="700">
                  Saving...
                </Text>
              </XStack>
            ) : (
              <XStack items="center" gap="$2">
                <Text color="white" fontWeight="700" fontSize={16}>
                  {isFullCycleComplete ? 'Start New Cycle' : `Start ${nextPhaseName}`}
                </Text>
                <CheckCircle size={20} color="white" />
              </XStack>
            )}
          </Button>
        </XStack>
      </YStack>
    </YStack>
  )
}
