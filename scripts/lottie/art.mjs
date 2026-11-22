// Drawing helpers and the shared sport builder. New sports are drawn in "art
// units": the object's bounding circle has radius 100, centred on 0,0, with
// y pointing down. The builder scales that to the stage and applies the
// sport's motion family.

import { composition, fill, fixed, group, nullLayer, path, shapeLayer, stroke, transform } from './lottie.mjs'
import { CANVAS, FPS, LOOP_FRAMES, rigTransform, spin, swing, tilt, tumble } from './motion.mjs'

export const ART_RADIUS = 100

// One outline colour and weight for every icon (about 1 pt on a 44 pt tile),
// matching soccer.
export const INK = '#1F2933'
export const OUTLINE = 7
export const LINE = 4

// ── shapes ──────────────────────────────────────────────────────────────────

export const ellipse = (cx, cy, w, h = w) => ({ ty: 'el', d: 1, p: fixed([cx, cy]), s: fixed([w, h]) })

export const circle = (cx, cy, r) => ellipse(cx, cy, r * 2)

export const rect = (cx, cy, w, h, radius = 0) => ({ ty: 'rc', d: 1, p: fixed([cx, cy]), s: fixed([w, h]), r: fixed(radius) })

const zeros = (points) => points.map(() => [0, 0])

/** Straight-edged path through points. */
export const poly = (points, closed = true) => path({ v: points, i: zeros(points), o: zeros(points), c: closed })

/**
 * Smooth path. Each node is [x, y, inX, inY, outX, outY], with tangents
 * relative to the node.
 */
export const curve = (nodes, closed = true) =>
  path({
    v: nodes.map((n) => [n[0], n[1]]),
    i: nodes.map((n) => [n[2] ?? 0, n[3] ?? 0]),
    o: nodes.map((n) => [n[4] ?? 0, n[5] ?? 0]),
    c: closed,
  })

/** Open circular arc from a0 to a1 degrees (0 = right, 90 = down). */
export function arc(cx, cy, r, a0, a1) {
  const segments = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90))
  const step = ((a1 - a0) / segments) * (Math.PI / 180)
  const k = (4 / 3) * Math.tan(step / 4) * r
  const v = []
  const i = []
  const o = []
  for (let s = 0; s <= segments; s++) {
    const a = a0 * (Math.PI / 180) + s * step
    const [x, y] = [cx + r * Math.cos(a), cy + r * Math.sin(a)]
    const [tx, ty] = [-Math.sin(a), Math.cos(a)]
    v.push([x, y])
    i.push([-tx * k, -ty * k])
    o.push([tx * k, ty * k])
  }
  return path({ v, i, o, c: false })
}

const polar = (angle, r) => [r * Math.cos((angle * Math.PI) / 180), r * Math.sin((angle * Math.PI) / 180)]
const add = (a, b) => [a[0] + b[0], a[1] + b[1]]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]]

/**
 * Path from absolute cubic segments: start point, then { c1, c2, to } for
 * each segment. A closed path's last segment must end on the start point.
 */
export function bezier(start, segments, closed = true) {
  const v = [start]
  const i = [[0, 0]]
  const o = []
  for (const seg of segments) {
    o.push(sub(seg.c1, v[v.length - 1]))
    v.push(seg.to)
    i.push(sub(seg.c2, seg.to))
  }
  o.push([0, 0])
  if (closed) {
    i[0] = i.pop()
    v.pop()
    o.pop()
  }
  return path({ v, i, o, c: closed })
}

/** Segments along a circle of radius r (centred on 0,0) from angle a to b, in degrees. */
export function edgeSegments(r, a, b) {
  const count = Math.max(1, Math.ceil(Math.abs(b - a) / 90))
  const step = (b - a) / count
  const k = (4 / 3) * Math.tan((step * Math.PI) / 180 / 4) * r
  const segs = []
  for (let n = 0; n < count; n++) {
    const a0 = a + n * step
    const a1 = a0 + step
    segs.push({ c1: add(polar(a0, r), polar(a0 + 90, k)), c2: sub(polar(a1, r), polar(a1 + 90, k)), to: polar(a1, r) })
  }
  return segs
}

export { polar, add }

/** Half-height y(x) of a circular-arc lemon at horizontal offset x. */
export function lemonY(x, halfLength, halfWidth) {
  const rc = (halfLength * halfLength + halfWidth * halfWidth) / (2 * halfWidth)
  return Math.sqrt(Math.max(0, rc * rc - x * x)) - (rc - halfWidth)
}

/** Symmetrical pointed oval (football, rugby ball): two smooth circular arcs meeting at ±halfLength. */
export function lemon(halfLength, halfWidth) {
  const rc = (halfLength * halfLength + halfWidth * halfWidth) / (2 * halfWidth)
  const theta = 2 * Math.atan(halfWidth / halfLength)
  const k = (4 / 3) * Math.tan(theta / 4) * rc
  const tx = k * Math.cos(theta)
  const ty = k * Math.sin(theta)
  return curve([
    [-halfLength, 0, tx, ty, tx, -ty],
    [0, -halfWidth, -k, 0, k, 0],
    [halfLength, 0, -tx, -ty, -tx, ty],
    [0, halfWidth, k, 0, -k, 0],
  ])
}

// ── paint ───────────────────────────────────────────────────────────────────

/** A filled part with the shared dark outline drawn on top. */
export const solid = (nm, shapes, color, { offset, rotation, outline = true } = {}) =>
  group(nm, [...shapes, ...(outline ? [stroke(INK, OUTLINE)] : []), fill(color)], offset, rotation)

/** Fill only, for highlights, shading and markings. */
export const paint = (nm, shapes, color, { opacity = 100, offset, rotation } = {}) =>
  group(nm, [...shapes, fill(color, opacity)], offset, rotation)

/** Stroke only, for seams, laces and straps. */
export const line = (nm, shapes, color, { width = LINE, offset, rotation, dash } = {}) => {
  const st = stroke(color, width)
  if (dash) st.d = [{ n: 'd', nm: 'dash', v: fixed(dash[0]) }, { n: 'g', nm: 'gap', v: fixed(dash[1]) }]
  return group(nm, [...shapes, st], offset, rotation)
}

/** Soft shading crescent like soccer's: a darker overlay on the lower right of a ball. */
export const ballShade = (r, offset) =>
  paint('shade', [
    curve([
      [r * 0.92, -r * 0.38, 0, 0, -r * 0.05, r * 0.75],
      [-r * 0.38, r * 0.92, r * 0.78, r * 0.12, 0, 0],
      [r * 0.0, r * 0.995, -r * 0.2, 0, r * 0.62, -r * 0.05],
      [r * 0.995, r * 0.0, 0, r * 0.62, 0, -r * 0.2],
    ]),
  ], '#000000', { opacity: 14, offset })

// ── builder ─────────────────────────────────────────────────────────────────

/**
 * Builds a sport's Lottie.
 *
 * `layers` are listed top first. Each is { nm, groups, role, ks, null, parent }:
 * - role 'markings' spins with the ball (bounce family only).
 * - role 'fixed' stays put while the rest moves (a golf tee).
 * - `ks`: custom layer transform (overrides family motion for bespoke choreography).
 * - `null: true`: makes this entry a null parent layer (no shapes) for nested transforms.
 * - `parent`: optional `nm` of another layer in `layers` to parent to (defaults to RIG).
 *
 * Families:
 * - bounce: hops, squashes and spins its markings (balls).
 * - tumble: hops and flips end over end (oval balls, shuttlecock).
 * - tilt: smaller hops, little squash, leans and rocks level (rigid objects).
 * - swing: no hop; swings from `pivot` and settles (hanging objects).
 * - still: stationary rig; each layer drives its own bespoke `ks` motion.
 */
export function buildSport({ nm, family, layers, bottom = ART_RADIUS, pivot = [0, -ART_RADIUS], spinCenter = [0, 0], tiltDegrees = 8 }) {
  const op = LOOP_FRAMES
  const RIG = layers.length + 1
  const STAND = layers.length + 2
  const motion = {
    bounce: { rig: { artRadius: ART_RADIUS, bottom }, body: null, markings: spin() },
    tumble: { rig: { artRadius: ART_RADIUS, bottom, squash: 0.35 }, body: tumble() },
    tilt: { rig: { artRadius: ART_RADIUS, bottom, height: 0.7, squash: 0.3 }, body: tilt(tiltDegrees) },
    swing: { rig: { artRadius: ART_RADIUS, bottom, still: true }, body: swing() },
    still: { rig: { artRadius: ART_RADIUS, bottom, still: true }, body: null },
  }[family]
  if (!motion) throw new Error(`${nm}: unknown family ${family}`)

  const indByName = new Map(layers.map((l, index) => [l.nm, index + 1]))

  const ksFor = (l) => {
    if (l.ks) return l.ks
    if (l.role === 'fixed') return transform()
    const r = l.role === 'markings' ? motion.markings ?? motion.body : motion.body
    if (!r) return transform()
    const anchor = family === 'swing' ? [...pivot, 0] : l.role === 'markings' ? [...spinCenter, 0] : [0, 0, 0]
    return transform({ a: anchor, p: anchor, r })
  }

  const parentFor = (l) => {
    if (l.parent) {
      const target = indByName.get(l.parent)
      if (!target) throw new Error(`${nm}: unknown parent layer ${l.parent}`)
      return target
    }
    return l.role === 'fixed' ? STAND : RIG
  }

  const hasFixed = layers.some((l) => l.role === 'fixed')
  return composition({
    nm,
    fr: FPS,
    op,
    size: CANVAS,
    layers: [
      ...layers.map((l, index) => {
        const spec = { ind: index + 1, nm: l.nm, op, parent: parentFor(l), ks: ksFor(l) }
        return l.null ? nullLayer(spec) : shapeLayer({ ...spec, shapes: l.groups })
      }),
      nullLayer({ ind: RIG, nm: 'rig', op, ks: rigTransform(motion.rig) }),
      ...(hasFixed ? [nullLayer({ ind: STAND, nm: 'stand', op, ks: rigTransform({ ...motion.rig, still: true }) })] : []),
    ],
  })
}
