jest.mock('react-native-reanimated', () => jest.requireActual('../../../jest/reanimatedMock'))

// eslint-disable-next-line import/first
import { CATEGORY_TILE_HEIGHT, categoryLayout } from '../CategoryStory'

describe('categoryLayout', () => {
  it('keeps full-size tiles on a tall phone and shrinks them on a short one', () => {
    expect(categoryLayout(722).tile).toBe(CATEGORY_TILE_HEIGHT)
    expect(categoryLayout(560).tile).toBe(112)
  })

  it('sizes the category name so the longest one fits on one line', () => {
    const names = ['POWER', 'ROTATION', 'STRENGTH', 'ENDURANCE']
    const overflow = names.filter((n) => categoryLayout(722, 354, n).name * 0.44 * n.length > 354)
    expect(overflow).toEqual([])
    expect(categoryLayout(722, 354, 'POWER').name).toBe(122)
  })
})

describe('bandTitleSize', () => {
  it('steps down for long sport names', () => {
    const { bandTitleSize } = jest.requireActual('../PlanView')
    expect([bandTitleSize('Basketball'), bandTitleSize('Track (Sprints/Jumps)')]).toEqual([50, 38])
  })
})
