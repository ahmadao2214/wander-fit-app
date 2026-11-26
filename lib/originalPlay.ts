import { sportTheme, type Scheme } from './sportTokens'

// Basketball route from play-final.html. The 8-week legs are the file's short set.
export const ORIGINAL_PLAY = {
  viewBox: '0 0 340 700',
  basketball: {
    long: ['M58 394 Q26 316 66 232', 'M66 232 Q150 318 254 268', 'M254 268 Q302 214 214 172'],
    short: ['M90 356 Q66 290 106 234', 'M106 234 Q180 304 250 262', 'M250 262 Q290 212 214 172'],
  },
} as const

export function renderOriginalPlay(scheme: Scheme, legs: 'long' | 'short' = 'long'): string {
  const theme = sportTheme('basketball', scheme)
  const paths = ORIGINAL_PLAY.basketball[legs]
    .map((d) => `<path d="${d}" fill="none" stroke="${theme.marker.hex}" stroke-width="2.8" stroke-linecap="round"/>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ORIGINAL_PLAY.viewBox}"><rect width="340" height="700" fill="${theme.boardSurface.hex}"/>${paths}</svg>`
}
