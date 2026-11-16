import { useEffect, useState } from 'react'
import Svg, { Circle, Ellipse, G, Polygon, Rect } from 'react-native-svg'
import { ATHLETES, ATHLETE_VIEWBOX, athleteShapes, poseAt, type Shape } from '../../lib/athletePose'
import type { CategoryId } from '../../lib/firstRunStory'

function ShapeEl({ s }: { s: Shape }) {
  switch (s.kind) {
    case 'polygon':
      return <Polygon points={s.points} fill={s.fill} />
    case 'circle':
      return <Circle cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} />
    case 'ellipse':
      return <Ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={s.fill} rotation={s.rotate} origin={`${s.cx}, ${s.cy}`} />
    case 'rect':
      return <Rect x={s.x} y={s.y} width={s.width} height={s.height} rx={s.r} fill={s.fill} />
  }
}

/**
 * A faceless silhouette athlete for a category tile. Still, it holds its
 * first pose. With `play`, it runs its move once (under a second) and holds
 * the last pose. `settled` shows the last pose with no motion (Reduce Motion,
 * or a revisit).
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
  const [k, setK] = useState(settled ? 1 : 0)

  useEffect(() => {
    if (settled) {
      setK(1)
      return
    }
    if (!play) return
    const ms = ATHLETES[cat].ms
    let raf = 0
    const t0 = Date.now()
    const tick = () => {
      const next = Math.min(1, (Date.now() - t0) / ms)
      setK(next)
      if (next < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [play, settled, cat])

  const pose = poseAt(cat, k)
  const shapes = athleteShapes(cat, pose, lit, tile)
  return (
    <Svg width="100%" height="100%" viewBox={ATHLETE_VIEWBOX} preserveAspectRatio="xMidYMax meet" accessible={false}>
      <G transform={pose.flip ? 'translate(100 0) scale(-1 1)' : undefined}>
        {shapes.map((s, i) => (
          <ShapeEl key={i} s={s} />
        ))}
      </G>
    </Svg>
  )
}
