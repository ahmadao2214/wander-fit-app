import { TouchableOpacity, StyleSheet } from 'react-native'
import {
  YStack,
  XStack,
  Text,
  Card,
} from 'tamagui'
import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Activity,
} from '@tamagui/lucide-icons'

/**
 * Performance data for a single set
 */
interface SetPerformance {
  setNumber: number
  repsCompleted?: number
  weight?: number
  rpe?: number
  completed: boolean
  skipped: boolean
}

/**
 * Exercise performance data from a completed session
 */
interface ExercisePerformance {
  exerciseId: string
  exerciseName: string
  exerciseSlug: string
  prescribedSets: number
  prescribedReps: string
  sets?: SetPerformance[]
  skipped: boolean
}

interface PerformanceReviewItemProps {
  exercise: ExercisePerformance
  index: number
  isExpanded: boolean
  onToggle: () => void
}

/**
 * PerformanceReviewItem - Accordion item showing exercise performance from a completed workout
 *
 * Collapsed: Shows exercise name, completion status, and summary (e.g., "3 sets @ 185lbs")
 * Expanded: Shows detailed breakdown of each set with reps, weight, and RPE
 */
export function PerformanceReviewItem({
  exercise,
  index,
  isExpanded,
  onToggle,
}: PerformanceReviewItemProps) {
  const completedSets = exercise.sets?.filter(s => s.completed && !s.skipped) || []
  const skippedSets = exercise.sets?.filter(s => s.skipped) || []
  const totalSets = exercise.sets?.length || 0

  // Calculate summary stats
  const maxWeight = completedSets.reduce((max, set) =>
    Math.max(max, set.weight || 0), 0)
  const avgRpe = completedSets.length > 0
    ? Math.round(completedSets.reduce((sum, set) => sum + (set.rpe || 0), 0) / completedSets.length)
    : null
  const totalReps = completedSets.reduce((sum, set) => sum + (set.repsCompleted || 0), 0)

  // Determine completion status
  const isFullyCompleted = completedSets.length === exercise.prescribedSets && !exercise.skipped
  const isPartiallyCompleted = completedSets.length > 0 && completedSets.length < exercise.prescribedSets
  const isSkipped = exercise.skipped || completedSets.length === 0

  return (
    <Card
      borderColor="$borderColor"
      borderWidth={1}
      bg="$background"
      mb="$2"
    >
      {/* Collapsed Header - Always Visible */}
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
        <XStack items="center" gap="$3" p="$3">
          {/* Status Icon */}
          <Card
            width={28}
            height={28}
            bg={isSkipped ? "$red4" : isPartiallyCompleted ? "$yellow4" : "$green4"}
            rounded="$10"
            items="center"
            justify="center"
            p={0}
          >
            {isSkipped ? (
              <X size={16} color="$red10" />
            ) : (
              <Check size={16} color={isPartiallyCompleted ? "$yellow10" : "$green10"} />
            )}
          </Card>

          {/* Exercise Name & Summary */}
          <YStack flex={1} gap="$1">
            <Text fontWeight="500" fontSize="$4" numberOfLines={1}>
              {exercise.exerciseName}
            </Text>
            <XStack gap="$2" items="center">
              {isSkipped ? (
                <Text fontSize="$2" color="$red10">Skipped</Text>
              ) : (
                <>
                  <Text fontSize="$2" color="$color10">
                    {completedSets.length}/{exercise.prescribedSets} sets
                  </Text>
                  {maxWeight > 0 && (
                    <Text fontSize="$2" color="$color10">
                      @ {maxWeight} lbs
                    </Text>
                  )}
                  {totalReps > 0 && (
                    <Text fontSize="$2" color="$color9">
                      ({totalReps} reps)
                    </Text>
                  )}
                </>
              )}
            </XStack>
          </YStack>

          {/* RPE Badge (if available) */}
          {avgRpe !== null && avgRpe > 0 && (
            <Card bg="$primary" px="$2" py="$1" rounded="$3">
              <Text fontSize="$2" color="white" fontWeight="600">
                RPE {avgRpe}
              </Text>
            </Card>
          )}

          {/* Expand/Collapse Chevron */}
          {isExpanded ? (
            <ChevronUp size={20} color="$gray8" />
          ) : (
            <ChevronDown size={20} color="$gray8" />
          )}
        </XStack>
      </TouchableOpacity>

      {/* Expanded Content - Set Details */}
      {isExpanded && (
        <YStack gap="$2" px="$4" pb="$4">
          {/* Prescribed info */}
          <XStack items="center" gap="$2" pb="$2" borderBottomWidth={1} borderBottomColor="$borderColor">
            <Text fontSize="$2" color="$color9">
              Prescribed: {exercise.prescribedSets} x {exercise.prescribedReps}
            </Text>
          </XStack>

          {/* Set-by-set breakdown */}
          {exercise.sets && exercise.sets.length > 0 ? (
            exercise.sets.map((set) => (
              <XStack
                key={set.setNumber}
                items="center"
                gap="$3"
                py="$2"
                opacity={set.skipped ? 0.5 : 1}
              >
                {/* Set number */}
                <Card
                  width={24}
                  height={24}
                  bg={set.skipped ? "$gray4" : set.completed ? "$green3" : "$gray4"}
                  rounded="$10"
                  items="center"
                  justify="center"
                  p={0}
                >
                  <Text fontSize="$1" fontWeight="600" color={set.skipped ? "$gray9" : "$color11"}>
                    {set.setNumber}
                  </Text>
                </Card>

                {/* Set details */}
                {set.skipped ? (
                  <Text fontSize="$3" color="$color9" fontStyle="italic">
                    Skipped
                  </Text>
                ) : set.completed ? (
                  <XStack flex={1} gap="$3" items="center">
                    <Text fontSize="$3" color="$color11">
                      {set.repsCompleted ? `${set.repsCompleted} reps` : 'Completed'}
                    </Text>
                    {set.weight !== undefined && set.weight > 0 && (
                      <Text fontSize="$3" color="$color10">
                        @ {set.weight} lbs
                      </Text>
                    )}
                    {set.rpe !== undefined && set.rpe > 0 && (
                      <XStack items="center" gap="$1">
                        <Activity size={12} color="$primary" />
                        <Text fontSize="$2" color="$primary" fontWeight="500">
                          {set.rpe}
                        </Text>
                      </XStack>
                    )}
                  </XStack>
                ) : (
                  <Text fontSize="$3" color="$color9">
                    Not completed
                  </Text>
                )}
              </XStack>
            ))
          ) : (
            <Text fontSize="$3" color="$color9" fontStyle="italic">
              No set data recorded
            </Text>
          )}
        </YStack>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({})
