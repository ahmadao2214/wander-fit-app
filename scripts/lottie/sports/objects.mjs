// Objects in their real colours. Most use the tilt family (smaller hops,
// a lean and a rock level). Rings swing; the golf ball hops off a fixed tee.

import { INK, OUTLINE, arc, ballShade, bezier, buildSport, circle, curve, ellipse, line, paint, poly, rect, solid } from '../art.mjs'
import { group, stroke } from '../lottie.mjs'

// A stroke with an outline: a wider ink stroke under the coloured one.
const strap = (nm, shapes, color, width) => [
  line(nm, shapes, color, { width }),
  line(`${nm} outline`, shapes, INK, { width: width + OUTLINE * 2 }),
]

const tilted = (nm, groups, opts = {}) =>
  buildSport({ nm, family: 'tilt', layers: [{ nm, groups }], ...opts })

// ── running shoes ───────────────────────────────────────────────────────────

// Side view, toe to the right. Spans y -46..46.
function shoe(nm, { upper, accent, sole, lugs }) {
  const upperShape = curve([
    [-88, 22, 0, 0, 0, -18],
    [-84, -30, -4, 12, 6, -12],
    [-62, -42, -10, 0, 8, 0],
    [-46, -26, -4, -10, 10, 14],
    [-6, -14, -16, -8, 22, 10],
    [56, 0, -22, -8, 22, 6],
    [90, 22, 0, -12, 0, 0],
  ])
  const groups = [
    line('laces', [[-28, -24, -14, -14], [-14, -18, 0, -8], [0, -12, 14, -2], [14, -6, 28, 4]].map(([a, b, c, d]) => poly([[a, b], [c, d]], false)), '#FAFAF2', { width: 4 }),
    paint('stripe', [poly([[-36, 14], [-6, -4], [8, -2], [-20, 18]])], accent),
    solid('upper', [upperShape], upper),
    solid('midsole', [rect(1, 28, 186, 14, 7)], '#F4F2EC'),
    solid('outsole', [rect(1, 38, 186, 10, 5)], sole),
  ]
  if (lugs) groups.push(solid('lugs', [-72, -48, -24, 0, 24, 48, 72].map((x) => rect(x, 45, 12, 6, 1.5)), sole))
  return tilted(nm, groups, { bottom: lugs ? 49 : 44 })
}

export const crossCountry = () => shoe('cross-country', { upper: '#2E9E6A', accent: '#F2C230', sole: '#2B2D31', lugs: true })

export const trackDistance = () => shoe('track-distance', { upper: '#2563EB', accent: '#F97316', sole: '#2B2D31', lugs: false })

// ── track and field ─────────────────────────────────────────────────────────

export const trackSprints = () => {
  const stripes = [-70, -42, -14, 14, 42].map((x) => rect(x + 14, -48, 14, 22))
  return tilted('track-sprints-jumps', [
    paint('stripes', stripes, '#1F2933'),
    solid('board', [rect(0, -48, 172, 26, 3)], '#FAFAF7'),
    solid('posts', [rect(-70, 10, 10, 96), rect(70, 10, 10, 96)], '#9AA3AE'),
    solid('feet', [rect(-70, 60, 52, 9, 3), rect(70, 60, 52, 9, 3)], '#6B7480'),
  ], { bottom: 65 })
}

// ── gymnastics: rings on straps, swinging from the top ──────────────────────

export const gymnastics = () =>
  buildSport({
    nm: 'gymnastics',
    family: 'swing',
    bottom: 80,
    pivot: [0, -92],
    layers: [
      {
        nm: 'rings',
        groups: [
          ...strap('rings', [circle(-34, 48, 26), circle(34, 48, 26)], '#C68A4E', 8),
          solid('buckles', [rect(-30, 6, 12, 10, 2), rect(30, 6, 12, 10, 2)], '#B8BCC2'),
          ...strap('straps', [poly([[-14, -92], [-34, 22]], false), poly([[14, -92], [34, 22]], false)], '#E7DFCF', 6),
        ],
      },
    ],
  })

// ── cheerleading: pom-pom ───────────────────────────────────────────────────

export const cheerleading = () => {
  // A fluffy cluster: a ring of puffs around a core. Ink-filled copies a
  // little larger sit underneath, so only the outer silhouette is outlined.
  const puffs = (r, grow) => [
    circle(0, -4, 58 + grow),
    ...Array.from({ length: 11 }, (_, k) => {
      const a = (k * 360) / 11 - 90
      return circle(60 * Math.cos((a * Math.PI) / 180), -4 + 60 * Math.sin((a * Math.PI) / 180), r + grow)
    }),
  ]
  const strands = Array.from({ length: 22 }, (_, k) => {
    const a = ((k * 360) / 22) * (Math.PI / 180)
    const inner = 18 + (k % 3) * 8
    const outer = 64 + (k % 2) * 10
    return poly([[inner * Math.cos(a), -4 + inner * Math.sin(a)], [outer * Math.cos(a), -4 + outer * Math.sin(a)]], false)
  })
  return tilted('cheerleading', [
    line('strands', strands, '#FFFFFF', { width: 3.5 }),
    paint('puffs', puffs(22, 0), '#E23B4E'),
    paint('silhouette', puffs(22, OUTLINE / 2), INK),
    solid('handle', [rect(0, 86, 18, 12, 3)], '#2B2F36'),
  ], { bottom: 92, tiltDegrees: 12 })
}

// ── diving: a splash ────────────────────────────────────────────────────────

export const diving = () =>
  tilted('diving', [
    solid('drops', [circle(-44, -62, 9), circle(2, -80, 10), circle(46, -58, 8)], '#7CC8F4'),
    solid('crown', [curve([
      [-70, 52, 0, 0, -6, -30],
      [-58, -10, 0, 0, 10, 20],
      [-32, 20, -6, -10, 4, -30],
      [-14, -40, 0, 0, 6, 30],
      [8, 16, -6, -6, 6, -30],
      [30, -30, 0, 0, 4, 28],
      [50, 18, -6, -10, 6, -20],
      [64, -6, 0, 0, 4, 30],
      [70, 52, 0, 0, 0, 0],
    ])], '#5BB4EE'),
    solid('surface', [ellipse(0, 56, 190, 34)], '#2F8FDB'),
  ], { bottom: 73, tiltDegrees: 5 })

// ── combat sports ───────────────────────────────────────────────────────────

export const wrestling = () =>
  tilted('wrestling', [
    line('grilles', [circle(-54, 18, 16), circle(54, 18, 16), circle(-54, 18, 7), circle(54, 18, 7)], '#1F2329', { width: 4 }),
    solid('ear guards', [circle(-54, 18, 32), circle(54, 18, 32)], '#C8262E'),
    ...strapPair(),
  ], { bottom: 62 })

function strapPair() {
  return strap('straps', [arc(0, 18, 54, 180, 360), poly([[-40, 56], [40, 56]], false)], '#2B2F36', 9)
}

export const martialArts = () =>
  tilted('martial-arts', [
    paint('tip bar', [poly([[-46, 58], [-30, 62], [-34, 72], [-50, 68]])], '#C8262E'),
    solid('knot', [rect(0, -14, 38, 34, 6)], '#26282C'),
    solid('tails', [
      poly([[-12, 0], [8, 2], [-28, 80], [-52, 72]]),
      poly([[-6, 2], [14, 0], [52, 72], [30, 80]]),
    ], '#26282C'),
    line('stitching', [poly([[-90, -14], [90, -14]], false)], '#4A4F57', { width: 2.5, dash: [5, 4] }),
    solid('belt', [rect(0, -14, 186, 26, 4)], '#26282C'),
  ], { bottom: 84 })

// ── swimming: goggles ───────────────────────────────────────────────────────

export const swimming = () =>
  tilted('swimming', [
    paint('gloss', [ellipse(-44, -8, 16, 9), ellipse(24, -8, 16, 9)], '#FFFFFF', { opacity: 55 }),
    solid('lenses', [ellipse(-34, 0, 58, 42), ellipse(34, 0, 58, 42)], '#2C7BE5'),
    ...strap('bridge', [arc(0, 8, 10, 200, 340)], '#2B2F36', 5),
    ...strap('strap', [ellipse(0, -2, 188, 64)], '#2B2F36', 7),
  ], { bottom: 38 })

// ── ice hockey: puck ────────────────────────────────────────────────────────

export const iceHockey = () =>
  tilted('ice-hockey', [
    line('rim highlight', [ellipse(0, -14, 140, 32)], '#9AA0AA', { width: 2.5 }),
    solid('top', [ellipse(0, -14, 150, 40)], '#4A4D55'),
    line('grip', [-52, -30, -8, 14, 36, 58].map((x) => poly([[x, 10], [x, 26]], false)), '#5A5E68', { width: 3 }),
    solid('side', [bezier([-75, -14], [
      { c1: [-75, -14], c2: [-75, 22], to: [-75, 22] },
      { c1: [-75, 33], c2: [-41, 42], to: [0, 42] },
      { c1: [41, 42], c2: [75, 33], to: [75, 22] },
      { c1: [75, 22], c2: [75, -14], to: [75, -14] },
      { c1: [75, -14], c2: [-75, -14], to: [-75, -14] },
    ])], '#1E1F23'),
  ], { bottom: 46 })

// ── strength: barbell and kettlebell ────────────────────────────────────────

export const weightlifting = () =>
  tilted('weightlifting', [
    solid('collars', [rect(-36, 0, 8, 28, 2), rect(36, 0, 8, 28, 2)], '#B8BCC2'),
    solid('blue plates', [rect(-48, 0, 14, 96, 4), rect(48, 0, 14, 96, 4)], '#2A62C9'),
    solid('red plates', [rect(-64, 0, 17, 118, 4), rect(64, 0, 17, 118, 4)], '#D6312F'),
    solid('bar', [rect(0, 0, 196, 8, 4)], '#A7AFB8'),
  ], { bottom: 63 })

export const generalFitness = () =>
  tilted('general-fitness', [
    solid('bell', [circle(0, 26, 56)], '#F2C230'),
    ...strap('handle', [arc(0, -26, 40, 180, 360), poly([[-40, -26], [-40, 0]], false), poly([[40, -26], [40, 0]], false)], '#3A3D42', 13),
  ], { bottom: 86 })

// ── golf: ball hops off a fixed tee ─────────────────────────────────────────

export const golf = () => {
  const dimples = []
  for (let row = -3; row <= 3; row++) {
    for (let col = -3; col <= 3; col++) {
      const x = col * 13 + (row % 2 ? 6.5 : 0)
      const y = row * 11
      if (Math.hypot(x, y) < 34) dimples.push(circle(x, y, 3.6))
    }
  }
  return buildSport({
    nm: 'golf',
    family: 'bounce',
    bottom: 12,
    spinCenter: [0, -32],
    layers: [
      {
        nm: 'outline',
        groups: [group('outline', [circle(0, -32, 44), stroke(INK, OUTLINE)])],
      },
      { nm: 'shading', groups: [ballShade(44, [0, -32])] },
      { nm: 'dimples', role: 'markings', groups: [paint('dimples', dimples, '#CDD0C8', { offset: [0, -32] })] },
      { nm: 'ball', groups: [paint('ball', [circle(0, -32, 44)], '#FAFAF6')] },
      {
        nm: 'tee',
        role: 'fixed',
        groups: [solid('tee', [poly([[-22, 12], [22, 12], [7, 24], [5, 74], [0, 84], [-5, 74], [-7, 24]])], '#E4572E')],
      },
    ],
  })
}

// ── ultimate: a disc, seen from a low angle ─────────────────────────────────

export const ultimateFrisbee = () =>
  tilted('ultimate-frisbee', [
    line('ring', [ellipse(0, -6, 124, 38)], '#FFFFFF', { width: 5 }),
    line('rim line', [ellipse(0, -6, 160, 52)], '#C2410C', { width: 3 }),
    solid('top', [ellipse(0, -6, 184, 64)], '#F97316'),
    solid('rim', [ellipse(0, 6, 184, 64)], '#C2410C'),
  ], { bottom: 42, tiltDegrees: 12 })
