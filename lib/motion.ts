import { ORIGINAL_PLAY } from './originalPlay'
import { sportTheme, type Scheme } from './sportTokens'

// Decision 21. Draw-on eases out. A control already on screen eases in and out.
// The draw curve is the pen's curve in play-final.html. Bounce stays at zero.
// Reduced motion shows the board already drawn, fades included.
export const MOTION = {
  easeOut: 'cubic-bezier(0.45, 0, 0.25, 1)',
  easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  bounce: 0,
  drawOnMs: 480,
  drawStagger: 0.92,
  instrumentMs: 180,
  reducedMotionMs: 0,
} as const

export function legDelayMs(index: number): number {
  return index * Math.round(MOTION.drawOnMs * MOTION.drawStagger)
}

export function tripMs(legs = ORIGINAL_PLAY.basketball.long.length): number {
  return MOTION.drawOnMs + legDelayMs(legs - 1)
}

const PAGE = (scheme: Scheme, body: string, script = '') => {
  const theme = sportTheme('basketball', scheme)
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Motion</title>
<meta name="draw-on-ms" content="${MOTION.drawOnMs}">
<meta name="instrument-ms" content="${MOTION.instrumentMs}">
<meta name="reduced-motion-ms" content="${MOTION.reducedMotionMs}">
<style>
  html, body { margin: 0; height: 100%; background: transparent; font-family: system-ui, sans-serif; }
  .board { width: 390px; height: 700px; display: flex; flex-direction: column; padding: 22px 16px 16px; box-sizing: border-box; }
  h2 { margin: 0 0 12px; font-size: 22px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  .field { flex: 1; min-height: 0; }
  .field svg { width: 100%; height: 100%; display: block; }
  .leg { fill: none; stroke: ${theme.marker.hex}; stroke-width: 2.8; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset ${MOTION.drawOnMs}ms ${MOTION.easeOut}; }
  .play .leg { stroke-dashoffset: 0; }
  button { height: 48px; border: 0; border-radius: 14px; font-family: inherit; font-weight: 700; font-size: 16px; line-height: 1; background: ${theme.button.hex}; color: ${scheme === 'chalkboard' ? theme.ink.hex : theme.chalk.hex}; }
  button.press { animation: press ${MOTION.instrumentMs}ms ${MOTION.easeInOut} both; }
  @keyframes press { 0% { transform: none; } 45% { transform: translateY(3px); } 100% { transform: none; } }
  html[data-reduced="1"] .leg { stroke-dashoffset: 0; transition: none; }
  html[data-reduced="1"] button { animation: none; }
  @media (prefers-reduced-motion: reduce) {
    .leg { stroke-dashoffset: 0; transition: none; }
    button { animation: none; }
  }
</style></head><body>${body}${script}</body></html>`
}

function legs(reduced: boolean): string {
  return ORIGINAL_PLAY.basketball.long
    .map((d, index) => {
      const delay = reduced ? 'transition:none;stroke-dashoffset:0' : `transition-delay:${legDelayMs(index)}ms`
      return `<path class="leg" pathLength="1" d="${d}" style="${delay}"/>`
    })
    .join('')
}

export function renderTrip(reduced = false): string {
  const theme = sportTheme('basketball', 'chalkboard')
  const drawn = reduced ? ' play' : ''
  const reducedAttr = reduced ? ' data-reduced="1"' : ''
  const script = reduced ? '' : '<script>requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector("svg").classList.add("play")))</script>'
  const body = `<main class="board"${reducedAttr} style="background:${theme.boardSurface.hex};color:${theme.chalk.hex}"><h2>Program</h2><div class="field"><svg class="${drawn.trim()}" xmlns="http://www.w3.org/2000/svg" viewBox="${ORIGINAL_PLAY.viewBox}"><rect width="340" height="700" fill="${theme.boardSurface.hex}"/>${legs(reduced)}</svg></div></main>`
  return PAGE('chalkboard', body, script).replace('<html>', `<html${reducedAttr}>`)
}

export function renderPress(): string {
  const theme = sportTheme('basketball', 'chalkboard')
  const body = `<main class="board" style="background:${theme.instrumentBackground.hex};color:${theme.chalk.hex}"><h2>Execute</h2><div class="field"></div><button type="button">Log Set</button></main>`
  const script = '<script>requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector("button").classList.add("press")))</script>'
  return PAGE('chalkboard', body, script)
}
