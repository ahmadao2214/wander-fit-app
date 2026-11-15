import fs from 'node:fs'
import path from 'node:path'
import soccer from './sports/soccer.mjs'
import { BEATS, LOOP_FRAMES } from './motion.mjs'

const assets = path.join(__dirname, '../../assets/lottie/sports')

describe('sport icon generator', () => {
  it('matches the committed soccer.json (rebuild with node scripts/lottie/build.mjs)', () => {
    const committed = fs.readFileSync(path.join(assets, 'soccer.json'), 'utf8')
    expect(JSON.stringify(soccer())).toBe(committed)
  })

  it('is deterministic', () => {
    expect(JSON.stringify(soccer())).toBe(JSON.stringify(soccer()))
  })

  it('keeps hops getting lower and ends with a rest of over two seconds', () => {
    const heights = BEATS.hops.map((hop) => hop.height)
    expect([...heights].sort((a, b) => b - a)).toEqual(heights)
    expect((LOOP_FRAMES - BEATS.settled) / 30).toBeGreaterThan(2)
  })

  it('times each hop to its height, like a falling object', () => {
    const [first, ...rest] = BEATS.hops
    const airtime = (hop) => hop.land - hop.up
    for (const hop of rest) {
      const expected = airtime(first) * Math.sqrt(hop.height / first.height)
      expect(Math.abs(airtime(hop) - expected)).toBeLessThanOrEqual(1.5)
    }
  })
})
