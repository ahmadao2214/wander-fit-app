import config from '../../tamagui.config'
import { RADIUS, RADIUS_ROLES, SPACE, SPACE_GRID } from '../spaceScale'

// Spacing and radius from the design audit's system contract
const tokens = (config as unknown as { tokens: Record<string, Record<string, { val: number }>> }).tokens

describe('spacing scale', () => {
  it('puts every whole step from $1 to $11 on the 4pt grid', () => {
    const off = Object.entries(SPACE)
      .filter(([key]) => Number.isInteger(Number(key)) && Number(key) >= 1 && Number(key) <= 11)
      .filter(([, value]) => value % SPACE_GRID !== 0)
    expect(off).toEqual([])
  })

  it('has the audit roles: 16pt gutters, 8–12pt gaps, 24–32pt between sections', () => {
    expect([SPACE[2], SPACE[3], SPACE[4], SPACE[5], SPACE[6]]).toEqual([8, 12, 16, 24, 32])
  })

  it('is what Tamagui resolves, including negative margins', () => {
    expect(tokens.space['4'].val).toBe(16)
    expect(tokens.space['-4'].val).toBe(-16)
    expect(tokens.space.true.val).toBe(16)
  })
})

describe('radius scale', () => {
  it('has 8pt controls, 12pt containers and 16pt sheets', () => {
    expect(RADIUS_ROLES).toEqual({ control: 8, container: 12, sheet: 16 })
  })

  it('grows with each step', () => {
    const values = Object.values(RADIUS)
    expect(values).toEqual([...values].sort((a, b) => a - b))
  })

  it('is what Tamagui resolves', () => {
    expect(tokens.radius['4'].val).toBe(12)
    expect(tokens.radius.true.val).toBe(8)
  })
})
