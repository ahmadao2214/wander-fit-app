import { useRef, useCallback } from 'react'
import { ViewStyle, StyleSheet, Platform } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated'
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler'
import { CalendarWorkoutCard, CalendarWorkoutCardProps } from './CalendarWorkoutCard'

export interface DraggableWorkoutCardProps extends CalendarWorkoutCardProps {
  /** Unique identifier for this workout slot */
  slotKey: string
  /** Called when drag starts */
  onDragStart?: (slotKey: string) => void
  /** Called during drag with current position */
  onDragMove?: (slotKey: string, x: number, y: number) => void
  /** Called when drag ends */
  onDragEnd?: (slotKey: string) => void
  /** Called when dropped on a valid target */
  onDrop?: (sourceSlotKey: string, targetSlotKey: string) => void
  /** Whether this card is currently being dragged */
  isDragging?: boolean
  /** Whether this card is a valid drop target */
  isDropTarget?: boolean
  /** Whether drag is disabled (e.g., for completed or locked workouts) */
  dragDisabled?: boolean
}

/**
 * DraggableWorkoutCard - Workout card with drag-drop support
 *
 * Wraps CalendarWorkoutCard with gesture handlers for drag-drop.
 * Uses react-native-reanimated for smooth animations.
 */
export function DraggableWorkoutCard({
  slotKey,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDrop,
  isDragging = false,
  isDropTarget = false,
  dragDisabled = false,
  isLocked = false,
  isCompleted = false,
  ...cardProps
}: DraggableWorkoutCardProps) {
  // Disable drag for completed or locked workouts
  const canDrag = !dragDisabled && !isLocked && !isCompleted

  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const scale = useSharedValue(1)
  const zIndex = useSharedValue(1)
  const opacity = useSharedValue(1)

  const onDragStartJS = useCallback(() => {
    onDragStart?.(slotKey)
  }, [onDragStart, slotKey])

  const onDragMoveJS = useCallback((x: number, y: number) => {
    onDragMove?.(slotKey, x, y)
  }, [onDragMove, slotKey])

  const onDragEndJS = useCallback(() => {
    onDragEnd?.(slotKey)
  }, [onDragEnd, slotKey])

  const panGesture = Gesture.Pan()
    .enabled(canDrag)
    .onStart(() => {
      'worklet'
      scale.value = withSpring(1.05, { damping: 15 })
      zIndex.value = 100
      opacity.value = 0.9
      runOnJS(onDragStartJS)()
    })
    .onUpdate((event) => {
      'worklet'
      translateX.value = event.translationX
      translateY.value = event.translationY
      runOnJS(onDragMoveJS)(event.absoluteX, event.absoluteY)
    })
    .onEnd(() => {
      'worklet'
      translateX.value = withSpring(0, { damping: 15 })
      translateY.value = withSpring(0, { damping: 15 })
      scale.value = withSpring(1, { damping: 15 })
      zIndex.value = 1
      opacity.value = 1
      runOnJS(onDragEndJS)()
    })

  const longPressGesture = Gesture.LongPress()
    .enabled(canDrag)
    .minDuration(250)
    .onStart(() => {
      'worklet'
      // Visual feedback for long press
      scale.value = withSpring(1.02, { damping: 15 })
    })
    .onEnd((_, success) => {
      'worklet'
      if (!success) {
        scale.value = withSpring(1, { damping: 15 })
      }
    })

  // Combine gestures: long press to activate, then pan to drag
  const composedGesture = Gesture.Simultaneous(longPressGesture, panGesture)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: zIndex.value,
    opacity: opacity.value,
  }))

  // Drop target highlight style
  const dropTargetStyle: ViewStyle = isDropTarget ? styles.dropTarget : {}

  // Web doesn't support gesture handler the same way
  if (Platform.OS === 'web') {
    return (
      <CalendarWorkoutCard
        {...cardProps}
        isLocked={isLocked}
        isCompleted={isCompleted}
      />
    )
  }

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, animatedStyle, dropTargetStyle]}>
        <CalendarWorkoutCard
          {...cardProps}
          isLocked={isLocked}
          isCompleted={isCompleted}
        />
      </Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  container: {
    // Allow the card to move above other elements when dragging
  },
  dropTarget: {
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
})
