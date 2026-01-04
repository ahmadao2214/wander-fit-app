import { useState, useCallback } from 'react'
import { 
  YStack, 
  XStack, 
  Text, 
  Card, 
  Button,
  Sheet,
  styled,
} from 'tamagui'
import { 
  Check, 
  ChevronRight,
  List,
  X,
  GripVertical,
} from '@tamagui/lucide-icons'
import { TouchableOpacity, Platform, Vibration, StyleSheet, View } from 'react-native'
import DraggableFlatList, { 
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const SectionLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: '$color10',
})

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Exercise {
  exerciseId: string
  name: string
  sets: number
  reps: string
  scaledSets?: number
  scaledReps?: string
  completed: boolean
}

interface ExerciseQueueProps {
  exercises: Exercise[]
  currentIndex: number
  onExerciseSelect: (index: number) => void
  onReorder: (fromIndex: number, toIndex: number) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ExerciseQueue - Swipe drawer with exercise list
 * 
 * Shows all exercises in the workout with:
 * - Completed exercises (checkmark, grayed out)
 * - Current exercise (highlighted)
 * - Upcoming exercises (draggable to reorder via grip handle)
 */
export function ExerciseQueue({
  exercises,
  currentIndex,
  onExerciseSelect,
  onReorder,
}: ExerciseQueueProps) {
  const [open, setOpen] = useState(false)

  const completedCount = exercises.filter(e => e.completed).length

  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(10)
    }
  }, [])

  // Handle drag end - update the order
  const handleDragEnd = useCallback(({ data, from, to }: { data: Exercise[], from: number, to: number }) => {
    if (from !== to) {
      // Only allow reordering of upcoming exercises (after current)
      if (from > currentIndex && to > currentIndex) {
        triggerHaptic()
        onReorder(from, to)
      }
    }
  }, [currentIndex, onReorder, triggerHaptic])

  // Render individual exercise item
  const renderItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<Exercise>) => {
    const index = getIndex() ?? 0
    const isCompleted = item.completed
    const isCurrent = index === currentIndex
    const isUpcoming = index > currentIndex && !isCompleted
    const canDrag = isUpcoming // Only upcoming exercises can be dragged

    return (
      <ScaleDecorator activeScale={1.03}>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic()
            onExerciseSelect(index)
            setOpen(false)
          }}
          activeOpacity={0.7}
          disabled={isActive}
        >
          <Card
            p="$3"
            mb="$2"
            bg={isActive ? '$brand2' : isCurrent ? '$brand1' : isCompleted ? '$color3' : '$surface'}
            borderColor={isActive ? '$primary' : isCurrent ? '$primary' : '$borderColor'}
            borderWidth={isCurrent || isActive ? 2 : 1}
            rounded="$4"
            opacity={isCompleted && !isCurrent ? 0.7 : 1}
            elevate={isActive}
          >
            <XStack items="center" gap="$3">
              {/* Drag Handle - only for upcoming exercises */}
              {canDrag ? (
                <TouchableOpacity
                  onLongPress={drag}
                  delayLongPress={100}
                  disabled={isActive}
                  style={styles.dragHandle}
                >
                  <GripVertical size={20} color="$color9" />
                </TouchableOpacity>
              ) : (
                <YStack width={28} />
              )}

              {/* Status Indicator */}
              <Card
                width={28}
                height={28}
                rounded="$3"
                bg={isCompleted ? '$success' : isCurrent ? '$primary' : '$color5'}
                items="center"
                justify="center"
              >
                {isCompleted ? (
                  <Check size={16} color="white" strokeWidth={3} />
                ) : (
                  <Text 
                    fontSize={12} 
                    fontFamily="$body" fontWeight="700"
                    color={isCurrent ? 'white' : '$color11'}
                  >
                    {index + 1}
                  </Text>
                )}
              </Card>

              {/* Exercise Info */}
              <YStack flex={1} gap="$0.5">
                <Text 
                  fontSize={14} 
                  fontFamily="$body"
                  fontWeight={isCurrent ? '700' : '500'}
                  color={isCompleted ? '$color10' : '$color12'}
                  textDecorationLine={isCompleted ? 'line-through' : 'none'}
                >
                  {item.name}
                </Text>
                <Text 
                  fontSize={12} 
                  color="$color10"
                  fontFamily="$body"
                >
                  {item.scaledSets ?? item.sets} sets × {item.scaledReps ?? item.reps}
                </Text>
              </YStack>

              {/* Current Badge or Navigation Arrow */}
              {isCurrent ? (
                <Card bg="$primary" px="$2" py="$1" rounded="$2">
                  <Text 
                    fontSize={10} 
                    color="white" 
                    fontFamily="$body" fontWeight="700"
                    letterSpacing={0.5}
                  >
                    CURRENT
                  </Text>
                </Card>
              ) : !isCompleted && !canDrag ? (
                <ChevronRight size={18} color="$color9" />
              ) : null}
            </XStack>
          </Card>
        </TouchableOpacity>
      </ScaleDecorator>
    )
  }, [currentIndex, onExerciseSelect, triggerHaptic])

  const keyExtractor = useCallback((item: Exercise, index: number) => 
    `${item.exerciseId}-${index}`, [])

  return (
    <>
      {/* Edge Indicator / Trigger Button */}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        style={styles.triggerButton}
      >
        <YStack
          bg="$primary"
          px="$2"
          py="$4"
          borderTopLeftRadius="$4"
          borderBottomLeftRadius="$4"
          opacity={0.95}
        >
          <List size={20} color="white" />
        </YStack>
      </TouchableOpacity>

      {/* Drawer Sheet */}
      <Sheet
        modal
        open={open}
        onOpenChange={setOpen}
        snapPoints={[80]}
        dismissOnSnapToBottom
        animation="medium"
      >
        <Sheet.Overlay 
          animation="lazy"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <Sheet.Frame bg="$background">
          <Sheet.Handle />
          
          <YStack flex={1} p="$4">
            {/* Header */}
            <XStack items="center" justify="space-between" pb="$4">
              <YStack gap="$0.5">
                <Text 
                  fontSize={20} 
                  fontFamily="$body" fontWeight="700"
                  color="$color12"
                >
                  Exercise Queue
                </Text>
                <Text 
                  fontSize={13} 
                  color="$color10"
                  fontFamily="$body"
                >
                  {completedCount} of {exercises.length} completed
                </Text>
              </YStack>
              <Button
                size="$3"
                circular
                bg="$surface"
                borderWidth={1}
                borderColor="$borderColor"
                icon={X}
                onPress={() => setOpen(false)}
              />
            </XStack>

            {/* Drag hint */}
            <XStack items="center" gap="$2" pb="$3">
              <GripVertical size={14} color="$color9" />
              <Text 
                fontSize={12} 
                color="$color9"
                fontFamily="$body"
              >
                Hold and drag upcoming exercises to reorder
              </Text>
            </XStack>

            {/* Draggable Exercise List */}
            <View style={styles.listContainer}>
              <DraggableFlatList
                data={exercises}
                onDragEnd={handleDragEnd}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                containerStyle={styles.flatList}
                activationDistance={10}
                onDragBegin={() => triggerHaptic()}
              />
            </View>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </>
  )
}

const styles = StyleSheet.create({
  triggerButton: {
    position: 'absolute',
    right: 0,
    top: '40%',
    zIndex: 100,
  },
  dragHandle: {
    padding: 4,
    marginLeft: -4,
  },
  listContainer: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
})

export default ExerciseQueue
