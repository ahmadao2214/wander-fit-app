import fs from 'node:fs'
import path from 'node:path'
import { SPORTS } from '../../convex/seedData'
import { getSportSlug } from '../intakeUI'
import { SPORT_ANIMATIONS, getSportAnimation } from '../sportAnimations'
import { SPORT_LOTTIE_RULES, checkSportLottie } from '../sportAnimationChecks'

const dir = path.join(__dirname, '../../assets/lottie/sports')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
const read = (file: string) => {
  const text = fs.readFileSync(path.join(dir, file), 'utf8')
  return { json: JSON.parse(text), bytes: Buffer.byteLength(text) }
}
const sportSlugs = SPORTS.map((s) => getSportSlug(s.name))

describe('sport animation files', () => {
  it.each(files)('%s follows the Lottie rules', (file) => {
    const { json, bytes } = read(file)
    expect(checkSportLottie(json, bytes)).toEqual([])
  })

  it('stay inside the total budget', () => {
    const total = files.reduce((sum, file) => sum + read(file).bytes, 0)
    expect(total).toBeLessThanOrEqual(SPORT_LOTTIE_RULES.totalLimitBytes)
  })

  it('are each named after a sport and registered', () => {
    for (const file of files) {
      const slug = file.replace(/\.json$/, '')
      expect(sportSlugs).toContain(slug)
      expect(SPORT_ANIMATIONS[slug]).toBeDefined()
    }
  })
})

describe('getSportAnimation', () => {
  it('only registers real sports', () => {
    for (const slug of Object.keys(SPORT_ANIMATIONS)) expect(sportSlugs).toContain(slug)
  })

  it('resolves every seeded sport to an animation or to the fallback', () => {
    expect(SPORTS).toHaveLength(27)
    for (const sport of SPORTS) {
      const source = getSportAnimation(sport.name)
      const expected = SPORT_ANIMATIONS[getSportSlug(sport.name)]
      expect(source).toBe(expected)
    }
  })

  it('finds Soccer by its display name', () => {
    expect(getSportAnimation('Soccer')).toBeDefined()
  })

  it('returns undefined for a sport without an animation yet', () => {
    expect(getSportAnimation('Track (Sprints/Jumps)')).toBeUndefined()
    expect(getSportAnimation('Not A Sport')).toBeUndefined()
  })
})

describe('checkSportLottie', () => {
  const soccer = read('soccer.json')
  const clone = () => JSON.parse(JSON.stringify(soccer.json))

  it('passes the generated soccer file', () => {
    expect(checkSportLottie(soccer.json, soccer.bytes)).toEqual([])
  })

  it('flags a file over the size budget', () => {
    expect(checkSportLottie(soccer.json, 16 * 1024).join()).toMatch(/over the 15 KB budget/)
  })

  it('flags expressions, effects and merge paths', () => {
    const lottie = clone()
    lottie.layers[0].ef = [{ ty: 5 }]
    lottie.layers[0].shapes[0].it.unshift({ ty: 'mm', mm: 1 })
    lottie.layers[0].shapes[0].it.find((i: { ty: string }) => i.ty === 'st').c.x = 'var $bm_rt = 1'
    const problems = checkSportLottie(lottie, 1000).join('\n')
    expect(problems).toMatch(/has effects/)
    expect(problems).toMatch(/merge paths/)
    expect(problems).toMatch(/expression/)
  })

  it('flags curved motion paths', () => {
    const lottie = clone()
    lottie.layers[0].ks.p = {
      a: 1,
      k: [
        { t: 0, s: [500, 500, 0], to: [0, 10, 0], ti: [0, -10, 0] },
        { t: 150, s: [500, 500, 0] },
      ],
    }
    expect(checkSportLottie(lottie, 1000).join()).toMatch(/curved motion path/)
  })

  it('flags an animation that does not end on its rest pose', () => {
    const lottie = clone()
    const rig = lottie.layers.find((l: { nm: string }) => l.nm === 'rig')
    const keys = rig.ks.p.y.k
    keys[keys.length - 1].s = [700]
    expect(checkSportLottie(lottie, 1000).join()).toMatch(/ends at \[700\]/)
  })

  it('accepts a full turn as ending where it started', () => {
    const panels = soccer.json.layers.find((l: { nm: string }) => l.nm === 'panels')
    const keys = panels.ks.r.k
    expect(keys[keys.length - 1].s[0] - keys[0].s[0]).toBe(-360)
  })

  it('flags the wrong timing', () => {
    const lottie = clone()
    lottie.fr = 29.97
    lottie.op = 172
    const problems = checkSportLottie(lottie, 1000).join('\n')
    expect(problems).toMatch(/frame rate 29.97/)
    expect(problems).toMatch(/frames 0–172/)
  })
})
