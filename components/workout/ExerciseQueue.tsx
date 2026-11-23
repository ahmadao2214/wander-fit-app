import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { YStack, XStack, Text, Card, Button } from 'tamagui'
import { Check, ChevronRight, ChevronLeft, GripVertical } from '@tamagui/lucide-icons'
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
import { phaseTokens } from '../../lib/phase'
import { SectionTitle, Body, Supporting, Caption } from '../Typography'
import type { Phase } from '../../types'

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
  /** Training phase: colors the current exercise and the edge tab */
  trainingPhase?: Phase
  /** Open state, when a control outside the queue (the header) opens it */
  open?: boolean
  onOpenChange?: (open: boolean) => void
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
  trainingPhase,
  open: openProp,
  onOpenChange,
}: ExerciseQueueProps) {
  const phase = useMemo(() => phaseTokens(trainingPhase), [trainingPhase])
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState
  const onOpenChangeRef = useRef(onOpenChange)
  onOpenChangeRef.current = onOpenChange
  const setOpen = useCallback((next: boolean) => {
    if (onOpenChangeRef.current) onOpenChangeRef.current(next)
    else setOpenState(next)
  }, [])
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current
  const insets = useSafeAreaInsets()

  const completedCount = exercises.filter((e) => e.completed).length

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
        if (
          gestureState.dx < -30 ||
          (Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10)
        ) {
          triggerHaptic()
          setOpen(true)
        }
      },
    })
  ).current

  // Handle drag end - update the order
  const handleDragEnd = useCallback(
    ({ data, from, to }: { data: Exercise[]; from: number; to: number }) => {
      if (from !== to) {
        // Only allow reordering of upcoming exercises (after current)
        if (from > currentIndex && to > currentIndex) {
          triggerHaptic()
          onReorder(from, to)
        }
      }
    },
    [currentIndex, onReorder, triggerHaptic]
  )

  // Render individual exercise item
  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<Exercise>) => {
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
              bg={
                isActive ? '$color2' : isCurrent ? '$color2' : isCompleted ? '$color3' : '$surface'
              }
              borderColor={isActive || isCurrent ? phase.fill : '$borderColor'}
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
                  rounded="$10"
                  bg={isCompleted ? '$green10' : isCurrent ? phase.fill : '$color4'}
                  items="center"
                  justify="center"
                >
                  {isCompleted ? (
                    <Check size={16} color="white" strokeWidth={3} />
                  ) : (
                    <Caption fontWeight="700" color={isCurrent ? phase.onFill : '$color11'}>
                      {index + 1}
                    </Caption>
                  )}
                </Card>

                {/* Exercise Info */}
                <YStack flex={1} gap="$0.5">
                  <Body
                    fontWeight={isCurrent ? '700' : '500'}
                    color={isCompleted ? '$color10' : '$color12'}
                    textDecorationLine={isCompleted ? 'line-through' : 'none'}
                  >
                    {item.name}
                  </Body>
                  <Caption color="$color10">
                    {item.scaledSets ?? item.sets} × {item.scaledReps ?? item.reps}
                  </Caption>
                </YStack>

                {/* Current Badge or Navigation Arrow */}
                {isCurrent ? (
                  <Card bg={phase.fill} px="$2" py="$1" rounded="$2">
                    <Caption color={phase.onFill} fontWeight="700">
                      Now
                    </Caption>
                  </Card>
                ) : !isCompleted && !canDrag ? (
                  <ChevronRight size={18} color="$color9" />
                ) : null}
              </XStack>
            </Card>
          </TouchableOpacity>
        </ScaleDecorator>
      )
    },
    [currentIndex, onExerciseSelect, triggerHaptic, phase]
  )

  const keyExtractor = useCallback(
    (item: Exercise, index: number) => `${item.exerciseId}-${index}`,
    []
  )

  return (
    <>
      {/* Edge Tab - Samsung Edge style */}
      <View
        style={styles.edgeTab}
        {...edgePanResponder.panHandlers}
        // VoiceOver/TalkBack can't drive the pan responder; give it a button
        accessible
        accessibilityRole="button"
        accessibilityLabel="Exercise list"
        accessibilityHint="Shows every exercise in this workout"
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'activate') setOpen(true)
        }}
        testID="exercise-queue-tab"
      >
        <YStack
          bg={phase.fill}
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
          <ChevronLeft size={16} color={phase.onFill} style={{ marginLeft: -2 }} />
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
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
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
                      <SectionTitle fontWeight="700">Exercises</SectionTitle>
                      <Supporting color="$color10">
                        {completedCount}/{exercises.length} done
                      </Supporting>
                    </YStack>
                    <Pressable
                      onPress={() => setOpen(false)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Close exercise list"
                      testID="exercise-queue-close"
                    >
                      <ChevronRight size={28} color="$color" />
                    </Pressable>
                  </XStack>

                  {/* Drag hint */}
                  <XStack items="center" gap="$2">
                    <GripVertical size={14} color="$color9" />
                    <Caption color="$color9">Hold to reorder upcoming</Caption>
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
    ...StyleSheet.absoluteFill,
  },
  backdropInner: {
    ...StyleSheet.absoluteFill,
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
