import { useEffect } from 'react'
import { Circle, type ColorTokens } from 'tamagui'
import LottieView from 'lottie-react-native'
import { Trophy } from '@tamagui/lucide-icons'
import { getSportAnimation } from '../../lib/sportAnimations'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * - `still`: the rest pose, no motion. Use this in lists and pickers.
 * - `once`: plays the move one time and stops on the rest pose. Reserve it
 *   for the First Run reveal, which is the flow's one animated moment.
 * - `loop`: plays continuously. Avoid in the intake.
 */
export type SportIconMode = 'still' | 'once' | 'loop'

export interface SportIconProps {
  /** Sport name as stored in Convex, e.g. "Track (Sprints/Jumps)". */
  name: string
  /** Diameter in points. */
  size?: number
  mode?: SportIconMode
  bg?: ColorTokens
  borderColor?: ColorTokens
  /**
   * Called when a `once` play finishes. With Reduce Motion on, or for a sport
   * without an animation, it's called right away, so a flow waiting on it
   * never stalls.
   */
  onFinish?: () => void
  testID?: string
}

export function SportIcon({
  name,
  size = 44,
  mode = 'still',
  bg = '$color4',
  borderColor,
  onFinish,
  testID,
}: SportIconProps) {
  const source = getSportAnimation(name)
  const reduceMotion = useReducedMotion()
  // Unknown (null) counts as reduced, so nothing starts and then stops.
  const moving = mode !== 'still' && source !== undefined && reduceMotion === false
  const skipsMotion = mode === 'once' && (source === undefined || reduceMotion === true)

  useEffect(() => {
    if (skipsMotion) onFinish?.()
    // Only when the answer changes; onFinish identity doesn't matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipsMotion])

  return (
    <Circle
      size={size}
      bg={bg}
      overflow="hidden"
      items="center"
      justify="center"
      borderWidth={borderColor ? 2 : 0}
      borderColor={borderColor}
      testID={testID}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {source ? (
        <LottieView
          // Remount when motion turns on or off so autoPlay takes effect and
          // a stopped icon goes back to frame 0, the rest pose.
          key={moving ? `play-${mode}` : 'still'}
          source={source}
          autoPlay={moving}
          loop={moving && mode === 'loop'}
          onAnimationFinish={mode === 'once' && moving ? () => onFinish?.() : undefined}
          style={{ width: size, height: size }}
        />
      ) : (
        <Trophy size={size * 0.5} color="$color10" />
      )}
    </Circle>
  )
}
