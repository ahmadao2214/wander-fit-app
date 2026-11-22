// Shared timing for every sport icon. Change a beat here and every sport
// follows. The beats are soccer's original ones, retimed to play at 1x
// (the app used to slow soccer to 0.8x) on a 30 fps, 5 s loop.
//
// Frame 0 is the rest pose, so a paused icon shows the still and a single
// play ends where it started. The loop is seamless for the same reason.

import { EASE, animated, splitPosition, transform } from './lottie.mjs'

export const FPS = 30
export const LOOP_FRAMES = 150
export const CANVAS = 1000

// Art fits inside the circle inscribed in the canvas, because the app clips
// icons to a circle.
export const SAFE_RADIUS = 470

// Where the object rests (its bottom edge) and how big it is.
export const STAGE = {
  centerX: 500,
  groundY: 860,
  objectRadius: 330,
}

export const BEATS = {
  restUntil: 8,
  squashAt: 12,
  takeoff: 16,
  hops: [
    // [leave ground, peak, land, contact ends]
    { up: 16, peak: 27, land: 38, leave: 41, height: 125, squash: [1.05, 0.94] },
    { up: 41, peak: 49, land: 57, leave: 59, height: 60, squash: [1.03, 0.97] },
    { up: 59, peak: 64, land: 69, leave: 69, height: 28, squash: null },
  ],
  settled: 69,
}

/** Bottom-contact y position: hops that get lower, then a long rest. */
export function hopY({ groundY = STAGE.groundY, height = 1 } = {}) {
  const keys = [
    { t: 0, v: groundY },
    { t: BEATS.takeoff, v: groundY, ease: EASE.rise },
  ]
  BEATS.hops.forEach((hop, index) => {
    if (index > 0) keys.push({ t: hop.up, v: groundY, ease: EASE.rise })
    keys.push({ t: hop.peak, v: groundY - hop.height * height, ease: EASE.fall })
    keys.push({ t: hop.land, v: groundY })
  })
  keys.push({ t: LOOP_FRAMES, v: groundY })
  return animated(dedupe(keys))
}

/**
 * Squash before takeoff and on the first two landings, around the bottom
 * edge. `amount` scales how far it squashes: 1 for a ball, less for rigid
 * objects.
 */
export function squashScale(base, amount = 1) {
  const s = (x, y) => [base * (1 + (x - 1) * amount), base * (1 + (y - 1) * amount), 100]
  const keys = [
    { t: 0, v: s(1, 1) },
    { t: BEATS.restUntil, v: s(1, 1), ease: EASE.inOut },
    { t: BEATS.squashAt, v: s(1.08, 0.9), ease: EASE.inOut },
    { t: BEATS.takeoff, v: s(0.97, 1.04), ease: EASE.inOut },
    { t: BEATS.takeoff + 4, v: s(1, 1) },
  ]
  for (const hop of BEATS.hops) {
    if (!hop.squash) continue
    const mid = (hop.land + hop.leave) / 2
    keys.push({ t: hop.land, v: s(1, 1), ease: EASE.inOut })
    keys.push({ t: mid, v: s(hop.squash[0], hop.squash[1]), ease: EASE.inOut })
    keys.push({ t: hop.leave, v: s(1, 1) })
  }
  keys.push({ t: LOOP_FRAMES, v: s(1, 1) })
  return animated(dedupe(keys))
}

/** One full turn across the hops, slowing into the rest. Balls spin their markings. */
export function spin(turnDegrees = -360) {
  return animated([
    { t: 0, v: 0 },
    { t: BEATS.takeoff, v: 0, ease: EASE.settle },
    { t: BEATS.settled, v: turnDegrees },
    { t: LOOP_FRAMES, v: turnDegrees },
  ])
}

/** Oval balls flip end over end once, during the first two hops. */
export function tumble(turnDegrees = -360) {
  const [first, second] = BEATS.hops
  return animated([
    { t: 0, v: 0 },
    { t: BEATS.takeoff, v: 0, ease: EASE.settle },
    { t: second.land, v: turnDegrees },
    { t: LOOP_FRAMES, v: turnDegrees },
  ])
}

/** Rigid objects lean back on the way up and rock level on landing. */
export function tilt(degrees = 8) {
  const [first, second, third] = BEATS.hops
  return animated([
    { t: 0, v: 0 },
    { t: BEATS.takeoff, v: 0, ease: EASE.inOut },
    { t: first.peak, v: -degrees, ease: EASE.inOut },
    { t: first.leave, v: degrees * 0.6, ease: EASE.inOut },
    { t: second.peak, v: -degrees * 0.35, ease: EASE.inOut },
    { t: third.up, v: degrees * 0.2, ease: EASE.inOut },
    { t: BEATS.settled, v: 0 },
    { t: LOOP_FRAMES, v: 0 },
  ])
}

/** Hanging objects swing from their pivot and settle, on the same beats. */
export function swing(degrees = 14) {
  const keys = [{ t: 0, v: 0 }, { t: BEATS.restUntil, v: 0, ease: EASE.inOut }]
  const swings = [1, -0.7, 0.45, -0.25, 0.1]
  swings.forEach((share, index) => {
    keys.push({ t: BEATS.squashAt + 4 + index * 14, v: degrees * share, ease: EASE.inOut })
  })
  keys.push({ t: BEATS.squashAt + 4 + swings.length * 14, v: 0 })
  keys.push({ t: LOOP_FRAMES, v: 0 })
  return animated(keys)
}

/**
 * Animated scalar track on the shared 150-frame loop. `keys` are `{ t, v, ease }`
 * pairs; frame 0 and frame 150 are filled automatically from `rest` (or the final
 * value for full-turn rotations).
 */
export function track(keys, { rest = 0, end = rest } = {}) {
  const full = [
    ...(keys[0]?.t === 0 ? [] : [{ t: 0, v: rest }]),
    ...keys,
    ...(keys[keys.length - 1]?.t === LOOP_FRAMES ? [] : [{ t: LOOP_FRAMES, v: end }]),
  ]
  return animated(dedupe(full))
}

/**
 * Animated 2D/3D scale track in percent (`[sx, sy, 100]`), resting at `[100, 100, 100]`.
 */
export function scaleTrack(keys, rest = [100, 100]) {
  const pad = (v) => [v[0], v[1], 100]
  return track(
    keys.map((k) => ({ ...k, v: pad(k.v) })),
    { rest: pad(rest), end: pad(rest) },
  )
}

/**
 * Animated straight-line position track (X and Y split into separate properties
 * so every player draws straight paths). `xKeys` / `yKeys` default to static.
 */
export function posTrack({ x = 0, y = 0, xKeys, yKeys } = {}) {
  const tx = xKeys ? track(xKeys, { rest: x }) : x
  const ty = yKeys ? track(yKeys, { rest: y }) : y
  return splitPosition(tx, ty)
}

// The object's centre rests here, a little below the canvas centre to leave
// room for the hop.
export const REST_CENTER_Y = STAGE.groundY - STAGE.objectRadius

/**
 * Transform for the null that carries the object. Children draw in art
 * units centred on the object; the anchor is the object's bottom edge, so
 * squash keeps it on the ground.
 *
 * - `artRadius`: the art's bounding circle, which is drawn at STAGE.objectRadius.
 * - `bottom`: how far below the centre the object's lowest point is
 *   (defaults to the full radius, for a ball).
 * - `height` and `squash`: scale the hops and squash for heavier or rigid objects.
 * - `still`: no hop at all (for objects that animate their own parts).
 */
export function rigTransform({ artRadius, bottom = artRadius, height = 1, squash = 1, still = false }) {
  const scale = (STAGE.objectRadius / artRadius) * 100
  const groundY = REST_CENTER_Y + (bottom * scale) / 100
  if (still) {
    return transform({ p: [STAGE.centerX, groundY, 0], a: [0, bottom, 0], s: [scale, scale, 100] })
  }
  return transform({
    p: splitPosition(STAGE.centerX, hopY({ groundY, height })),
    a: [0, bottom, 0],
    s: squashScale(scale, squash),
  })
}

function dedupe(keys) {
  return keys.filter((key, index) => index === 0 || key.t !== keys[index - 1].t)
}
