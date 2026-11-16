jest.mock('react-native-reanimated', () => jest.requireActual('../../../jest/reanimatedMock'))

// eslint-disable-next-line import/first
import { CATEGORY_TILE_HEIGHT, categoryLayout, displayWidthEm } from '../CategoryStory'

describe('categoryLayout', () => {
  it('keeps full-size tiles on a tall phone and shrinks them on a short one', () => {
    expect(categoryLayout(722).tile).toBe(CATEGORY_TILE_HEIGHT)
    expect(categoryLayout(560).tile).toBe(112)
  })

  it('sizes every category name to fit one line, down to a 320-wide phone', () => {
    const names = ['POWER', 'ROTATION', 'STRENGTH', 'ENDURANCE']
    const overflow = [272, 354, 512].flatMap((w) =>
      names.filter((n) => categoryLayout(722, w, n).name * displayWidthEm(n) > w).map((n) => `${n}@${w}`)
    )
    expect(overflow).toEqual([])
  })

  it('measures with the font\'s own letter widths, so STRENGTH gets the room it needs', () => {
    // The old 0.44 em average guessed 3.52 em; the font sets it at 3.10 em.
    expect(displayWidthEm('STRENGTH')).toBeCloseTo(3.104, 3)
    expect(displayWidthEm('WM')).toBeGreaterThan(displayWidthEm('II') * 2.5)
    expect(categoryLayout(722, 354, 'POWER').name).toBe(122)
    expect(categoryLayout(722, 354, 'STRENGTH').name).toBe(107)
  })
})

describe('bandTitleSize', () => {
  it('steps down for long sport names', () => {
    const { bandTitleSize } = jest.requireActual('../PlanView')
    expect([bandTitleSize('Basketball'), bandTitleSize('Track (Sprints/Jumps)')]).toEqual([50, 38])
  })
})

describe('bandIconFrame', () => {
  it('lets a round ball bleed off the band and keeps any other icon whole inside it', () => {
    const { bandIconFrame } = jest.requireActual('../PlanView')
    expect(bandIconFrame('Basketball', 62)).toEqual({ size: 190, right: -46, top: 62 })
    const swim = bandIconFrame('Swimming', 62)
    expect(swim.right).toBeGreaterThanOrEqual(0)
    expect(['Weightlifting', 'Tennis', 'Track (Sprints/Jumps)'].every((s) => bandIconFrame(s, 0).right >= 0)).toBe(true)
  })
})

describe('phaseDetail', () => {
  it('shows only the acronym on the reveal and the week range on the Program tab', () => {
    const { phaseDetail } = jest.requireActual('../StoryPhaseBar')
    expect(phaseDetail('SPP', 1, 4, false)).toBe('SPP')
    expect(phaseDetail('SPP', 1, 4, true)).toBe('SPP · Wk 5–8')
  })
})
