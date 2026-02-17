import { useState, useEffect, useRef } from 'react'
import {
  YStack,
  XStack,
  Text,
  Button,
  Card,
  ScrollView,
  Spinner,
} from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ArrowLeft,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  Rocket,
  Dumbbell,
} from '@tamagui/lucide-icons'
import { ConfettiEffect } from '../../components/workout/ConfettiEffect'
import Animated, { FadeInUp, ZoomIn, BounceIn } from 'react-native-reanimated'

const DIFFICULTY_LABELS: Record<string, string> = {
  too_easy: 'Too Easy',
  just_right: 'Just Right',
  challenging: 'Challenging',
  too_hard: 'Too Hard',
}

/**
 * Results Screen — Screen 4 of Reassessment Flow
 *
 * Shows summary of the reassessment and confirms phase advancement.
 * Calls completeReassessment mutation on button press.
 */
export default function ResultsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const params = useLocalSearchParams<{
    difficulty: string
    energy: string
    notes: string
    maxesUpdated: string
  }>()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reassessmentStatus = useQuery(
    api.userPrograms.getReassessmentStatus,
    user ? {} : 'skip'
  )

  const completeReassessment = useMutation(api.userPrograms.completeReassessment)

  // Clean up redirect timer
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current)
      }
    }
  }, [])

  if (reassessmentStatus === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text fontFamily="$body" color="$color10">Loading...</Text>
      </YStack>
    )
  }

  const difficulty = params.difficulty as string
  const energy = params.energy || undefined
  const notes = params.notes || undefined
  const maxesUpdated = params.maxesUpdated === 'true'

  const canUpgrade =
    reassessmentStatus?.canUpgradeSkillLevel &&
    (difficulty === 'too_easy' || difficulty === 'just_right')

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      const result = await completeReassessment({
        phaseDifficulty: difficulty as any,
        energyLevel: energy as any,
        notes,
        maxesUpdated,
      })

      setIsSuccess(true)

      // Auto-redirect after 4 seconds
      redirectTimerRef.current = setTimeout(() => {
        router.replace('/(athlete)')
      }, 4000)
    } catch (error) {
      console.error('Failed to complete reassessment:', error)
      setIsSubmitting(false)
    }
  }

  // Success state
  if (isSuccess) {
    return (
      <YStack flex={1} bg="$background">
        <ConfettiEffect trigger />
        <YStack
          flex={1}
          px="$4"
          pt={insets.top + 24}
          pb={insets.bottom + 24}
          items="center"
          justify="center"
          gap="$6"
        >
          <Animated.View entering={BounceIn.delay(200)}>
            <YStack
              width={100}
              height={100}
              bg="$success"
              rounded="$10"
              items="center"
              justify="center"
            >
              <Rocket size={52} color="white" />
            </YStack>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(300)}>
            <YStack items="center" gap="$2">
              <Text
                fontFamily="$heading"
                fontSize={32}
                letterSpacing={1}
                color="$color12"
                text="center"
              >
                {reassessmentStatus?.nextPhase} UNLOCKED!
              </Text>
              <Text fontFamily="$body" color="$color10" text="center">
                Your next phase is ready. Let's keep going!
              </Text>
            </YStack>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(600).duration(300)}
            style={{ width: '100%', maxWidth: 400 }}
          >
            <Button
              width="100%"
              size="$5"
              bg="$primary"
              color="white"
              fontFamily="$body"
              fontWeight="700"
              rounded="$4"
              pressStyle={{ opacity: 0.9, scale: 0.98 }}
              onPress={() => {
                if (redirectTimerRef.current) {
                  clearTimeout(redirectTimerRef.current)
                }
                router.replace('/(athlete)')
              }}
            >
              Continue to Dashboard
            </Button>
          </Animated.View>
        </YStack>
      </YStack>
    )
  }

  return (
    <YStack flex={1} bg="$background">
      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 } as any}
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
                REVIEW & CONFIRM
              </Text>
              <Text fontFamily="$body" color="$color10" fontSize={14}>
                Ready to move on to {reassessmentStatus?.nextPhase}
              </Text>
            </YStack>
          </XStack>

          {/* Summary Cards */}
          <YStack gap="$3">
            {/* Phase Completed */}
            <Animated.View entering={FadeInUp.delay(100).duration(250)}>
              <Card
                p="$4"
                bg="$surface"
                borderWidth={1}
                borderColor="$borderColor"
                borderCurve="continuous"
                rounded="$4"
              >
                <XStack items="center" gap="$3">
                  <CheckCircle size={24} color="$success" />
                  <YStack flex={1}>
                    <Text fontFamily="$body" fontWeight="600" color="$color12">
                      Phase Completed
                    </Text>
                    <Text fontFamily="$body" fontSize={13} color="$color10">
                      {reassessmentStatus?.pendingForPhase}
                      {reassessmentStatus?.completionStats &&
                        ` — ${Math.round(reassessmentStatus.completionStats.completionRate * 100)}% completion rate`}
                    </Text>
                  </YStack>
                </XStack>
              </Card>
            </Animated.View>

            {/* Difficulty Rating */}
            <Animated.View entering={FadeInUp.delay(180).duration(250)}>
              <Card
                p="$4"
                bg="$surface"
                borderWidth={1}
                borderColor="$borderColor"
                borderCurve="continuous"
                rounded="$4"
              >
                <XStack items="center" gap="$3">
                  <Text fontSize={20}>
                    {difficulty === 'too_easy' ? '🟢' :
                     difficulty === 'just_right' ? '🔵' :
                     difficulty === 'challenging' ? '🟠' : '🔴'}
                  </Text>
                  <YStack flex={1}>
                    <Text fontFamily="$body" fontWeight="600" color="$color12">
                      Difficulty Rating
                    </Text>
                    <Text fontFamily="$body" fontSize={13} color="$color10">
                      {DIFFICULTY_LABELS[difficulty] ?? difficulty}
                      {energy ? ` • ${energy} energy` : ''}
                    </Text>
                  </YStack>
                </XStack>
              </Card>
            </Animated.View>

            {/* Maxes Status */}
            <Animated.View entering={FadeInUp.delay(260).duration(250)}>
              <Card
                p="$4"
                bg="$surface"
                borderWidth={1}
                borderColor="$borderColor"
                borderCurve="continuous"
                rounded="$4"
              >
                <XStack items="center" gap="$3">
                  <Dumbbell size={24} color="$primary" />
                  <YStack flex={1}>
                    <Text fontFamily="$body" fontWeight="600" color="$color12">
                      1RM Maxes
                    </Text>
                    <Text fontFamily="$body" fontSize={13} color="$color10">
                      {maxesUpdated ? 'Updated' : 'No changes'}
                    </Text>
                  </YStack>
                </XStack>
              </Card>
            </Animated.View>

            {/* Notes */}
            {notes && (
              <Animated.View entering={FadeInUp.delay(340).duration(250)}>
                <Card
                  p="$4"
                  bg="$surface"
                  borderWidth={1}
                  borderColor="$borderColor"
                  borderCurve="continuous"
                  rounded="$4"
                >
                  <YStack gap="$1">
                    <Text fontFamily="$body" fontWeight="600" color="$color12">
                      Notes
                    </Text>
                    <Text fontFamily="$body" fontSize={13} color="$color10">
                      {notes}
                    </Text>
                  </YStack>
                </Card>
              </Animated.View>
            )}
          </YStack>

          {/* Skill Upgrade Section */}
          {canUpgrade && reassessmentStatus?.nextSkillLevel && (
            <Animated.View entering={ZoomIn.delay(500).duration(300)}>
              <Card
                p="$5"
                bg="$brand1"
                borderWidth={2}
                borderColor="$primary"
                borderCurve="continuous"
                rounded="$5"
                items="center"
                gap="$3"
              >
                <TrendingUp size={32} color="$primary" />
                <Text fontFamily="$heading" fontSize={24} letterSpacing={0.5} color="$primary">
                  SKILL UPGRADE
                </Text>
                <Text fontFamily="$body" fontWeight="700" fontSize={18} color="$color12">
                  {reassessmentStatus.currentSkillLevel} → {reassessmentStatus.nextSkillLevel}
                </Text>
                <Text fontFamily="$body" fontSize={13} color="$color10" text="center">
                  Based on your performance and self-assessment
                </Text>
              </Card>
            </Animated.View>
          )}

          {/* Next Phase Info */}
          <Card
            p="$4"
            bg="$brand1"
            borderCurve="continuous"
            rounded="$4"
          >
            <XStack items="center" gap="$3">
              <ArrowRight size={24} color="$primary" />
              <YStack flex={1}>
                <Text fontFamily="$body" fontWeight="700" color="$brand9">
                  Next up: {reassessmentStatus?.nextPhase}
                </Text>
                <Text fontFamily="$body" fontSize={13} color="$brand8">
                  {reassessmentStatus?.isFullCycleComplete
                    ? 'Full cycle complete! Starting fresh.'
                    : 'Your new phase will start at Week 1, Day 1'}
                </Text>
              </YStack>
            </XStack>
          </Card>

          {/* Confirm Button */}
          <Button
            width="100%"
            size="$5"
            bg="$primary"
            color="white"
            fontFamily="$body"
            fontWeight="700"
            rounded="$4"
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
            disabled={isSubmitting}
            onPress={handleComplete}
          >
            {isSubmitting ? 'Processing...' : `Start ${reassessmentStatus?.nextPhase}`}
          </Button>
        </YStack>
      </ScrollView>
    </YStack>
  )
}
