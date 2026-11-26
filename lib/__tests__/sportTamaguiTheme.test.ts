import { readFileSync } from 'fs'
import { join } from 'path'
import config from '../../tamagui.config'
import { sportTheme } from '../sportTokens'
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

// Issue #210: light and dark lose Electric Blue and the phase colours. Their
// primary is the board's neutral button face.
const PHASE_KEY = /^phase(GPP|SPP|SSP)/
const ELECTRIC_BLUE = '#2563EB'
const PRIMARY_ROLE = [
  'primary',
  'primaryHover',
  'primaryPress',
  'primaryFocus',
  'primaryText',
  'borderColorFocus',
  'tabActive',
] as const

describe('light and dark', () => {
  it('take the neutral button face as primary: ink in light, chalk in dark', () => {
    expect([val('light', 'primary'), val('dark', 'primary')]).toEqual([white.button.hex, chalk.button.hex])
  })

  it('give every primary-role key that face, never the marker', () => {
    const wrong = (
      [
        ['light', white],
        ['dark', chalk],
      ] as const
    ).flatMap(([scheme, sport]) =>
      PRIMARY_ROLE.filter((key) => val(scheme, key) !== sport.button.hex || val(scheme, key) === sport.marker.hex).map(
        (key) => `${scheme}.${key}`,
      ),
    )
    expect(wrong).toEqual([])
  })

  it('carry no phase colour keys', () => {
    const left = (['light', 'dark'] as const).flatMap((scheme) =>
      Object.keys(themes[scheme])
        .filter((key) => PHASE_KEY.test(key))
        .map((key) => `${scheme}.${key}`),
    )
    expect(left).toEqual([])
  })

  it('paint no primary-role key Electric Blue', () => {
    const blue = (['light', 'dark'] as const).flatMap((scheme) =>
      PRIMARY_ROLE.filter((key) => val(scheme, key)?.toUpperCase() === ELECTRIC_BLUE).map((key) => `${scheme}.${key}`),
    )
    expect(blue).toEqual([])
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
