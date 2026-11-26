import { readFileSync } from 'fs'
import { join } from 'path'
import config from '../../tamagui.config'
import { sportTheme } from '../sportTokens'
import { phaseThemeColors } from '../phase'
import { sportThemeOverrides } from '../sportTamaguiTheme'

// Issue #208: the basketball chalkboard and whiteboard themes sit beside light
// and dark. Compare the parsed themes Tamagui actually built, not the inputs.
type Parsed = Record<string, { val: string } | undefined>
const themes = config.themes as unknown as Record<string, Parsed>
const val = (theme: string, key: string) => themes[theme]?.[key]?.val

const chalk = sportTheme('basketball', 'chalkboard')
const white = sportTheme('basketball', 'whiteboard')

const ROOT = join(__dirname, '..', '..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')
// A hex colour: 6 or 8 digits, or 3/4 with a letter in them, so "issue #208" is not one.
const RAW_HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|(?=[0-9]*[a-f])[0-9a-f]{3,4})\b/gi

describe('light and dark are unchanged', () => {
  it('keep Electric Blue as primary', () => {
    expect([val('light', 'primary'), val('dark', 'primary')]).toEqual(['#2563EB', '#2563EB'])
  })

  it('keep the phase colours', () => {
    const missing = (['light', 'dark'] as const).flatMap((scheme) =>
      Object.entries(phaseThemeColors(scheme))
        .filter(([key, hex]) => val(scheme, key) !== hex)
        .map(([key]) => `${scheme}.${key}`),
    )
    expect(missing).toEqual([])
  })

  it('carry no marker, so old screens cannot reach the pen', () => {
    expect([val('light', 'marker'), val('dark', 'marker')]).toEqual([undefined, undefined])
  })
})

describe('basketball sport themes', () => {
  it('ground: background is the instrument background', () => {
    expect(val('chalkboard', 'background')).toBe(chalk.instrumentBackground.hex)
    expect(val('whiteboard', 'background')).toBe(white.instrumentBackground.hex)
  })

  it('words: color is chalk on chalkboard and ink on whiteboard', () => {
    expect(val('chalkboard', 'color')).toBe(chalk.chalk.hex)
    expect(val('whiteboard', 'color')).toBe(white.ink.hex)
  })

  it('button: primary is the neutral button face, not the marker', () => {
    expect(val('chalkboard', 'primary')).toBe(chalk.button.hex)
    expect(val('whiteboard', 'primary')).toBe(white.button.hex)
    expect(val('chalkboard', 'primary')).not.toBe(chalk.marker.hex)
    expect(val('whiteboard', 'primary')).not.toBe(white.marker.hex)
  })

  it('pen: marker is the sport marker, and the two schemes differ', () => {
    expect(val('chalkboard', 'marker')).toBe(chalk.marker.hex)
    expect(val('whiteboard', 'marker')).toBe(white.marker.hex)
    expect(chalk.marker.hex).not.toBe(white.marker.hex)
  })

  it('every key the sport theme owns comes from sportTheme', () => {
    const wrong = (['chalkboard', 'whiteboard'] as const).flatMap((scheme) =>
      Object.entries(sportThemeOverrides('basketball', scheme))
        .filter(([key, hex]) => val(scheme, key) !== hex)
        .map(([key]) => `${scheme}.${key}`),
    )
    expect(wrong).toEqual([])
  })

  it('no owned key is Electric Blue', () => {
    const blue = (['chalkboard', 'whiteboard'] as const).flatMap((scheme) =>
      Object.keys(sportThemeOverrides('basketball', scheme))
        .filter((key) => val(scheme, key)?.toUpperCase() === '#2563EB')
        .map((key) => `${scheme}.${key}`),
    )
    expect(blue).toEqual([])
  })

  it('fill every other key from the base: dark for chalkboard, light for whiteboard', () => {
    const owned = new Set(Object.keys(sportThemeOverrides('basketball', 'chalkboard')))
    const gaps = (
      [
        ['chalkboard', 'dark'],
        ['whiteboard', 'light'],
      ] as const
    ).flatMap(([sport, base]) =>
      Object.keys(themes[base])
        .filter((key) => !owned.has(key) && val(sport, key) !== val(base, key))
        .map((key) => `${sport}.${key}`),
    )
    expect(gaps).toEqual([])
  })
})

describe('the sport theme source', () => {
  it('types no raw hex', () => {
    expect(read('lib/sportTamaguiTheme.ts').match(RAW_HEX)).toBeNull()
  })
})

describe('SportThemeProof', () => {
  const proof = read('components/SportThemeProof.tsx')

  it('holds no Electric Blue, phase name or score', () => {
    const found = ['#2563EB', 'GPP', 'SPP', 'SSP', 'SCORE'].filter((word) =>
      proof.toUpperCase().includes(word.toUpperCase()),
    )
    expect(found).toEqual([])
  })

  it('holds no raw colour and no svg path', () => {
    expect([proof.match(RAW_HEX), /<Path|<Svg|react-native-svg/.test(proof)]).toEqual([
      null,
      false,
    ])
  })

  it('is not mounted from the app root', () => {
    expect(read('app/_layout.tsx')).not.toContain('SportThemeProof')
  })
})
