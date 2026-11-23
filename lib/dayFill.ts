/**
 * The Days screen's tile choreography, one per movement family
 * (docs/first-run-v2/STORYBOARD.md, "Training days"). Pure keyframes, so the
 * timing and the geometry are tested without rendering.
 *
 * The ball and the fill share one coordinate system: both are measured in
 * points from the tile's top. The fill's surface is at `H * (1 - fill)`, and
 * a ball resting on it has its top at `surface - BALL`.
 */
import type { MovementFamily } from './firstRunStory'

export type DayEasing = 'linear' | 'in' | 'out' | 'inOut' | 'page'

/** A value reached at `at` ms, eased from the key before it. */
export interface Key {
  at: number
  v: number
  easing?: DayEasing
}

export interface DayChoreography {
  duration: number
  /** 0 empty, 1 full. */
  fill: Key[]
  /** Ball top, in points from the tile's top. */
  ballY: Key[]
  ballOpacity: Key[]
  /** Degrees. */
  ballRotate: Key[]
  /** The water ripple's travel, 0 → 1 of its width, and its opacity. */
  wave: Key[]
  waveOpacity: Key[]
}

export const BALL = 34

/** Where the fill's surface is, from the tile's top. */
export const surfaceY = (H: number, fill: number) => H * (1 - fill)

const still = (v: number): Key[] => [{ at: 0, v }]

/** The plain gauge fill every other family uses until it's designed. */
function plain(on: boolean, H: number): DayChoreography {
  return {
    duration: 200,
    fill: [
      { at: 0, v: on ? 0 : 1 },
      { at: 200, v: on ? 1 : 0, easing: 'page' },
    ],
    ballY: still(-BALL),
    ballOpacity: still(0),
    ballRotate: still(0),
    wave: still(0),
    waveOpacity: still(0),
  }
}

function roll(on: boolean, H: number): DayChoreography {
  // An even roll (no front-loaded easing), so the ball stays visible the whole way up.
  const ms = on ? 950 : 650
  const [from, to] = on ? [0, 1] : [1, 0]
  const ride = (k: number) => surfaceY(H, k) - BALL * 0.6 // half-sunk at the surface
  const total = ms + 130
  return {
    duration: total,
    fill: [
      { at: 0, v: from },
      { at: ms, v: to, easing: 'inOut' },
    ],
    ballY: [
      { at: 0, v: ride(from) },
      { at: ms, v: ride(to), easing: 'inOut' },
      { at: total, v: ride(to) + (on ? -14 : 0), easing: 'inOut' },
    ],
    ballOpacity: [
      { at: 0, v: 1 },
      { at: ms, v: 1 },
      { at: total, v: 0 },
    ],
    ballRotate: [
      { at: 0, v: 0 },
      { at: ms, v: on ? -540 : 540, easing: 'inOut' },
      { at: total, v: on ? -600 : 600, easing: 'inOut' },
    ],
    wave: still(0),
    waveOpacity: still(0),
  }
}

/** The three dribble contacts, in ms, for a tile turning on. */
export const BOUNCE_MS = 1150
export const BOUNCE_CONTACTS = [0.22, 0.5, 0.76].map((t) => Math.round(t * BOUNCE_MS))

function bounce(on: boolean, H: number): DayChoreography {
  if (!on) {
    return {
      ...plain(false, H),
      duration: 420,
      fill: [
        { at: 0, v: 1 },
        { at: 420, v: 0, easing: 'page' },
      ],
    }
  }
  const at = (t: number) => Math.round(t * BOUNCE_MS)
  const top = (k: number) => surfaceY(H, k) - BALL
  const third = 1 / 3
  // Exactly three dribbles. Each contact lands on the current surface and raises it a third.
  return {
    duration: BOUNCE_MS,
    ballY: [
      { at: 0, v: -BALL },
      { at: at(0.22), v: top(0), easing: 'in' }, // contact 1
      { at: at(0.36), v: top(third) - 40, easing: 'out' },
      { at: at(0.5), v: top(third), easing: 'in' }, // contact 2
      { at: at(0.62), v: top(2 * third) - 32, easing: 'out' },
      { at: at(0.76), v: top(2 * third), easing: 'in' }, // contact 3
      { at: at(0.94), v: -BALL, easing: 'out' },
    ],
    ballOpacity: [
      { at: 0, v: 1 },
      { at: at(0.94), v: 1 },
      { at: BOUNCE_MS, v: 0 },
    ],
    fill: [
      { at: 0, v: 0 },
      { at: at(0.22), v: 0 },
      { at: at(0.28), v: third },
      { at: at(0.5), v: third },
      { at: at(0.56), v: 2 * third },
      { at: at(0.76), v: 2 * third },
      { at: at(0.82), v: 1 },
    ],
    ballRotate: still(0),
    wave: still(0),
    waveOpacity: still(0),
  }
}

function water(on: boolean, H: number): DayChoreography {
  // The day fills like a lane; the surface ripples, then settles.
  const ms = on ? 900 : 520
  return {
    duration: on ? 1300 : ms,
    fill: [
      { at: 0, v: on ? 0 : 1 },
      { at: ms, v: on ? 1 : 0, easing: 'page' },
    ],
    ballY: still(-BALL),
    ballOpacity: still(0),
    ballRotate: still(0),
    wave: on
      ? [
          { at: 0, v: 0 },
          { at: 1040, v: 0.5, easing: 'out' },
          { at: 1300, v: 0.6, easing: 'out' },
        ]
      : still(0),
    waveOpacity: on
      ? [
          { at: 0, v: 1 },
          { at: 1040, v: 1 },
          { at: 1300, v: 0 },
        ]
      : still(0),
  }
}

export function dayChoreography(
  family: MovementFamily | null,
  on: boolean,
  H: number
): DayChoreography {
  if (family === 'roll') return roll(on, H)
  if (family === 'bounce') return bounce(on, H)
  if (family === 'water') return water(on, H)
  return plain(on, H)
}

/** A track's value at `ms`, linear between keys. For tests and still frames. */
export function valueAt(keys: readonly Key[], ms: number): number {
  if (ms <= keys[0].at) return keys[0].v
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]
    const b = keys[i]
    if (ms <= b.at) return b.at === a.at ? b.v : a.v + ((b.v - a.v) * (ms - a.at)) / (b.at - a.at)
  }
  return keys[keys.length - 1].v
}
