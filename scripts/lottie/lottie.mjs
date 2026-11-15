// Small Lottie builders. Only what the sport icons use: shape layers, one null
// rig, paths, fills, strokes and transform keyframes. No masks, mattes,
// effects, expressions, images, text or merge paths.

export const round = (n, digits = 2) => {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

// cubic-bezier(x1, y1, x2, y2) for the segment that leaves a keyframe.
export const EASE = {
  linear: [0, 0, 1, 1],
  inOut: [0.42, 0, 0.58, 1],
  // Quadratic out/in: close to a thrown object slowing at the top and
  // speeding into the ground.
  rise: [0.33, 0.67, 0.67, 1],
  fall: [0.33, 0, 0.67, 0.33],
  settle: [0.2, 0.5, 0.4, 1],
}

export const fixed = (k) => ({ a: 0, k })

const asArray = (v) => (Array.isArray(v) ? v : [v])

/**
 * Animated property from keys like { t, v, ease }. `ease` shapes the segment
 * from this key to the next one. Values can be numbers or arrays.
 */
export function animated(keys) {
  const k = keys.map((key, index) => {
    const s = asArray(key.v).map((n) => round(n, 3))
    if (index === keys.length - 1) return { t: key.t, s }
    const [x1, y1, x2, y2] = key.ease ?? EASE.linear
    const dims = s.length
    return {
      t: key.t,
      s,
      o: { x: Array(dims).fill(x1), y: Array(dims).fill(y1) },
      i: { x: Array(dims).fill(x2), y: Array(dims).fill(y2) },
    }
  })
  return { a: 1, k }
}

export function transform({ p = [0, 0, 0], a = [0, 0, 0], s = [100, 100, 100], r = 0, o = 100 } = {}) {
  const wrap = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : fixed(v))
  return { o: wrap(o), r: wrap(r), p: wrap(p), a: wrap(a), s: wrap(s) }
}

/** Position with X and Y as separate properties, so every player draws a straight path. */
export const splitPosition = (x, y) => ({ s: true, x: typeof x === 'number' ? fixed(x) : x, y: typeof y === 'number' ? fixed(y) : y })

const roundPoints = (points) => points.map((p) => p.map((n) => round(n)))

export const path = ({ v, i, o, c }) => ({
  ty: 'sh',
  ks: fixed({ i: roundPoints(i), o: roundPoints(o), v: roundPoints(v), c }),
})

export const rgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16)
  return [round(((n >> 16) & 255) / 255, 3), round(((n >> 8) & 255) / 255, 3), round((n & 255) / 255, 3), 1]
}

export const fill = (hex, opacity = 100) => ({ ty: 'fl', c: fixed(rgb(hex)), o: fixed(opacity), r: 1 })

export const stroke = (hex, width) => ({ ty: 'st', c: fixed(rgb(hex)), o: fixed(100), w: fixed(width), lc: 2, lj: 2 })

export const group = (nm, items, offset = [0, 0], rotation = 0) => ({
  ty: 'gr',
  nm,
  it: [
    ...items,
    {
      ty: 'tr',
      p: fixed(offset.map((n) => round(n))),
      a: fixed([0, 0]),
      s: fixed([100, 100]),
      r: fixed(rotation),
      o: fixed(100),
      sk: fixed(0),
      sa: fixed(0),
    },
  ],
})

const layerBase = (ind, nm, op, parent) => ({
  ddd: 0,
  ind,
  nm,
  ...(parent ? { parent } : {}),
  sr: 1,
  ao: 0,
  ip: 0,
  op,
  st: 0,
  bm: 0,
})

export const nullLayer = ({ ind, nm, op, ks }) => ({ ...layerBase(ind, nm, op), ty: 3, ks })

export const shapeLayer = ({ ind, nm, op, parent, ks = transform(), shapes }) => ({
  ...layerBase(ind, nm, op, parent),
  ty: 4,
  ks,
  shapes,
})

export const composition = ({ nm, fr, op, size, layers, markers = [] }) => ({
  v: '5.7.0',
  fr,
  ip: 0,
  op,
  w: size,
  h: size,
  nm,
  ddd: 0,
  assets: [],
  layers,
  markers,
})
