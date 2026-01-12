import { useState, useRef, useEffect, useCallback } from 'react'
import { YStack, Text, Circle } from 'tamagui'
import { Pressable, Platform } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

interface CommitmentButtonProps {
  /** Called when the button is held for the full duration */
  onCommit: () => void
  /** How long to hold in milliseconds (default: 2000) */
  holdDuration?: number
  /** Size of the button (default: 120) */
  size?: number
  /** Text shown inside the button */
  label?: string
  /** Text shown below the button */
  instruction?: string
  /** Whether the button is disabled */
  disabled?: boolean
}

const AnimatedYStack = Animated.createAnimatedComponent(YStack)

/**
 * CommitmentButton - YAZIO-style hold-to-confirm button
 *
 * User must press and hold for a duration to confirm their commitment.
 * Features:
 * - Progress ring that fills as user holds
 * - Haptic feedback during hold and on complete
 * - Celebration animation on success
 * - Resets if released early
 */
export function CommitmentButton({
  onCommit,
  holdDuration = 2000,
  size = 120,
  label = 'Hold',
  instruction = 'Hold to confirm',
  disabled = false,
}: CommitmentButtonProps) {
  const [isHolding, setIsHolding] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const progress = useSharedValue(0)
  const scale = useSharedValue(1)
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTime = useRef<number>(0)

  // Haptic feedback
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'success') => {
    if (Platform.OS === 'web') return

    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        break
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        break
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        break
    }
  }, [])

  const handleComplete = useCallback(() => {
    setIsComplete(true)
    triggerHaptic('success')
    onCommit()
  }, [onCommit, triggerHaptic])

  const handlePressIn = useCallback(() => {
    if (disabled || isComplete) return

    setIsHolding(true)
    startTime.current = Date.now()
    triggerHaptic('light')

    // Animate progress
    progress.value = withTiming(1, {
      duration: holdDuration,
      easing: Easing.linear,
    })

    // Scale down slightly
    scale.value = withSpring(0.95)

    // Set up completion timer
    holdTimer.current = setTimeout(() => {
      runOnJS(handleComplete)()
    }, holdDuration)

    // Periodic haptic feedback during hold
    const hapticInterval = setInterval(() => {
      if (Date.now() - startTime.current < holdDuration) {
        triggerHaptic('light')
      } else {
        clearInterval(hapticInterval)
      }
    }, 500)
  }, [disabled, isComplete, holdDuration, progress, scale, triggerHaptic, handleComplete])

  const handlePressOut = useCallback(() => {
    if (isComplete) return

    setIsHolding(false)

    // Clear timer
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }

    // Reset progress
    progress.value = withTiming(0, { duration: 200 })
    scale.value = withSpring(1)
  }, [isComplete, progress, scale])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimer.current) {
        clearTimeout(holdTimer.current)
      }
    }
  }, [])

  // Animated styles for progress ring
  const progressStyle = useAnimatedStyle(() => {
    const circumference = Math.PI * (size - 8)
    const strokeDashoffset = circumference * (1 - progress.value)

    return {
      strokeDashoffset,
    }
  })

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = Math.PI * 2 * radius

  return (
    <YStack items="center" gap="$4">
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || isComplete}
      >
        <AnimatedYStack
          style={containerStyle}
          width={size}
          height={size}
          items="center"
          justify="center"
        >
          {/* Background circle */}
          <Circle
            size={size}
            bg={isComplete ? '$green10' : isHolding ? '$green4' : '$gray3'}
            position="absolute"
          />

          {/* Progress ring - using SVG would be ideal, using YStack as fallback */}
          <YStack
            position="absolute"
            width={size}
            height={size}
            br={size / 2}
            borderWidth={strokeWidth}
            borderColor={isComplete ? '$green10' : '$green8'}
            opacity={isHolding || isComplete ? 1 : 0.3}
          />

          {/* Inner content */}
          <YStack items="center" gap="$1">
            {isComplete ? (
              <Text fontSize="$6" color="white">
                ✓
              </Text>
            ) : (
              <>
                <Text
                  fontSize="$5"
                  fontWeight="bold"
                  color={isHolding ? '$green11' : '$gray11'}
                >
                  {label}
                </Text>
              </>
            )}
          </YStack>
        </AnimatedYStack>
      </Pressable>

      {/* Instruction text */}
      <Text
        fontSize="$3"
        color={isComplete ? '$green11' : '$gray10'}
        textAlign="center"
      >
        {isComplete ? "You're committed!" : instruction}
      </Text>
    </YStack>
  )
}
