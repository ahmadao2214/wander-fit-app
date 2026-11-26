import { FRAME } from '../stories/redesign/contract'
import { MOTION, legDelayMs } from './motion'
import { ORIGINAL_PLAY } from './originalPlay'
import { SCHEMES, SPORTS, sportTheme, type Scheme, type Sport } from './sportTokens'

// First Run plays the committed basketball route. Soccer and track use the
// same legs. Chalkboard is the dark scheme. Whiteboard is the light scheme.
// Reduced motion shows the board already drawn.

const wordsOf = (scheme: Scheme) => (scheme === 'chalkboard' ? 'chalk' : 'ink')

function legs(theme: ReturnType<typeof sportTheme>, reduced: boolean): string {
  return ORIGINAL_PLAY.basketball.long
    .map((d, index) => {
      const delay = reduced ? 'transition:none;stroke-dashoffset:0' : `transition-delay:${legDelayMs(index)}ms`
      return `<path class="leg" pathLength="1" d="${d}" stroke="${theme.marker.hex}" style="${delay}"/>`
    })
    .join('')
}

export function renderFirstRunBoard(sport: Sport, scheme: Scheme, reduced = false): string {
  const theme = sportTheme(sport, scheme)
  const words = theme[wordsOf(scheme)].hex
  const reducedAttr = reduced ? ' data-reduced="1"' : ''
  const drawn = reduced ? ' play' : ''
  return `<main class="phone" data-sport="${sport}" data-scheme="${scheme}"${reducedAttr} style="background:${theme.boardSurface.hex};color:${words}"><h1>First Run</h1><div class="field"><svg class="${drawn.trim()}" xmlns="http://www.w3.org/2000/svg" viewBox="${ORIGINAL_PLAY.viewBox}"><rect width="340" height="700" fill="${theme.boardSurface.hex}"/>${legs(theme, reduced)}</svg></div></main>`
}

const STYLE = `<style>
  html, body { margin: 0; background: transparent; font-family: system-ui, sans-serif; }
  .phone { width: ${FRAME.width}px; height: ${FRAME.height}px; box-sizing: border-box; display: flex; flex-direction: column; padding: 62px 16px 34px; }
  h1 { margin: 0 0 12px; font-size: 22px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  .field { flex: 1; min-height: 0; }
  .field svg { width: 100%; height: 100%; display: block; }
  .leg { fill: none; stroke-width: 2.8; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset ${MOTION.drawOnMs}ms ${MOTION.easeOut}; }
  .play .leg { stroke-dashoffset: 0; }
  html[data-reduced="1"] .leg, .phone[data-reduced="1"] .leg { stroke-dashoffset: 0; transition: none; }
  @media (prefers-reduced-motion: reduce) {
    .leg { stroke-dashoffset: 0; transition: none; }
  }
</style>`

function page(body: string, reduced: boolean, script = ''): string {
  const reducedAttr = reduced ? ' data-reduced="1"' : ''
  return `<!DOCTYPE html><html${reducedAttr}><head><meta charset="utf-8"><title>First Run</title>${STYLE}</head><body>${body}${script}</body></html>`
}

export function renderFirstRun(sport: Sport, scheme: Scheme, reduced = false): string {
  const script = reduced
    ? ''
    : '<script>requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector("svg").classList.add("play")))</script>'
  return page(renderFirstRunBoard(sport, scheme, reduced), reduced, script)
}

export function renderFirstRunSheet(): string {
  const cells = SCHEMES.flatMap((scheme) =>
    SPORTS.map(
      (sport) =>
        `<div class="cell"><p class="cap">${sport} · ${scheme}</p>${renderFirstRunBoard(sport, scheme, true)}</div>`
    )
  ).join('')
  return page(`<div class="sheet">${cells}</div>`, true).replace(
    '</style>',
    `.sheet { display: grid; grid-template-columns: repeat(3, ${FRAME.width}px); gap: 28px 20px; }
    .cap { margin: 0 0 8px; font-size: 13px; }
    .cell { width: ${FRAME.width}px; }</style>`
  )
}
