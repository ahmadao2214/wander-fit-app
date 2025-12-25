import { useState, useCallback } from 'react'
import { 
  YStack, 
  XStack, 
  Text, 
  Card, 
  Button,
  Sheet,
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

/**
 * ExerciseQueue - Swipe drawer with exercise list
 * 
 * Shows all exercises in the workout with:
 * - Completed exercises (checkmark, grayed out)
 * - Current exercise (highlighted)
 * - Upcoming exercises (draggable to reorder via grip handle)
 */

interface Exercise {
  exerciseId: string
  name: string
  sets: number
  reps: string
  completed: boolean
}

interface ExerciseQueueProps {
  exercises: Exercise[]
  currentIndex: number
  onExerciseSelect: (index: number) => void
  onReorder: (fromIndex: number, toIndex: number) => void
}

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
            bg={isActive ? '$green3' : isCurrent ? '$green2' : isCompleted ? '$gray2' : '$background'}
            borderColor={isActive ? '$green9' : isCurrent ? '$green8' : '$gray6'}
            borderWidth={isCurrent || isActive ? 2 : 1}
            borderRadius="$3"
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
                borderRadius="$10"
                bg={isCompleted ? '$green9' : isCurrent ? '$green9' : '$gray5'}
                items="center"
                justify="center"
              >
                {isCompleted ? (
                  <Check size={16} color="white" />
                ) : (
                  <Text 
                    fontSize="$2" 
                    fontWeight="600" 
                    color={isCurrent ? 'white' : '$color11'}
                  >
                    {index + 1}
                  </Text>
                )}
              </Card>

              {/* Exercise Info */}
              <YStack flex={1}>
                <Text 
                  fontSize="$4" 
                  fontWeight={isCurrent ? '700' : '500'}
                  color={isCompleted ? '$color10' : '$color12'}
                  textDecorationLine={isCompleted ? 'line-through' : 'none'}
                >
                  {item.name}
                </Text>
                <Text fontSize="$2" color="$color10">
                  {item.sets} sets × {item.reps}
                </Text>
              </YStack>

              {/* Current Badge or Navigation Arrow */}
              {isCurrent ? (
                <Card bg="$green9" px="$2" py="$1" borderRadius="$2">
                  <Text fontSize="$1" color="white" fontWeight="600">
                    CURRENT
                  </Text>
                </Card>
              ) : !isCompleted && !canDrag ? (
                <ChevronRight size={18} color="$color10" />
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
          bg="$green9"
          px="$2"
          py="$4"
          borderTopLeftRadius="$4"
          borderBottomLeftRadius="$4"
          opacity={0.9}
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
              <YStack>
                <Text fontSize="$6" fontWeight="700">
                  Exercise Queue
                </Text>
                <Text fontSize="$3" color="$color10">
                  {completedCount} of {exercises.length} completed
                </Text>
              </YStack>
              <Button
                size="$3"
                circular
                variant="outlined"
                icon={X}
                onPress={() => setOpen(false)}
              />
            </XStack>

            {/* Drag hint */}
            <XStack items="center" gap="$2" pb="$3">
              <GripVertical size={14} color="$color9" />
              <Text fontSize="$2" color="$color9">
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
