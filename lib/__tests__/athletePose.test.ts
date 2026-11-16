import { ATHLETES, athleteColors, athleteShapes, poseAt } from '../athletePose'

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
    const rects = (cat: 1 | 2 | 3 | 4) => athleteShapes(cat, poseAt(cat, 0), false, '#131C2E').filter((s) => s.kind === 'rect').length
    expect([rects(1), rects(2), rects(3), rects(4)]).toEqual([0, 0, 0, 3])
    const tool = athleteColors(true, '#A855F7').tool
    const lit = athleteShapes(3, poseAt(3, 1), true, '#F97316')
    expect(lit.some((s) => s.fill === tool)).toBe(true)
  })

  it('lights the athlete white on its color and dims the others', () => {
    expect(athleteColors(true, '#A855F7').body).toBe('#FFFFFF')
    expect(athleteColors(false, '#131C2E').body).not.toBe('#FFFFFF')
  })
})
