import { useState } from 'react'
import { 
  YStack, 
  XStack, 
  Text, 
  Card, 
  Button,
  Sheet,
  ScrollView,
} from 'tamagui'
import { 
  Check, 
  ChevronUp,
  ChevronDown,
  ChevronRight,
  List,
  X,
} from '@tamagui/lucide-icons'
import { TouchableOpacity, Platform, Vibration } from 'react-native'

/**
 * ExerciseQueue - Swipe drawer with exercise list
 * 
 * Shows all exercises in the workout with:
 * - Completed exercises (checkmark, grayed out)
 * - Current exercise (highlighted)
 * - Upcoming exercises (draggable to reorder - simplified for MVP)
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
  const [reorderMode, setReorderMode] = useState(false)

  const completedCount = exercises.filter(e => e.completed).length

  // Haptic feedback helper
  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(10)
    }
  }

  // Move exercise up (swap with previous)
  const moveUp = (index: number) => {
    if (index > currentIndex + 1) {
      triggerHaptic()
      onReorder(index, index - 1)
    }
  }

  // Move exercise down (swap with next)
  const moveDown = (index: number) => {
    if (index < exercises.length - 1 && index > currentIndex) {
      triggerHaptic()
      onReorder(index, index + 1)
    }
  }

  return (
    <>
      {/* Edge Indicator / Trigger Button */}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        style={{
          position: 'absolute',
          right: 0,
          top: '40%',
          zIndex: 100,
        }}
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
              <XStack gap="$2">
                <Button
                  size="$3"
                  variant={reorderMode ? 'outlined' : 'outlined'}
                  bg={reorderMode ? '$blue9' : undefined}
                  color={reorderMode ? 'white' : undefined}
                  onPress={() => setReorderMode(!reorderMode)}
                >
                  {reorderMode ? 'Done' : 'Reorder'}
                </Button>
              <Button
                size="$3"
                circular
                variant="outlined"
                icon={X}
                  onPress={() => {
                    setReorderMode(false)
                    setOpen(false)
                  }}
              />
              </XStack>
            </XStack>

            {/* Exercise List */}
            <ScrollView flex={1}>
              <YStack gap="$2">
                {exercises.map((exercise, index) => {
                  const isCompleted = exercise.completed
                  const isCurrent = index === currentIndex
                  const isUpcoming = index > currentIndex && !isCompleted

                  return (
                    <TouchableOpacity
                      key={`${exercise.exerciseId}-${index}`}
                      onPress={() => {
                        if (!reorderMode) {
                          triggerHaptic()
                        onExerciseSelect(index)
                        setOpen(false)
                        }
                      }}
                      activeOpacity={reorderMode ? 1 : 0.7}
                    >
                      <Card
                        p="$3"
                        bg={isCurrent ? '$green2' : isCompleted ? '$gray2' : '$background'}
                        borderColor={isCurrent ? '$green8' : '$gray6'}
                        borderWidth={isCurrent ? 2 : 1}
                        borderRadius="$3"
                        opacity={isCompleted && !isCurrent ? 0.7 : 1}
                      >
                        <XStack items="center" gap="$3">
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
                              {exercise.name}
                            </Text>
                            <Text fontSize="$2" color="$color10">
                              {exercise.sets} sets × {exercise.reps}
                            </Text>
                          </YStack>

                          {/* Action Area */}
                          {isCurrent && (
                            <Card bg="$green9" px="$2" py="$1" borderRadius="$2">
                              <Text fontSize="$1" color="white" fontWeight="600">
                                CURRENT
                              </Text>
                            </Card>
                          )}

                          {/* Reorder buttons for upcoming exercises */}
                          {reorderMode && isUpcoming && (
                            <XStack gap="$1">
                              <TouchableOpacity
                                onPress={() => moveUp(index)}
                                disabled={index <= currentIndex + 1}
                              >
                                <Card
                                  p="$2"
                                  bg={index <= currentIndex + 1 ? '$gray3' : '$blue9'}
                                  borderRadius="$2"
                                >
                                  <ChevronUp 
                                    size={18} 
                                    color={index <= currentIndex + 1 ? '$gray8' : 'white'} 
                                  />
                                </Card>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => moveDown(index)}
                                disabled={index >= exercises.length - 1}
                              >
                                <Card
                                  p="$2"
                                  bg={index >= exercises.length - 1 ? '$gray3' : '$blue9'}
                                  borderRadius="$2"
                                >
                                  <ChevronDown 
                                    size={18} 
                                    color={index >= exercises.length - 1 ? '$gray8' : 'white'} 
                                  />
                                </Card>
                              </TouchableOpacity>
                            </XStack>
                          )}

                          {/* Normal navigation arrow */}
                          {!reorderMode && !isCurrent && !isCompleted && (
                            <ChevronRight size={18} color="$color10" />
                          )}
                        </XStack>
                      </Card>
                    </TouchableOpacity>
                  )
                })}
              </YStack>
            </ScrollView>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </>
  )
}

export default ExerciseQueue
