import { renderOriginalPlay } from './originalPlay'
import { sportTheme, type Scheme, type SportTheme } from './sportTokens'

// Program is a board screen. It shows the original play already drawn, so
// opening it plays nothing. Execute and Set Edit are instruments: a neutral
// ground, the lift, the set, the reps and the load, and no court.
// The phone is the harness frame: 402 by 874, with the harness insets.

const PHONE = { width: 402, height: 874, padTop: 62, padSide: 16, padBottom: 34 }
const SPORT = 'basketball' as const

export const EXECUTE_SET = {
  lift: 'Back squat',
  set: 2,
  of: 4,
  reps: 6,
  load: 135,
  unit: 'lb',
} as const

type Words = { words: string; label: string; theme: SportTheme }

// Words are chalk on a chalkboard and ink on a whiteboard. The button label is
// the other neutral.
function wordsFor(scheme: Scheme): Words {
  const theme = sportTheme(SPORT, scheme)
  const words = scheme === 'chalkboard' ? theme.chalk.hex : theme.ink.hex
  const label = scheme === 'chalkboard' ? theme.ink.hex : theme.chalk.hex
  return { words, label, theme }
}

function mainButton(text: string, { theme, label }: Words): string {
  return `<button class="main" type="button" data-role="main-button" style="background:${theme.button.hex};color:${label}">${text}</button>`
}

const STYLE = `<style>
  html, body { margin: 0; background: transparent; font-family: system-ui, sans-serif; }
  .phone { position: relative; overflow: hidden; width: ${PHONE.width}px; height: ${PHONE.height}px; box-sizing: border-box; display: flex; flex-direction: column; padding: ${PHONE.padTop}px ${PHONE.padSide}px ${PHONE.padBottom}px; }
  h1 { margin: 0 0 12px; font-size: 22px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  .board { flex: 1; min-height: 0; margin-bottom: 16px; }
  .board svg { width: 100%; height: 100%; display: block; }
  .main { display: block; width: 100%; height: 48px; flex: none; border: 0; border-radius: 14px; padding: 0 16px; font: inherit; font-size: 17px; font-weight: 700; line-height: 1; }
  .work { flex: 1; display: flex; flex-direction: column; gap: 8px; padding-top: 8px; }
  .lift { margin: 0; font-size: 30px; font-weight: 700; letter-spacing: -0.01em; }
  .set { margin: 0 0 24px; font-size: 17px; font-weight: 600; }
  .num { margin: 0; font-size: 20px; font-weight: 600; }
  .num span { font-size: 64px; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .under { flex: 1; display: flex; flex-direction: column; }
  .scrim { position: absolute; inset: 0; opacity: 0.72; }
  .sheet { position: absolute; left: 0; right: 0; bottom: 0; box-sizing: border-box; padding: 8px ${PHONE.padSide}px ${PHONE.padBottom}px; border-top: 1px solid; border-radius: 20px 20px 0 0; }
  .grab { width: 36px; height: 5px; margin: 0 auto 8px; border-radius: 3px; opacity: 0.4; }
  .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .head h2 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  .close { min-width: 44px; min-height: 44px; padding: 0 4px; border: 0; background: transparent; color: inherit; font: inherit; font-size: 17px; font-weight: 600; }
  .row { display: flex; align-items: center; justify-content: space-between; min-height: 64px; }
  .row + .row { border-top: 1px solid; border-color: inherit; }
  .lab { font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .step { display: flex; align-items: center; gap: 12px; }
  .step output { min-width: 4.5em; text-align: center; font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .step button { width: 44px; height: 44px; border: 1px solid; border-radius: 22px; background: transparent; color: inherit; font: inherit; font-size: 24px; line-height: 1; }
  .sheet .main { margin-top: 16px; }
  .contact { display: grid; grid-template-columns: repeat(2, ${PHONE.width}px); gap: 28px 20px; }
  .cap { margin: 0 0 8px; font-size: 13px; color: CanvasText; }
</style>`

export function renderProgramPhone(scheme: Scheme): string {
  const w = wordsFor(scheme)
  return `<main class="phone" data-screen="program" data-scheme="${scheme}" style="background:${w.theme.boardSurface.hex};color:${w.words}"><h1>Program</h1><div class="board">${renderOriginalPlay(scheme, 'long')}</div>${mainButton('Start', w)}</main>`
}

function executeBody(w: Words): string {
  const s = EXECUTE_SET
  return `<h1>Execute</h1><div class="work"><p class="lift">${s.lift}</p><p class="set">Set ${s.set} of ${s.of}</p><p class="num"><span>${s.reps}</span> reps</p><p class="num"><span>${s.load}</span> ${s.unit}</p></div>${mainButton('Log Set', w)}`
}

export function renderExecutePhone(scheme: Scheme): string {
  const w = wordsFor(scheme)
  return `<main class="phone" data-screen="execute" data-scheme="${scheme}" style="background:${w.theme.instrumentBackground.hex};color:${w.words}">${executeBody(w)}</main>`
}

function stepper(label: string, value: string, noun: string): string {
  return `<div class="row"><span class="lab">${label}</span><span class="step"><button type="button" aria-label="Less ${noun}">−</button><output>${value}</output><button type="button" aria-label="More ${noun}">+</button></span></div>`
}

// Set Edit is a sheet over a dimmed Execute. The scrim is the scheme's dark
// neutral, so it dims on both schemes. Close is text. Save is the one button.
export function renderSetEditPhone(scheme: Scheme): string {
  const w = wordsFor(scheme)
  const ground = w.theme.instrumentBackground.hex
  const scrim = scheme === 'chalkboard' ? ground : w.theme.ink.hex
  const s = EXECUTE_SET
  const sheet = `<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="set-edit-title" style="background:${ground};border-color:${w.words}"><div class="grab" style="background:${w.words}"></div><div class="head"><h2 id="set-edit-title">Set ${s.set}</h2><button class="close" type="button">Close</button></div>${stepper('Reps', String(s.reps), 'reps')}${stepper('Load', `${s.load} ${s.unit}`, 'load')}${mainButton('Save', w)}</section>`
  return `<main class="phone" data-screen="set-edit" data-scheme="${scheme}" style="background:${ground};color:${w.words}"><div class="under" inert aria-hidden="true">${executeBody(w)}</div><div class="scrim" style="background:${scrim}"></div>${sheet}</main>`
}

function page(title: string, scheme: Scheme | null, body: string): string {
  const attr = scheme ? ` data-scheme="${scheme}"` : ''
  return `<!DOCTYPE html><html${attr}><head><meta charset="utf-8"><title>${title}</title>${STYLE}</head><body>${body}</body></html>`
}

export function renderProgram(scheme: Scheme): string {
  return page('Program', scheme, renderProgramPhone(scheme))
}

export function renderExecute(scheme: Scheme): string {
  return page('Execute', scheme, renderExecutePhone(scheme))
}

export function renderSetEdit(scheme: Scheme): string {
  return page('Set Edit', scheme, renderSetEditPhone(scheme))
}

export const PROGRAM_SHEET_CELLS: { caption: string; render: () => string }[] = [
  { caption: 'Program · chalkboard', render: () => renderProgramPhone('chalkboard') },
  { caption: 'Program · whiteboard', render: () => renderProgramPhone('whiteboard') },
  { caption: 'Execute · chalkboard', render: () => renderExecutePhone('chalkboard') },
  { caption: 'Execute · whiteboard', render: () => renderExecutePhone('whiteboard') },
  { caption: 'Set Edit · chalkboard', render: () => renderSetEditPhone('chalkboard') },
]

export function renderProgramSheet(): string {
  const cells = PROGRAM_SHEET_CELLS.map(
    ({ caption, render }) => `<div class="cell"><p class="cap">${caption}</p>${render()}</div>`
  ).join('')
  return page('Program and Execute', null, `<div class="contact">${cells}</div>`)
}
