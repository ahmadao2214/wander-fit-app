import { useState, useCallback, useRef, useEffect } from 'react'
import {
  YStack,
  XStack,
  Text,
  Card,
  Button,
  styled,
} from 'tamagui'
import {
  Check,
  ChevronRight,
  ChevronLeft,
  GripVertical,
} from '@tamagui/lucide-icons'
import {
  TouchableOpacity,
  Platform,
  Vibration,
  StyleSheet,
  View,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  PanResponder,
} from 'react-native'
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

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
  /** Primary intensity color token (e.g., "$intensityLow6") */
  intensityColor?: string
}

const DRAWER_WIDTH = Dimensions.get('window').width * 0.85
const EDGE_TAB_WIDTH = 14

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ExerciseQueue - Right-side sliding drawer with exercise list
 *
 * - Tap edge tab or swipe left to open
 * - Swipe right to close
 * - Completed exercises (checkmark, grayed out)
 * - Current exercise (highlighted)
 * - Upcoming exercises (draggable to reorder via grip handle)
 */
export function ExerciseQueue({
  exercises,
  currentIndex,
  onExerciseSelect,
  onReorder,
  intensityColor = '$primary',
}: ExerciseQueueProps) {
  const [open, setOpen] = useState(false)
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current
  const insets = useSafeAreaInsets()

  const completedCount = exercises.filter(e => e.completed).length

  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(10)
    }
  }, [])

  // Animate drawer open/close
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: open ? 0 : DRAWER_WIDTH,
      useNativeDriver: true,
      friction: 20,
      tension: 70,
    }).start()
  }, [open, slideAnim])

  // Pan responder for swipe gestures on the drawer header only
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to rightward horizontal swipes (to close)
        return gestureState.dx > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow swiping right (to close)
        if (gestureState.dx > 0) {
          slideAnim.setValue(gestureState.dx)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Close if swiped more than 1/3 of drawer width
        if (gestureState.dx > DRAWER_WIDTH / 3 || gestureState.vx > 0.5) {
          triggerHaptic()
          setOpen(false)
        } else {
          // Snap back open
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 20,
            tension: 70,
          }).start()
        }
      },
    })
  ).current

  // Pan responder for edge tab swipe-to-open
  const edgePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gestureState) => {
        // Open if swiped left or tapped
        if (gestureState.dx < -30 || (Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10)) {
          triggerHaptic()
          setOpen(true)
        }
      },
    })
  ).current

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
    const canDrag = isUpcoming

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
            bg={isActive ? '$color2' : isCurrent ? '$color2' : isCompleted ? '$color3' : '$surface'}
            borderColor={isActive ? intensityColor : isCurrent ? intensityColor : '$borderColor'}
            borderWidth={isCurrent || isActive ? 2 : 1}
            rounded="$4"
            opacity={isCompleted && !isCurrent ? 0.7 : 1}
            elevate={isActive}
          >
            <XStack items="center" gap="$3">
              {/* Drag Handle - only for upcoming exercises */}
              {canDrag ? (
                <Pressable
                  onLongPress={drag}
                  delayLongPress={100}
                  disabled={isActive}
                  style={styles.dragHandle}
                >
                  <GripVertical size={20} color="$color9" />
                </Pressable>
              ) : (
                <YStack width={28} />
              )}

              {/* Status Indicator */}
              <Card
                width={28}
                height={28}
                rounded="$3"
                bg={isCompleted ? '$success' : isCurrent ? intensityColor : '$color5'}
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
                  {item.scaledSets ?? item.sets} × {item.scaledReps ?? item.reps}
                </Text>
              </YStack>

              {/* Current Badge or Navigation Arrow */}
              {isCurrent ? (
                <Card bg={intensityColor} px="$2" py="$1" rounded="$2">
                  <Text
                    fontSize={10}
                    color="white"
                    fontFamily="$body" fontWeight="700"
                    letterSpacing={0.5}
                  >
                    NOW
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
  }, [currentIndex, onExerciseSelect, triggerHaptic, intensityColor])

  const keyExtractor = useCallback((item: Exercise, index: number) =>
    `${item.exerciseId}-${index}`, [])

  return (
    <>
      {/* Edge Tab - Samsung Edge style */}
      <View
        style={styles.edgeTab}
        {...edgePanResponder.panHandlers}
      >
        <YStack
          bg={intensityColor}
          width={EDGE_TAB_WIDTH}
          height={80}
          borderTopLeftRadius={12}
          borderBottomLeftRadius={12}
          shadowColor="black"
          shadowOffset={{ width: -3, height: 0 }}
          shadowOpacity={0.25}
          shadowRadius={8}
          items="center"
          justify="center"
        >
          <ChevronLeft size={16} color="white" style={{ marginLeft: -2 }} />
        </YStack>
      </View>

      {/* Drawer Modal */}
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        {/* Backdrop */}
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
        >
          <Animated.View
            style={[
              styles.backdropInner,
              {
                opacity: slideAnim.interpolate({
                  inputRange: [0, DRAWER_WIDTH],
                  outputRange: [0.5, 0],
                }),
              },
            ]}
          />
        </Pressable>

        {/* Drawer */}
        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              transform: [{ translateX: slideAnim }],
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          {/* GestureHandlerRootView is required inside Modal for DraggableFlatList to work */}
          <GestureHandlerRootView style={{ flex: 1 }}>
            <YStack flex={1} bg="$background">
              {/* Header - swipe here to close */}
              <View {...panResponder.panHandlers}>
                <YStack px="$4" pt="$4" pb="$2">
                  <XStack items="center" justify="space-between" pb="$3">
                    <YStack gap="$0.5">
                      <Text
                        fontSize={18}
                        fontFamily="$body" fontWeight="700"
                        color="$color12"
                      >
                        Exercises
                      </Text>
                      <Text
                        fontSize={13}
                        color="$color10"
                        fontFamily="$body"
                      >
                        {completedCount}/{exercises.length} done
                      </Text>
                    </YStack>
                    <Button
                      size="$3"
                      circular
                      bg="$color3"
                      icon={ChevronRight}
                      onPress={() => setOpen(false)}
                    />
                  </XStack>

                  {/* Drag hint */}
                  <XStack items="center" gap="$2">
                    <GripVertical size={14} color="$color9" />
                    <Text
                      fontSize={12}
                      color="$color9"
                      fontFamily="$body"
                    >
                      Hold to reorder upcoming
                    </Text>
                  </XStack>
                </YStack>
              </View>

              {/* Draggable Exercise List - no pan responder here */}
              <View style={styles.listContainer}>
                <DraggableFlatList
                  data={exercises}
                  onDragEnd={handleDragEnd}
                  keyExtractor={keyExtractor}
                  renderItem={renderItem}
                  containerStyle={styles.flatList}
                  contentContainerStyle={styles.listContent}
                  activationDistance={10}
                  onDragBegin={() => triggerHaptic()}
                />
              </View>
            </YStack>
          </GestureHandlerRootView>
        </Animated.View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  edgeTab: {
    position: 'absolute',
    right: 0,
    top: '40%',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#0F172A', // Dark background fallback
    shadowColor: 'black',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
})

export default ExerciseQueue
