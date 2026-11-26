import { contrastRatio } from './contrast'
import { channels, maxChroma, oklchToHex, type Oklch } from './oklch'

export { channels, maxChroma }

export const SPORTS = ['basketball', 'soccer', 'track'] as const
export const SCHEMES = ['chalkboard', 'whiteboard'] as const

export type Sport = (typeof SPORTS)[number]
export type Scheme = (typeof SCHEMES)[number]
export type Token = Oklch & { hex: string }

export type SportTheme = {
  sport: Sport
  scheme: Scheme
  marker: Token
  boardSurface: Token
  ink: Token
  chalk: Token
  button: Token
  instrumentBackground: Token
}

// Hues of the play-final marker inks: basketball #E8762D, soccer #45C27A, track #EE5D47.
const HUE: Record<Sport, number> = {
  basketball: 49.013,
  soccer: 154.358,
  track: 31.072,
}

const BLUE_HUE = 250
const NEUTRAL_HUE = 70

const RECIPE = {
  chalkboard: {
    markerL: 0.7,
    markerFraction: 0.62,
    boardL: 0.2,
    boardFraction: 0.22,
    inkL: 0.27,
    chalkL: 0.93,
    instrumentL: 0.16,
    neutralC: 0.012,
  },
  whiteboard: {
    markerL: 0.48,
    markerFraction: 0.75,
    boardL: 0.96,
    boardFraction: 0.12,
    inkL: 0.25,
    chalkL: 0.95,
    instrumentL: 0.98,
    neutralC: 0.01,
  },
} as const

function sportColor(l: number, fraction: number, h: number): Token {
  const c = fraction * maxChroma(l, h)
  return { l, c, h, hex: oklchToHex(l, c, h) }
}

function neutralColor(l: number, c: number): Token {
  return { l, c, h: NEUTRAL_HUE, hex: oklchToHex(l, c, NEUTRAL_HUE) }
}

function neutralsFor(scheme: Scheme) {
  const recipe = RECIPE[scheme]
  return {
    ink: neutralColor(recipe.inkL, recipe.neutralC),
    chalk: neutralColor(recipe.chalkL, recipe.neutralC),
    instrumentBackground: neutralColor(recipe.instrumentL, recipe.neutralC),
  }
}

const NEUTRALS: Record<Scheme, ReturnType<typeof neutralsFor>> = {
  chalkboard: neutralsFor('chalkboard'),
  whiteboard: neutralsFor('whiteboard'),
}

export function sportTheme(sport: Sport, scheme: Scheme): SportTheme {
  const recipe = RECIPE[scheme]
  const hue = HUE[sport]
  const neutrals = NEUTRALS[scheme]
  // Decision 5: the button face is chalk on a chalkboard and ink on a whiteboard.
  const button = scheme === 'chalkboard' ? neutrals.chalk : neutrals.ink
  return {
    sport,
    scheme,
    marker: sportColor(recipe.markerL, recipe.markerFraction, hue),
    boardSurface: sportColor(recipe.boardL, recipe.boardFraction, hue),
    ink: neutrals.ink,
    chalk: neutrals.chalk,
    button,
    instrumentBackground: neutrals.instrumentBackground,
  }
}

export function blueProbe(scheme: Scheme): Token {
  const recipe = RECIPE[scheme]
  return sportColor(recipe.markerL, recipe.markerFraction, BLUE_HUE)
}

// Move lightness only. Chroma stays the same fraction of the ceiling at the new lightness.
function repairedLightness(foreground: string, background: string, minimum: number): number | null {
  const source = channels(foreground)
  const ceiling = maxChroma(source.l, source.h)
  const fraction = ceiling > 1e-8 ? Math.min(1, source.c / ceiling) : 0
  const away = channels(background).l > source.l ? -1 : 1
  return walk(source.l, away, source.h, fraction, background, minimum)
    ?? walk(source.l, -away, source.h, fraction, background, minimum)
}

function walk(
  start: number,
  direction: number,
  h: number,
  fraction: number,
  background: string,
  minimum: number,
): number | null {
  for (let step = 1; step <= 100; step++) {
    const l = Math.round((start + direction * step * 0.01) * 100) / 100
    if (l < 0 || l > 1) return null
    const hex = oklchToHex(l, fraction * maxChroma(l, h), h)
    if (contrastRatio(hex, background) >= minimum) return l
  }
  return null
}

export function contrastFailure(
  sport: Sport,
  pairName: string,
  foreground: string,
  background: string,
  minimum: number,
): string | null {
  if (contrastRatio(foreground, background) >= minimum) return null
  const shownFrom = channels(foreground).l.toFixed(2)
  const repaired = repairedLightness(foreground, background, minimum)
  if (repaired === null) {
    return `${sport} ${pairName}: lightness ${shownFrom} cannot reach ${minimum}:1`
  }
  const shownTo = repaired.toFixed(2)
  const delta = (Number(shownTo) - Number(shownFrom)).toFixed(2)
  const signed = Number(delta) >= 0 ? `+${delta}` : delta
  return `${sport} ${pairName}: lightness ${shownFrom} → ${shownTo} (${signed})`
}
