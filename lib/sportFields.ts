/**
 * Where each sport is played, drawn top-down as chalk lines: a soccer center
 * circle, a hockey faceoff circle, a pool's lane T-marks. The First Run draws
 * the picked sport's field large and faint behind the page.
 *
 * Every drawing sits in a 400 × 400 box and may run past its edges; the
 * backdrop crops it. Proportions follow the real surface where they read well
 * and are bent where they don't.
 */

export type FieldStroke = 'line' | 'heavy' | 'dash' | 'dot' | 'fill'

export interface FieldMark {
  d: string
  stroke: FieldStroke
}

export const FIELD_BOX = 400

// ─── Path helpers ─────────────────────────────────────────────────────────

const n = (v: number) => Math.round(v * 10) / 10

function line(x1: number, y1: number, x2: number, y2: number): string {
  return `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`
}

function rect(x: number, y: number, w: number, h: number): string {
  return `M${n(x)} ${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z`
}

function circle(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx + r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx - r)} ${n(cy)}Z`
}

/** An arc from angle `a0` to `a1` in degrees, clockwise on screen (y down; -90 is up). */
function arc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const rad = (a: number) => (a * Math.PI) / 180
  const x0 = cx + r * Math.cos(rad(a0))
  const y0 = cy + r * Math.sin(rad(a0))
  const x1 = cx + r * Math.cos(rad(a1))
  const y1 = cy + r * Math.sin(rad(a1))
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0
  const sweep = a1 > a0 ? 1 : 0
  return `M${n(x0)} ${n(y0)}A${n(r)} ${n(r)} 0 ${large} ${sweep} ${n(x1)} ${n(y1)}`
}

function roundRect(x: number, y: number, w: number, h: number, r: number): string {
  return (
    `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}` +
    `V${n(y + h - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}` +
    `H${n(x + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}` +
    `V${n(y + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Z`
  )
}

/** A stadium (running-track) loop: two straights joined by half circles. */
function stadium(cx: number, cy: number, straight: number, r: number): string {
  const l = cx - straight / 2
  const rt = cx + straight / 2
  return (
    `M${n(l)} ${n(cy - r)}H${n(rt)}A${n(r)} ${n(r)} 0 0 1 ${n(rt)} ${n(cy + r)}` +
    `H${n(l)}A${n(r)} ${n(r)} 0 0 1 ${n(l)} ${n(cy - r)}Z`
  )
}

/** A lumpy closed ring, for terrain contours and putting greens. Deterministic. */
function contour(cx: number, cy: number, r: number, wobble: number, seed: number): string {
  const steps = 72
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const k = r + wobble * (Math.sin(2 * a + seed) * 0.6 + Math.sin(3 * a + seed * 1.7) * 0.4)
    d += `${i === 0 ? 'M' : 'L'}${n(cx + k * Math.cos(a))} ${n(cy + k * Math.sin(a) * 0.82)}`
  }
  return `${d}Z`
}

const range = (count: number) => Array.from({ length: count }, (_, i) => i)

const m = (stroke: FieldStroke, ...ds: string[]): FieldMark[] => ds.map((d) => ({ d, stroke }))

// ─── Fields ───────────────────────────────────────────────────────────────

const soccer = (): FieldMark[] => [
  ...m('heavy', line(200, -40, 200, 440)),
  ...m('line', circle(200, 200, 72), rect(-40, 40, 480, 320)),
  ...m('fill', circle(200, 200, 4)),
  // Corner arcs where the touchlines leave the frame.
  ...m('line', arc(-40, 40, 14, 0, 90), arc(440, 360, 14, 180, 270)),
]

const basketball = (): FieldMark[] => {
  const base = 360
  const hoop = 328
  return [
    ...m('heavy', line(base, -40, base, 440)),
    ...m('line', rect(244, 151, base - 244, 98), arc(244, 200, 36, 90, 270)),
    ...m('dash', arc(244, 200, 36, -90, 90)),
    // The three-point line: corner straights joined by the arc.
    ...m(
      'line',
      arc(hoop, 200, 145, 112.3, 247.7),
      line(273, 334, base, 334),
      line(273, 66, base, 66)
    ),
    ...m('line', circle(hoop, 200, 9), arc(hoop, 200, 25, 90, 270)),
    ...m('heavy', line(344, 182, 344, 218)),
    // Half-court circle at the frame's edge.
    ...m('line', line(-20, -40, -20, 440), arc(-20, 200, 36, -90, 90)),
  ]
}

const volleyball = (): FieldMark[] => [
  ...m('line', rect(20, 110, 360, 180)),
  ...m('heavy', line(200, 82, 200, 318)),
  ...m('line', line(140, 110, 140, 290), line(260, 110, 260, 290)),
  ...m(
    'dash',
    line(140, 70, 140, 110),
    line(140, 290, 140, 330),
    line(260, 70, 260, 110),
    line(260, 290, 260, 330)
  ),
  ...m('fill', circle(200, 82, 5), circle(200, 318, 5)),
]

const tennis = (): FieldMark[] => [
  ...m('line', rect(33, 123, 334, 154), line(33, 142, 367, 142), line(33, 258, 367, 258)),
  ...m('line', line(110, 142, 110, 258), line(290, 142, 290, 258), line(110, 200, 290, 200)),
  ...m('line', line(33, 196, 41, 196), line(359, 200, 367, 200)),
  ...m('heavy', line(200, 108, 200, 292)),
  ...m('fill', circle(200, 108, 4), circle(200, 292, 4)),
]

const badminton = (): FieldMark[] => [
  ...m('line', rect(26, 120, 348, 160), line(26, 133, 374, 133), line(26, 267, 374, 267)),
  ...m(
    'line',
    line(148, 120, 148, 280),
    line(252, 120, 252, 280),
    line(46, 120, 46, 280),
    line(354, 120, 354, 280)
  ),
  ...m('line', line(26, 200, 148, 200), line(252, 200, 374, 200)),
  ...m('heavy', line(200, 104, 200, 296)),
]

const racquetball = (): FieldMark[] => [
  ...m('heavy', line(20, 100, 20, 300)),
  ...m('line', rect(20, 110, 360, 180), line(155, 110, 155, 290), line(200, 110, 200, 290)),
  ...m('line', line(155, 124, 200, 124), line(155, 276, 200, 276)),
  ...m('dash', line(245, 110, 245, 290)),
]

const diamond = (moundAt: number, moundR: number, grassR: number): FieldMark[] => [
  // Foul lines run out of frame from home through first and third.
  ...m('heavy', line(200, 360, 560, 0), line(200, 360, -160, 0)),
  ...m('line', line(340, 220, 200, 80), line(60, 220, 200, 80)),
  ...m('line', arc(200, moundAt, grassR, -147, -33)),
  ...m('line', circle(200, moundAt, moundR)),
  ...m('fill', rect(334, 214, 12, 12), rect(194, 74, 12, 12), rect(54, 214, 12, 12)),
  ...m('fill', `M193 360L207 360L207 366L200 372L193 366Z`),
  ...m('line', rect(171, 346, 16, 30), rect(213, 346, 16, 30)),
  ...m('dash', arc(200, 360, 48, -135, -45)),
]

const baseball = () => diamond(227, 20, 209)
const softball = () => diamond(218, 26, 180)

const football = (): FieldMark[] => [
  // Five-yard lines, a yard every 10 units; goal line and end zone on the right.
  ...range(8).flatMap((i) => m('line', line(i * 50, -40, i * 50, 440))),
  ...m('heavy', line(360, -40, 360, 440)),
  ...range(36).flatMap((i) =>
    i % 5 === 0 ? [] : m('line', line(i * 10, 136, i * 10, 146), line(i * 10, 254, i * 10, 264))
  ),
  ...m('line', line(-40, 20, 440, 20), line(-40, 380, 440, 380)),
  ...m('line', line(345, 200, 350, 200)),
  ...m('fill', rect(356, 16, 8, 8), rect(356, 376, 8, 8)),
  // Field numbers as chevrons pointing at the nearer goal.
  ...m(
    'line',
    'M188 52L178 58L188 64',
    'M288 52L278 58L288 64',
    'M188 336L178 342L188 348',
    'M288 336L278 342L288 348'
  ),
]

const rugby = (): FieldMark[] => [
  ...m('heavy', line(360, -40, 360, 440), line(110, -40, 110, 440)),
  ...m('line', line(250, -40, 250, 440), line(-40, 25, 440, 25), line(-40, 375, 440, 375)),
  ...m('dash', line(160, -40, 160, 440), line(60, -40, 60, 440)),
  ...m(
    'dash',
    line(-40, 50, 360, 50),
    line(-40, 350, 360, 350),
    line(-40, 100, 360, 100),
    line(-40, 300, 360, 300)
  ),
  // H-posts on the try line.
  ...m('heavy', line(360, 186, 360, 214)),
  ...m('fill', circle(360, 186, 5), circle(360, 214, 5)),
  ...m('line', line(395, -40, 395, 440)),
]

const lacrosse = (): FieldMark[] => [
  ...m('line', circle(300, 200, 26), rect(140, 40, 320, 320)),
  ...m('heavy', line(140, -40, 140, 440)),
  ...m('line', `M300 192L312 200L300 208Z`),
  ...m('line', line(-40, 4, 440, 4), line(-40, 396, 440, 396)),
  ...m('fill', circle(20, 200, 5)),
  ...m('line', line(10, 190, 30, 210), line(30, 190, 10, 210)),
]

const fieldHockey = (): FieldMark[] => [
  ...m('heavy', line(370, -40, 370, 440)),
  ...m(
    'line',
    `${arc(370, 178, 176, 180, 270)}`,
    `${arc(370, 222, 176, 90, 180)}`,
    line(194, 178, 194, 222)
  ),
  ...m(
    'dash',
    arc(370, 178, 236, 180, 245),
    arc(370, 222, 236, 115, 180),
    line(134, 178, 134, 222)
  ),
  ...m('line', line(94, -40, 94, 440), rect(370, 178, 12, 44)),
  ...m('fill', circle(292, 200, 4)),
]

const ultimate = (): FieldMark[] => [
  ...m('line', line(-40, 80, 320, 80), line(-40, 320, 320, 320), line(320, 80, 320, 320)),
  ...m('heavy', line(200, 80, 200, 320)),
  ...m(
    'line',
    line(72, 192, 88, 208),
    line(88, 192, 72, 208),
    line(-48, 192, -32, 208),
    line(-32, 192, -48, 208)
  ),
  ...m('fill', circle(200, 80, 6), circle(200, 320, 6), circle(320, 80, 6), circle(320, 320, 6)),
]

const cricket = (): FieldMark[] => [
  ...m('line', rect(188, 128, 24, 144)),
  ...m('heavy', line(176, 146, 224, 146), line(176, 254, 224, 254)),
  ...m(
    'line',
    line(182, 134, 182, 160),
    line(218, 134, 218, 160),
    line(182, 240, 182, 266),
    line(218, 240, 218, 266)
  ),
  ...m('fill', circle(194, 134, 2.5), circle(200, 134, 2.5), circle(206, 134, 2.5)),
  ...m('fill', circle(194, 266, 2.5), circle(200, 266, 2.5), circle(206, 266, 2.5)),
  ...m('dash', circle(200, 200, 165)),
  ...m('line', circle(200, 200, 300)),
]

const iceHockey = (): FieldMark[] => [
  ...m('line', roundRect(-100, 30, 504, 340, 112)),
  ...m('heavy', line(360, 30, 360, 370)),
  ...m('line', arc(360, 200, 24, 90, 270)),
  ...m('line', circle(280, 112, 60), circle(280, 288, 60)),
  ...m('fill', circle(280, 112, 5), circle(280, 288, 5), circle(84, 112, 5), circle(84, 288, 5)),
  // Hash marks off the faceoff circles.
  ...m(
    'line',
    line(272, 52, 272, 44),
    line(288, 52, 288, 44),
    line(272, 172, 272, 180),
    line(288, 172, 288, 180)
  ),
  ...m(
    'line',
    line(272, 228, 272, 220),
    line(288, 228, 288, 220),
    line(272, 348, 272, 356),
    line(288, 348, 288, 356)
  ),
  // The blue line, painted wide.
  ...m('heavy', line(100, 30, 100, 370), line(108, 30, 108, 370)),
  ...m('line', `M360 188L372 188L372 212L360 212`),
]

const trackSprints = (): FieldMark[] => [
  ...range(9).flatMap((i) =>
    m(i === 0 || i === 8 ? 'heavy' : 'line', line(-40, 102 + i * 24.5, 440, 102 + i * 24.5))
  ),
  ...m('heavy', line(60, 102, 60, 298)),
  ...range(8).flatMap((i) =>
    m(
      'dash',
      line(170, 106 + i * 24.5, 170, 122 + i * 24.5),
      line(290, 106 + i * 24.5, 290, 122 + i * 24.5)
    )
  ),
]

const trackDistance = (): FieldMark[] => [
  ...range(5).flatMap((i) =>
    m(i === 0 || i === 4 ? 'heavy' : 'line', stadium(200, 200, 296, 128 + i * 9))
  ),
  ...m('heavy', line(348, 328, 348, 372)),
  ...m('dash', line(52, 80, 348, 80), line(52, 320, 348, 320)),
]

const crossCountry = (): FieldMark[] => [
  ...range(7).flatMap((i) => m('line', contour(230, 210, 24 + i * 34, 6 + i * 3, 1.3))),
  ...m('dash', 'M-20 360C60 330 90 250 150 236S260 260 300 180S330 60 420 40'),
  ...m('fill', `M150 236L150 212L164 218L150 224Z`, `M300 180L300 156L314 162L300 168Z`),
]

const swimming = (): FieldMark[] => [
  ...m('heavy', line(370, -40, 370, 440)),
  ...range(10).flatMap((i) => m('dot', line(-40, i * 40, 370, i * 40))),
  ...range(9).flatMap((i) => {
    const y = 20 + i * 40
    return m('line', line(-40, y, 338, y), line(338, y - 8, 338, y + 8))
  }),
  ...m('dash', line(290, -40, 290, 440)),
]

const diving = (): FieldMark[] => [
  ...m('heavy', line(380, -40, 380, 440)),
  ...m('line', rect(296, 118, 84, 22), rect(296, 260, 84, 22), rect(330, 180, 50, 40)),
  ...m('line', circle(248, 129, 18), circle(248, 129, 38)),
  ...m('dash', circle(248, 129, 62)),
  ...m('line', line(-40, 360, 380, 360), line(-40, 40, 380, 40)),
]

const wrestling = (): FieldMark[] => [
  ...m('heavy', circle(200, 200, 180)),
  ...m('line', circle(200, 200, 164), circle(200, 200, 64)),
  ...m('heavy', line(188, 190, 188, 210), line(212, 190, 212, 210)),
  ...m('line', rect(-44, -44, 488, 488)),
]

const martialArts = (): FieldMark[] => [
  ...m('heavy', rect(80, 80, 240, 240)),
  ...m('line', rect(-10, -10, 420, 420)),
  ...range(13).flatMap((i) =>
    i === 0 || i === 12 ? [] : m('dash', line(-10 + i * 35, -10, -10 + i * 35, 410))
  ),
  ...m('heavy', line(140, 192, 140, 208), line(260, 192, 260, 208)),
]

const gymnastics = (): FieldMark[] => [
  ...m('heavy', rect(44, 44, 312, 312)),
  ...m('line', rect(18, 18, 364, 364)),
  ...m('dash', line(56, 56, 344, 344), line(344, 56, 56, 344)),
  ...range(5).flatMap((i) => m('line', line(44 + (i + 1) * 52, 44, 44 + (i + 1) * 52, 52))),
]

const cheerleading = (): FieldMark[] => [
  ...m('heavy', rect(24, 63, 351, 273)),
  ...range(8).flatMap((i) => m('line', line(24 + (i + 1) * 39, 63, 24 + (i + 1) * 39, 336))),
  ...m('heavy', line(194, 200, 206, 200), line(200, 194, 200, 206)),
  // Count marks along the front edge.
  ...range(9).flatMap((i) => m('fill', circle(43.5 + i * 39, 350, 3))),
]

const golf = (): FieldMark[] => [
  ...range(5).flatMap((i) =>
    m(i === 4 ? 'heavy' : 'line', contour(210, 200, 30 + i * 36, 4 + i * 4, 0.6))
  ),
  ...m('dash', contour(210, 200, 220, 26, 0.6)),
  ...m('line', circle(232, 186, 8)),
  ...m('heavy', line(232, 186, 232, 120)),
  ...m('fill', `M232 120L262 130L232 140Z`),
  ...m('dash', 'M80 320Q150 270 224 192'),
]

const weightlifting = (): FieldMark[] => [
  ...m('heavy', rect(30, 30, 340, 340)),
  ...m('line', line(115, 30, 115, 370), line(285, 30, 285, 370)),
  ...range(9).flatMap((i) => m('dash', line(132 + i * 17, 30, 132 + i * 17, 370))),
  ...m('heavy', line(56, 200, 344, 200)),
  ...m(
    'line',
    rect(76, 178, 14, 44),
    rect(310, 178, 14, 44),
    rect(92, 184, 8, 32),
    rect(300, 184, 8, 32)
  ),
]

const generalFitness = (): FieldMark[] => [
  ...m('heavy', line(-40, 120, 440, 120), line(-40, 280, 440, 280)),
  ...m('line', line(-40, 200, 440, 200)),
  ...range(11).flatMap((i) => {
    const x = i * 40
    return i % 5 === 0
      ? m('line', line(x, 120, x, 280))
      : m('line', line(x, 120, x, 132), line(x, 268, x, 280))
  }),
  ...m('line', rect(286, 144, 44, 36), line(280, 144, 280, 180)),
]

const FIELDS: Record<string, () => FieldMark[]> = {
  Soccer: soccer,
  'Field Hockey': fieldHockey,
  Lacrosse: lacrosse,
  Rugby: rugby,
  'Ultimate Frisbee': ultimate,
  'Cross Country': crossCountry,
  'Track (Distance)': trackDistance,
  Basketball: basketball,
  Volleyball: volleyball,
  'Track (Sprints/Jumps)': trackSprints,
  Gymnastics: gymnastics,
  Cheerleading: cheerleading,
  Diving: diving,
  Baseball: baseball,
  Softball: softball,
  Tennis: tennis,
  Golf: golf,
  Badminton: badminton,
  Racquetball: racquetball,
  Cricket: cricket,
  Football: football,
  Wrestling: wrestling,
  'Ice Hockey': iceHockey,
  Swimming: swimming,
  'Martial Arts': martialArts,
  Weightlifting: weightlifting,
  'General Fitness': generalFitness,
}

/** The sport's field as chalk marks, or General Fitness's turf for an unknown sport. */
export function sportField(name: string): FieldMark[] {
  return (hasSportField(name) ? FIELDS[name] : generalFitness)()
}

export function hasSportField(name: string): boolean {
  return Object.hasOwn(FIELDS, name)
}
