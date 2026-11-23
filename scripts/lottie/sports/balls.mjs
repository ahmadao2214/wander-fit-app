// Bounce family: round balls in their real colours. Same hops and squash as
// soccer; the markings spin, the shading stays put like a light source.

import {
  ART_RADIUS as R,
  INK,
  OUTLINE,
  add,
  arc,
  ballShade,
  bezier,
  buildSport,
  circle,
  edgeSegments,
  ellipse,
  line,
  paint,
  polar,
  poly,
} from '../art.mjs'
import { group, stroke } from '../lottie.mjs'

function ball(nm, body, markings = [], { gloss = false, glossOpacity = 45 } = {}) {
  return buildSport({
    nm,
    family: 'bounce',
    layers: [
      { nm: 'outline', groups: [group('outline', [circle(0, 0, R), stroke(INK, OUTLINE)])] },
      {
        nm: 'shading',
        groups: [
          ballShade(R),
          ...(gloss
            ? [
                paint('gloss', [ellipse(-38, -46, 38, 22)], '#FFFFFF', {
                  opacity: glossOpacity,
                  rotation: -35,
                }),
              ]
            : []),
        ],
      },
      ...(markings.length ? [{ nm: 'markings', role: 'markings', groups: markings }] : []),
      { nm: 'body', groups: [paint('body', [circle(0, 0, R)], body)] },
    ],
  })
}

// Two opposed curves, as on tennis balls and baseballs. Pulled slightly inside
// the rim (±44.5°) so thick seams stay framed cleanly under the dark outline.
const seamCurves = (span = 45) => [
  arc(-140, 0, 100, -span, span),
  arc(140, 0, 100, 180 - span, 180 + span),
]

// Individual angled stitch ticks placed analytically along both seam arcs.
function baseballStitches() {
  const ticks = []
  const angles = [-35, -25, -15, -5, 5, 15, 25, 35]
  for (const side of [-1, 1]) {
    const cx = side * 140
    for (const deg of angles) {
      const a = ((side === -1 ? deg : 180 - deg) * Math.PI) / 180
      const px = cx + 100 * Math.cos(a)
      const py = 100 * Math.sin(a)
      const nx = Math.cos(a)
      const ny = Math.sin(a)
      const tx = -Math.sin(a)
      const ty = Math.cos(a)
      const halfN = 7.2
      const slantT = 2.4 * side
      ticks.push(
        poly(
          [
            [px - nx * halfN - tx * slantT, py - ny * halfN - ty * slantT],
            [px + nx * halfN + tx * slantT, py + ny * halfN + ty * slantT],
          ],
          false
        )
      )
    }
  }
  return ticks
}

// Evaluates a cubic bezier segment from p0 to seg.to at parameter t ∈ [0, 1].
function evalCubic(p0, seg, t) {
  const u = 1 - t
  return [0, 1].map(
    (k) =>
      u * u * u * p0[k] +
      3 * u * u * t * seg.c1[k] +
      3 * u * t * t * seg.c2[k] +
      t * t * t * seg.to[k]
  )
}

// Volleyball: 3 smooth 120° curved panel groups (cream, gold, cobalt), each
// divided by two parallel curved sub-panel ribs that join the main seams and
// outer rim cleanly.
const VOLLEY_ANGLES = [-90, 30, 150]
const volleySeam = (angle) => ({
  c1: polar(angle - 22, 36),
  c2: add(polar(angle, R), polar(angle + 162, 34)),
  to: polar(angle, R),
})
const volleySection = (k) => {
  const a = VOLLEY_ANGLES[k]
  const out = volleySeam(a)
  const back = volleySeam(a + 120)
  return bezier(
    [0, 0],
    [out, ...edgeSegments(R, a, a + 120), { c1: back.c2, c2: back.c1, to: [0, 0] }]
  )
}
function volleyRibs(a) {
  const base = volleySeam(a)
  const next = volleySeam(a + 120)
  const rib = (tStart, rimOffset, bend) => {
    const start = evalCubic([0, 0], base, tStart)
    const end = polar(a + rimOffset, R - 0.5)
    const dir = [next.c1[0] * 0.9, next.c1[1] * 0.9]
    const c1 = add(start, [dir[0] * bend, dir[1] * bend])
    const c2 = add(end, polar(a + rimOffset + 158, 28 * bend))
    return bezier(start, [{ c1, c2, to: end }], false)
  }
  return [rib(0.35, 82, 0.95), rib(0.68, 46, 0.65)]
}

export const basketball = () =>
  ball(
    'basketball',
    '#E8762D',
    [
      line(
        'seams',
        [
          poly(
            [
              [0, -R],
              [0, R],
            ],
            false
          ),
          poly(
            [
              [-R, 0],
              [R, 0],
            ],
            false
          ),
          arc(-150, 0, 110, -41.5, 41.5),
          arc(150, 0, 110, 138.5, 221.5),
        ],
        INK,
        { width: 5 }
      ),
    ],
    { gloss: true, glossOpacity: 24 }
  )

export const volleyball = () =>
  ball(
    'volleyball',
    '#F7F5EE',
    [
      line(
        'seams',
        [
          ...VOLLEY_ANGLES.map((a) => bezier([0, 0], [volleySeam(a)], false)),
          ...VOLLEY_ANGLES.flatMap((a) => volleyRibs(a)),
        ],
        INK,
        { width: 3.4 }
      ),
      paint('yellow', [volleySection(0)], '#F5C518'),
      paint('blue', [volleySection(1)], '#2459B8'),
    ],
    { gloss: true, glossOpacity: 20 }
  )

export const tennis = () =>
  ball('tennis', '#D4E83A', [line('seams', seamCurves(45.2), '#FAFAF2', { width: 7 })])

const stitched = (nm, body) =>
  ball(
    nm,
    body,
    [
      line('stitches', baseballStitches(), '#D2332B', { width: 3.2 }),
      line('seams', seamCurves(44.2), '#D2332B', { width: 2.6 }),
    ],
    { gloss: true, glossOpacity: 28 }
  )

export const baseball = () => stitched('baseball', '#F6F3EA')

export const softball = () => stitched('softball', '#E3EC2E')
