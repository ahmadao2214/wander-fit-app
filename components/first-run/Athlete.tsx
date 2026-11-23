import { useEffect, useMemo } from 'react'
import Svg, { Line } from 'react-native-svg'
import Animated, {
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import {
  ATHLETES,
  ATHLETE_VIEWBOX,
  athleteColors,
  athleteStrokes,
  poseFrom,
  type Stroke,
} from '../../lib/athletePose'
import type { CategoryId } from '../../lib/firstRunStory'

const AnimatedLine = Animated.createAnimatedComponent(Line)

function StrokeLine({ strokes, i }: { strokes: SharedValue<Stroke[]>; i: number }) {
  const props = useAnimatedProps(() => {
    const s = strokes.value[i]
    return { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, strokeWidth: s.w, stroke: s.color }
  })
  return <AnimatedLine animatedProps={props} strokeLinecap="round" />
}

/**
 * A faceless silhouette athlete for a category tile. Still, it holds its
 * first pose. With `play`, it runs its move once (under a second) on the UI
 * thread and holds the last pose. `settled` shows the last pose with no
 * motion (Reduce Motion, or a revisit).
 */
export function Athlete({
  cat,
  lit,
  tile,
  play,
  settled,
}: {
  cat: CategoryId
  lit: boolean
  tile: string
  play: boolean
  settled: boolean
}) {
  const def = ATHLETES[cat]
  const k = useSharedValue(settled ? 1 : 0)
  useEffect(() => {
    if (settled) {
      k.value = 1
      return
    }
    if (play) k.value = withTiming(1, { duration: def.ms, easing: Easing.linear })
  }, [play, settled, def.ms, k])

  const colors = useMemo(() => athleteColors(lit, tile), [lit, tile])
  const { frames, female, tool } = def
  const strokes = useDerivedValue(() =>
    athleteStrokes(poseFrom(frames, k.value), !!female, tool, colors)
  )
  // The stroke count is fixed per category, so each stroke keeps its line.
  const count = useMemo(
    () => athleteStrokes(poseFrom(frames, 0), !!female, tool, colors).length,
    [frames, female, tool, colors]
  )

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={ATHLETE_VIEWBOX}
      preserveAspectRatio="xMidYMax meet"
      accessible={false}
    >
      {Array.from({ length: count }, (_, i) => (
        <StrokeLine key={i} strokes={strokes} i={i} />
      ))}
    </Svg>
  )
}
