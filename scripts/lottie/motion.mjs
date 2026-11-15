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
export function hopY({ groundY } = STAGE) {
  const keys = [
    { t: 0, v: groundY },
    { t: BEATS.takeoff, v: groundY, ease: EASE.rise },
  ]
  BEATS.hops.forEach((hop, index) => {
    if (index > 0) keys.push({ t: hop.up, v: groundY, ease: EASE.rise })
    keys.push({ t: hop.peak, v: groundY - hop.height, ease: EASE.fall })
    keys.push({ t: hop.land, v: groundY })
  })
  keys.push({ t: LOOP_FRAMES, v: groundY })
  return animated(dedupe(keys))
}

/** Squash before takeoff and on the first two landings, around the bottom edge. */
export function squashScale(base) {
  const s = (x, y) => [base * x, base * y, 100]
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

/** One full turn across the hops, slowing into the rest. */
export function spin(turnDegrees = -360) {
  return animated([
    { t: 0, v: 0 },
    { t: BEATS.takeoff, v: 0, ease: EASE.settle },
    { t: BEATS.settled, v: turnDegrees },
    { t: LOOP_FRAMES, v: turnDegrees },
  ])
}

/**
 * Transform for the null that carries the object. Children draw in art
 * units centred on the object; the anchor is the object's bottom edge, so
 * squash keeps it on the ground.
 */
export function rigTransform({ artRadius }) {
  const scale = (STAGE.objectRadius / artRadius) * 100
  return transform({
    p: splitPosition(STAGE.centerX, hopY()),
    a: [0, artRadius, 0],
    s: squashScale(scale),
  })
}

function dedupe(keys) {
  return keys.filter((key, index) => index === 0 || key.t !== keys[index - 1].t)
}
