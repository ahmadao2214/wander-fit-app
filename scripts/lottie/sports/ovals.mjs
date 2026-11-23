// Spiral-pass oval balls (football, rugby) and darting shuttlecock (badminton).

import {
  INK,
  OUTLINE,
  bezier,
  buildSport,
  lemon,
  lemonY,
  line,
  paint,
  poly,
  rect,
  solid,
} from '../art.mjs'
import { EASE, transform } from '../lottie.mjs'
import { posTrack, scaleTrack, track } from '../motion.mjs'

// Oval balls rest tipped up 30°, nose aimed up-right for a spiral pass.
const TIP = -30

// Curved vertical band wrapping around a 3D lemon from x0 to x1, bowing
// gently away from the centre so it reads as painted onto a round surface.
function lemonBand(x0, x1, halfLength, halfWidth) {
  const bow = Math.sign((x0 + x1) / 2) * 7
  const y0 = lemonY(x0, halfLength, halfWidth)
  const y1 = lemonY(x1, halfLength, halfWidth)
  const cy0 = y0 * 0.55
  const cy1 = y1 * 0.55
  return bezier(
    [x0, -y0],
    [
      { c1: [x0, -y0], c2: [x1, -y1], to: [x1, -y1] },
      { c1: [x1 + bow, -cy1], c2: [x1 + bow, cy1], to: [x1, y1] },
      { c1: [x1, y1], c2: [x0, y0], to: [x0, y0] },
      { c1: [x0 + bow, cy0], c2: [x0 + bow, -cy0], to: [x0, -y0] },
    ]
  )
}

// Lower-edge shading crescent inside a lemon, matching the round balls' shade.
function lemonShade(halfLength, halfWidth) {
  const rc = (halfLength * halfLength + halfWidth * halfWidth) / (2 * halfWidth)
  const theta = 2 * Math.atan(halfWidth / halfLength)
  const k = (4 / 3) * Math.tan(theta / 4) * rc
  const tx = k * Math.cos(theta)
  const ty = k * Math.sin(theta)
  return bezier(
    [halfLength, 0],
    [
      { c1: [halfLength - tx, ty], c2: [k, halfWidth], to: [0, halfWidth] },
      { c1: [-k, halfWidth], c2: [-halfLength + tx, ty], to: [-halfLength, 0] },
      {
        c1: [-halfLength * 0.45, halfWidth * 0.62],
        c2: [halfLength * 0.45, halfWidth * 0.62],
        to: [halfLength, 0],
      },
    ]
  )
}

// Spiral flight path: brief cock-back, crisp nose-led arc, smooth settle.
function spiralFlight(pitch = 6) {
  return transform({
    p: posTrack({
      xKeys: [
        { t: 8, v: 0, ease: EASE.inOut },
        { t: 15, v: -8, ease: EASE.rise },
        { t: 36, v: 14, ease: EASE.inOut },
        { t: 62, v: 0 },
      ],
      yKeys: [
        { t: 8, v: 0, ease: EASE.inOut },
        { t: 15, v: 5, ease: EASE.rise },
        { t: 34, v: -24, ease: EASE.fall },
        { t: 54, v: 2, ease: EASE.inOut },
        { t: 64, v: 0 },
      ],
    }),
    r: track(
      [
        { t: 8, v: TIP, ease: EASE.inOut },
        { t: 15, v: TIP - pitch, ease: EASE.inOut },
        { t: 34, v: TIP + pitch * 0.9, ease: EASE.inOut },
        { t: 52, v: TIP + pitch * 1.4, ease: EASE.inOut },
        { t: 64, v: TIP },
      ],
      { rest: TIP }
    ),
  })
}

// 3D spiral roll of a surface feature (laces / seam) cycling across the front
// face of the oval ball twice with foreshortening near the top/bottom horizon.
function spiralSurfaceRoll(span = 26) {
  return transform({
    p: posTrack({
      yKeys: [
        { t: 14, v: 0, ease: EASE.linear },
        { t: 22, v: -span, ease: EASE.linear },
        { t: 24, v: span, ease: EASE.linear },
        { t: 38, v: -span, ease: EASE.linear },
        { t: 40, v: span, ease: EASE.linear },
        { t: 54, v: 0, ease: EASE.settle },
        { t: 62, v: 0 },
      ],
    }),
    s: scaleTrack([
      { t: 14, v: [100, 100], ease: EASE.inOut },
      { t: 22, v: [94, 24], ease: EASE.linear },
      { t: 24, v: [94, 24], ease: EASE.inOut },
      { t: 31, v: [100, 100], ease: EASE.inOut },
      { t: 38, v: [94, 24], ease: EASE.linear },
      { t: 40, v: [94, 24], ease: EASE.inOut },
      { t: 54, v: [100, 100] },
    ]),
    o: track(
      [
        { t: 14, v: 100, ease: EASE.linear },
        { t: 20, v: 100, ease: EASE.linear },
        { t: 22, v: 0, ease: EASE.linear },
        { t: 24, v: 0, ease: EASE.linear },
        { t: 26, v: 100, ease: EASE.linear },
        { t: 36, v: 100, ease: EASE.linear },
        { t: 38, v: 0, ease: EASE.linear },
        { t: 40, v: 0, ease: EASE.linear },
        { t: 42, v: 100, ease: EASE.linear },
        { t: 62, v: 100 },
      ],
      { rest: 100 }
    ),
  })
}

export const football = () => {
  const L = 96
  const W = 54
  return buildSport({
    nm: 'football',
    family: 'still',
    bottom: 65,
    layers: [
      {
        nm: 'outline',
        parent: 'flight',
        groups: [
          line('outline', [lemon(L, W)], INK, { width: OUTLINE }),
          paint('shade', [lemonShade(L, W)], '#000000', { opacity: 16 }),
        ],
      },
      {
        nm: 'laces',
        parent: 'flight',
        ks: spiralSurfaceRoll(25),
        groups: [
          line(
            'laces',
            [-21, -7, 7, 21].map((x) =>
              poly(
                [
                  [x, -12],
                  [x, 12],
                ],
                false
              )
            ),
            '#FAFAF2',
            { width: 5.5 }
          ),
          line(
            'lace seam',
            [
              poly(
                [
                  [-32, 0],
                  [32, 0],
                ],
                false
              ),
            ],
            '#FAFAF2',
            { width: 4.5 }
          ),
        ],
      },
      {
        nm: 'body',
        parent: 'flight',
        groups: [
          paint('stripes', [lemonBand(-64, -53, L, W), lemonBand(53, 64, L, W)], '#FAFAF2'),
          paint('body', [lemon(L, W)], '#9A4D22'),
        ],
      },
      { nm: 'flight', null: true, ks: spiralFlight(6) },
    ],
  })
}

export const rugby = () => {
  const L = 94
  const W = 58
  return buildSport({
    nm: 'rugby',
    family: 'still',
    bottom: 67,
    layers: [
      {
        nm: 'outline',
        parent: 'flight',
        groups: [
          line('outline', [lemon(L, W)], INK, { width: OUTLINE }),
          paint('shade', [lemonShade(L, W)], '#000000', { opacity: 12 }),
        ],
      },
      {
        nm: 'seam',
        parent: 'flight',
        ks: spiralSurfaceRoll(28),
        groups: [
          line(
            'seam',
            [
              poly(
                [
                  [-76, 0],
                  [76, 0],
                ],
                false
              ),
            ],
            INK,
            { width: 2.5 }
          ),
        ],
      },
      {
        nm: 'body',
        parent: 'flight',
        groups: [
          paint('red band', [lemonBand(-46, -32, L, W)], '#C8262E'),
          paint('navy band', [lemonBand(32, 46, L, W)], '#1E3A8A'),
          paint('body', [lemon(L, W)], '#F3F0E6'),
        ],
      },
      { nm: 'flight', null: true, ks: spiralFlight(5) },
    ],
  })
}

// Shuttlecock: pops up sharply, flips cork-first at the apex, floats down on
// feather drag, and rocks gently upright on its cork.
export const badminton = () => {
  const skirt = poly([
    [-17, 34],
    [-60, -76],
    [60, -76],
    [17, 34],
  ])
  return buildSport({
    nm: 'badminton',
    family: 'still',
    bottom: 86,
    layers: [
      {
        nm: 'shuttlecock',
        ks: transform({
          a: [0, 74, 0],
          p: posTrack({
            x: 0,
            y: 74,
            xKeys: [
              { t: 10, v: 0, ease: EASE.rise },
              { t: 28, v: -16, ease: EASE.inOut },
              { t: 54, v: 12, ease: EASE.settle },
              { t: 70, v: 0 },
            ],
            yKeys: [
              { t: 8, v: 74, ease: EASE.inOut },
              { t: 13, v: 78, ease: EASE.rise },
              { t: 30, v: 56, ease: EASE.inOut },
              { t: 42, v: 58, ease: EASE.fall },
              { t: 62, v: 74, ease: EASE.inOut },
              { t: 68, v: 71, ease: EASE.inOut },
              { t: 74, v: 74 },
            ],
          }),
          r: track([
            { t: 10, v: 0, ease: EASE.inOut },
            { t: 14, v: 6, ease: EASE.rise },
            { t: 28, v: -20, ease: EASE.inOut },
            { t: 46, v: 20, ease: EASE.inOut },
            { t: 62, v: 8, ease: EASE.inOut },
            { t: 70, v: -4, ease: EASE.inOut },
            { t: 78, v: 0 },
          ]),
          s: scaleTrack([
            { t: 8, v: [100, 100], ease: EASE.inOut },
            { t: 13, v: [108, 90], ease: EASE.rise },
            { t: 18, v: [96, 105], ease: EASE.inOut },
            { t: 24, v: [100, 100] },
            { t: 60, v: [100, 100], ease: EASE.inOut },
            { t: 64, v: [106, 94], ease: EASE.inOut },
            { t: 70, v: [100, 100] },
          ]),
        }),
        groups: [
          line(
            'band',
            [
              poly(
                [
                  [-27, 8],
                  [27, 8],
                ],
                false
              ),
              poly(
                [
                  [-38, -22],
                  [38, -22],
                ],
                false
              ),
            ],
            INK,
            { width: 3 }
          ),
          line(
            'quills',
            [-60, -30, 0, 30, 60].map((x) =>
              poly(
                [
                  [x * 0.28, 34],
                  [x, -76],
                ],
                false
              )
            ),
            '#B8BCC2',
            { width: 2.5 }
          ),
          solid('skirt', [skirt], '#FBFBF7'),
          paint('cork band', [rect(0, 41, 40, 7, 2)], '#D23A2E'),
          solid(
            'cork',
            [
              bezier(
                [-21, 38],
                [
                  { c1: [-28, 70], c2: [-14, 86], to: [0, 86] },
                  { c1: [14, 86], c2: [28, 70], to: [21, 38] },
                  { c1: [21, 38], c2: [-21, 38], to: [-21, 38] },
                ]
              ),
            ],
            '#F2EBDD'
          ),
        ],
      },
    ],
  })
}
