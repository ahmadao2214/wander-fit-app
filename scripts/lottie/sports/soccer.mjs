// Soccer: 100% original procedural Telstar-style soccer ball (cream body,
// charcoal pentagon panels, spherical seam lines, soft shading crescent, and
// dark outline), built on the shared bounce rig.

import {
  ART_RADIUS as R,
  INK,
  OUTLINE,
  add,
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

export const COLORS = {
  body: '#FBFBF0',
  panels: '#1F2933',
  shading: '#000000',
  outline: INK,
}

const PENTAGON_ANGLES = [0, 1, 2, 3, 4].map((k) => -90 + k * 72 + 12)

// Gently inflated center pentagon (edges bow slightly outward like a sphere).
function centerPentagon(radius) {
  const verts = PENTAGON_ANGLES.map((a) => polar(a, radius))
  const segs = verts.map((_, k) => {
    const a0 = PENTAGON_ANGLES[k]
    const p0 = verts[k]
    const p1 = verts[(k + 1) % 5]
    const midAngle = a0 + 36
    const bow = polar(midAngle, 3.5)
    return {
      c1: add([p0[0] * 0.68 + p1[0] * 0.32, p0[1] * 0.68 + p1[1] * 0.32], bow),
      c2: add([p0[0] * 0.32 + p1[0] * 0.68, p0[1] * 0.32 + p1[1] * 0.68], bow),
      to: p1,
    }
  })
  return bezier(verts[0], segs, true)
}

// Foreshortened outer pentagon flush against the rim at r = R - 0.5.
function outerPentagon(angle) {
  const rim = R - 0.5
  const apex = polar(angle, 67)
  const shL = polar(angle - 19, 82)
  const rimL = polar(angle - 14, rim)
  const rimR = polar(angle + 14, rim)
  const shR = polar(angle + 19, 82)
  return bezier(
    apex,
    [
      { c1: polar(angle - 10, 72), c2: polar(angle - 17, 78), to: shL },
      { c1: polar(angle - 18, 88), c2: polar(angle - 16, 95), to: rimL },
      ...edgeSegments(rim, angle - 14, angle + 14),
      { c1: polar(angle + 16, 95), c2: polar(angle + 18, 88), to: shR },
      { c1: polar(angle + 17, 78), c2: polar(angle + 10, 72), to: apex },
    ],
    true
  )
}

// Curved hexagon outer seam connecting adjacent outer pentagon shoulders.
function hexOuterSeam(angle) {
  const a0 = angle + 19
  const a1 = angle + 72 - 19
  const mid = angle + 36
  const start = polar(a0, 82)
  const end = polar(a1, 82)
  return bezier(start, [{ c1: polar(mid - 9, 89), c2: polar(mid + 9, 89), to: end }], false)
}

export default function soccer() {
  const centerR = 35
  const radialSeams = PENTAGON_ANGLES.map((a) => poly([polar(a, centerR - 1), polar(a, 68)], false))
  const outerSeams = PENTAGON_ANGLES.map((a) => hexOuterSeam(a))
  const panels = [centerPentagon(centerR), ...PENTAGON_ANGLES.map((a) => outerPentagon(a))]

  return buildSport({
    nm: 'soccer',
    family: 'bounce',
    layers: [
      {
        nm: 'outline',
        groups: [group('outline', [circle(0, 0, R), stroke(COLORS.outline, OUTLINE)])],
      },
      {
        nm: 'shading',
        groups: [
          ballShade(R),
          paint('gloss', [ellipse(-36, -44, 34, 18)], '#FFFFFF', { opacity: 42, rotation: -35 }),
        ],
      },
      {
        nm: 'panels',
        role: 'markings',
        groups: [
          paint('panels', panels, COLORS.panels),
          line('seams', [...radialSeams, ...outerSeams], COLORS.outline, { width: 3.4 }),
        ],
      },
      { nm: 'body', groups: [paint('body', [circle(0, 0, R)], COLORS.body)] },
    ],
  })
}
