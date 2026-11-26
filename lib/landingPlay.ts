import { MOTION, legDelayMs } from './motion'
import { renderOriginalPlay } from './originalPlay'
import { SCHEMES, sportTheme, type Scheme } from './sportTokens'

// The landing scroll scene is the First Run play: the original basketball
// route, long legs only, from the board kit. Chalkboard then whiteboard,
// stacked. The scroll page draws each board on as it scrolls into view.
// The reduced page, and reduced motion on the scroll page, show it drawn.

export const LANDING_WIDTH = 1100

const wordsOf = (scheme: Scheme) => (scheme === 'chalkboard' ? 'chalk' : 'ink')

// Takes the kit's SVG as is and only marks each leg so it can be drawn on.
function board(scheme: Scheme, reduced: boolean): string {
  let index = 0
  const svg = renderOriginalPlay(scheme, 'long').replace(/<path /g, () => {
    const style = reduced ? 'stroke-dasharray:1;stroke-dashoffset:0' : `transition-delay:${legDelayMs(index)}ms`
    index += 1
    return `<path class="leg" pathLength="1" style="${style}" `
  })
  return reduced ? svg.replace('<svg ', '<svg class="play" ') : svg
}

function section(scheme: Scheme, reduced: boolean): string {
  const theme = sportTheme('basketball', scheme)
  const words = theme[wordsOf(scheme)].hex
  return `<section class="board" data-scheme="${scheme}" style="background:${theme.boardSurface.hex};color:${words}"><p class="words">The play</p><div class="field">${board(scheme, reduced)}</div></section>`
}

const BASE = `html, body { margin: 0; background: transparent; font-family: system-ui, sans-serif; }
  main { width: ${LANDING_WIDTH}px; margin: 0 auto; }
  .board { width: ${LANDING_WIDTH}px; box-sizing: border-box; padding: 64px 0; display: flex; flex-direction: column; align-items: center; }
  .words { margin: 0 0 24px; font-size: 22px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; }
  .field svg { width: 340px; height: 700px; display: block; }`

const SCROLL_STYLE = `<style>
  ${BASE}
  .leg { stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset ${MOTION.drawOnMs}ms ${MOTION.easeOut}; }
  .play .leg { stroke-dashoffset: 0; }
  @media (prefers-reduced-motion: reduce) {
    .leg { stroke-dashoffset: 0; transition: none; }
  }
</style>`

const REDUCED_STYLE = `<style>
  ${BASE}
  .leg { stroke-dasharray: 1; stroke-dashoffset: 0; }
</style>`

// Draw a board once a third of it has scrolled into view.
const SCROLL_SCRIPT = `<script>
(() => {
  const boards = document.querySelectorAll(".board svg")
  if (!("IntersectionObserver" in window)) { boards.forEach((svg) => svg.classList.add("play")); return }
  const seen = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.intersectionRatio < 0.33) continue
      entry.target.classList.add("play")
      seen.unobserve(entry.target)
    }
  }, { threshold: 0.33 })
  boards.forEach((svg) => seen.observe(svg))
})()
</script>`

function page(reduced: boolean): string {
  const reducedAttr = reduced ? ' data-reduced="1"' : ''
  const style = reduced ? REDUCED_STYLE : SCROLL_STYLE
  const script = reduced ? '' : SCROLL_SCRIPT
  const body = `<main>${SCHEMES.map((scheme) => section(scheme, reduced)).join('')}</main>`
  return `<!DOCTYPE html><html${reducedAttr}><head><meta charset="utf-8"><meta name="viewport" content="width=${LANDING_WIDTH}"><title>Landing Play</title>${style}</head><body>${body}${script}</body></html>`
}

export function renderLandingScroll(): string {
  return page(false)
}

export function renderLandingReduced(): string {
  return page(true)
}
