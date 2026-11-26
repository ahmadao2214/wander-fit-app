import { sportTheme, type Scheme, type Sport } from './sportTokens'

// Decision 16. Today carries the scorebug and no board. The week is the sport
// colour. The phase is words. Opening Today plays nothing.
// The phone is the harness frame: 402 by 874, with the harness insets.

const PHONE = { width: 402, height: 874, padTop: 62, padSide: 16, padBottom: 34 }
const LAST_TWO_WEEKS_DAYS = 14

export type PhaseName = 'Build' | 'Train' | 'Sharpen'

export type TodaySeason =
  | { kind: 'dated'; daysToGame: number }
  | { kind: 'open'; done: number; total: number }
  | { kind: 'in-season' }

export type TodayInput = {
  sport: Sport
  scheme: Scheme
  week: number
  phase: PhaseName
  phaseStep: number
  phaseOf: number
  season: TodaySeason
  large?: boolean
}

export function gameReadout(daysToGame: number): string {
  if (daysToGame <= LAST_TWO_WEEKS_DAYS) return `${daysToGame} days`
  return `${Math.round(daysToGame / 7)} wks`
}

export function thirdCell(season: TodaySeason): { label: string; value: string } {
  if (season.kind === 'in-season') return { label: 'Season', value: 'In season, week 1' }
  if (season.kind === 'open') return { label: 'Plan', value: `${season.done} of ${season.total}` }
  return { label: '1st game', value: gameReadout(season.daysToGame) }
}

function wordsOf(scheme: Scheme): 'chalk' | 'ink' {
  return scheme === 'chalkboard' ? 'chalk' : 'ink'
}

const STYLE = `<style>
  html, body { margin: 0; background: transparent; font-family: system-ui, sans-serif; }
  html[data-large="1"] { font-size: 22px; }
  .phone { width: ${PHONE.width}px; height: ${PHONE.height}px; box-sizing: border-box; display: flex; flex-direction: column; padding: ${PHONE.padTop}px ${PHONE.padSide}px ${PHONE.padBottom}px; }
  h1 { margin: 0 0 16px; font-size: 22px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  .bug { box-sizing: border-box; display: flex; flex-wrap: wrap; align-items: flex-start; width: 100%; min-height: 44px; margin: 0; padding: 0; border-width: 1px; border-style: solid; border-radius: 12px; text-align: left; font: inherit; }
  .cell { flex: 1 1 7.5em; min-width: 7.5em; min-height: 44px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; padding: 8px 12px; }
  .lab { font-weight: 700; font-size: 0.8em; letter-spacing: 0.08em; text-transform: uppercase; }
  .val { font-weight: 700; font-size: 1.25em; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; overflow-wrap: break-word; }
  .sheet { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; width: 824px; }
  .cell-wrap { width: 402px; }
  .cap { margin: 0 0 8px; font-size: 13px; color: var(--foreground, CanvasText); }
</style>`

export function renderTodayPhone(input: TodayInput): string {
  const theme = sportTheme(input.sport, input.scheme)
  const words = theme[wordsOf(input.scheme)].hex
  const third = thirdCell(input.season)
  const phase = `${input.phase} ${input.phaseStep}/${input.phaseOf}`
  const bug = `<button class="bug" type="button" data-open="program" style="border-color:${words};background:${theme.instrumentBackground.hex};color:${words}"><span class="cell"><span class="lab">Week</span><span class="val sport" style="color:${theme.marker.hex}">${input.week}</span></span><span class="cell"><span class="lab">Phase</span><span class="val">${phase}</span></span><span class="cell"><span class="lab">${third.label}</span><span class="val">${third.value}</span></span></button>`
  return `<main class="phone" data-sport="${input.sport}" data-scheme="${input.scheme}" style="background:${theme.instrumentBackground.hex};color:${words}"><h1>Today</h1>${bug}</main>`
}

export function renderToday(input: TodayInput): string {
  const large = input.large ? ' data-large="1"' : ''
  return `<!DOCTYPE html><html data-scheme="${input.scheme}"${large}><head><meta charset="utf-8"><title>Today</title>${STYLE}</head><body>${renderTodayPhone(input)}</body></html>`
}

export const TODAY_SAMPLES: { caption: string; input: TodayInput }[] = [
  {
    caption: '8 weeks out',
    input: { sport: 'basketball', scheme: 'chalkboard', week: 4, phase: 'Build', phaseStep: 1, phaseOf: 3, season: { kind: 'dated', daysToGame: 56 } },
  },
  {
    caption: '10 days out',
    input: { sport: 'basketball', scheme: 'whiteboard', week: 11, phase: 'Sharpen', phaseStep: 3, phaseOf: 3, season: { kind: 'dated', daysToGame: 10 } },
  },
  {
    caption: 'no set season',
    input: { sport: 'soccer', scheme: 'chalkboard', week: 4, phase: 'Build', phaseStep: 1, phaseOf: 3, season: { kind: 'open', done: 4, total: 12 } },
  },
  {
    caption: 'after the first game',
    input: { sport: 'track', scheme: 'whiteboard', week: 1, phase: 'Build', phaseStep: 1, phaseOf: 3, season: { kind: 'in-season' } },
  },
]

export function renderTodaySheet(): string {
  const cells = TODAY_SAMPLES.map(
    ({ caption, input }) => `<div class="cell-wrap"><p class="cap">${caption}</p>${renderTodayPhone(input)}</div>`
  ).join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Today</title>${STYLE}</head><body><div class="sheet">${cells}</div></body></html>`
}
