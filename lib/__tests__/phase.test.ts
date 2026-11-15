import { contrastRatio } from '../contrast'
import {
  PHASES,
  PHASE_NAMES,
  PHASE_SWATCHES,
  phaseTitle,
  phaseTokens,
  phaseThemeColors,
} from '../phase'

const BACKGROUNDS = {
  light: { background: '#FAFBFC', surface: '#FFFFFF' },
  dark: { background: '#0F172A', surface: '#1E293B' },
} as const

function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return 0
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}

function lightness(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2
}

describe('phase glossary', () => {
  it('uses the approved expansions', () => {
    expect(PHASE_NAMES).toEqual({
      GPP: 'General Physical Preparedness',
      SPP: 'Specific Physical Preparedness',
      SSP: 'Sport-Specific Preparedness',
    })
  })

  it('formats a title with the abbreviation first', () => {
    expect(phaseTitle('SPP')).toBe('SPP: Specific Physical Preparedness')
  })
})

describe('phase colors', () => {
  for (const mode of ['light', 'dark'] as const) {
    describe(`${mode} theme`, () => {
      for (const phase of PHASES) {
        const s = PHASE_SWATCHES[mode][phase]

        it(`${phase} text passes AA on the background, surface and its tint`, () => {
          expect(contrastRatio(s.text, BACKGROUNDS[mode].background)).toBeGreaterThanOrEqual(4.5)
          expect(contrastRatio(s.text, BACKGROUNDS[mode].surface)).toBeGreaterThanOrEqual(4.5)
          expect(contrastRatio(s.text, s.tint)).toBeGreaterThanOrEqual(4.5)
        })

        it(`${phase} label on its fill passes AA`, () => {
          expect(contrastRatio(s.onFill, s.fill)).toBeGreaterThanOrEqual(4.5)
        })

        it(`${phase} stays in the brand blue, clear of red, amber and green`, () => {
          for (const c of [s.fill, s.text, s.tint]) {
            const h = hue(c)
            expect(h).toBeGreaterThanOrEqual(200)
            expect(h).toBeLessThanOrEqual(240)
          }
        })
      }

      it('fills deepen from GPP to SSP', () => {
        const [g, sp, ss] = PHASES.map((p) => lightness(PHASE_SWATCHES[mode][p].fill))
        expect(g).toBeGreaterThan(sp)
        expect(sp).toBeGreaterThan(ss)
      })
    })
  }

  it('maps a phase to its theme tokens, defaulting to GPP', () => {
    expect(phaseTokens('SSP')).toEqual({
      fill: '$phaseSSP',
      onFill: '$phaseSSPOnFill',
      text: '$phaseSSPText',
      tint: '$phaseSSPTint',
    })
    expect(phaseTokens(undefined).fill).toBe('$phaseGPP')
  })

  it('exposes every token to the theme', () => {
    const colors = phaseThemeColors('light')
    for (const phase of PHASES) {
      const t = phaseTokens(phase)
      for (const token of Object.values(t)) {
        expect(colors[token.slice(1)]).toBeDefined()
      }
    }
  })
})
