import { TouchableOpacity, Pressable, StyleSheet, View } from 'react-native'
import { 
  YStack, 
  XStack, 
  Text, 
  Card,
} from 'tamagui'
import { 
  GripVertical,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  RotateCcw,
  Info,
  Target,
  Flame,
  ArrowUpDown,
} from '@tamagui/lucide-icons'

/**
 * Exercise type from the template (with optional intensity scaling)
 */
interface ExerciseData {
  exerciseId: string
  sets: number
  reps: string
  tempo?: string
  restSeconds: number
  notes?: string
  orderIndex: number
  superset?: string
  exercise?: {
    name: string
    instructions?: string
    tags?: string[]
  }
  // Intensity scaling fields (from getWorkoutWithIntensity)
  scaledSets?: number
  scaledReps?: string
  scaledRestSeconds?: number
  targetWeight?: number
  percentOf1RM?: number
  rpeTarget?: { min: number; max: number }
  isBodyweight?: boolean
  isSubstituted?: boolean
  substitutedExerciseSlug?: string
  hasOneRepMax?: boolean
}

interface ExerciseAccordionItemProps {
  exercise: ExerciseData
  index: number
  isExpanded: boolean
  onToggle: () => void
  drag?: () => void
  isActive?: boolean
}

/**
 * ExerciseAccordionItem - Collapsible exercise card for workout summary
 * 
 * Collapsed state: Shows exercise number, name, and sets x reps at a glance
 * Expanded state: Shows full exercise details including tempo, rest, notes, instructions
 * 
 * Includes a drag handle for reordering exercises via long-press
 */
export function ExerciseAccordionItem({
  exercise,
  index,
  isExpanded,
  onToggle,
  drag,
  isActive,
}: ExerciseAccordionItemProps) {
  const exerciseDetails = exercise.exercise
  
  // Use scaled values if available, otherwise fall back to base values
  const displaySets = exercise.scaledSets ?? exercise.sets
  const displayReps = exercise.scaledReps ?? exercise.reps
  const displayRest = exercise.scaledRestSeconds ?? exercise.restSeconds
  const hasScaling = exercise.scaledSets !== undefined || exercise.scaledReps !== undefined

  return (
    <Card 
      borderColor={isActive ? "$green8" : "$gray6"} 
      borderWidth={isActive ? 2 : 1}
      bg={isActive ? "$green2" : "$background"}
      elevation={isActive ? 4 : 0}
      mb="$2"
    >
      {/* Collapsed Header - Always Visible */}
      <XStack items="center" gap="$2" p="$3">
        {/* Drag Handle - larger touch area for mobile */}
        {drag ? (
          <Pressable
            onLongPress={drag}
            delayLongPress={150}
            disabled={isActive}
            style={styles.dragHandle}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <View style={[
              styles.dragHandleInner,
              isActive && styles.dragHandleActive
            ]}>
              <GripVertical size={20} color={isActive ? "$green9" : "$color9"} />
            </View>
          </Pressable>
        ) : (
          <View style={styles.dragHandlePlaceholder} />
        )}

        {/* Order Number */}
        <Card
          width={28}
          height={28}
          bg="$green9"
          borderRadius="$10"
          items="center"
          justify="center"
          p={0}
        >
          <Text color="white" fontWeight="600" fontSize="$2">
            {index + 1}
          </Text>
        </Card>

        {/* Tappable area for toggle */}
        <TouchableOpacity 
          style={styles.exerciseInfo}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          <XStack items="center" gap="$2" flex={1}>
            {/* Exercise Name */}
            <Text flex={1} fontWeight="500" fontSize="$4" numberOfLines={1}>
              {exerciseDetails?.name || 'Exercise'}
            </Text>

            {/* Sets x Reps (with scaling indicator) */}
            <XStack items="center" gap="$1">
              {hasScaling && <Flame size={14} color="$orange9" />}
              <Text color={hasScaling ? "$orange11" : "$color10"} fontSize="$3" fontWeight={hasScaling ? "600" : "400"}>
                {displaySets} × {displayReps}
              </Text>
            </XStack>

            {/* Expand/Collapse Chevron */}
            {isExpanded ? (
              <ChevronUp size={20} color="$gray8" />
            ) : (
              <ChevronDown size={20} color="$gray8" />
            )}
          </XStack>
        </TouchableOpacity>
      </XStack>

      {/* Expanded Content */}
      {isExpanded && (
        <YStack gap="$3" px="$4" pb="$4">
          {/* Tags */}
          {exerciseDetails?.tags && exerciseDetails.tags.length > 0 && (
            <XStack gap="$1" flexWrap="wrap">
              {exerciseDetails.tags.slice(0, 3).map((tag) => (
                <Card key={tag} bg="$gray3" px="$2" py="$0.5" borderRadius="$2">
                  <Text fontSize="$1" color="$color10">
                    {tag.replace(/_/g, ' ')}
                  </Text>
                </Card>
              ))}
            </XStack>
          )}

          {/* Intensity Scaling Info */}
          {hasScaling && (
            <Card bg="$orange2" p="$2" borderRadius="$2" borderColor="$orange6">
              <XStack items="center" gap="$2" flexWrap="wrap">
                <Flame size={14} color="$orange9" />
                <Text fontSize="$2" color="$orange11" fontWeight="500">
                  Intensity Adjusted
                </Text>
                {exercise.targetWeight && (
                  <Text fontSize="$2" color="$orange11">
                    • Target: {exercise.targetWeight} lbs ({exercise.percentOf1RM}% 1RM)
                  </Text>
                )}
                {exercise.rpeTarget && (
                  <Text fontSize="$2" color="$orange11">
                    • RPE {exercise.rpeTarget.min}-{exercise.rpeTarget.max}
                  </Text>
                )}
                {!exercise.targetWeight && !exercise.isBodyweight && (
                  <Text fontSize="$2" color="$orange11">
                    • Use RPE {exercise.rpeTarget?.min}-{exercise.rpeTarget?.max} to select weight
                  </Text>
                )}
              </XStack>
            </Card>
          )}

          {/* Substitution Notice */}
          {exercise.isSubstituted && exercise.substitutedExerciseSlug && (
            <Card bg="$blue2" p="$2" borderRadius="$2" borderColor="$blue6">
              <XStack items="center" gap="$2">
                <ArrowUpDown size={14} color="$blue9" />
                <Text fontSize="$2" color="$blue11">
                  Substituted: {exercise.substitutedExerciseSlug.replace(/_/g, ' ')}
                </Text>
              </XStack>
            </Card>
          )}

          {/* Exercise Details Row */}
          <XStack gap="$4" flexWrap="wrap">
            <XStack items="center" gap="$2">
              <Dumbbell size={16} color="$color10" />
              <Text fontSize="$3" color="$color11">
                {displaySets} sets
              </Text>
            </XStack>
            
            <XStack items="center" gap="$2">
              <Text fontSize="$3" color="$color11">
                {displayReps}
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
                {displayRest}s rest
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
            <Card bg="$gray2" p="$3" borderRadius="$3">
              <YStack gap="$1">
                <Text fontSize="$2" color="$color10" fontWeight="600">
                  Instructions:
                </Text>
                <Text fontSize="$2" color="$color11">
                  {exerciseDetails.instructions}
                </Text>
              </YStack>
            </Card>
          )}
        </YStack>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  dragHandle: {
    // Larger touch target for mobile accessibility (44pt minimum)
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  dragHandleInner: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  dragHandleActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)', // green tint when dragging
  },
  dragHandlePlaceholder: {
    width: 32,
  },
  exerciseInfo: {
    flex: 1,
  },
})
