// Soccer: the original LottieFiles ball (cream body, black panels, a soft
// shading crescent), with generated motion. Fixes against the old file:
// straight X/Y paths, the panels re-centred and spun about the ball's true
// centre, a dark outline so the ball reads on light tiles, and no After
// Effects effect or colour expressions.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { composition, fill, group, nullLayer, path as shapePath, shapeLayer, stroke, transform } from '../lottie.mjs'
import { CANVAS, FPS, LOOP_FRAMES, rigTransform, spin } from '../motion.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const art = JSON.parse(readFileSync(path.join(here, '../art/soccer.json'), 'utf8'))

export const COLORS = {
  body: '#FBFBF0',
  panels: '#000000',
  shading: '#000000',
  outline: '#1F2933',
}

// About 1 pt on a 44 pt icon.
const OUTLINE_WIDTH = 32

export default function soccer() {
  const op = LOOP_FRAMES
  const RIG = 5
  const circle = art.body.paths.map(shapePath)

  return composition({
    nm: 'soccer',
    fr: FPS,
    op,
    size: CANVAS,
    layers: [
      shapeLayer({
        ind: 1,
        nm: 'outline',
        op,
        parent: RIG,
        shapes: [group('outline', [...circle, stroke(COLORS.outline, OUTLINE_WIDTH)])],
      }),
      shapeLayer({
        ind: 2,
        nm: 'shading',
        op,
        parent: RIG,
        shapes: [
          group('shading', [...art.shading.paths.map(shapePath), fill(COLORS.shading, art.shading.opacity)], art.shading.offset),
        ],
      }),
      shapeLayer({
        ind: 3,
        nm: 'panels',
        op,
        parent: RIG,
        ks: transform({ r: spin() }),
        // Centred on the ball (the source had them 15 units low), so the
        // outer panels stay inside the ball while spinning.
        shapes: [group('panels', [...art.panels.paths.map(shapePath), fill(COLORS.panels)])],
      }),
      shapeLayer({
        ind: 4,
        nm: 'body',
        op,
        parent: RIG,
        shapes: [group('body', [...circle, fill(COLORS.body)])],
      }),
      nullLayer({ ind: RIG, nm: 'rig', op, ks: rigTransform({ artRadius: art.radius }) }),
    ],
  })
}
