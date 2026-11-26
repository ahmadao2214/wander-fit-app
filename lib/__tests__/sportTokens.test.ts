import { contrastRatio } from '../contrast'
import {
  SCHEMES,
  SPORTS,
  blueProbe,
  channels,
  contrastFailure,
  maxChroma,
  sportTheme,
} from '../sportTokens'
import type { Scheme, Sport, Token } from '../sportTokens'

// play-final.html marker inks. The tokens keep these hues.
const SKETCH: Record<Sport, string> = {
  basketball: '#E8762D',
  soccer: '#45C27A',
  track: '#EE5D47',
}

function chromaFraction(token: Token): number {
  const ceiling = maxChroma(token.l, token.h)
  return token.c / ceiling
}

function pairs(scheme: Scheme, sport: Sport) {
  const theme = sportTheme(sport, scheme)
  const body = scheme === 'chalkboard' ? theme.chalk.hex : theme.ink.hex
  const label = scheme === 'chalkboard' ? theme.ink.hex : theme.chalk.hex
  return [
    ['body-on-board', body, theme.boardSurface.hex, 4.5],
    ['body-on-instrument', body, theme.instrumentBackground.hex, 4.5],
    ['button-label', label, theme.button.hex, 4.5],
    ['marker-line-on-board', theme.marker.hex, theme.boardSurface.hex, 3],
    ['hero-on-instrument', theme.marker.hex, theme.instrumentBackground.hex, 4.5],
  ] as const
}

describe('sport token contract', () => {
  it('reads black, white, and the sRGB primaries', () => {
    expect(channels('#ffffff').l).toBeCloseTo(1, 2)
    expect(channels('#ffffff').c).toBeCloseTo(0, 3)
    expect(channels('#000000').l).toBeCloseTo(0, 2)
    const red = channels('#ff0000')
    expect(red.l).toBeCloseTo(0.62796, 4)
    expect(red.c).toBeCloseTo(0.25768, 4)
    expect(red.h).toBeCloseTo(29.234, 2)
  })

  it('covers basketball, soccer, and track on a chalkboard and a whiteboard', () => {
    expect([...SPORTS]).toEqual(['basketball', 'soccer', 'track'])
    expect([...SCHEMES]).toEqual(['chalkboard', 'whiteboard'])
  })

  it('shares one marker lightness and one chroma fraction inside a scheme', () => {
    for (const scheme of SCHEMES) {
      const markers = SPORTS.map((sport) => sportTheme(sport, scheme).marker)
      const boards = SPORTS.map((sport) => sportTheme(sport, scheme).boardSurface)
      const markerFractions = markers.map(chromaFraction)
      const boardFractions = boards.map(chromaFraction)

      expect(new Set(markers.map((token) => token.l)).size).toBe(1)
      expect(new Set(boards.map((token) => token.l)).size).toBe(1)
      expect(new Set(markers.map((token) => token.hex)).size).toBe(3)
      for (const fraction of markerFractions.slice(1)) {
        expect(fraction).toBeCloseTo(markerFractions[0], 4)
      }
      for (const fraction of boardFractions.slice(1)) {
        expect(fraction).toBeCloseTo(boardFractions[0], 4)
      }
      for (const token of [...markers, ...boards]) {
        expect(chromaFraction(token)).toBeGreaterThan(0)
        expect(chromaFraction(token)).toBeLessThanOrEqual(1)
        const back = channels(token.hex)
        expect(Math.abs(back.l - token.l)).toBeLessThanOrEqual(0.01)
        expect(Math.abs(back.c - token.c)).toBeLessThanOrEqual(0.01)
      }
    }
  })

  it('keeps each marker on its sketch hue', () => {
    for (const sport of SPORTS) {
      const hue = channels(SKETCH[sport]).h
      for (const scheme of SCHEMES) {
        const theme = sportTheme(sport, scheme)
        expect(Math.abs(theme.marker.h - hue)).toBeLessThanOrEqual(1)
        expect(Math.abs(theme.boardSurface.h - hue)).toBeLessThanOrEqual(1)
      }
    }
  })

  it('uses a less vivid marker on the chalkboard than on the whiteboard', () => {
    for (const sport of SPORTS) {
      const dark = chromaFraction(sportTheme(sport, 'chalkboard').marker)
      const light = chromaFraction(sportTheme(sport, 'whiteboard').marker)
      expect(dark).toBeLessThan(light)
    }
  })

  it('paints the button with the scheme neutral, and keeps the board off the instrument', () => {
    for (const scheme of SCHEMES) {
      const themes = SPORTS.map((sport) => sportTheme(sport, scheme))
      const [first] = themes
      for (const theme of themes) {
        expect(theme.ink.hex).toBe(first.ink.hex)
        expect(theme.chalk.hex).toBe(first.chalk.hex)
        expect(theme.instrumentBackground.hex).toBe(first.instrumentBackground.hex)
        expect(theme.boardSurface.hex).not.toBe(theme.instrumentBackground.hex)
        expect(theme.button.hex).not.toBe(theme.marker.hex)
        if (scheme === 'chalkboard') {
          expect(theme.button.hex).toBe(theme.chalk.hex)
          expect(theme.button.l).toBeGreaterThan(theme.boardSurface.l)
        } else {
          expect(theme.button.hex).toBe(theme.ink.hex)
          expect(theme.button.l).toBeLessThan(theme.boardSurface.l)
        }
        for (const neutral of [theme.ink, theme.chalk, theme.instrumentBackground]) {
          expect(neutral.h).toBeGreaterThanOrEqual(40)
          expect(neutral.h).toBeLessThanOrEqual(100)
          expect(neutral.c).toBeGreaterThan(0)
          expect(neutral.c).toBeLessThan(0.04)
        }
      }
    }
  })

  it('clears 4.5:1 for text and 3:1 for marker lines', () => {
    for (const scheme of SCHEMES) {
      for (const sport of SPORTS) {
        for (const [name, foreground, background, minimum] of pairs(scheme, sport)) {
          expect({ sport, scheme, name, ok: contrastRatio(foreground, background) >= minimum }).toEqual({
            sport,
            scheme,
            name,
            ok: true,
          })
        }
      }
    }
  })

  it('checks the warm neutrals against a blue sport', () => {
    for (const scheme of SCHEMES) {
      const probe = blueProbe(scheme)
      const theme = sportTheme('basketball', scheme)
      const marker = theme.marker
      expect(probe.h).toBeGreaterThanOrEqual(240)
      expect(probe.h).toBeLessThanOrEqual(260)
      expect(probe.l).toBeCloseTo(marker.l, 4)
      expect(chromaFraction(probe)).toBeCloseTo(chromaFraction(marker), 4)
      expect(contrastRatio(probe.hex, theme.instrumentBackground.hex)).toBeGreaterThanOrEqual(3)
      const body = scheme === 'chalkboard' ? theme.chalk.hex : theme.ink.hex
      expect(contrastRatio(body, theme.instrumentBackground.hex)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('names the sport and the lightness change when a pair fails', () => {
    const message = contrastFailure('basketball', 'marker-on-board', '#5A534C', '#6B645C', 3)
    expect(message).toMatch(
      /^basketball marker-on-board: lightness \d+\.\d{2} → \d+\.\d{2} \([+-]\d+\.\d{2}\)$/,
    )
  })

  it('tries white before it reports that a pair cannot reach the ratio', () => {
    const message = contrastFailure('basketball', 'marker-on-board', '#888888', '#595959', 7)
    expect(message).toMatch(/^basketball marker-on-board: lightness \d+\.\d{2} → 1\.00 \(\+\d+\.\d{2}\)$/)
  })

  it('stays quiet when a shipped pair already clears', () => {
    for (const scheme of SCHEMES) {
      for (const sport of SPORTS) {
        for (const [name, foreground, background, minimum] of pairs(scheme, sport)) {
          expect(contrastFailure(sport, name, foreground, background, minimum)).toBeNull()
        }
      }
    }
  })
})
