// Tumble family: objects that flip end over end on the first two hops.

import { INK, bezier, buildSport, circle, lemon, line, paint, poly, rect, solid } from '../art.mjs'

// Oval balls rest tipped up 30°, like a ball sitting on a kicking tee. At
// that angle the lowest point is ~67 units below the centre.
const TIP = -30
const tipped = (fn) => (nm, shapes, color, opts = {}) => fn(nm, shapes, color, { ...opts, rotation: TIP })

export const football = () => {
  const s = tipped(solid)
  const l = tipped(line)
  return buildSport({
    nm: 'football',
    family: 'tumble',
    bottom: 67,
    layers: [
      {
        nm: 'football',
        groups: [
          l('laces', [-21, -7, 7, 21].map((x) => poly([[x, -28], [x, -12]], false)), '#FAFAF2', { width: 4.5 }),
          l('lace seam', [poly([[-30, -20], [30, -20]], false)], '#FAFAF2', { width: 4 }),
          l('stripes', [
            poly([[-62, -33], [-60, 33]], false),
            poly([[62, -33], [60, 33]], false),
          ], '#FAFAF2', { width: 6 }),
          s('ball', [lemon(92, 56)], '#8A4B2A'),
        ],
      },
    ],
  })
}

export const rugby = () => {
  const s = tipped(solid)
  const l = tipped(line)
  const p = tipped(paint)
  return buildSport({
    nm: 'rugby',
    family: 'tumble',
    bottom: 67,
    layers: [
      {
        nm: 'rugby',
        groups: [
          l('seam', [poly([[-84, 0], [84, 0]], false)], INK, { width: 2.5 }),
          p('red band', [poly([[-44, -50], [-30, -54], [-30, 54], [-44, 50]])], '#C8262E'),
          p('navy band', [poly([[30, -54], [44, -50], [44, 50], [30, 54]])], '#1E3A8A'),
          s('ball', [lemon(92, 56)], '#F3F0E6'),
        ],
      },
    ],
  })
}

// Shuttlecock: feather skirt up, cork down.
export const badminton = () => {
  const skirt = poly([[-17, 34], [-60, -76], [60, -76], [17, 34]])
  return buildSport({
    nm: 'badminton',
    family: 'tumble',
    bottom: 86,
    layers: [
      {
        nm: 'shuttlecock',
        groups: [
          line('band', [poly([[-27, 8], [27, 8]], false), poly([[-38, -22], [38, -22]], false)], INK, { width: 3 }),
          line('quills', [-60, -30, 0, 30, 60].map((x) => poly([[x * 0.28, 34], [x, -76]], false)), '#B8BCC2', { width: 2.5 }),
          solid('skirt', [skirt], '#FBFBF7'),
          paint('cork band', [rect(0, 41, 40, 7, 2)], '#D23A2E'),
          solid('cork', [bezier([-21, 38], [
            { c1: [-28, 70], c2: [-14, 86], to: [0, 86] },
            { c1: [14, 86], c2: [28, 70], to: [21, 38] },
            { c1: [21, 38], c2: [-21, 38], to: [-21, 38] },
          ])], '#F2EBDD'),
        ],
      },
    ],
  })
}
