import { TouchableOpacity, Pressable, StyleSheet, View, Platform } from 'react-native'
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
  /** Intensity color token (e.g., "$intensityLow6", "$intensityMed6", "$intensityHigh6") */
  intensityColor?: string
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
  intensityColor = "$primary",
}: ExerciseAccordionItemProps) {
  const exerciseDetails = exercise.exercise

  // Use scaled values if available, otherwise fall back to base values
  const displaySets = exercise.scaledSets ?? exercise.sets
  const displayReps = exercise.scaledReps ?? exercise.reps
  const displayRest = exercise.scaledRestSeconds ?? exercise.restSeconds

  return (
    <Card
      borderColor={isActive ? intensityColor : "$borderColor"}
      borderWidth={isActive ? 2 : 1}
      bg={isActive ? "$color2" : "$background"}
      elevation={isActive ? 4 : 0}
      mb="$2"
    >
      {/* Collapsed Header - Always Visible */}
      <XStack items="center" gap="$2" p="$3">
        {/* Drag Handle - works on both mobile (long-press) and web (click-hold) */}
        {drag ? (
          <Pressable
            onLongPress={drag}
            delayLongPress={Platform.OS === 'web' ? 100 : 150}
            disabled={isActive}
            style={[
              styles.dragHandle,
              Platform.OS === 'web' && styles.dragHandleWeb,
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <View style={[
              styles.dragHandleInner,
              isActive && styles.dragHandleActive
            ]}>
              <GripVertical size={20} color={isActive ? intensityColor : "$color9"} />
            </View>
          </Pressable>
        ) : (
          <View style={styles.dragHandlePlaceholder} />
        )}

        {/* Order Number */}
        <Card
          width={28}
          height={28}
          bg={intensityColor}
          rounded="$10"
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

            {/* Sets x Reps */}
            <Text color="$color10" fontSize="$3">
              {displaySets} × {displayReps}
            </Text>

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
          {/* Tags - filter out warm_up and cool_down */}
          {exerciseDetails?.tags && exerciseDetails.tags.filter(t => t !== 'warm_up' && t !== 'cool_down').length > 0 && (
            <XStack gap="$1" flexWrap="wrap">
              {exerciseDetails.tags
                .filter(tag => tag !== 'warm_up' && tag !== 'cool_down')
                .slice(0, 3)
                .map((tag) => (
                  <Card key={tag} bg="$gray3" px="$2" py="$0.5" rounded="$2">
                    <Text fontSize="$1" color="$color10">
                      {tag.replace(/_/g, ' ')}
                    </Text>
                  </Card>
                ))}
            </XStack>
          )}

          {/* Exercise Details Row */}
          <XStack gap="$4" flexWrap="wrap">
            <XStack items="center" gap="$2">
              <Dumbbell size={16} color="$color10" />
              <Text fontSize="$3" color="$color11">
                {displaySets} sets × {displayReps}
              </Text>
            </XStack>

            {exercise.targetWeight && (
              <XStack items="center" gap="$2">
                <Text fontSize="$3" color="$color11">
                  @ {exercise.targetWeight} lbs
                </Text>
              </XStack>
            )}

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
            <Card bg={"$purple2" as any} p="$2" rounded="$2">
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
            <Card bg="$gray2" p="$3" rounded="$3">
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
    // Ensure drag handle is always on top and receives events
    zIndex: 10,
  },
  dragHandleWeb: {
    // Web-specific: show grab cursor to indicate draggable
    cursor: 'grab' as any,
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
    cursor: 'grabbing' as any,
  },
  dragHandlePlaceholder: {
    width: 32,
  },
  exerciseInfo: {
    flex: 1,
  },
})
