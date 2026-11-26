import type { SchemeTokens, Tokens } from '../contract'

// Direction B, "Athlete dark": directions/b.md, revision 3. Dark is the default.

type TextRole =
  | 'text'
  | 'textMuted'
  | 'onPrimary'
  | 'primaryText'
  | 'statusLow'
  | 'statusMedium'
  | 'statusHigh'
  | 'tabActive'
  | 'tabInactive'
type BgRole =
  | 'background'
  | 'surface'
  | 'surfaceRaised'
  | 'primary'
  | 'tintGPP'
  | 'tintSPP'
  | 'tintSSP'
  | 'tabBar'

// Text on the page, tiles and the raised current set; the one accent button;
// blue text; status (done checks) on tiles; the tab bar. No text sits on a
// phase tint: b.md gives none, so the tint is only ever a small block.
const pairs: SchemeTokens<TextRole, BgRole>['contrastPairs'] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'surfaceRaised'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['textMuted', 'surfaceRaised'],
  ['onPrimary', 'primary'],
  ['primaryText', 'background'],
  ['primaryText', 'surface'],
  ['primaryText', 'surfaceRaised'],
  ['statusLow', 'background'],
  ['statusLow', 'surface'],
  ['statusMedium', 'surface'],
  ['statusHigh', 'surface'],
  ['tabActive', 'tabBar'],
  ['tabInactive', 'tabBar'],
]

export const tokens: Tokens<TextRole, BgRole> = {
  name: 'B · Athlete dark',
  defaultScheme: 'dark',
  dark: {
    text: {
      text: '#F2F4F7',
      textMuted: '#9AA4B2',
      onPrimary: '#06121F',
      primaryText: '#8FCBFF',
      statusLow: '#3DD68C',
      statusMedium: '#FFC53D',
      statusHigh: '#FF6B6B',
      tabActive: '#8FCBFF',
      tabInactive: '#9AA4B2',
    },
    background: {
      background: '#0E1116',
      surface: '#181C23',
      surfaceRaised: '#222833',
      primary: '#7CC4FF',
      tintGPP: '#1D3B57',
      tintSPP: '#24659A',
      tintSSP: '#4E9BDB',
      tabBar: '#181C23',
    },
    // Phase stripes (Lead, consolidation pass): no text sits on them.
    other: {
      scrim: 'rgba(0,0,0,0.6)',
      stripeGPP: '#3F74D6',
      stripeSPP: '#5B8DEE',
      stripeSSP: '#A9C8F5',
    },
    contrastPairs: pairs,
    shadow: {},
    statusBar: 'light',
  },
  light: {
    text: {
      text: '#12151A',
      textMuted: '#566070',
      onPrimary: '#FFFFFF',
      primaryText: '#0A569F',
      statusLow: '#086A41',
      statusMedium: '#8A4F00',
      statusHigh: '#B32222',
      tabActive: '#0A569F',
      tabInactive: '#566070',
    },
    background: {
      background: '#EEF1F4',
      surface: '#FFFFFF',
      surfaceRaised: '#DDE6F0',
      primary: '#0B62B8',
      tintGPP: '#CFE6FA',
      tintSPP: '#7DB9EC',
      tintSSP: '#0B62B8',
      tabBar: '#FFFFFF',
    },
    other: {
      scrim: 'rgba(18,21,26,0.4)',
      stripeGPP: '#3F74D6',
      stripeSPP: '#2A5FD0',
      stripeSSP: '#163A8F',
    },
    contrastPairs: pairs,
    shadow: {},
    statusBar: 'dark',
  },
  type: {
    /** Only when a screen has a single number: warmup countdown, sets done on paused Today. */
    hero: 72,
    /** Execute's reps and load tiles, and any two numbers side by side. */
    bigNumber: 44,
    /** Barlow Condensed Bold capitals: screen titles and the exercise name on Execute only. */
    display: 34,
    title: 24,
    heading: 18,
    body: 17,
    /** The label under a number ("reps", "lb"): Medium, lower case, readable at arm's length. */
    unit: 16,
    /** Captions only. */
    label: 13,
    /** 13pt floor for every caption and tab label (from C). */
    caption: 13,
  },
  // b.md gives no letter spacing.
  letterSpacing: {},
  radius: { tile: 14, button: 14, sheet: 20 },
  space: [4, 8, 12, 16, 24, 32],
  gutter: 16,
  /** Anything used mid-set. */
  tapTarget: 56,
}
