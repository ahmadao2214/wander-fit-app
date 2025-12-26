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
 * Exercise type from the template
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

  return (
    <Card 
      borderColor={isActive ? "$green8" : "$gray6"} 
      borderWidth={1}
      bg={isActive ? "$green2" : "$background"}
      elevation={isActive ? 4 : 0}
      scale={isActive ? 1.02 : 1}
      opacity={isActive ? 0.95 : 1}
    >
      {/* Collapsed Header - Always Visible */}
      <XStack 
        items="center" 
        gap="$3" 
        p="$3"
        pressStyle={{ opacity: 0.7 }}
        onPress={onToggle}
      >
        {/* Drag Handle */}
        <XStack
          p="$2"
          onLongPress={drag}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <GripVertical size={20} color="$gray8" />
        </XStack>

        {/* Order Number */}
        <YStack
          width={28}
          height={28}
          bg="$green9"
          borderRadius={14}
          items="center"
          justify="center"
        >
          <Text color="white" fontWeight="600" fontSize="$2">
            {index + 1}
          </Text>
        </YStack>

        {/* Exercise Name */}
        <Text flex={1} fontWeight="500" fontSize="$4" numberOfLines={1}>
          {exerciseDetails?.name || 'Exercise'}
        </Text>

        {/* Sets x Reps */}
        <Text color="$color10" fontSize="$3">
          {exercise.sets} × {exercise.reps}
        </Text>

        {/* Expand/Collapse Chevron */}
        {isExpanded ? (
          <ChevronUp size={20} color="$gray8" />
        ) : (
          <ChevronDown size={20} color="$gray8" />
        )}
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

          {/* Exercise Details Row */}
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
      )}
    </Card>
  )
}


