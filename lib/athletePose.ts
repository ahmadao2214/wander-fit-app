/**
 * Faceless silhouette athletes for the reveal's category tiles, drawn in code
 * (ported from docs/first-run-v2/prototype/athlete.js).
 *
 * A 2D skeleton with absolute joint angles (0° points straight down, 90° the
 * way the athlete faces, 180° straight up). Bodies are shaped masses: a
 * tapered torso, limbs that narrow joint to joint, a head and neck, and feet.
 * Each category has keyframed poses; the lit tile plays its move once and the
 * others hold a still. This file only computes shapes; `Athlete.tsx` draws them.
 */
import { mixHex, type CategoryId } from './firstRunStory'

const L = { torso: 30, neck: 5, head: 7.2, upper: 16, fore: 15, thigh: 21, shin: 21, foot: 9 }
const rad = (a: number) => (a * Math.PI) / 180
type Pt = [number, number]
const step = (x: number, y: number, ang: number, len: number): Pt => [
  x + Math.sin(rad(ang)) * len,
  y + Math.cos(rad(ang)) * len,
]

/** [rootX, rootY, torso, farUpper, farFore, nearUpper, nearFore, farThigh, farShin, nearThigh, nearShin, tool] */
export type Pose = number[] & { flip?: boolean }

interface Frame {
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
export const ATHLETE_VIEWBOX = '-8 -22 116 142'

const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)

/** The pose `k` (0 → 1) of the way through the athlete's move. */
export function poseAt(cat: CategoryId, k: number): Pose {
  const f = ATHLETES[cat].frames
  let i = 0
  while (i < f.length - 2 && k > f[i + 1].t) i++
  const a = f[i]
  const b = f[i + 1]
  const local = ease(Math.min(1, Math.max(0, (k - a.t) / (b.t - a.t))))
  const p = a.p.map((v, j) => lerp(v, b.p[j], local)) as Pose
  p.flip = local >= 0.5 ? !!b.flip : !!a.flip
  return p
}

export type Shape =
  | { kind: 'polygon'; points: string; fill: string }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill: string }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rotate: number; fill: string }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; r: number; fill: string }

/** Opaque colors mixed against the tile, so overlapping limbs don't show seams. */
export function athleteColors(lit: boolean, tile: string) {
  return lit
    ? { body: '#FFFFFF', far: mixHex('#FFFFFF', tile, 0.66), kit: mixHex('#0B1220', tile, 0.28), tool: '#0B1220' }
    : {
        body: mixHex('#FFFFFF', tile, 0.24),
        far: mixHex('#FFFFFF', tile, 0.15),
        kit: mixHex('#FFFFFF', tile, 0.34),
        tool: mixHex('#FFFFFF', tile, 0.22),
      }
}

const r1 = (v: number) => Math.round(v * 10) / 10

/** A segment that narrows from w1 to w2, with rounded joints. */
function taper(out: Shape[], x1: number, y1: number, x2: number, y2: number, w1: number, w2: number, fill: string, round = true) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const pts: Pt[] = [
    [x1 + (nx * w1) / 2, y1 + (ny * w1) / 2],
    [x2 + (nx * w2) / 2, y2 + (ny * w2) / 2],
    [x2 - (nx * w2) / 2, y2 - (ny * w2) / 2],
    [x1 - (nx * w1) / 2, y1 - (ny * w1) / 2],
  ]
  out.push({ kind: 'polygon', points: pts.map((p) => `${r1(p[0])},${r1(p[1])}`).join(' '), fill })
  if (round) {
    out.push({ kind: 'circle', cx: r1(x1), cy: r1(y1), r: r1(w1 / 2), fill })
    out.push({ kind: 'circle', cx: r1(x2), cy: r1(y2), r: r1(w2 / 2), fill })
  }
}

/** Every shape for one frame, back to front. */
export function athleteShapes(cat: CategoryId, pose: Pose, lit: boolean, tile: string): Shape[] {
  const def = ATHLETES[cat]
  const female = !!def.female
  const [rx, ry, tor, fu, ff, nu, nf, ft, fs, nt, ns, tool] = pose
  const c = athleteColors(lit, tile)
  const W = female
    ? { sh: 15, waist: 10, hip: 13, ua: [6.5, 5], fa: [5, 3.8], th: [11, 7], sn: [7, 4.6] }
    : { sh: 19, waist: 12, hip: 14, ua: [8, 6], fa: [6, 4.4], th: [12.5, 8], sn: [8, 5] }
  const out: Shape[] = []
  const [sx, sy] = step(rx, ry, tor, L.torso)

  const arm = (u: number, f: number, color: string, kit?: string): Pt => {
    const [ex, ey] = step(sx, sy, u, L.upper)
    const [hx, hy] = step(ex, ey, f, L.fore)
    taper(out, sx, sy, ex, ey, W.ua[0], W.ua[1], color)
    taper(out, ex, ey, hx, hy, W.fa[0], W.fa[1], color)
    out.push({ kind: 'circle', cx: r1(hx), cy: r1(hy), r: r1(W.fa[1] * 0.75), fill: color })
    if (kit) {
      const [kx, ky] = step(sx, sy, u, L.upper * 0.45)
      taper(out, sx, sy, kx, ky, W.ua[0] + 1.5, W.ua[0] + 1, kit, false)
    }
    return [hx, hy]
  }
  const leg = (t: number, s: number, color: string, kit?: string) => {
    const [kx, ky] = step(rx, ry, t, L.thigh)
    const [ax, ay] = step(kx, ky, s, L.shin)
    const [tx, ty] = step(ax, ay, s + 90, L.foot)
    taper(out, rx, ry, kx, ky, W.th[0], W.th[1], color)
    taper(out, kx, ky, ax, ay, W.sn[0], W.sn[1], color)
    taper(out, ax, ay, tx, ty, W.sn[1] + 1, 3.5, color)
    if (kit) {
      const [mx, my] = step(rx, ry, t, L.thigh * 0.55)
      taper(out, rx, ry, mx, my, W.th[0] + 1.5, W.th[0] + 0.5, kit, false)
    }
  }

  if (def.tool === 'sled') {
    const [ex, ey] = step(sx, sy, nu, L.upper)
    const [hx, hy] = step(ex, ey, nf, L.fore)
    const g = 117 // ground
    out.push({ kind: 'rect', x: r1(hx + 1), y: r1(hy - 4), width: 5, height: r1(g - hy), r: 2, fill: c.tool })
    out.push({ kind: 'rect', x: r1(hx - 2), y: g - 5, width: 32, height: 5, r: 2.5, fill: c.tool })
    out.push({ kind: 'rect', x: r1(hx + 11), y: g - 17, width: 13, height: 12, r: 2, fill: c.tool })
  }
  arm(fu, ff, c.far)
  leg(ft, fs, c.far)
  // torso: shoulders wider than the waist, then the hips
  const [wx, wy] = step(rx, ry, tor, L.torso * 0.35)
  taper(out, sx, sy, wx, wy, W.sh, W.waist, c.body)
  taper(out, wx, wy, rx, ry, W.waist, W.hip, c.body)
  const [k1x, k1y] = step(sx, sy, tor + 180, 1.5)
  const [k2x, k2y] = step(sx, sy, tor + 180, L.torso * 0.66)
  taper(out, k1x, k1y, k2x, k2y, W.sh, W.waist + 0.5, c.kit, false)
  const [nx, ny] = step(sx, sy, tor, L.neck)
  taper(out, sx, sy, nx, ny, 6, 5, c.body)
  const [hx, hy] = step(sx, sy, tor, L.neck + L.head)
  out.push({ kind: 'ellipse', cx: r1(hx), cy: r1(hy), rx: r1(L.head * 0.9), ry: L.head, rotate: r1(180 - tor), fill: c.body })
  if (female) {
    const [px, py] = step(hx, hy, tor + 205, L.head)
    const [qx, qy] = step(px, py, tor + 160, 9)
    taper(out, px, py, qx, qy, 5, 2.5, c.body)
  }
  leg(nt, ns, c.body, c.kit)
  const [hx2, hy2] = arm(nu, nf, c.body, c.kit)
  if (def.tool === 'bat') {
    const [bx, by] = step(hx2, hy2, tool, 30)
    taper(out, hx2, hy2, bx, by, 2.6, 4.2, c.tool)
  }
  return out
}
