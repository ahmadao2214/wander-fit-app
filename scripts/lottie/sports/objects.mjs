// Bespoke sport animations for every non-ball sport. Each animation keeps
// frame 0 = frame 150 as its clean centred rest pose, completes its move by
// ~frame 78–82 so single-play previews land upright, and stays inside the
// 470-unit safe circle on every frame.

import { INK, OUTLINE, arc, ballShade, bezier, buildSport, circle, curve, ellipse, line, paint, poly, rect, solid } from '../art.mjs'
import { EASE, group, stroke, transform } from '../lottie.mjs'
import { posTrack, scaleTrack, track } from '../motion.mjs'

// A stroke with an outline: a wider ink stroke under the coloured one.
const strap = (nm, shapes, color, width) => [
  line(nm, shapes, color, { width }),
  line(`${nm} outline`, shapes, INK, { width: width + OUTLINE * 2 }),
]

// ── running shoes: sleek modern athletic silhouettes with running strides ───

function shoe(nm, { upper, heelColor, accent, stripe2, sole, lugs = false, spikes = false }) {
  // Sleek low-cut modern running shoe profile (no bulbous heel bump):
  // sculpted heel counter, clean ankle cutout, angled tongue, tapered toe box.
  const upperShape = curve([
    [-86, 20, 0, 0, -4, -18],
    [-76, -34, -4, 14, 6, -6],
    [-64, -36, -6, 0, 8, 8],
    [-40, -18, -12, 0, 12, 0],
    [-18, -32, -8, 6, 10, -4],
    [-4, -30, -4, -2, 10, 10],
    [24, -10, -14, -8, 18, 6],
    [70, 2, -20, -6, 18, 4],
    [88, 16, 0, -10, 0, 4],
    [86, 22, 2, 0, 0, 0],
  ])
  // Cushioned rocker midsole: thicker sculpted heel tapering to an upturned toe.
  const midsole = curve([
    [-88, 20, 0, 0, 0, 0],
    [88, 16, 0, 0, 4, 8],
    [82, 30, 8, -2, -22, 6],
    [-16, 36, 28, 0, -28, 0],
    [-82, 36, 14, 0, -8, -4],
  ])
  // Thin contoured outsole hugging the rocker midsole.
  const outsole = curve([
    [-84, 34, 0, 0, 0, 0],
    [-16, 34, -24, 0, 24, 0],
    [84, 27, -20, 5, 4, 0],
    [82, 35, 2, 0, -20, 6],
    [-16, 42, 24, 0, -24, 0],
    [-80, 42, 12, 0, -6, -2],
  ])

  const groups = [
    line('upper outline', [upperShape], INK, { width: OUTLINE }),
    line('laces', [
      [-10, -24, 4, -16],
      [2, -18, 16, -10],
      [14, -12, 28, -4],
    ].map(([a, b, c, d]) => poly([[a, b], [c, d]], false)), '#FAFAF2', { width: 4 }),
    ...(stripe2 ? [paint('stripe2', [poly([[-38, 16], [-6, -8], [4, -6], [-24, 18]])], stripe2)] : []),
    paint('stripe', [poly([[-22, 18], [14, -6], [26, -4], [-6, 19]])], accent),
    paint('heel counter', [curve([
      [-86, 20, 0, 0, -4, -14],
      [-78, -26, -2, 10, 10, 2],
      [-52, 20, -14, -16, 0, 0],
    ])], heelColor),
    paint('upper', [upperShape], upper),
    solid('midsole', [midsole], '#F8FAFC'),
    solid('outsole', [outsole], sole),
  ]
  if (lugs) {
    // Angled trail cleats hugging the contoured outsole.
    const trailLugs = [
      [-68, 41], [-48, 41], [-28, 41], [-8, 41], [14, 40], [36, 38], [58, 35],
    ].map(([x, y]) => poly([[x - 6, y], [x + 6, y], [x + 2, y + 9], [x - 5, y + 9]]))
    groups.push(solid('lugs', trailLugs, '#64748B'))
  }
  if (spikes) {
    // Bright forefoot Pebax spike plate + sharp metallic silver needle spikes.
    const plate = curve([
      [10, 34, 0, 0, 22, 0],
      [84, 27, -20, 5, 4, 0],
      [82, 35, 2, 0, -20, 6],
      [10, 41, 20, 0, 0, 0],
    ])
    const pins = [
      [24, 39], [42, 37], [60, 35], [75, 32],
    ].map(([x, y]) => poly([[x - 3.5, y], [x + 3.5, y], [x + 2, y + 13]]))
    groups.push(
      solid('spike plate', [plate], accent),
      solid('spikes', pins, '#E2E8F0'),
    )
  }

  // Genuine running stride: lifts off, pitches heel-down for strike, rolls
  // midfoot onto toe-off with cushioned compression + streaming ground dashes.
  const strideKs = spikes
    ? transform({
        a: [16, 36, 0],
        p: posTrack({
          x: 16,
          y: 36,
          xKeys: [
            { t: 8, v: 16, ease: EASE.inOut },
            { t: 16, v: 26, ease: EASE.inOut },
            { t: 26, v: 8, ease: EASE.inOut },
            { t: 36, v: 26, ease: EASE.inOut },
            { t: 46, v: 8, ease: EASE.inOut },
            { t: 56, v: 24, ease: EASE.inOut },
            { t: 68, v: 16 },
          ],
          yKeys: [
            { t: 8, v: 36, ease: EASE.rise },
            { t: 15, v: 14, ease: EASE.fall },
            { t: 23, v: 36, ease: EASE.rise },
            { t: 34, v: 14, ease: EASE.fall },
            { t: 43, v: 36, ease: EASE.rise },
            { t: 54, v: 18, ease: EASE.fall },
            { t: 65, v: 36 },
          ],
        }),
        r: track([
          { t: 8, v: 0, ease: EASE.inOut },
          { t: 14, v: 18, ease: EASE.inOut },
          { t: 22, v: -12, ease: EASE.inOut },
          { t: 33, v: 20, ease: EASE.inOut },
          { t: 42, v: -12, ease: EASE.inOut },
          { t: 53, v: 16, ease: EASE.inOut },
          { t: 65, v: 0 },
        ]),
      })
    : transform({
        a: [0, 36, 0],
        p: posTrack({
          x: 0,
          y: 36,
          xKeys: [
            { t: 8, v: 0, ease: EASE.inOut },
            { t: 20, v: 14, ease: EASE.inOut },
            { t: 34, v: -12, ease: EASE.inOut },
            { t: 48, v: 14, ease: EASE.inOut },
            { t: 62, v: -8, ease: EASE.inOut },
            { t: 74, v: 0 },
          ],
          yKeys: [
            { t: 8, v: 36, ease: EASE.rise },
            { t: 18, v: 16, ease: EASE.fall },
            { t: 28, v: 36, ease: EASE.inOut },
            { t: 34, v: 36, ease: EASE.rise },
            { t: 46, v: 16, ease: EASE.fall },
            { t: 58, v: 36, ease: EASE.inOut },
            { t: 70, v: 36 },
          ],
        }),
        r: track([
          { t: 8, v: 0, ease: EASE.inOut },
          { t: 16, v: -16, ease: EASE.inOut },
          { t: 28, v: 18, ease: EASE.inOut },
          { t: 44, v: -16, ease: EASE.inOut },
          { t: 58, v: 18, ease: EASE.inOut },
          { t: 72, v: 0 },
        ]),
      })

  const streakShapes = spikes
    ? [poly([[-44, 58], [-4, 58]], false), poly([[14, 58], [46, 58]], false)]
    : [poly([[-48, 59], [-20, 59]], false), poly([[4, 59], [30, 59]], false)]

  const groundStreaks = {
    nm: 'ground',
    ks: transform({
      p: posTrack({
        xKeys: [
          { t: 10, v: 42, ease: EASE.linear },
          { t: 38, v: -42, ease: EASE.linear },
          { t: 40, v: 42, ease: EASE.linear },
          { t: 68, v: -42, ease: EASE.linear },
          { t: 72, v: 0 },
        ],
      }),
      o: track([
        { t: 10, v: 0, ease: EASE.linear },
        { t: 14, v: 90, ease: EASE.linear },
        { t: 36, v: 90, ease: EASE.linear },
        { t: 38, v: 0, ease: EASE.linear },
        { t: 42, v: 90, ease: EASE.linear },
        { t: 64, v: 90, ease: EASE.linear },
        { t: 70, v: 0 },
      ]),
    }),
    groups: [
      line('ticks', streakShapes, spikes ? '#F8FAFC' : '#4ADE80', { width: 4.5 }),
      line('ticks outline', streakShapes, INK, { width: 9 }),
    ],
  }

  return buildSport({
    nm,
    family: 'still',
    bottom: 54,
    layers: [
      { nm: 'shoe', ks: strideKs, groups },
      groundStreaks,
    ],
  })
}

export const crossCountry = () =>
  shoe('cross-country', { upper: '#16A34A', heelColor: '#15803D', accent: '#FACC15', sole: '#475569', lugs: true })

export const trackDistance = () =>
  shoe('track-distance', { upper: '#2563EB', heelColor: '#1D4ED8', accent: '#F97316', stripe2: '#F8FAFC', sole: '#64748B', spikes: true })

// ── track sprints/jumps: explosive vaulting arc clears the planted hurdle ───

export const trackSprints = () => {
  const stripes = [-70, -42, -14, 14, 42].map((x) => rect(x + 14, -48, 14, 20))
  return buildSport({
    nm: 'track-sprints-jumps',
    family: 'still',
    bottom: 66,
    layers: [
      {
        // Bright vaulting comet head soaring cleanly over the hurdle crossbar.
        nm: 'vaulter',
        ks: transform({
          p: posTrack({
            xKeys: [
              { t: 8, v: -82, ease: EASE.linear },
              { t: 24, v: 0, ease: EASE.linear },
              { t: 40, v: 82, ease: EASE.settle },
              { t: 46, v: 0 },
            ],
            yKeys: [
              { t: 8, v: 18, ease: EASE.rise },
              { t: 24, v: -86, ease: EASE.fall },
              { t: 40, v: 18, ease: EASE.linear },
              { t: 46, v: 0 },
            ],
          }),
          r: track([
            { t: 8, v: -52, ease: EASE.inOut },
            { t: 24, v: 0, ease: EASE.inOut },
            { t: 40, v: 52, ease: EASE.linear },
            { t: 46, v: 0 },
          ]),
          o: track([
            { t: 8, v: 0, ease: EASE.linear },
            { t: 12, v: 100, ease: EASE.linear },
            { t: 36, v: 100, ease: EASE.linear },
            { t: 42, v: 0 },
          ]),
        }),
        groups: [
          paint('core', [ellipse(4, 0, 26, 12)], '#FFFFFF'),
          solid('streak', [curve([
            [-32, 0, 0, 0, 14, -8],
            [12, -8, -10, 0, 10, 0],
            [22, 0, 0, -6, 0, 6],
            [12, 8, 10, 0, -10, 0],
          ])], '#FACC15'),
        ],
      },
      {
        // Glowing arc path tracing the jump trajectory across the top of the hurdle.
        nm: 'jump arc',
        ks: transform({
          o: track([
            { t: 12, v: 0, ease: EASE.inOut },
            { t: 22, v: 75, ease: EASE.inOut },
            { t: 36, v: 55, ease: EASE.inOut },
            { t: 48, v: 0 },
          ]),
        }),
        groups: [
          line('trail', [curve([
            [-76, 8, 0, 0, 22, -78],
            [0, -86, -34, 0, 34, 0],
            [76, 8, -22, -78, 0, 0],
          ], false)], '#FACC15', { width: 5, dash: [10, 10] }),
        ],
      },
      {
        // Crossbar vibrates/dips slightly on pass-over while posts & feet stay planted.
        nm: 'board',
        ks: transform({
          p: posTrack({
            yKeys: [
              { t: 22, v: 0, ease: EASE.inOut },
              { t: 27, v: 7, ease: EASE.inOut },
              { t: 33, v: -3, ease: EASE.inOut },
              { t: 40, v: 2, ease: EASE.inOut },
              { t: 48, v: 0 },
            ],
          }),
          r: track([
            { t: 22, v: 0, ease: EASE.inOut },
            { t: 27, v: 3, ease: EASE.inOut },
            { t: 34, v: -2, ease: EASE.inOut },
            { t: 42, v: 1, ease: EASE.inOut },
            { t: 50, v: 0 },
          ]),
        }),
        groups: [
          paint('stripes', stripes, '#EF4444'),
          solid('board', [rect(0, -48, 174, 26, 3)], '#FAFAF7'),
        ],
      },
      {
        nm: 'frame',
        groups: [
          solid('posts', [rect(-70, 10, 11, 96), rect(70, 10, 11, 96)], '#CBD5E1'),
          solid('feet', [rect(-70, 60, 54, 10, 3), rect(70, 60, 54, 10, 3)], '#94A3B8'),
        ],
      },
    ],
  })
}

// ── gymnastics: parallel rings on straps, swinging from a fixed bar ─────────

export const gymnastics = () =>
  buildSport({
    nm: 'gymnastics',
    family: 'swing',
    bottom: 82,
    pivot: [0, -88],
    layers: [
      {
        nm: 'rings',
        groups: [
          ...strap('rings', [circle(-46, 46, 28), circle(46, 46, 28)], '#D99B58', 10),
          solid('buckles', [rect(-46, 12, 14, 11, 2), rect(46, 12, 14, 11, 2)], '#CBD5E1'),
          solid('mounts', [circle(-46, -84, 7), circle(46, -84, 7)], '#CBD5E1'),
          ...strap('straps', [poly([[-46, -82], [-46, 12]], false), poly([[46, -82], [46, 12]], false)], '#EFE8DA', 7),
        ],
      },
    ],
  })

// ── cheerleading: pom-pom energetic wrist shake + streamer shimmy ───────────

export const cheerleading = () => {
  const puffs = (r, grow) => [
    circle(0, -4, 58 + grow),
    ...Array.from({ length: 11 }, (_, k) => {
      const a = (k * 360) / 11 - 90
      return circle(60 * Math.cos((a * Math.PI) / 180), -4 + 60 * Math.sin((a * Math.PI) / 180), r + grow)
    }),
  ]
  const strands = Array.from({ length: 22 }, (_, k) => {
    const a = ((k * 360) / 22) * (Math.PI / 180)
    const inner = 18 + (k % 3) * 8
    const outer = 64 + (k % 2) * 10
    return poly([[inner * Math.cos(a), -4 + inner * Math.sin(a)], [outer * Math.cos(a), -4 + outer * Math.sin(a)]], false)
  })
  return buildSport({
    nm: 'cheerleading',
    family: 'still',
    bottom: 93,
    layers: [
      {
        nm: 'strands',
        parent: 'pom',
        ks: transform({
          a: [0, -4, 0],
          p: [0, -4, 0],
          r: track([
            { t: 10, v: 0, ease: EASE.inOut },
            { t: 17, v: -14, ease: EASE.inOut },
            { t: 24, v: 14, ease: EASE.inOut },
            { t: 31, v: -12, ease: EASE.inOut },
            { t: 38, v: 12, ease: EASE.inOut },
            { t: 46, v: -8, ease: EASE.inOut },
            { t: 54, v: 6, ease: EASE.inOut },
            { t: 64, v: 0 },
          ]),
        }),
        groups: [line('strands', strands, '#FFFFFF', { width: 3.5 })],
      },
      {
        nm: 'pom',
        ks: transform({
          a: [0, 86, 0],
          p: [0, 86, 0],
          r: track([
            { t: 10, v: 0, ease: EASE.inOut },
            { t: 16, v: 16, ease: EASE.inOut },
            { t: 23, v: -16, ease: EASE.inOut },
            { t: 30, v: 14, ease: EASE.inOut },
            { t: 37, v: -13, ease: EASE.inOut },
            { t: 45, v: 9, ease: EASE.inOut },
            { t: 53, v: -6, ease: EASE.inOut },
            { t: 62, v: 2.5, ease: EASE.inOut },
            { t: 70, v: 0 },
          ]),
          s: scaleTrack([
            { t: 10, v: [100, 100], ease: EASE.inOut },
            { t: 16, v: [107, 104], ease: EASE.inOut },
            { t: 23, v: [96, 105], ease: EASE.inOut },
            { t: 30, v: [106, 102], ease: EASE.inOut },
            { t: 37, v: [97, 104], ease: EASE.inOut },
            { t: 48, v: [103, 101], ease: EASE.inOut },
            { t: 64, v: [100, 100] },
          ]),
        }),
        groups: [
          paint('puffs', puffs(22, 0), '#E23B4E'),
          paint('silhouette', puffs(22, OUTLINE / 2), INK),
          solid('handle', [rect(0, 86, 20, 14, 3)], '#CBD5E1'),
        ],
      },
    ],
  })
}

// ── diving: springboard flexes & bounces on its fulcrum while stand stays bolted

export const diving = () =>
  buildSport({
    nm: 'diving',
    family: 'still',
    bottom: 79,
    layers: [
      {
        nm: 'board',
        ks: transform({
          // Pivot directly on the blue fulcrum wheel at [-24, 10].
          a: [-24, 10, 0],
          p: [-24, 10, 0],
          r: track([
            { t: 8, v: 0, ease: EASE.inOut },
            { t: 20, v: 12, ease: EASE.inOut },
            { t: 28, v: -11, ease: EASE.inOut },
            { t: 37, v: 7.5, ease: EASE.inOut },
            { t: 46, v: -5, ease: EASE.inOut },
            { t: 55, v: 3, ease: EASE.inOut },
            { t: 64, v: -1.5, ease: EASE.inOut },
            { t: 72, v: 0 },
          ]),
        }),
        groups: [
          paint('tip stripe', [poly([[56, -33], [80, -39], [83, -24], [59, -18]])], '#EF4444'),
          solid('board', [poly([[-84, 2], [82, -39], [85, -24], [-80, 17]])], '#F8FAFC'),
        ],
      },
      {
        nm: 'stand',
        groups: [
          solid('fulcrum', [circle(-24, 10, 11)], '#2563EB'),
          solid('fulcrum post', [rect(-24, 34, 12, 34, 2)], '#94A3B8'),
          solid('stand', [poly([[-78, 12], [-58, 12], [-48, 54], [-84, 54]])], '#94A3B8'),
          solid('base', [rect(-52, 56, 70, 12, 4)], '#CBD5E1'),
        ],
      },
      {
        nm: 'waves',
        ks: transform({
          p: posTrack({
            xKeys: [
              { t: 20, v: 0, ease: EASE.inOut },
              { t: 32, v: 8, ease: EASE.inOut },
              { t: 48, v: -6, ease: EASE.inOut },
              { t: 62, v: 3, ease: EASE.inOut },
              { t: 74, v: 0 },
            ],
            yKeys: [
              { t: 20, v: 0, ease: EASE.inOut },
              { t: 30, v: -4, ease: EASE.inOut },
              { t: 44, v: 3, ease: EASE.inOut },
              { t: 58, v: -2, ease: EASE.inOut },
              { t: 72, v: 0 },
            ],
          }),
        }),
        groups: [
          ...strap('wave top', [curve([
            [-2, 54, 0, 0, 14, -12],
            [28, 54, -12, -12, 12, 12],
            [58, 54, -12, 12, 12, -12],
            [86, 54, -10, -12, 0, 0],
          ], false)], '#38BDF8', 7),
          ...strap('wave bottom', [curve([
            [10, 74, 0, 0, 14, -10],
            [42, 74, -12, -10, 12, 10],
            [74, 74, -12, 10, 0, 0],
          ], false)], '#60A5FA', 6),
        ],
      },
    ],
  })

// ── combat sports ───────────────────────────────────────────────────────────

// Wrestling singlet: grounded athletic stance drop & lateral level-change fake.
export const wrestling = () => {
  const body = curve([
    [-44, -76, 0, 0, 0, 0],
    [-26, -76, 0, 0, 0, 26],
    [0, -34, -22, 0, 22, 0],
    [26, -76, 0, 26, 0, 0],
    [44, -76, 0, 0, 0, 18],
    [54, -22, -10, -14, 4, 18],
    [58, 74, 0, -12, 0, 0],
    [16, 74, 0, 0, 0, -10],
    [0, 44, 12, 0, -12, 0],
    [-16, 74, 0, -10, 0, 0],
    [-58, 74, 0, 0, 0, -12],
    [-54, -22, -4, 18, 10, -14],
  ])
  return buildSport({
    nm: 'wrestling',
    family: 'still',
    bottom: 78,
    layers: [
      {
        nm: 'singlet',
        ks: transform({
          a: [0, 74, 0],
          p: posTrack({
            x: 0,
            y: 74,
            xKeys: [
              { t: 18, v: 0, ease: EASE.inOut },
              { t: 29, v: -12, ease: EASE.inOut },
              { t: 43, v: 12, ease: EASE.inOut },
              { t: 58, v: 0 },
            ],
            yKeys: [
              { t: 8, v: 74, ease: EASE.inOut },
              { t: 18, v: 84, ease: EASE.inOut },
              { t: 48, v: 84, ease: EASE.rise },
              { t: 62, v: 72, ease: EASE.inOut },
              { t: 70, v: 74 },
            ],
          }),
          r: track([
            { t: 18, v: 0, ease: EASE.inOut },
            { t: 29, v: -7, ease: EASE.inOut },
            { t: 43, v: 7, ease: EASE.inOut },
            { t: 58, v: 0 },
          ]),
          s: scaleTrack([
            { t: 8, v: [100, 100], ease: EASE.inOut },
            { t: 18, v: [108, 89], ease: EASE.inOut },
            { t: 48, v: [108, 89], ease: EASE.inOut },
            { t: 60, v: [97, 104], ease: EASE.inOut },
            { t: 70, v: [100, 100] },
          ]),
        }),
        groups: [
          line('singlet outline', [body], INK, { width: OUTLINE }),
          line('neck trim', [curve([
            [-26, -74, 0, 0, 0, 25],
            [0, -34, -21, 0, 21, 0],
            [26, -74, 0, 25, 0, 0],
          ], false)], '#F8FAFC', { width: 5 }),
          line('leg trim', [
            poly([[-54, 67], [-18, 67]], false),
            poly([[18, 67], [54, 67]], false),
          ], '#F8FAFC', { width: 4.5 }),
          paint('side white', [
            poly([[-52, -16], [-41, -16], [-44, 64], [-55, 64]]),
            poly([[41, -16], [52, -16], [55, 64], [44, 64]]),
          ], '#F8FAFC'),
          paint('chest chevron', [
            poly([[-44, -4], [0, 18], [44, -4], [44, 10], [0, 32], [-44, 10]]),
          ], '#1E3A8A'),
          paint('chevron accent', [
            poly([[-44, -10], [0, 12], [44, -10], [44, -4], [0, 18], [-44, -4]]),
          ], '#F8FAFC'),
          paint('singlet', [body], '#DC2626'),
        ],
      },
    ],
  })
}

// Martial arts gi: grounded power-stance snap making both black belt tails whip out.
export const martialArts = () =>
  buildSport({
    nm: 'martial-arts',
    family: 'still',
    bottom: 82,
    layers: [
      {
        nm: 'knot',
        parent: 'gi',
        groups: [
          line('knot fold', [poly([[-10, 10], [10, 10]], false)], '#64748B', { width: 3 }),
          solid('knot', [rect(0, 12, 32, 28, 6)], '#26282C'),
        ],
      },
      {
        nm: 'left tail',
        parent: 'gi',
        ks: transform({
          a: [-4, 22, 0],
          p: [-4, 22, 0],
          r: track([
            { t: 10, v: 0, ease: EASE.inOut },
            { t: 21, v: 22, ease: EASE.inOut },
            { t: 34, v: -8, ease: EASE.inOut },
            { t: 46, v: 10, ease: EASE.inOut },
            { t: 58, v: -4, ease: EASE.inOut },
            { t: 68, v: 0 },
          ]),
        }),
        groups: [
          paint('tip bar', [poly([[-40, 56], [-24, 61], [-28, 71], [-44, 66]])], '#EF4444'),
          solid('tail', [poly([[-10, 22], [8, 24], [-22, 78], [-44, 70]])], '#26282C'),
        ],
      },
      {
        nm: 'right tail',
        parent: 'gi',
        ks: transform({
          a: [4, 22, 0],
          p: [4, 22, 0],
          r: track([
            { t: 10, v: 0, ease: EASE.inOut },
            { t: 21, v: -22, ease: EASE.inOut },
            { t: 34, v: 8, ease: EASE.inOut },
            { t: 46, v: -10, ease: EASE.inOut },
            { t: 58, v: 4, ease: EASE.inOut },
            { t: 68, v: 0 },
          ]),
        }),
        groups: [
          solid('tail', [poly([[-8, 24], [10, 22], [44, 70], [22, 78]])], '#26282C'),
        ],
      },
      {
        nm: 'gi',
        ks: transform({
          a: [0, 56, 0],
          p: posTrack({
            x: 0,
            y: 56,
            yKeys: [
              { t: 10, v: 56, ease: EASE.inOut },
              { t: 18, v: 62, ease: EASE.inOut },
              { t: 30, v: 54, ease: EASE.inOut },
              { t: 44, v: 58, ease: EASE.inOut },
              { t: 62, v: 56 },
            ],
          }),
          r: track([
            { t: 10, v: 0, ease: EASE.inOut },
            { t: 18, v: -6, ease: EASE.inOut },
            { t: 30, v: 6, ease: EASE.inOut },
            { t: 44, v: -3, ease: EASE.inOut },
            { t: 58, v: 0 },
          ]),
          s: scaleTrack([
            { t: 10, v: [100, 100], ease: EASE.inOut },
            { t: 18, v: [106, 94], ease: EASE.inOut },
            { t: 30, v: [102, 102], ease: EASE.inOut },
            { t: 52, v: [100, 100] },
          ]),
        }),
        groups: [
          line('belt stitching', [poly([[-74, 12], [74, 12]], false)], '#64748B', { width: 2.5, dash: [5, 4] }),
          solid('belt', [rect(0, 12, 156, 22, 4)], '#26282C'),
          line('lapel', [poly([[-28, -74], [8, 2]], false), poly([[28, -74], [-4, -18]], false)], '#94A3B8', { width: 5 }),
          solid('gi', [poly([
            [-34, -78], [0, -56], [34, -78], [76, -54], [64, -14], [56, -18], [58, 56], [-58, 56], [-56, -18], [-64, -14], [-76, -54],
          ])], '#F8FAFC'),
        ],
      },
    ],
  })

// ── swimming: buoyant goggles bobbing over opposing gliding pool waves ──────

export const swimming = () =>
  buildSport({
    nm: 'swimming',
    family: 'still',
    bottom: 68,
    layers: [
      {
        nm: 'goggles',
        ks: transform({
          p: posTrack({
            yKeys: [
              { t: 8, v: 0, ease: EASE.inOut },
              { t: 22, v: -11, ease: EASE.inOut },
              { t: 38, v: 5, ease: EASE.inOut },
              { t: 54, v: -7, ease: EASE.inOut },
              { t: 68, v: 2, ease: EASE.inOut },
              { t: 78, v: 0 },
            ],
          }),
          r: track([
            { t: 8, v: 0, ease: EASE.inOut },
            { t: 22, v: -6, ease: EASE.inOut },
            { t: 40, v: 5, ease: EASE.inOut },
            { t: 56, v: -3.5, ease: EASE.inOut },
            { t: 72, v: 0 },
          ]),
        }),
        groups: [
          paint('gloss', [
            poly([[-56, -34], [-34, -38], [-28, -28], [-50, -24]]),
            poly([[28, -34], [50, -38], [56, -28], [34, -24]]),
          ], '#FFFFFF', { opacity: 80 }),
          paint('lenses', [rect(-42, -22, 52, 34, 14), rect(42, -22, 52, 34, 14)], '#0EA5E9'),
          solid('gaskets', [rect(-42, -22, 66, 48, 18), rect(42, -22, 66, 48, 18)], '#F8FAFC'),
          ...strap('bridge', [arc(0, -14, 13, 205, 335)], '#CBD5E1', 7),
          ...strap('side straps', [
            curve([[-74, -22, 0, 0, -14, -4], [-88, -32, 0, 10, 4, -10], [-74, -44, -10, 0, 0, 0]], false),
            curve([[74, -22, 0, 0, 14, -4], [88, -32, 0, 10, -4, -10], [74, -44, 10, 0, 0, 0]], false),
          ], '#94A3B8', 7),
        ],
      },
      {
        nm: 'wave top',
        ks: transform({
          p: posTrack({
            xKeys: [
              { t: 8, v: 0, ease: EASE.inOut },
              { t: 26, v: 12, ease: EASE.inOut },
              { t: 50, v: -10, ease: EASE.inOut },
              { t: 74, v: 0 },
            ],
            yKeys: [
              { t: 8, v: 0, ease: EASE.inOut },
              { t: 24, v: -4, ease: EASE.inOut },
              { t: 46, v: 4, ease: EASE.inOut },
              { t: 72, v: 0 },
            ],
          }),
        }),
        groups: [
          ...strap('wave top', [curve([
            [-76, 36, 0, 0, 18, -14],
            [-38, 36, -16, -14, 16, 14],
            [0, 36, -16, 14, 16, -14],
            [38, 36, -16, -14, 16, 14],
            [76, 36, -18, 14, 0, 0],
          ], false)], '#38BDF8', 7),
        ],
      },
      {
        nm: 'wave bottom',
        ks: transform({
          p: posTrack({
            xKeys: [
              { t: 8, v: 0, ease: EASE.inOut },
              { t: 28, v: -12, ease: EASE.inOut },
              { t: 52, v: 10, ease: EASE.inOut },
              { t: 74, v: 0 },
            ],
            yKeys: [
              { t: 8, v: 0, ease: EASE.inOut },
              { t: 26, v: 4, ease: EASE.inOut },
              { t: 48, v: -4, ease: EASE.inOut },
              { t: 72, v: 0 },
            ],
          }),
        }),
        groups: [
          ...strap('wave bottom', [curve([
            [-60, 60, 0, 0, 18, -12],
            [-20, 60, -16, -12, 16, 12],
            [20, 60, -16, 12, 16, -12],
            [60, 60, -18, -12, 0, 0],
          ], false)], '#0284C7', 6.5),
        ],
      },
    ],
  })

// ── ice hockey: bright taped hockey stick slaps the puck across the ice ─────

export const iceHockey = () => {
  // Classic hockey stick: angled composite shaft into a long flat ice blade
  // with crisp white blade tape so it pops on dark and light tiles.
  const stickShape = curve([
    [-70, -68, 0, 0, 0, 0],
    [-55, -74, 0, 0, 0, 0],
    [-12, 48, -4, -10, 4, 8],
    [22, 50, -8, 2, 10, 0],
    [26, 66, 4, -6, -4, 6],
    [-22, 70, 10, 0, -14, -4],
  ])
  return buildSport({
    nm: 'ice-hockey',
    family: 'still',
    bottom: 76,
    layers: [
      {
        nm: 'puck',
        ks: transform({
          p: posTrack({
            xKeys: [
              { t: 26, v: 0, ease: EASE.rise },
              { t: 42, v: 36, ease: EASE.settle },
              { t: 52, v: 36, ease: EASE.inOut },
              { t: 72, v: 0 },
            ],
          }),
        }),
        groups: [
          line('rim highlight', [ellipse(42, 50, 42, 10)], '#CBD5E1', { width: 2.5 }),
          solid('top', [ellipse(42, 50, 50, 15)], '#64748B'),
          line('grip', [27, 36, 45, 54].map((x) => poly([[x, 57], [x, 66]], false)), '#94A3B8', { width: 2.5 }),
          solid('side', [bezier([17, 50], [
            { c1: [17, 50], c2: [17, 65], to: [17, 65] },
            { c1: [17, 71], c2: [29, 75], to: [42, 75] },
            { c1: [55, 75], c2: [67, 71], to: [67, 65] },
            { c1: [67, 65], c2: [67, 50], to: [67, 50] },
            { c1: [67, 50], c2: [17, 50], to: [17, 50] },
          ])], '#475569'),
        ],
      },
      {
        nm: 'stick',
        ks: transform({
          a: [-62, -70, 0],
          p: posTrack({
            x: -62,
            y: -70,
            xKeys: [
              { t: 21, v: -62, ease: EASE.rise },
              { t: 29, v: -54, ease: EASE.settle },
              { t: 50, v: -56, ease: EASE.inOut },
              { t: 72, v: -62 },
            ],
          }),
          r: track([
            { t: 8, v: 0, ease: EASE.inOut },
            { t: 21, v: 24, ease: EASE.inOut },
            { t: 27, v: -4, ease: EASE.rise },
            { t: 35, v: -18, ease: EASE.settle },
            { t: 52, v: -14, ease: EASE.inOut },
            { t: 72, v: 0 },
          ]),
        }),
        groups: [
          line('stick outline', [stickShape], INK, { width: OUTLINE }),
          line('blade wraps', [
            poly([[-4, 52], [-2, 69]], false),
            poly([[8, 52], [10, 68]], false),
            poly([[18, 52], [19, 67]], false),
          ], '#64748B', { width: 3 }),
          paint('blade tape', [poly([[-12, 50], [26, 50], [26, 68], [-16, 70]])], '#F8FAFC'),
          paint('shaft red', [poly([[-44, -8], [-29, -14], [-21, 8], [-36, 14]])], '#EF4444'),
          paint('shaft blue', [poly([[-36, 14], [-21, 8], [-15, 24], [-30, 30]])], '#2563EB'),
          paint('top grip', [poly([[-70, -68], [-55, -74], [-46, -46], [-61, -40]])], '#38BDF8'),
          paint('stick body', [stickShape], '#E2E8F0'),
        ],
      },
    ],
  })
}

// ── strength: barbell lift + bumper-plate drop, dumbbell curl reps ──────────

export const weightlifting = () =>
  buildSport({
    nm: 'weightlifting',
    family: 'still',
    bottom: 65,
    layers: [
      {
        nm: 'barbell',
        ks: transform({
          p: posTrack({
            yKeys: [
              { t: 8, v: 0, ease: EASE.inOut },
              { t: 13, v: 5, ease: EASE.rise },
              { t: 28, v: -42, ease: EASE.settle },
              { t: 40, v: -42, ease: EASE.fall },
              { t: 52, v: 0, ease: EASE.rise },
              { t: 58, v: -13, ease: EASE.fall },
              { t: 64, v: 0, ease: EASE.rise },
              { t: 68, v: -4, ease: EASE.fall },
              { t: 73, v: 0 },
            ],
          }),
          r: track([
            { t: 50, v: 0, ease: EASE.inOut },
            { t: 54, v: -2.5, ease: EASE.inOut },
            { t: 60, v: 2, ease: EASE.inOut },
            { t: 66, v: -1, ease: EASE.inOut },
            { t: 72, v: 0 },
          ]),
          s: scaleTrack([
            { t: 26, v: [100, 100], ease: EASE.inOut },
            { t: 30, v: [103, 97], ease: EASE.inOut },
            { t: 36, v: [100, 100] },
            { t: 50, v: [100, 100], ease: EASE.inOut },
            { t: 53, v: [104, 95], ease: EASE.inOut },
            { t: 58, v: [100, 100] },
          ]),
        }),
        groups: [
          solid('collars', [rect(-35, 0, 9, 28, 2), rect(35, 0, 9, 28, 2)], '#E2E8F0'),
          solid('blue plates', [rect(-48, 0, 15, 98, 4), rect(48, 0, 15, 98, 4)], '#3B82F6'),
          solid('red plates', [rect(-65, 0, 18, 122, 4), rect(65, 0, 18, 122, 4)], '#EF4444'),
          solid('bar', [rect(0, 0, 196, 9, 4)], '#CBD5E1'),
        ],
      },
    ],
  })

export const generalFitness = () => {
  const rot = -35
  return buildSport({
    nm: 'general-fitness',
    family: 'still',
    bottom: 72,
    layers: [
      {
        nm: 'dumbbell',
        ks: transform({
          p: posTrack({
            yKeys: [
              { t: 8, v: 0, ease: EASE.inOut },
              { t: 22, v: -24, ease: EASE.inOut },
              { t: 38, v: 0, ease: EASE.inOut },
              { t: 52, v: -24, ease: EASE.inOut },
              { t: 70, v: 0 },
            ],
          }),
          r: track([
            { t: 8, v: 0, ease: EASE.inOut },
            { t: 22, v: 32, ease: EASE.inOut },
            { t: 38, v: 0, ease: EASE.inOut },
            { t: 52, v: 32, ease: EASE.inOut },
            { t: 70, v: 0 },
          ]),
        }),
        groups: [
          line('knurling', [-16, -6, 6, 16].map((x) => poly([[x, -7], [x, 7]], false)), '#64748B', { width: 2.5, rotation: rot }),
          solid('outer plates', [rect(-75, 0, 18, 62, 6), rect(75, 0, 18, 62, 6)], '#475569', { rotation: rot }),
          paint('plate bevel', [rect(-58, -12, 18, 36, 4), rect(50, -12, 18, 36, 4)], '#94A3B8', { opacity: 55, rotation: rot }),
          solid('main plates', [rect(-54, 0, 28, 86, 8), rect(54, 0, 28, 86, 8)], '#64748B', { rotation: rot }),
          solid('collars', [rect(-37, 0, 11, 46, 3), rect(37, 0, 11, 46, 3)], '#3B82F6', { rotation: rot }),
          solid('handle', [rect(0, 0, 74, 18, 4)], '#CBD5E1', { rotation: rot }),
        ],
      },
    ],
  })
}

// ── lacrosse: crosse cradles back, whips forward, launches and catches ball ─

export const lacrosse = () => {
  const rot = 36
  const shift = [-6, 0]
  const head = curve([
    [0, -82, -26, 0, 26, 0],
    [36, -54, 0, -20, -4, 18],
    [13, -6, 10, -12, 0, 0],
    [-13, -6, 0, 0, -10, -12],
    [-36, -54, 4, 18, 0, -20],
  ])
  const mesh = [
    poly([[-22, -68], [16, -24]], false),
    poly([[22, -68], [-16, -24]], false),
    poly([[-30, -52], [20, -48]], false),
    poly([[-24, -36], [24, -36]], false),
    poly([[0, -76], [0, -12]], false),
  ]
  return buildSport({
    nm: 'lacrosse',
    family: 'still',
    bottom: 82,
    layers: [
      {
        nm: 'ball',
        ks: transform({
          p: posTrack({
            xKeys: [
              { t: 8, v: 0, ease: EASE.inOut },
              { t: 21, v: 26, ease: EASE.rise },
              { t: 27, v: -6, ease: EASE.rise },
              { t: 42, v: -28, ease: EASE.inOut },
              { t: 58, v: -10, ease: EASE.settle },
              { t: 70, v: 0 },
            ],
            yKeys: [
              { t: 8, v: 0, ease: EASE.inOut },
              { t: 21, v: 8, ease: EASE.rise },
              { t: 27, v: -16, ease: EASE.rise },
              { t: 42, v: -44, ease: EASE.fall },
              { t: 58, v: 4, ease: EASE.inOut },
              { t: 70, v: 0 },
            ],
          }),
        }),
        groups: [
          paint('ball gloss', [ellipse(0, 0, 12, 7)], '#FFFFFF', { opacity: 65, offset: [-52, -42], rotation: -35 }),
          solid('ball', [circle(-44, -34, 24)], '#FACC15'),
        ],
      },
      {
        nm: 'stick',
        ks: transform({
          a: [-44, 62, 0],
          p: [-44, 62, 0],
          r: track([
            { t: 8, v: 0, ease: EASE.inOut },
            { t: 21, v: 22, ease: EASE.inOut },
            { t: 31, v: -26, ease: EASE.settle },
            { t: 48, v: -20, ease: EASE.inOut },
            { t: 60, v: 6, ease: EASE.inOut },
            { t: 70, v: 0 },
          ]),
        }),
        groups: [
          solid('butt cap', [rect(0, 82, 16, 14, 4)], '#1E3A8A', { offset: shift, rotation: rot }),
          solid('grip', [rect(0, 56, 14, 44, 3)], '#2563EB', { offset: shift, rotation: rot }),
          solid('shaft', [rect(0, 20, 12, 56, 2)], '#CBD5E1', { offset: shift, rotation: rot }),
          line('head', [head], '#F8FAFC', { width: 8, offset: shift, rotation: rot }),
          line('head outline', [head], INK, { width: 8 + OUTLINE * 2, offset: shift, rotation: rot }),
          line('mesh', mesh, '#CBD5E1', { width: 2.5, offset: shift, rotation: rot }),
          paint('pocket', [head], '#1E293B', { opacity: 50, offset: shift, rotation: rot }),
        ],
      },
    ],
  })
}

// ── field hockey: flat-faced curved J-hook stick strikes the dimpled ball ───

export const fieldHockey = () => {
  // Authentic field hockey stick facing right: sturdy angled shaft sweeping
  // into a compact, thick curved toe so the flat hitting face strikes the ball.
  const stickShape = curve([
    [-64, -68, 0, 0, 0, 0],
    [-48, -74, 0, 0, 0, 0],
    [-8, 38, -6, -12, 4, 14],
    [6, 52, -8, 2, 10, 0],
    [16, 40, -2, 8, 2, -10],
    [28, 42, -4, -6, 6, 8],
    [22, 68, 12, -4, -12, 8],
    [-12, 70, 14, 2, -18, -6],
    [-26, 44, -6, 14, -4, -12],
  ])
  const dimples = [
    [-7, -6], [6, -7], [0, 2], [-8, 7], [7, 7],
  ].map(([dx, dy]) => circle(dx, dy, 2.6))
  return buildSport({
    nm: 'field-hockey',
    family: 'still',
    bottom: 76,
    layers: [
      {
        nm: 'ball',
        ks: transform({
          p: posTrack({
            x: 46,
            y: 50,
            xKeys: [
              { t: 26, v: 46, ease: EASE.rise },
              { t: 44, v: 78, ease: EASE.settle },
              { t: 52, v: 78, ease: EASE.inOut },
              { t: 72, v: 46 },
            ],
            yKeys: [
              { t: 26, v: 50, ease: EASE.rise },
              { t: 35, v: 36, ease: EASE.fall },
              { t: 44, v: 50, ease: EASE.inOut },
              { t: 72, v: 50 },
            ],
          }),
          r: track([
            { t: 26, v: 0, ease: EASE.settle },
            { t: 46, v: 360, ease: EASE.inOut },
            { t: 72, v: 0 },
          ]),
        }),
        groups: [
          paint('dimples', dimples, '#94A3B8'),
          solid('ball', [circle(0, 0, 22)], '#FAFAF6'),
        ],
      },
      {
        nm: 'stick',
        ks: transform({
          a: [-56, -70, 0],
          p: [-56, -70, 0],
          r: track([
            { t: 8, v: 0, ease: EASE.inOut },
            { t: 21, v: 24, ease: EASE.inOut },
            { t: 27, v: -6, ease: EASE.rise },
            { t: 35, v: -20, ease: EASE.settle },
            { t: 52, v: -16, ease: EASE.inOut },
            { t: 72, v: 0 },
          ]),
        }),
        groups: [
          line('stick outline', [stickShape], INK, { width: OUTLINE }),
          line('grip bands', [
            poly([[-60, -56], [-44, -62]], false),
            poly([[-54, -40], [-38, -46]], false),
            poly([[-48, -24], [-32, -30]], false),
          ], '#065F46', { width: 3.5 }),
          paint('grip', [poly([[-64, -68], [-48, -74], [-30, -18], [-46, -12]])], '#10B981'),
          paint('bow stripe', [poly([[-32, 24], [-14, 18], [-8, 36], [-26, 42]])], '#0284C7'),
          paint('toe accent', [poly([[4, 48], [28, 38], [28, 70], [4, 70]])], '#F59E0B'),
          paint('stick body', [stickShape], '#F8FAFC'),
        ],
      },
    ],
  })
}

// ── racquetball: racket swings to whack ball off the front wall and back ────

export const racquetball = () => {
  const ox = -16
  const head = curve([
    [ox, -78, -32, 0, 32, 0],
    [ox + 42, -30, 0, -28, 0, 24],
    [ox + 9, 28, 14, -10, 0, 0],
    [ox - 9, 28, 0, 0, -14, -10],
    [ox - 42, -30, 0, 24, 0, -28],
  ])
  const strings = [
    ...[-26, -13, 0, 13, 26].map((dx) => poly([[ox + dx, -70 + Math.abs(dx) * 0.48], [ox + dx, 14 - Math.abs(dx) * 0.45]], false)),
    ...[-54, -38, -22, -6].map((y) => poly([[ox - 36 + Math.abs(y + 30) * 0.35, y], [ox + 36 - Math.abs(y + 30) * 0.35, y]], false)),
  ]
  return buildSport({
    nm: 'racquetball',
    family: 'still',
    bottom: 82,
    layers: [
      {
        nm: 'ball',
        ks: transform({
          p: posTrack({
            x: 52,
            y: 44,
            xKeys: [
              { t: 8, v: 52, ease: EASE.inOut },
              { t: 25, v: 20, ease: EASE.rise },
              { t: 41, v: 78, ease: EASE.inOut },
              { t: 56, v: 46, ease: EASE.inOut },
              { t: 68, v: 52 },
            ],
            yKeys: [
              { t: 8, v: 44, ease: EASE.inOut },
              { t: 25, v: -6, ease: EASE.rise },
              { t: 41, v: -36, ease: EASE.fall },
              { t: 56, v: 50, ease: EASE.inOut },
              { t: 68, v: 44 },
            ],
          }),
          s: scaleTrack([
            { t: 38, v: [100, 100], ease: EASE.inOut },
            { t: 41, v: [78, 122], ease: EASE.inOut },
            { t: 45, v: [100, 100] },
          ]),
        }),
        groups: [
          paint('ball gloss', [ellipse(0, 0, 13, 8)], '#FFFFFF', { opacity: 60, offset: [-8, -10], rotation: -35 }),
          solid('ball', [circle(0, 0, 26)], '#2563EB'),
        ],
      },
      {
        nm: 'racket',
        ks: transform({
          a: [ox, 74, 0],
          p: [ox, 74, 0],
          r: track([
            { t: 8, v: 0, ease: EASE.inOut },
            { t: 20, v: -22, ease: EASE.inOut },
            { t: 27, v: 18, ease: EASE.settle },
            { t: 36, v: 24, ease: EASE.inOut },
            { t: 56, v: 0 },
          ]),
        }),
        groups: [
          solid('grip', [rect(ox, 56, 16, 48, 5)], '#2563EB'),
          ...strap('frame', [head], '#E2E8F0', 8),
          line('strings', strings, '#CBD5E1', { width: 2.5 }),
          paint('head backing', [head], '#1E293B', { opacity: 45 }),
        ],
      },
    ],
  })
}

// ── golf: metallic iron/driver swings through and launches the ball off tee ─

export const golf = () => {
  const dimples = []
  for (let row = -3; row <= 3; row++) {
    for (let col = -3; col <= 3; col++) {
      const x = col * 10 + (row % 2 ? 5 : 0)
      const y = row * 8.5
      if (Math.hypot(x, y) < 25) dimples.push(circle(x, y, 2.7))
    }
  }
  // Classic bright metallic golf iron/driver head with angled hosel & flat sole.
  const clubHead = curve([
    [-34, 48, 0, 0, 0, 0],
    [-22, 48, 0, 0, 2, 10],
    [6, 54, -10, 0, 12, 2],
    [14, 68, 2, -6, -4, 8],
    [-26, 76, 16, 2, -14, 0],
    [-36, 66, -2, 8, 2, -8],
  ])
  return buildSport({
    nm: 'golf',
    family: 'still',
    bottom: 82,
    layers: [
      {
        nm: 'ball',
        ks: transform({
          p: posTrack({
            x: 36,
            y: 22,
            xKeys: [
              { t: 26, v: 36, ease: EASE.rise },
              { t: 44, v: 68, ease: EASE.inOut },
              { t: 62, v: 36 },
            ],
            yKeys: [
              { t: 26, v: 22, ease: EASE.rise },
              { t: 42, v: -64, ease: EASE.fall },
              { t: 58, v: 22, ease: EASE.rise },
              { t: 64, v: 12, ease: EASE.fall },
              { t: 70, v: 22 },
            ],
          }),
          r: track([
            { t: 26, v: 0, ease: EASE.settle },
            { t: 58, v: -360 },
          ], { end: -360 }),
        }),
        groups: [
          group('outline', [circle(0, 0, 28), stroke(INK, OUTLINE)]),
          ballShade(28),
          paint('dimples', dimples, '#CDD0C8'),
          paint('ball', [circle(0, 0, 28)], '#FAFAF6'),
        ],
      },
      {
        nm: 'tee',
        groups: [
          solid('tee', [poly([[22, 50], [50, 50], [40, 58], [39, 76], [36, 82], [33, 76], [32, 58]])], '#E4572E'),
        ],
      },
      {
        nm: 'club',
        ks: transform({
          a: [-60, -74, 0],
          p: [-60, -74, 0],
          r: track([
            { t: 8, v: 0, ease: EASE.inOut },
            { t: 21, v: 26, ease: EASE.inOut },
            { t: 27, v: -8, ease: EASE.rise },
            { t: 37, v: -36, ease: EASE.settle },
            { t: 54, v: -30, ease: EASE.inOut },
            { t: 72, v: 0 },
          ]),
        }),
        groups: [
          line('head outline', [clubHead], INK, { width: OUTLINE }),
          line('grooves', [
            poly([[-14, 61], [2, 61]], false),
            poly([[-14, 67], [4, 67]], false),
          ], '#64748B', { width: 2.5 }),
          paint('face', [poly([[-18, 56], [8, 57], [8, 72], [-20, 72]])], '#F8FAFC'),
          paint('head', [clubHead], '#CBD5E1'),
          solid('ferrule', [poly([[-38, 32], [-26, 30], [-23, 48], [-35, 50]])], '#2563EB'),
          solid('shaft', [poly([[-63, -76], [-53, -78], [-26, 34], [-36, 36]])], '#E2E8F0'),
          solid('grip', [poly([[-64, -76], [-52, -78], [-45, -42], [-57, -40]])], '#DC2626'),
          paint('grip cap', [poly([[-64, -76], [-52, -78], [-50, -68], [-62, -66]])], '#F8FAFC'),
        ],
      },
    ],
  })
}

// ── cricket: willow cricket bat drives the stitched crimson ball ────────────

export const cricket = () => {
  const rot = 28
  const shift = [-14, 0]
  return buildSport({
    nm: 'cricket',
    family: 'still',
    bottom: 84,
    layers: [
      {
        nm: 'ball',
        ks: transform({
          p: posTrack({
            x: 48,
            y: 36,
            xKeys: [
              { t: 10, v: 48, ease: EASE.inOut },
              { t: 26, v: 26, ease: EASE.rise },
              { t: 44, v: 74, ease: EASE.inOut },
              { t: 60, v: 46, ease: EASE.inOut },
              { t: 70, v: 48 },
            ],
            yKeys: [
              { t: 10, v: 36, ease: EASE.inOut },
              { t: 26, v: 20, ease: EASE.rise },
              { t: 42, v: -32, ease: EASE.fall },
              { t: 58, v: 42, ease: EASE.inOut },
              { t: 70, v: 36 },
            ],
          }),
          r: track([
            { t: 26, v: 0, ease: EASE.settle },
            { t: 62, v: -360 },
          ], { end: -360 }),
        }),
        groups: [
          group('outline', [circle(0, 0, 24), stroke(INK, OUTLINE)]),
          ballShade(24),
          line('stitches', [poly([[-22, -4], [22, -4]], false), poly([[-22, 4], [22, 4]], false)], '#F2E6C8', { width: 3.5, dash: [2.5, 4] }),
          line('seam', [poly([[-23, 0], [23, 0]], false)], '#F2E6C8', { width: 2.5 }),
          paint('body', [circle(0, 0, 24)], '#A8232B'),
        ],
      },
      {
        nm: 'bat',
        ks: transform({
          a: [20, -70, 0],
          p: [20, -70, 0],
          r: track([
            { t: 8, v: 0, ease: EASE.inOut },
            { t: 21, v: 24, ease: EASE.inOut },
            { t: 28, v: -10, ease: EASE.rise },
            { t: 37, v: -30, ease: EASE.settle },
            { t: 54, v: -22, ease: EASE.inOut },
            { t: 72, v: 0 },
          ]),
        }),
        groups: [
          line('ridge', [poly([[0, -24], [0, 74]], false)], '#C89E5D', { width: 4, offset: shift, rotation: rot }),
          paint('sticker', [rect(0, 14, 34, 18, 2)], '#1E3A8A', { offset: shift, rotation: rot }),
          solid('blade', [rect(0, 26, 38, 108, 7)], '#E9C992', { offset: shift, rotation: rot }),
          solid('handle', [rect(0, -54, 14, 54, 4)], '#1E3A8A', { offset: shift, rotation: rot }),
          line('grip', [-68, -56, -44].map((y) => poly([[-7, y], [7, y]], false)), '#EF4444', { width: 3.5, offset: shift, rotation: rot }),
        ],
      },
    ],
  })
}

// ── ultimate: flying disc spinning in true 3D perspective with wind trails ──

export const ultimateFrisbee = () => {
  const rot = -22
  const trails = [
    poly([[-86, 12], [-54, 0]], false),
    poly([[-88, 34], [-48, 18]], false),
    poly([[-74, 52], [-42, 39]], false),
  ]
  return buildSport({
    nm: 'ultimate-frisbee',
    family: 'still',
    bottom: 56,
    layers: [
      {
        nm: 'spin markings',
        parent: 'disc plane',
        ks: transform({
          r: track([
            { t: 8, v: 0, ease: EASE.settle },
            { t: 72, v: -720 },
          ], { end: -720 }),
        }),
        groups: [
          line('spin arcs', [
            arc(0, 0, 58, 15, 115),
            arc(0, 0, 58, 195, 295),
          ], '#FFFFFF', { width: 6 }),
          line('inner arcs', [
            arc(0, 0, 32, 65, 155),
            arc(0, 0, 32, 245, 335),
          ], '#FEF3C7', { width: 4 }),
        ],
      },
      {
        // Squashes child rotation into the exact 68/154 ≈ 44% 3/4 disc ellipse.
        nm: 'disc plane',
        parent: 'glide',
        null: true,
        ks: transform({
          p: [12, -8, 0],
          r: rot,
          s: [100, 44, 100],
        }),
      },
      {
        nm: 'disc',
        parent: 'glide',
        groups: [
          line('rim highlight', [ellipse(12, -8, 124, 52)], '#FDBA74', { width: 3, rotation: rot }),
          solid('top', [ellipse(12, -8, 154, 68)], '#F97316', { rotation: rot }),
          solid('rim', [ellipse(12, 4, 154, 68)], '#C2410C', { rotation: rot }),
        ],
      },
      {
        nm: 'wind trails',
        parent: 'glide',
        ks: transform({
          p: posTrack({
            xKeys: [
              { t: 8, v: 0, ease: EASE.inOut },
              { t: 28, v: -12, ease: EASE.inOut },
              { t: 52, v: 4, ease: EASE.inOut },
              { t: 72, v: 0 },
            ],
          }),
          o: track([
            { t: 8, v: 100, ease: EASE.inOut },
            { t: 26, v: 55, ease: EASE.inOut },
            { t: 44, v: 100, ease: EASE.inOut },
            { t: 60, v: 65, ease: EASE.inOut },
            { t: 74, v: 100 },
          ], { rest: 100 }),
        }),
        groups: [
          line('wind trails', trails, '#F8FAFC', { width: 4.5 }),
          line('wind trails outline', trails, INK, { width: 9.5 }),
        ],
      },
      {
        nm: 'glide',
        null: true,
        ks: transform({
          p: posTrack({
            xKeys: [
              { t: 8, v: 0, ease: EASE.inOut },
              { t: 30, v: 16, ease: EASE.inOut },
              { t: 54, v: -6, ease: EASE.inOut },
              { t: 74, v: 0 },
            ],
            yKeys: [
              { t: 8, v: 0, ease: EASE.rise },
              { t: 32, v: -14, ease: EASE.inOut },
              { t: 56, v: 4, ease: EASE.inOut },
              { t: 74, v: 0 },
            ],
          }),
          r: track([
            { t: 8, v: 0, ease: EASE.inOut },
            { t: 26, v: -5, ease: EASE.inOut },
            { t: 48, v: 4, ease: EASE.inOut },
            { t: 72, v: 0 },
          ]),
        }),
      },
    ],
  })
}
