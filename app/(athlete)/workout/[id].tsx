import { useState } from 'react'
import { 
  YStack, 
  XStack, 
  H2, 
  H3,
  Text, 
  Card, 
  Button,
  ScrollView,
  Spinner 
} from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../../hooks/useAuth'
import { Id } from '../../../convex/_generated/dataModel'
import { 
  ArrowLeft, 
  Play, 
  Dumbbell,
  Timer,
  RotateCcw,
  Info,
  Lock,
} from '@tamagui/lucide-icons'
import { PHASE_NAMES } from '../../../types'

/**
 * Workout Detail Screen
 * 
 * OPEN ACCESS:
 * - Athletes can start ANY workout within their unlocked phases
 * - No suggested/scheduled workout - full flexibility
 * - Locked phases show a lock message
 */
export default function WorkoutDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()

  // All hooks must be called before any early returns
  const [isStarting, setIsStarting] = useState(false)

  // Get the template with exercise details
  const template = useQuery(
    api.programTemplates.getByIdWithExercises,
    id ? { templateId: id as Id<"program_templates"> } : "skip"
  )

  // Get current program state
  const programState = useQuery(
    api.userPrograms.getCurrentProgramState,
    user ? {} : "skip"
  )

  // Get unlocked phases to check access
  const unlockedPhases = useQuery(
    api.userPrograms.getUnlockedPhases,
    user ? {} : "skip"
  )

  // Mutation for starting workout session
  const startSession = useMutation(api.gppWorkoutSessions.startSession)

  if (!user) {
    return (
      <YStack flex={1} items="center" justify="center">
        <Text>Please log in to view workouts</Text>
      </YStack>
    )
  }

  if (template === undefined || unlockedPhases === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$green10" />
        <Text>Loading workout...</Text>
      </YStack>
    )
  }

  if (!template) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4" px="$4">
        <Text>Workout not found</Text>
        <Button onPress={() => router.back()}>Go Back</Button>
      </YStack>
    )
  }

  // Check if this workout's phase is unlocked
  const isPhaseUnlocked = unlockedPhases?.phases.includes(
    template.phase as "GPP" | "SPP" | "SSP"
  )

  const startWorkout = async () => {
    if (isStarting) return
    
    setIsStarting(true)
    try {
      const result = await startSession({
        templateId: template._id,
      })
      
      // Navigate to execution screen with the session ID
      router.push({
        pathname: '/(athlete)/workout/execute/[id]',
        params: { id: result.sessionId },
      })
    } catch (error) {
      console.error('Failed to start workout:', error)
      alert('Failed to start workout. Please try again.')
    } finally {
      setIsStarting(false)
    }
  }

  const totalSets = template.exercises.reduce((sum, ex) => sum + ex.sets, 0)
  const phaseName = PHASE_NAMES[template.phase as keyof typeof PHASE_NAMES] || template.phase

  return (
    <YStack flex={1} bg="$background">
      <ScrollView flex={1}>
        <YStack
          gap="$4"
          px="$4"
          pt="$6"
          pb="$8"
          maxW={800}
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
              <H2>{template.name}</H2>
              <Text color="$color10">
                {template.exercises.length} exercises • ~{template.estimatedDurationMinutes} min
              </Text>
            </YStack>
          </XStack>

          {/* Phase/Week/Day Badges */}
          <XStack gap="$2" flexWrap="wrap">
            <Card bg="$green3" px="$3" py="$1" borderRadius="$10">
              <Text fontSize="$2" color="$green11" fontWeight="500">
                {template.phase}
              </Text>
            </Card>
            <Card bg="$blue3" px="$3" py="$1" borderRadius="$10">
              <Text fontSize="$2" color="$blue11" fontWeight="500">
                Week {template.week}
              </Text>
            </Card>
            <Card bg={"$purple3" as any} px="$3" py="$1" borderRadius="$10">
              <Text fontSize="$2" color={"$purple11" as any} fontWeight="500">
                Day {template.day}
              </Text>
            </Card>
            <Card bg={"$orange3" as any} px="$3" py="$1" borderRadius="$10">
              <Text fontSize="$2" color={"$orange11" as any} fontWeight="500">
                {template.skillLevel}
              </Text>
            </Card>
          </XStack>

          {/* Phase Locked Warning */}
          {!isPhaseUnlocked && (
            <Card p="$4" bg="$red2" borderColor="$red7">
              <XStack items="center" gap="$3">
                <Lock size={24} color="$red11" />
                <YStack flex={1}>
                  <Text fontWeight="600" color="$red11">
                    Phase Locked
                  </Text>
                  <Text fontSize="$2" color="$red10">
                    Complete the previous phase to unlock {phaseName} workouts.
                  </Text>
                </YStack>
              </XStack>
            </Card>
          )}

          {/* Description */}
          {template.description && (
            <Card p="$4" bg="$blue2" borderColor="$blue6">
              <XStack items="center" gap="$3">
                <Info size={20} color="$blue11" />
                <YStack flex={1}>
                  <Text fontWeight="600" color="$blue11" fontSize="$3">
                    About This Workout
                  </Text>
                  <Text color="$blue11" fontSize="$3">
                    {template.description}
                  </Text>
                </YStack>
              </XStack>
            </Card>
          )}

          {/* Start Button (enabled if phase is unlocked) */}
          {isPhaseUnlocked && (
            <Button
              bg="$green9"
              color="white"
              size="$5"
              onPress={startWorkout}
              icon={isStarting ? undefined : Play}
              fontWeight="700"
              disabled={isStarting}
            >
              {isStarting ? 'Starting...' : 'Start Workout'}
            </Button>
          )}

          {/* Exercise List */}
          <YStack gap="$3">
            <H3>Exercises ({template.exercises.length})</H3>
            
            {template.exercises.map((exercise, index) => {
              const exerciseDetails = exercise.exercise
              
              return (
                <Card key={`${exercise.exerciseId}-${index}`} p="$4" borderColor="$gray6" borderWidth={1}>
                  <YStack gap="$3">
                    {/* Exercise Header */}
                    <XStack items="center" gap="$3">
                      <YStack
                        width={32}
                        height={32}
                        bg="$green9"
                        borderRadius={16}
                        items="center"
                        justify="center"
                      >
                        <Text color="white" fontWeight="600" fontSize="$3">
                          {index + 1}
                        </Text>
                      </YStack>
                      <YStack flex={1}>
                        <Text fontSize="$5" fontWeight="600">
                          {exerciseDetails?.name || 'Exercise'}
                        </Text>
                        {exerciseDetails?.tags && (
                          <XStack gap="$1" flexWrap="wrap" pt="$1">
                            {exerciseDetails.tags.slice(0, 3).map((tag) => (
                              <Card key={tag} bg="$gray3" px="$2" py="$0.5" borderRadius="$2">
                                <Text fontSize="$1" color="$color10">
                                  {tag.replace(/_/g, ' ')}
                                </Text>
                              </Card>
                            ))}
                          </XStack>
                        )}
                      </YStack>
                    </XStack>

                    {/* Exercise Details */}
                    <XStack gap="$4" flexWrap="wrap">
                      <XStack items="center" gap="$2">
                        <Dumbbell size={16} color="$color10" />
                        <Text fontSize="$3" color="$color11">
                          {exercise.sets} sets
                        </Text>
                      </XStack>
                      
                      <XStack items="center" gap="$2">
                        <Text fontSize="$3" color="$color11">
                          {exercise.reps}
                        </Text>
                      </XStack>

                      {exercise.tempo && (
                        <XStack items="center" gap="$2">
                          <Text fontSize="$3" color="$color11">
                            Tempo: {exercise.tempo}
                          </Text>
                        </XStack>
                      )}
                      
                      <XStack items="center" gap="$2">
                        <RotateCcw size={16} color="$color10" />
                        <Text fontSize="$3" color="$color11">
                          {exercise.restSeconds}s rest
                        </Text>
                      </XStack>
                    </XStack>

                    {/* Superset Indicator */}
                    {exercise.superset && (
                      <Card bg={"$purple2" as any} p="$2" borderRadius="$2">
                        <Text fontSize="$2" color="purple" fontWeight="500">
                          Superset {exercise.superset}
                        </Text>
                      </Card>
                    )}

                    {/* Notes */}
                    {exercise.notes && (
                      <Card p="$3" bg="$yellow2" borderColor="$yellow6">
                        <XStack items="flex-start" gap="$2">
                          <Info size={14} color="orange" />
                          <Text fontSize="$2" color="orange" flex={1}>
                            {exercise.notes}
                          </Text>
                        </XStack>
                      </Card>
                    )}

                    {/* Exercise Instructions */}
                    {exerciseDetails?.instructions && (
                      <YStack gap="$1" bg="$gray2" p="$3" borderRadius="$3">
                        <Text fontSize="$2" color="$color10" fontWeight="600">
                          Instructions:
                        </Text>
                        <Text fontSize="$2" color="$color11">
                          {exerciseDetails.instructions}
                        </Text>
                      </YStack>
                    )}
                  </YStack>
                </Card>
              )
            })}
          </YStack>

          {/* Workout Summary */}
          <Card p="$4" bg="$green2" borderColor="$green6">
            <YStack gap="$3">
              <Text fontWeight="600" color="$green11" fontSize="$4">
                Workout Summary
              </Text>
              <YStack gap="$1">
                <Text fontSize="$3" color="$green11">
                  • Phase: {phaseName}
                </Text>
                <Text fontSize="$3" color="$green11">
                  • {template.exercises.length} exercises, {totalSets} total sets
                </Text>
                <Text fontSize="$3" color="$green11">
                  • Estimated duration: ~{template.estimatedDurationMinutes} minutes
                </Text>
                <Text fontSize="$3" color="$green11">
                  • Skill level: {template.skillLevel}
                </Text>
              </YStack>
            </YStack>
          </Card>

          {/* Bottom Action */}
          {isPhaseUnlocked ? (
            <Button
              bg="$green9"
              color="white"
              size="$5"
              onPress={startWorkout}
              icon={isStarting ? undefined : Play}
              fontWeight="700"
              disabled={isStarting}
            >
              {isStarting ? 'Starting...' : 'Ready? Start Workout'}
            </Button>
          ) : (
            <Card p="$4" bg="$gray3" borderColor="$gray6">
              <XStack items="center" justify="center" gap="$2">
                <Lock size={20} color="$color10" />
                <Text color="$color10" fontWeight="500">
                  Unlock {template.phase} phase to start this workout
                </Text>
              </XStack>
            </Card>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  )
}
