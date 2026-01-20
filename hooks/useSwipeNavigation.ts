import { useRef, useEffect } from 'react'
import { Animated, PanResponder, Dimensions } from 'react-native'
import { Vibration } from 'react-native'
import { useIsFocused } from '@react-navigation/native'

const SCREEN_WIDTH = Dimensions.get('window').width
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2 // 20% of screen width
const SWIPE_VELOCITY_THRESHOLD = 0.5

interface UseSwipeNavigationOptions {
  /** Called when user swipes right (to go back) */
  onSwipeRight?: () => void
  /** Called when user swipes left (to go forward) */
  onSwipeLeft?: () => void
  /** Whether swiping right (back) is enabled */
  canSwipeRight?: boolean
  /** Whether swiping left (forward) is enabled */
  canSwipeLeft?: boolean
}

/**
 * Hook for adding swipe navigation to intake screens
 *
 * @example
 * const { panHandlers, translateX } = useSwipeNavigation({
 *   onSwipeRight: handleBack,
 *   onSwipeLeft: handleContinue,
 *   canSwipeRight: true,
 *   canSwipeLeft: isValid,
 * })
 *
 * <Animated.View
 *   {...panHandlers}
 *   style={{ transform: [{ translateX }] }}
 * >
 *   {content}
 * </Animated.View>
 */
export function useSwipeNavigation({
  onSwipeRight,
  onSwipeLeft,
  canSwipeRight = true,
  canSwipeLeft = true,
}: UseSwipeNavigationOptions) {
  const translateX = useRef(new Animated.Value(0)).current
  const isFocused = useIsFocused()

  // Use refs to always have access to the latest values
  const canSwipeRightRef = useRef(canSwipeRight)
  const canSwipeLeftRef = useRef(canSwipeLeft)
  const onSwipeRightRef = useRef(onSwipeRight)
  const onSwipeLeftRef = useRef(onSwipeLeft)

  // Update refs when props change
  canSwipeRightRef.current = canSwipeRight
  canSwipeLeftRef.current = canSwipeLeft
  onSwipeRightRef.current = onSwipeRight
  onSwipeLeftRef.current = onSwipeLeft

  // Reset translateX when screen comes into focus
  useEffect(() => {
    if (isFocused) {
      translateX.setValue(0)
    }
  }, [isFocused, translateX])

  const panResponder = useRef(
    PanResponder.create({
      // Only capture horizontal swipes
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState
        // Only respond to horizontal swipes that are more horizontal than vertical
        // and have moved at least 10px
        return Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 10
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        const { dx, dy } = gestureState
        // Capture when it's clearly a horizontal swipe
        return Math.abs(dx) > Math.abs(dy) * 2 && Math.abs(dx) > 20
      },
      onPanResponderGrant: () => {
        // Stop any current animation and reset
        translateX.stopAnimation()
        translateX.setValue(0)
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx } = gestureState

        // Limit the swipe based on whether navigation is allowed
        let limitedDx = dx

        // Swiping right (positive dx) = going back
        if (dx > 0 && !canSwipeRightRef.current) {
          limitedDx = dx * 0.15 // Resistance effect
        }
        // Swiping left (negative dx) = going forward
        if (dx < 0 && !canSwipeLeftRef.current) {
          limitedDx = dx * 0.15 // Resistance effect
        }

        translateX.setValue(limitedDx)
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState

        const shouldSwipeRight =
          canSwipeRightRef.current &&
          onSwipeRightRef.current &&
          (dx > SWIPE_THRESHOLD || (dx > 30 && vx > SWIPE_VELOCITY_THRESHOLD))

        const shouldSwipeLeft =
          canSwipeLeftRef.current &&
          onSwipeLeftRef.current &&
          (dx < -SWIPE_THRESHOLD || (dx < -30 && vx < -SWIPE_VELOCITY_THRESHOLD))

        if (shouldSwipeRight || shouldSwipeLeft) {
          // Trigger navigation immediately and spring back
          // This avoids the "black screen" gap by not sliding off-screen
          Vibration.vibrate(10)

          // Spring back to center quickly while navigation happens
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 300,
            friction: 20,
          }).start()

          // Trigger navigation
          if (shouldSwipeRight) {
            onSwipeRightRef.current?.()
          } else {
            onSwipeLeftRef.current?.()
          }
        } else {
          // Spring back to center
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 150,
            friction: 12,
          }).start()
        }
      },
      onPanResponderTerminate: () => {
        // Spring back if gesture is interrupted
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 150,
          friction: 12,
        }).start()
      },
    })
  ).current

  return {
    panHandlers: panResponder.panHandlers,
    translateX,
  }
}
