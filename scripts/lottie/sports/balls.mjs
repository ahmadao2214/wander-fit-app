// Bounce family: round balls in their real colours. Same hops and squash as
// soccer; the markings spin, the shading stays put like a light source.

import { ART_RADIUS as R, INK, OUTLINE, add, arc, ballShade, bezier, buildSport, circle, edgeSegments, ellipse, line, paint, polar, poly } from '../art.mjs'
import { group, stroke } from '../lottie.mjs'

function ball(nm, body, markings = [], { gloss = false } = {}) {
  return buildSport({
    nm,
    family: 'bounce',
    layers: [
      { nm: 'outline', groups: [group('outline', [circle(0, 0, R), stroke(INK, OUTLINE)])] },
      { nm: 'shading', groups: [ballShade(R), ...(gloss ? [paint('gloss', [ellipse(-38, -46, 38, 22)], '#FFFFFF', { opacity: 45, rotation: -35 })] : [])] },
      ...(markings.length ? [{ nm: 'markings', role: 'markings', groups: markings }] : []),
      { nm: 'body', groups: [paint('body', [circle(0, 0, R)], body)] },
    ],
  })
}

// Two opposed curves, as on tennis balls and baseballs. Each meets the ball
// edge at ±45.6° from its own centre, so it stays inside while spinning.
const seamCurves = () => [arc(-140, 0, 100, -45.6, 45.6), arc(140, 0, 100, 134.4, 225.6)]

// Volleyball: three sections that swirl out from the centre. Each seam
// leaves the centre sideways and meets the edge at an angle.
const SEAM_ANGLES = [-90, 30, 150]
const seam = (angle) => ({ c1: polar(angle - 90, 38), c2: add(polar(angle, R), polar(angle + 140, 38)), to: polar(angle, R) })
const section = (k) => {
  const a = SEAM_ANGLES[k]
  const out = seam(a)
  const back = seam(a + 120)
  return bezier([0, 0], [out, ...edgeSegments(R, a, a + 120), { c1: back.c2, c2: back.c1, to: [0, 0] }])
}

export const basketball = () =>
  ball('basketball', '#E8762D', [
    line('seams', [
      poly([[0, -R], [0, R]], false),
      poly([[-R, 0], [R, 0]], false),
      arc(-150, 0, 110, -43, 43),
      arc(150, 0, 110, 137, 223),
    ], INK, { width: 5 }),
  ])

export const volleyball = () =>
  ball('volleyball', '#F7F5EE', [
    line('seams', SEAM_ANGLES.map((a) => bezier([0, 0], [seam(a)], false)), INK, { width: 3.5 }),
    paint('yellow', [section(0)], '#F5C518'),
    paint('blue', [section(1)], '#2459B8'),
  ])

export const tennis = () => ball('tennis', '#D4E83A', [line('seams', seamCurves(), '#FAFAF2', { width: 7 })])

const stitched = (nm, body) =>
  ball(nm, body, [
    line('stitches', seamCurves(), '#D2332B', { width: 9, dash: [3, 6] }),
    line('seams', seamCurves(), '#D2332B', { width: 2.5 }),
  ])

export const baseball = () => stitched('baseball', '#F5F2E8')

export const softball = () => stitched('softball', '#E3E83A')

export const cricket = () =>
  ball('cricket', '#A8232B', [
    line('seam', [poly([[-96, 0], [96, 0]], false)], '#F2E6C8', { width: 4 }),
    line('stitches', [poly([[-94, -10], [94, -10]], false), poly([[-94, 10], [94, 10]], false)], '#F2E6C8', { width: 5, dash: [3, 5] }),
  ])

export const racquetball = () => ball('racquetball', '#2D6CDF', [], { gloss: true })

export const lacrosse = () => ball('lacrosse', '#F2B630', [], { gloss: true })

export const fieldHockey = () => {
  const dimples = []
  for (let row = -4; row <= 4; row++) {
    for (let col = -4; col <= 4; col++) {
      const x = col * 22 + (row % 2 ? 11 : 0)
      const y = row * 19
      if (Math.hypot(x, y) < 82) dimples.push(circle(x, y, 6.5))
    }
  }
  return ball('field-hockey', '#F4F4F0', [paint('dimples', dimples, '#C9CCC4')])
}
