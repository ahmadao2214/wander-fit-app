import { sportTheme, type Scheme, type Sport } from './sportTokens'

/** The Tamagui theme names for a sport's two schemes (issue #208). */
export const SPORT_THEME_NAMES = {
  chalkboard: 'chalkboard',
  whiteboard: 'whiteboard',
} as const satisfies Record<Scheme, string>

export type SportThemeName = (typeof SPORT_THEME_NAMES)[Scheme]

/**
 * The keys a sport theme owns. Every value comes from sportTheme(sport, scheme):
 * the ground, the words, the neutral button and the marker pen.
 */
export function sportThemeOverrides(sport: Sport, scheme: Scheme) {
  const t = sportTheme(sport, scheme)
  const text = scheme === 'chalkboard' ? t.chalk.hex : t.ink.hex
  return {
    // The ground
    background: t.instrumentBackground.hex,
    // The words
    color: text,
    colorHover: text,
    colorPress: text,
    colorFocus: text,
    color12: text,
    // The neutral button (chalk on a chalkboard, ink on a whiteboard), not the marker
    primary: t.button.hex,
    primaryHover: t.button.hex,
    primaryPress: t.button.hex,
    primaryFocus: t.button.hex,
    primaryText: t.button.hex,
    // The pen, and only the pen
    marker: t.marker.hex,
  }
}

/**
 * A full Tamagui theme for a sport. `base` (light for whiteboard, dark for
 * chalkboard) only fills keys this theme does not own; the overrides win.
 */
export function sportTamaguiTheme<Base extends Record<string, string>>(
  sport: Sport,
  scheme: Scheme,
  base: Base,
): Omit<Base, keyof ReturnType<typeof sportThemeOverrides>> & ReturnType<typeof sportThemeOverrides> {
  return { ...base, ...sportThemeOverrides(sport, scheme) }
}
