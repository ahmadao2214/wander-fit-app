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

  it('measures with the font\'s own letter widths', () => {
    // The width cap is what keeps STRENGTH on one line (it used to set at
    // 128pt, about 397pt wide). Real widths size it a little larger than the
    // old 0.44 em average did (3.52 em guessed; the font sets 3.10 em).
    expect(displayWidthEm('STRENGTH')).toBeCloseTo(3.104, 3)
    expect(displayWidthEm('WM')).toBeGreaterThan(displayWidthEm('II') * 2.5)
    expect(categoryLayout(722, 354, 'POWER').name).toBe(122)
    expect(categoryLayout(722, 354, 'STRENGTH').name).toBe(107)
  })
})

describe('bandTitleSize', () => {
  it('keeps 50pt for most sports and steps down so a long name fits two lines', () => {
    const { bandTitleSize } = jest.requireActual('../PlanView')
    const { displayWidthEm } = jest.requireActual('../CategoryStory')
    expect([bandTitleSize('Basketball', 230), bandTitleSize('Swimming', 230)]).toEqual([50, 50])
    const track = bandTitleSize('Track (Sprints/Jumps)', 230)
    expect(track).toBeLessThan(50)
    // Its longest word fits one line.
    expect(displayWidthEm('(SPRINTS/JUMPS)') * track).toBeLessThanOrEqual(230)
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

describe('weekTagSize', () => {
  const { weekTagSize } = jest.requireActual('../PlanView')
  const { displayWidthEm } = jest.requireActual('../CategoryStory')
  const week = (tags: (string | null)[]) => tags.map((tag) => ({ tag }))

  it('sets every label at one size, from the widest, so RECOVER matches LOWER', () => {
    const plain = weekTagSize(week(['LOWER', null, 'UPPER', null, 'POWER', null, null]), 402)
    const withRecover = weekTagSize(week(['LOWER', null, 'RECOVER', null, 'POWER', null, null]), 402)
    expect(plain).toBe(18)
    expect(withRecover).toBeLessThan(plain)
  })

  it('fits the widest label in its cell, down to a 320-wide phone', () => {
    const tags = ['LOWER', 'RECOVER', 'UPPER', null, 'POWER', 'FULL', null]
    const overflow = [320, 375, 402].filter((w) => {
      const cell = (w - 48 - 24) / 7 - 6
      return displayWidthEm('RECOVER') * weekTagSize(week(tags), w) > cell
    })
    expect(overflow).toEqual([])
  })
})
