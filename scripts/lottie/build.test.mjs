import fs from 'node:fs'
import path from 'node:path'
import { SPORTS } from './sports/index.mjs'
import { BEATS, LOOP_FRAMES } from './motion.mjs'

const assets = path.join(__dirname, '../../assets/lottie/sports')

describe('sport icon generator', () => {
  it.each(Object.keys(SPORTS))(
    'matches the committed %s.json (rebuild with node scripts/lottie/build.mjs)',
    (slug) => {
      const committed = fs.readFileSync(path.join(assets, `${slug}.json`), 'utf8')
      expect(JSON.stringify(SPORTS[slug]())).toBe(committed)
    }
  )

  it('has a generator for every committed file', () => {
    const committed = fs
      .readdirSync(assets)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5))
    expect(Object.keys(SPORTS).sort()).toEqual(committed.sort())
  })

  it('is deterministic', () => {
    expect(JSON.stringify(SPORTS.soccer())).toBe(JSON.stringify(SPORTS.soccer()))
  })

  it('generates every icon procedurally with no external art files', () => {
    expect(fs.existsSync(path.join(__dirname, 'art'))).toBe(false)
    const soccerLayers = SPORTS.soccer().layers.map((l) => l.nm)
    expect(soccerLayers).toContain('panels')
    expect(soccerLayers).toContain('rig')
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
