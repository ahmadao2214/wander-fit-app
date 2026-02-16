import React, { useRef, useEffect } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import ConfettiCannon from 'react-native-confetti-cannon'

interface ConfettiEffectProps {
  trigger: boolean
  onComplete?: () => void
}

// Mix of brand colors and standard confetti colors
const CONFETTI_COLORS = [
  // Brand colors
  '#2563EB', // Electric Blue (primary)
  '#3B82F6', // Blue accent
  '#F97316', // Flame Orange (accent)
  '#10B981', // Success green
  // Standard confetti colors
  '#FFD700', // Gold
  '#FF6B6B', // Coral red
  '#A855F7', // Purple
  '#14B8A6', // Teal
]

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

export function ConfettiEffect({ trigger, onComplete }: ConfettiEffectProps) {
  const leftCannonRef = useRef<ConfettiCannon>(null)
  const rightCannonRef = useRef<ConfettiCannon>(null)
  const hasTriggeredRef = useRef(false)

  useEffect(() => {
    if (trigger && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true
      // Fire both cannons
      leftCannonRef.current?.start()
      rightCannonRef.current?.start()
    }

    // Reset when trigger becomes false
    if (!trigger) {
      hasTriggeredRef.current = false
    }
  }, [trigger])

  if (!trigger) {
    return null
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Left cannon */}
      <ConfettiCannon
        ref={leftCannonRef}
        count={75}
        origin={{ x: 0, y: SCREEN_HEIGHT }}
        autoStart={false}
        fadeOut
        fallSpeed={3000}
        explosionSpeed={350}
        colors={CONFETTI_COLORS}
        onAnimationEnd={onComplete}
      />
      {/* Right cannon */}
      <ConfettiCannon
        ref={rightCannonRef}
        count={75}
        origin={{ x: SCREEN_WIDTH, y: SCREEN_HEIGHT }}
        autoStart={false}
        fadeOut
        fallSpeed={3000}
        explosionSpeed={350}
        colors={CONFETTI_COLORS}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
})
