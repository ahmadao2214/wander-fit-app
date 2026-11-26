import { readFileSync } from 'node:fs'
import { ORIGINAL_PLAY } from '../originalPlay'
import { MOTION, legDelayMs, renderPress, renderTrip, tripMs } from '../motion'

const LONG = ['M58 394 Q26 316 66 232', 'M66 232 Q150 318 254 268', 'M254 268 Q302 214 214 172']

describe('motion scheme', () => {
  it('writes the three durations', () => {
    expect(MOTION.drawOnMs).toBe(480)
    expect(MOTION.instrumentMs).toBe(180)
    expect(MOTION.reducedMotionMs).toBe(0)
    expect(MOTION.instrumentMs).toBeLessThan(300)
    expect(tripMs()).toBeGreaterThan(300)
    expect(MOTION.bounce).toBe(0)
    expect(legDelayMs(0)).toBe(0)
    expect(legDelayMs(1)).toBe(442)
    expect(legDelayMs(2)).toBe(884)
  })

  it('draws the original play on, and shows it already drawn when motion is reduced', () => {
    const trip = renderTrip(false)
    const reduced = renderTrip(true)
    for (const leg of LONG) {
      expect(trip).toContain(leg)
      expect(reduced).toContain(leg)
    }
    expect(trip).toContain(`${MOTION.drawOnMs}ms ${MOTION.easeOut}`)
    expect(trip).toContain('transition-delay:442ms')
    expect(trip).toContain('transition-delay:884ms')
    expect(reduced).toContain('data-reduced="1"')
    expect(reduced).toContain('stroke-dashoffset:0')
    expect(reduced).toContain('transition:none')
    expect(reduced).not.toContain('requestAnimationFrame')
    expect(Object.keys(ORIGINAL_PLAY).sort()).toEqual(['basketball', 'viewBox'])
  })

  it('eases the instrument press in and out, with no court', () => {
    const press = renderPress()
    expect(press).toContain(`${MOTION.instrumentMs}ms ${MOTION.easeInOut}`)
    expect(press).toContain('Log Set')
    expect(press).toContain('@media (prefers-reduced-motion: reduce)')
    expect(press).toContain('button.press { animation: none; }')
    expect(press).not.toContain('<path')
    expect(press).not.toContain('<svg')
    for (const leg of LONG) expect(press).not.toContain(leg)
  })

  it('matches the pages on disk', () => {
    expect(readFileSync('design/motion/trip.html', 'utf8')).toBe(renderTrip(false))
    expect(readFileSync('design/motion/reduced.html', 'utf8')).toBe(renderTrip(true))
    expect(readFileSync('design/motion/press.html', 'utf8')).toBe(renderPress())
  })
})
