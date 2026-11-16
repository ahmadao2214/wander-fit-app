import { useEffect, useRef, useState } from 'react'
import { Pressable, Text as RNText, View } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import Svg, { Path } from 'react-native-svg'
import { BALL, dayChoreography, type DayEasing, type Key } from '../../lib/dayFill'
import { NIGHT, type MovementFamily } from '../../lib/firstRunStory'
import { DISPLAY, SportShape } from './Night'
import { PAGE_EASE } from './intakeMotion'

export const DAY_TILE_HEIGHT = 132

const EASINGS: Record<DayEasing, (t: number) => number> = {
  linear: Easing.linear,
  in: Easing.bezier(0.42, 0, 1, 1).factory(),
  out: Easing.bezier(0, 0, 0.58, 1).factory(),
  inOut: Easing.bezier(0.45, 0, 0.55, 1).factory(),
  page: PAGE_EASE.factory(),
}

const FILL: Record<MovementFamily | 'plain', string> = {
  roll: '#15803D',
  bounce: '#C2410C',
  water: '#0284C7',
  plain: NIGHT.fg,
}

/** Runs one track's keys on a shared value, after `delay` ms. */
function run(value: SharedValue<number>, keys: readonly Key[], delay: number) {
  cancelAnimation(value)
  value.value = keys[0].v
  if (keys.length < 2) return
  const steps = keys.slice(1).map((k, i) =>
    withTiming(k.v, { duration: Math.max(0, k.at - keys[i].at), easing: EASINGS[k.easing ?? 'linear'] })
  )
  const [first, ...more] = steps
  const seq = more.length ? withSequence(first, ...more) : first
  value.value = delay > 0 ? withDelay(delay, seq) : seq
}

/**
 * One day of the week. Turning on plays the sport's movement family: the
 * ball rolls up the pitch, dribbles three times, or the lane fills like a
 * pool. Other sports, and Reduce Motion, get the plain gauge fill.
 */
export function DayTile({
  label,
  full,
  on,
  family,
  sportName,
  moving,
  enterDelay,
  onPress,
  testID,
  hint,
}: {
  label: string
  full: string
  on: boolean
  family: MovementFamily | null
  sportName?: string
  moving: boolean
  /** On arrival, a preselected day fills after this many ms. */
  enterDelay: number
  onPress: () => void
  testID?: string
  hint?: string
}) {
  const H = DAY_TILE_HEIGHT
  const [width, setWidth] = useState(44)
  const fill = useSharedValue(0)
  const ballY = useSharedValue(-BALL)
  const ballOpacity = useSharedValue(0)
  const ballRotate = useSharedValue(0)
  const wave = useSharedValue(0)
  const waveOpacity = useSharedValue(0)
  const first = useRef(true)

  useEffect(() => {
    const arriving = first.current
    first.current = false
    if (!moving) {
      fill.value = on ? 1 : 0
      ballOpacity.value = 0
      return
    }
    if (arriving && !on) return
    const c = dayChoreography(family, on, H)
    const delay = arriving ? enterDelay : 0
    run(fill, c.fill, delay)
    run(ballY, c.ballY, delay)
    run(ballOpacity, c.ballOpacity, delay)
    run(ballRotate, c.ballRotate, delay)
    run(wave, c.wave, delay)
    run(waveOpacity, c.waveOpacity, delay)
    // Only the on/off answer drives this; the rest is fixed for the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, moving])

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ translateY: H * (1 - fill.value) }] }))
  const ballStyle = useAnimatedStyle(() => ({
    opacity: ballOpacity.value,
    transform: [{ translateY: ballY.value }, { rotate: `${ballRotate.value}deg` }],
  }))
  const waveStyle = useAnimatedStyle(() => ({
    opacity: waveOpacity.value,
    transform: [{ translateX: -wave.value * width * 2 }],
  }))

  const themed = family !== null
  const textOn = themed ? '#FFFFFF' : NIGHT.ink

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={full}
      accessibilityHint={hint}
      testID={testID}
      style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.95 : 1 }] })}
    >
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{
          height: H,
          borderRadius: 12,
          backgroundColor: NIGHT.ink2,
          overflow: 'hidden',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 12,
        }}
      >
        <Animated.View
          style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: H, backgroundColor: FILL[family ?? 'plain'] }, fillStyle]}
        >
          {family === 'water' ? (
            <Animated.View style={[{ position: 'absolute', top: -6, left: 0, width: width * 2, height: 8 }, waveStyle]}>
              <Svg width="100%" height="100%" viewBox="0 0 80 8" preserveAspectRatio="none">
                <Path d="M0 4 Q5 0 10 4 T20 4 T30 4 T40 4 T50 4 T60 4 T70 4 T80 4 V8 H0 Z" fill={FILL.water} />
              </Svg>
            </Animated.View>
          ) : null}
        </Animated.View>
        {themed && family !== 'water' && sportName ? (
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', top: 0, left: '50%', marginLeft: -BALL / 2, width: BALL, height: BALL }, ballStyle]}
          >
            <SportShape name={sportName} size={BALL} />
          </Animated.View>
        ) : null}
        <RNText style={{ fontFamily: DISPLAY, fontSize: 26, lineHeight: 28, color: on ? textOn : NIGHT.fg }}>{label}</RNText>
      </View>
    </Pressable>
  )
}
