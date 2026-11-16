import { ATHLETES, athleteColors, athleteShapes, poseAt } from '../athletePose'

const CATS = [1, 2, 3, 4] as const

describe('poseAt', () => {
  it('starts on the first key and ends on the last', () => {
    for (const cat of [1, 2, 3, 4] as const) {
      const f = ATHLETES[cat].frames
      expect([cat, ...poseAt(cat, 0)]).toEqual([cat, ...f[0].p])
      expect([cat, ...poseAt(cat, 1).map((v) => Math.round(v * 1000) / 1000)]).toEqual([cat, ...f[f.length - 1].p])
    }
  })

  it('Endurance cuts back the other way part-way through', () => {
    expect(poseAt(1, 0).flip).toBe(false)
    expect(poseAt(1, 1).flip).toBe(true)
  })

  it('two women and two men, as the storyboard asks', () => {
    expect([1, 2, 3, 4].map((c) => !!ATHLETES[c as 1].female)).toEqual([true, false, true, false])
  })

  it('every move runs under a second', () => {
    expect(Object.values(ATHLETES).every((a) => a.ms <= 1000)).toBe(true)
  })
})

describe('athleteShapes', () => {
  it('draws a bat for Rotation and a sled for Strength, and no tool for the others', () => {
    const tool = athleteColors(false, '#131C2E').tool
    const tools = CATS.map((c) => athleteShapes(c, poseAt(c, 0), false, '#131C2E').filter((s) => s.color === tool).length)
    expect(tools).toEqual([0, 0, 1, 3])
  })

  it('keeps the same number of strokes through the whole move, so each stays one line', () => {
    const counts = CATS.map((c) => [0, 0.3, 0.6, 1].map((k) => athleteShapes(c, poseAt(c, k), true, '#A855F7').length))
    expect(counts.every((n) => new Set(n).size === 1)).toBe(true)
  })

  it('draws the head as a round dot set apart from the shoulders', () => {
    const head = athleteShapes(2, poseAt(2, 0), true, '#A855F7').find((s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1) < 0.1)
    expect(head?.w).toBeCloseTo(14.4)
  })

  it('mirrors the Endurance athlete inside the frame after the cut', () => {
    const before = athleteShapes(1, poseAt(1, 0), true, '#14B8A6')
    const after = athleteShapes(1, poseAt(1, 1), true, '#14B8A6')
    const mean = (ss: { x1: number }[]) => ss.reduce((a, s) => a + s.x1, 0) / ss.length
    expect(mean(before) < 60 && mean(after) > 40).toBe(true)
      })

  // Tiles are never narrower than square, and the viewBox is drawn centered and
  // bottom-aligned, so a tile shows x from -21 to 121 and y from -22 to 122.
  it('keeps every stroke of every move inside a square tile', () => {
    const out = CATS.flatMap((c) =>
      [0, 0.25, 0.5, 0.75, 1].flatMap((k) =>
        athleteShapes(c, poseAt(c, k), true, '#3B82F6')
          .filter((s) => [s.x1, s.x2].some((x) => x - s.w / 2 < -21 || x + s.w / 2 > 121) || [s.y1, s.y2].some((y) => y - s.w / 2 < -22 || y + s.w / 2 > 122))
          .map(() => `${c}@${k}`)
      )
    )
    expect(out).toEqual([])
  })

  it('lights the athlete white on its color and dims the others', () => {
    expect(athleteColors(true, '#A855F7').body).toBe('#FFFFFF')
    expect(athleteColors(false, '#131C2E').body).not.toBe('#FFFFFF')
  })
})
