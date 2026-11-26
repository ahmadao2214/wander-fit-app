import { renderOriginalPlay } from './originalPlay'
import { SCHEMES, sportTheme, type SportTheme } from './sportTokens'

// Program is the board: the original play, already drawn. Execute is the instrument.
// Decision 5: the button face is chalk on a chalkboard and ink on a whiteboard.
const BUTTON_LABEL = { program: 'Start', execute: 'Log Set' } as const

function words(theme: SportTheme): string {
  return theme.scheme === 'chalkboard' ? theme.chalk.hex : theme.ink.hex
}

function buttonInk(theme: SportTheme): string {
  return theme.scheme === 'chalkboard' ? theme.ink.hex : theme.chalk.hex
}

function program(theme: SportTheme): string {
  return `<section data-screen="program" data-scheme="${theme.scheme}" style="background:${theme.boardSurface.hex};color:${words(theme)}"><h2>Program</h2><div class="board">${renderOriginalPlay(theme.scheme)}</div>${button(theme, 'program')}</section>`
}

function execute(theme: SportTheme): string {
  return `<section data-screen="execute" data-scheme="${theme.scheme}" style="background:${theme.instrumentBackground.hex};color:${words(theme)}"><h2>Execute</h2><div class="work"><p class="lift">Back squat</p><p class="set">Set 2 of 4</p><p class="reps"><span>6</span> reps</p><p class="load"><span>135</span> lb</p></div>${button(theme, 'execute')}</section>`
}

function button(theme: SportTheme, screen: keyof typeof BUTTON_LABEL): string {
  return `<button type="button" data-role="main-button" style="background:${theme.button.hex};color:${buttonInk(theme)}">${BUTTON_LABEL[screen]}</button>`
}

function cell(theme: SportTheme, screen: 'program' | 'execute'): string {
  const name = screen === 'program' ? 'Program' : 'Execute'
  const frame = screen === 'program' ? program(theme) : execute(theme)
  return `<div class="cell"><p class="cap">${name} · ${theme.scheme}</p>${frame}</div>`
}

export function renderContactSheet(): string {
  const cells = SCHEMES.flatMap((scheme) => {
    const theme = sportTheme('basketball', scheme)
    return [cell(theme, 'program'), cell(theme, 'execute')]
  })
  // Column order is chalkboard, then whiteboard. Each column is Program over Execute.
  const ordered = [cells[0], cells[2], cells[1], cells[3]].join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Program and Execute</title><style>
    html, body { margin: 0; background: transparent; color: var(--foreground); font-family: var(--font-sans), system-ui, sans-serif; }
    .sheet { display: grid; grid-template-columns: 1fr 1fr; gap: 28px 20px; }
    .cap { margin: 0 0 8px; font-size: 13px; letter-spacing: 0.02em; }
    .phone, section { box-sizing: border-box; }
    section { display: flex; flex-direction: column; height: 640px; border-radius: 28px; padding: 22px 16px 16px; }
    h2 { margin: 0 0 12px; font-size: 22px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
    .board { flex: 1; min-height: 0; }
    .board svg { width: 100%; height: 100%; display: block; }
    .work { flex: 1; display: flex; flex-direction: column; justify-content: flex-start; gap: 8px; padding-top: 12px; }
    .lift { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.03em; }
    .set, .reps, .load { margin: 0; font-size: 15px; }
    .reps span, .load span { font-size: 56px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.04em; }
    button { height: 48px; border: 0; border-radius: 14px; font: 700 16px/1 inherit; }
  </style></head><body><main class="sheet">${ordered}</main></body></html>`
}
