import { SPORTS } from '../../convex/seedData'
import { hasSportField, sportField } from '../sportFields'

describe('sportField', () => {
  it('draws a field for every seeded sport', () => {
    const missing = SPORTS.map((s) => s.name).filter((name) => !hasSportField(name))
    expect(missing).toEqual([])
  })

  it('gives each sport at least three marks with finite coordinates', () => {
    const bad = SPORTS.map((s) => s.name).filter((name) => {
      const marks = sportField(name)
      return (
        marks.length < 3 || marks.some((mk) => /NaN|Infinity/.test(mk.d) || !mk.d.startsWith('M'))
      )
    })
    expect(bad).toEqual([])
  })

  it('draws a different field for each sport', () => {
    const drawings = new Set(SPORTS.map((s) => JSON.stringify(sportField(s.name))))
    expect(drawings.size).toBe(SPORTS.length)
  })

  it('falls back to General Fitness turf for an unknown sport', () => {
    expect(sportField('Curling')).toEqual(sportField('General Fitness'))
  })
})
