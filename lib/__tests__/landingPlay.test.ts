import { readFileSync } from 'node:fs'
import { LANDING_WIDTH, renderLandingReduced, renderLandingScroll } from '../landingPlay'
import { MOTION } from '../motion'
import { ORIGINAL_PLAY } from '../originalPlay'
import { sportTheme } from '../sportTokens'

const LONG = ['M58 394 Q26 316 66 232', 'M66 232 Q150 318 254 268', 'M254 268 Q302 214 214 172']
const chalkboard = sportTheme('basketball', 'chalkboard')
const whiteboard = sportTheme('basketball', 'whiteboard')
const count = (page: string, needle: string) => page.split(needle).length - 1

describe('landing play', () => {
  const scroll = renderLandingScroll()
  const reduced = renderLandingReduced()
  const pages = { scroll, reduced }

  it('draws the original play, long legs only', () => {
    expect([...ORIGINAL_PLAY.basketball.long]).toEqual(LONG)
    expect(ORIGINAL_PLAY.viewBox).toBe('0 0 340 700')
    for (const [name, page] of Object.entries(pages)) {
      for (const leg of LONG) expect({ name, leg, times: count(page, `d="${leg}"`) }).toEqual({ name, leg, times: 2 })
      for (const leg of ORIGINAL_PLAY.basketball.short) expect({ name, leg, found: page.includes(leg) }).toEqual({ name, leg, found: false })
      expect({ name, paths: count(page, '<path ') }).toEqual({ name, paths: 6 })
      expect({ name, viewBoxes: count(page, 'viewBox="0 0 340 700"') }).toEqual({ name, viewBoxes: 2 })
      expect({ name, width: count(page, 'stroke-width="2.8"') }).toEqual({ name, width: 6 })
      expect({ name, circles: count(page, '<circle'), lines: count(page, '<line') }).toEqual({ name, circles: 0, lines: 0 })
      for (const banned of ['#2563EB', 'SCORE', 'GPP', 'SPP', 'SSP']) {
        expect({ name, banned, found: page.includes(banned) }).toEqual({ name, banned, found: false })
      }
      expect(page).toContain(`width: ${LANDING_WIDTH}px`)
    }
  })

  it('stacks chalkboard then whiteboard, each with its own marker and surface', () => {
    expect(chalkboard.marker.hex).not.toBe(whiteboard.marker.hex)
    for (const page of Object.values(pages)) {
      const chalk = page.indexOf('data-scheme="chalkboard"')
      const white = page.indexOf('data-scheme="whiteboard"')
      expect(chalk).toBeGreaterThan(-1)
      expect(white).toBeGreaterThan(chalk)
      const chalkSection = page.slice(chalk, white)
      const whiteSection = page.slice(white)
      expect(count(chalkSection, `stroke="${chalkboard.marker.hex}"`)).toBe(3)
      expect(count(whiteSection, `stroke="${whiteboard.marker.hex}"`)).toBe(3)
      expect(chalkSection).not.toContain(whiteboard.marker.hex)
      expect(whiteSection).not.toContain(chalkboard.marker.hex)
      expect(chalkSection).toContain(`fill="${chalkboard.boardSurface.hex}"`)
      expect(whiteSection).toContain(`fill="${whiteboard.boardSurface.hex}"`)
      expect(chalkSection).toContain(`color:${chalkboard.chalk.hex}`)
      expect(whiteSection).toContain(`color:${whiteboard.ink.hex}`)
      expect(count(page, 'class="words"')).toBe(2)
    }
  })

  it('draws on with the ease-out curve as the page scrolls, and not under reduced motion', () => {
    expect(scroll).toContain(MOTION.easeOut)
    expect(scroll).toContain(`stroke-dashoffset ${MOTION.drawOnMs}ms ${MOTION.easeOut}`)
    expect(scroll).toContain('IntersectionObserver')
    expect(scroll).toContain('entry.intersectionRatio < 0.33')
    expect(scroll).not.toContain('entry.isIntersecting')
    expect(scroll).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.leg \{ stroke-dashoffset: 0; transition: none; \}/)
  })

  it('shows the reduced page already drawn, with no motion at all', () => {
    expect(reduced).toContain('<html data-reduced="1">')
    expect(count(reduced, 'stroke-dashoffset:0')).toBe(6)
    expect(reduced).toContain('stroke-dashoffset: 0')
    expect(reduced).not.toContain('stroke-dashoffset: 1')
    for (const banned of ['<script', 'requestAnimationFrame', '@keyframes', 'transition', 'animation']) {
      expect({ banned, found: reduced.includes(banned) }).toEqual({ banned, found: false })
    }
  })

  it('matches the pages on disk', () => {
    expect(readFileSync('design/landing/scroll.html', 'utf8')).toBe(scroll)
    expect(readFileSync('design/landing/reduced.html', 'utf8')).toBe(reduced)
  })
})
