import { readFileSync } from 'node:fs'
import { renderFirstRun, renderFirstRunSheet } from '../firstRunBoard'
import { MOTION, legDelayMs } from '../motion'
import { ORIGINAL_PLAY } from '../originalPlay'
import { SCHEMES, SPORTS, sportTheme } from '../sportTokens'

const LONG = [...ORIGINAL_PLAY.basketball.long]

describe('First Run board', () => {
  it('renders both schemes for basketball, soccer, and track', () => {
    const pages = SPORTS.flatMap((sport) => SCHEMES.map((scheme) => renderFirstRun(sport, scheme)))
    expect(pages).toHaveLength(6)
    for (const sport of SPORTS) {
      for (const scheme of SCHEMES) {
        const page = renderFirstRun(sport, scheme)
        const theme = sportTheme(sport, scheme)
        expect(page).toContain(`data-sport="${sport}"`)
        expect(page).toContain(`data-scheme="${scheme}"`)
        expect(page).toContain('width: 402px')
        expect(page).toContain('height: 874px')
        expect(page).toContain(theme.boardSurface.hex)
        expect(page).toContain(theme.marker.hex)
        for (const leg of LONG) expect(page).toContain(leg)
        expect(page).not.toContain('#2563EB')
        expect(page).not.toContain('GPP')
        expect(page).not.toContain('SCORE')
      }
    }
  })

  it('keeps one route and only the sport colour changes', () => {
    const chalkboard = SPORTS.map((sport) => renderFirstRun(sport, 'chalkboard'))
    const markers = SPORTS.map((sport) => sportTheme(sport, 'chalkboard').marker.hex)
    expect(new Set(markers).size).toBe(3)
    for (const page of chalkboard) {
      for (const leg of LONG) expect(page).toContain(leg)
    }
    expect(chalkboard[0]).toContain(markers[0])
    expect(chalkboard[0]).not.toContain(markers[1])
    expect(chalkboard[1]).not.toContain(markers[0])
  })

  it('eases the trip out, and shows the board already drawn when motion is reduced', () => {
    const trip = renderFirstRun('basketball', 'chalkboard', false)
    const reduced = renderFirstRun('basketball', 'chalkboard', true)
    expect(trip).toContain(`${MOTION.drawOnMs}ms ${MOTION.easeOut}`)
    expect(trip).toContain(`transition-delay:${legDelayMs(1)}ms`)
    expect(trip).toContain(`transition-delay:${legDelayMs(2)}ms`)
    expect(trip).toContain('requestAnimationFrame')
    expect(reduced).toContain('data-reduced="1"')
    expect(reduced).toContain('stroke-dashoffset:0')
    expect(reduced).toContain('transition:none')
    expect(reduced).not.toContain('requestAnimationFrame')
    expect(reduced).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('matches the pages on disk', () => {
    expect(readFileSync('design/first-run/trip.html', 'utf8')).toBe(renderFirstRun('basketball', 'chalkboard', false))
    expect(readFileSync('design/first-run/reduced.html', 'utf8')).toBe(renderFirstRun('basketball', 'chalkboard', true))
    expect(readFileSync('design/first-run/sheet.html', 'utf8')).toBe(renderFirstRunSheet())
  })
})
