/**
 * Faceless silhouette athletes for the reveal's category tiles, drawn in code
 * (ported from docs/first-run-v2/prototype/athlete.js).
 *
 * A 2D skeleton with absolute joint angles (0° points straight down, 90° the
 * way the athlete faces, 180° straight up), drawn pictogram-style: every part
 * is a round-capped stroke (torso, limbs, feet, a head set slightly apart,
 * the bat and the sled), so joints read smooth at any pose. Each category has
 * keyframed poses; the lit tile plays its move once and the others hold a
 * still. This file only computes the strokes; `Athlete.tsx` draws them. The
 * pose math runs as worklets, so the move plays on the UI thread.
 */
import { mixHex, type CategoryId } from './firstRunStory'

const L = { torso: 30, neck: 5, head: 7.2, upper: 16, fore: 15, thigh: 21, shin: 21, foot: 9 }
type Pt = [number, number]
function step(x: number, y: number, ang: number, len: number): Pt {
  'worklet'
  const r = (ang * Math.PI) / 180
  return [x + Math.sin(r) * len, y + Math.cos(r) * len]
}

/** [rootX, rootY, torso, farUpper, farFore, nearUpper, nearFore, farThigh, farShin, nearThigh, nearShin, tool] */
export type Pose = number[] & { flip?: boolean }

export interface Frame {
  t: number
  p: number[]
  /** The athlete faces the other way from this key on (Endurance's cut). */
  flip?: boolean
}

interface AthleteDef {
  frames: Frame[]
  ms: number
  female?: boolean
  tool?: 'bat' | 'sled'
}

export const ATHLETES: Record<CategoryId, AthleteDef> = {
  // Endurance: drive forward, plant and brake, then cut back the other way
  1: {
    frames: [
      { t: 0, p: [44, 70, 162, 50, 125, -50, 25, -35, -80, 60, 5, 0] },
      { t: 0.42, p: [50, 74, 196, 75, 110, -60, -20, -20, -45, 42, 30, 0] },
      { t: 0.58, p: [50, 74, 196, 75, 110, -60, -20, -20, -45, 42, 30, 0], flip: true },
      { t: 1, p: [50, 70, 150, -45, 30, 55, 130, 65, 5, -40, -85, 0], flip: true },
    ],
    ms: 900,
    female: true,
  },
  // Power: load, take off arms-first, land soft
  2: {
    frames: [
      { t: 0, p: [48, 84, 135, -55, -30, -55, -30, 75, -15, 70, -20, 0] },
      { t: 0.42, p: [50, 60, 178, 160, 172, 150, 168, 4, -8, 10, -2, 0] },
      { t: 0.7, p: [50, 62, 176, 150, 165, 140, 160, 15, -20, 25, -5, 0] },
      { t: 1, p: [50, 80, 145, 40, 80, 30, 70, 65, -10, 60, -15, 0] },
    ],
    ms: 1000,
  },
  // Rotation: coil, the back hip drives first, then the shoulders and bat follow through
  3: {
    frames: [
      { t: 0, p: [46, 72, 176, -70, 160, -60, 165, -26, -6, 28, 6, 205] },
      { t: 0.3, p: [46, 72, 178, -72, 158, -62, 163, -26, -6, 28, 6, 208] },
      { t: 0.5, p: [49, 72, 176, -60, 150, -50, 155, 8, -45, 26, 4, 215] },
      { t: 0.68, p: [51, 72, 166, 62, 95, 72, 92, 14, -55, 26, 4, 92] },
      { t: 1, p: [52, 73, 160, 122, 205, 112, 200, 18, -62, 24, 2, 262] },
    ],
    ms: 820,
    female: true,
    tool: 'bat',
  },
  // Strength: a low drive, two steps into a sled
  4: {
    frames: [
      { t: 0, p: [21, 76, 122, 98, 92, 102, 96, 70, 0, -38, -48, 0] },
      { t: 0.5, p: [25, 76, 120, 98, 92, 102, 96, -38, -48, 70, 0, 0] },
      { t: 1, p: [29, 76, 122, 98, 92, 102, 96, 70, 0, -38, -48, 0] },
    ],
    ms: 900,
    tool: 'sled',
  },
}

/** The SVG viewBox holds each athlete's whole motion, so nothing clips at the tile edges. */
export const ATHLETE_VIEWBOX = '-8 -22 116 144'

/** The pose `k` (0 → 1) of the way through a move's keyframes. */
export function poseFrom(frames: readonly Frame[], k: number): Pose {
  'worklet'
  let i = 0
  while (i < frames.length - 2 && k > frames[i + 1].t) i++
  const a = frames[i]
  const b = frames[i + 1]
  const x = Math.min(1, Math.max(0, (k - a.t) / (b.t - a.t)))
  const local = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
  const p = a.p.map((v, j) => v + (b.p[j] - v) * local) as Pose
  p.flip = local >= 0.5 ? !!b.flip : !!a.flip
  return p
}

/** The pose `k` (0 → 1) of the way through the athlete's move. */
export function poseAt(cat: CategoryId, k: number): Pose {
  return poseFrom(ATHLETES[cat].frames, k)
}

/** One round-capped stroke. A dot (the head) is a stroke with no length. */
export interface Stroke {
  x1: number
  y1: number
  x2: number
  y2: number
  /** Stroke width, in viewBox units. */
  w: number
  color: string
}

export interface AthleteColors {
  body: string
  far: string
  tool: string
}

/** Opaque colors mixed against the tile, so overlapping limbs don't show seams. */
export function athleteColors(lit: boolean, tile: string): AthleteColors {
  return lit
    ? { body: '#FFFFFF', far: mixHex('#FFFFFF', tile, 0.62), tool: '#0B1220' }
    : {
        body: mixHex('#FFFFFF', tile, 0.24),
        far: mixHex('#FFFFFF', tile, 0.14),
        tool: mixHex('#FFFFFF', tile, 0.2),
      }
}

/** Stroke widths: torso, upper arm, forearm, thigh, shin, foot. */
const BUILD = {
  male: { torso: 16, ua: 8, fa: 7, th: 12, sn: 9, ft: 6 },
  female: { torso: 13.5, ua: 7, fa: 6, th: 11, sn: 8, ft: 5.5 },
}
const GROUND = 117

/**
 * Every stroke for one pose, back to front: the tool behind, the far arm and
 * leg, the torso and head, the near leg and arm, then the bat. The count is
 * fixed per category, so each stroke can be one animated SVG line.
 */
export function athleteStrokes(
  pose: Pose,
  female: boolean,
  tool: 'bat' | 'sled' | undefined,
  c: AthleteColors
): Stroke[] {
  'worklet'
  const W = female ? BUILD.female : BUILD.male
  const [rx, ry, tor, fu, ff, nu, nf, ft, fs, nt, ns, toolAng] = pose
  const out: Stroke[] = []
  const line = (x1: number, y1: number, x2: number, y2: number, w: number, color: string) => {
    // The Endurance cut faces the other way: mirror inside the 100-wide frame.
    out.push(
      pose.flip ? { x1: 100 - x1, y1, x2: 100 - x2, y2, w, color } : { x1, y1, x2, y2, w, color }
    )
  }
  const [sx, sy] = step(rx, ry, tor, L.torso)

  const arm = (u: number, f: number, color: string): Pt => {
    const [ex, ey] = step(sx, sy, u, L.upper)
    const [hx, hy] = step(ex, ey, f, L.fore)
    line(sx, sy, ex, ey, W.ua, color)
    line(ex, ey, hx, hy, W.fa, color)
    return [hx, hy]
  }
  const leg = (t: number, s: number, color: string) => {
    const [kx, ky] = step(rx, ry, t, L.thigh)
    const [ax, ay] = step(kx, ky, s, L.shin)
    const [tx, ty] = step(ax, ay, s + 90, L.foot - W.ft / 2)
    line(rx, ry, kx, ky, W.th, color)
    line(kx, ky, ax, ay, W.sn, color)
    line(ax, ay, tx, ty, W.ft, color)
  }

  if (tool === 'sled') {
    // A push sled seen side-on: the post the hands drive into, the runner
    // along the ground, and a stack of plates on the back of it.
    const [ex, ey] = step(sx, sy, nu, L.upper)
    const [hx, hy] = step(ex, ey, nf, L.fore)
    line(hx + 1, hy - 1, hx + 4, GROUND - 3, 4.5, c.tool)
    line(hx - 4, GROUND - 2, hx + 15, GROUND - 2, 4.5, c.tool)
    line(hx + 10, GROUND - 5, hx + 10, GROUND - 15, 10, c.tool)
  }
  arm(fu, ff, c.far)
  leg(ft, fs, c.far)
  // The torso's round ends sit inside the shoulders and hips.
  const [t1x, t1y] = step(rx, ry, tor, W.torso * 0.3)
  const [t2x, t2y] = step(sx, sy, tor + 180, W.torso * 0.4)
  line(t1x, t1y, t2x, t2y, W.torso, c.body)
  // The head, set a little apart from the shoulders.
  const [hx, hy] = step(sx, sy, tor, L.neck + L.head + 1.5)
  line(hx, hy, hx + 0.01, hy, L.head * 2, c.body)
  if (female) {
    const [px, py] = step(hx, hy, tor + 205, L.head * 0.85)
    const [qx, qy] = step(px, py, tor + 165, 8)
    line(px, py, qx, qy, 4.5, c.body)
  }
  leg(nt, ns, c.body)
  const [hx2, hy2] = arm(nu, nf, c.body)
  if (tool === 'bat') {
    const [bx, by] = step(hx2, hy2, toolAng, 30)
    line(hx2, hy2, bx, by, 3.6, c.tool)
  }
  return out
}

/** Every stroke for one frame of a category's athlete. */
export function athleteShapes(cat: CategoryId, pose: Pose, lit: boolean, tile: string): Stroke[] {
  const def = ATHLETES[cat]
  return athleteStrokes(pose, !!def.female, def.tool, athleteColors(lit, tile))
}
