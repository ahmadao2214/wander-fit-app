import { renderOriginalPlay } from './originalPlay'
import { sportTheme, type Scheme, type SportTheme } from './sportTokens'

// Run 3 puts History, the reassessment, the check-in, Profile, Settings and
// the max sheet on the role tokens. History empty is the one board screen: it
// shows the original play already drawn, so there is something on the board
// before the first workout. Everything else is an instrument: a neutral
// ground, words in chalk or ink, and no court. The phone frame and the scrim
// follow lib/programHarness.ts. Phase words are Build, Train and Sharpen.

const PHONE = { width: 402, height: 874, padTop: 62, padSide: 16, padBottom: 34 }
const SPORT = 'basketball' as const

export const RUN3_SCREEN_IDS = [
  'history-empty',
  'history',
  'reassessment',
  'check-in',
  'profile',
  'settings',
  'max-sheet',
] as const

export type Run3ScreenId = (typeof RUN3_SCREEN_IDS)[number]

export const RUN3_TITLES: Record<Run3ScreenId, string> = {
  'history-empty': 'History empty',
  history: 'History',
  reassessment: 'Reassessment',
  'check-in': 'Check-in',
  profile: 'Profile',
  settings: 'Settings',
  'max-sheet': 'Max sheet',
}

export const SESSION = {
  name: 'Lower Body Foundation',
  date: 'Wed, Nov 25',
  minutes: 45,
  phase: 'Build',
  status: 'Done',
} as const

export const REASSESSMENT = {
  phase: 'Build',
  done: 10,
  planned: 10,
  sentence: 'You trained every planned session in this block.',
} as const

export const CHECK_IN = {
  phase: 'Build',
  feel: ['Too easy', 'Just right', 'Challenging', 'Too hard'],
  feelChosen: 'Just right',
  energy: ['Low', 'Moderate', 'High'],
  energyChosen: 'Moderate',
} as const

export const PROFILE = {
  name: 'Jordan Lee',
  facts: [
    ['Sport', 'Basketball'],
    ['Phase', 'Build'],
    ['Week', '4'],
    ['Training', '3 a week'],
    ['Experience', '1–2 years'],
  ],
  max: { lift: 'Back squat', load: 135, unit: 'lb' },
  learn: { title: 'Training Science', line: 'Understand your program' },
  settings: 'App settings',
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

function textButton(text: string): string {
  return `<button class="text" type="button">${text}</button>`
}

const STYLE = `<style>
  html, body { margin: 0; background: transparent; font-family: system-ui, sans-serif; }
  .phone { position: relative; overflow: hidden; width: ${PHONE.width}px; height: ${PHONE.height}px; box-sizing: border-box; display: flex; flex-direction: column; padding: ${PHONE.padTop}px ${PHONE.padSide}px ${PHONE.padBottom}px; }
  h1 { margin: 0 0 12px; font-size: 22px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  h1.say { margin: 0 0 8px; font-size: 30px; letter-spacing: -0.01em; text-transform: none; line-height: 1.15; text-wrap: balance; }
  h2 { margin: 24px 0 4px; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.72; }
  p { margin: 0; }
  .empty { margin: 0 0 12px; font-size: 17px; font-weight: 600; }
  .board { flex: 1; min-height: 0; margin-bottom: 16px; }
  .board svg { width: 100%; height: 100%; display: block; }
  .main { display: block; width: 100%; height: 48px; flex: none; border: 0; border-radius: 14px; padding: 0 16px; font: inherit; font-size: 17px; font-weight: 700; line-height: 1; }
  .text { min-width: 44px; min-height: 44px; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; font-size: 17px; font-weight: 600; text-align: left; }
  .work { flex: 1; display: flex; flex-direction: column; }
  .count { margin: 4px 0 12px; font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .line { font-size: 17px; line-height: 1.4; }
  .list { margin: 0; padding: 0; list-style: none; }
  .session { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 64px; border-top: 1px solid; border-bottom: 1px solid; }
  .session .name { font-size: 17px; font-weight: 700; }
  .session .meta { margin-top: 2px; font-size: 15px; font-variant-numeric: tabular-nums; }
  .session .status { font-size: 15px; font-weight: 700; }
  .group { display: grid; gap: 8px; }
  .group.three { grid-template-columns: repeat(3, 1fr); }
  .choice { min-height: 48px; border: 1px solid; border-radius: 14px; padding: 0 16px; background: transparent; color: inherit; font: inherit; font-size: 17px; font-weight: 600; text-align: left; }
  .group.three .choice { text-align: center; padding: 0 8px; }
  .choice[aria-checked="true"] { border-width: 2px; font-weight: 700; }
  .who { margin: 0 0 4px; font-size: 30px; font-weight: 700; letter-spacing: -0.01em; }
  .facts { margin: 8px 0 0; display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; font-size: 15px; }
  .facts dt { font-weight: 600; opacity: 0.72; }
  .facts dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }
  .rowbtn { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; min-height: 56px; padding: 0; border: 0; border-bottom: 1px solid; border-color: inherit; background: transparent; color: inherit; font: inherit; font-size: 17px; font-weight: 600; text-align: left; }
  .rowbtn .sub { display: block; margin-top: 2px; font-size: 15px; font-weight: 400; opacity: 0.72; }
  .rowbtn .val { font-variant-numeric: tabular-nums; }
  .foot { margin-top: auto; }
  .under { flex: 1; display: flex; flex-direction: column; }
  .scrim { position: absolute; inset: 0; opacity: 0.72; }
  .sheet { position: absolute; left: 0; right: 0; bottom: 0; box-sizing: border-box; padding: 8px ${PHONE.padSide}px ${PHONE.padBottom}px; border-top: 1px solid; border-radius: 20px 20px 0 0; }
  .grab { width: 36px; height: 5px; margin: 0 auto 8px; border-radius: 3px; opacity: 0.4; }
  .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .head h2 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; opacity: 1; }
  .row { display: flex; align-items: center; justify-content: space-between; min-height: 64px; }
  .lab { font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .step { display: flex; align-items: center; gap: 12px; }
  .step output { min-width: 4.5em; text-align: center; font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .step button { width: 44px; height: 44px; border: 1px solid; border-radius: 22px; background: transparent; color: inherit; font: inherit; font-size: 24px; line-height: 1; }
  .sheet .main { margin-top: 16px; }
  .contact { display: grid; grid-template-columns: repeat(6, ${PHONE.width}px); gap: 28px 20px; }
  .cap { margin: 0 0 8px; font-size: 13px; color: CanvasText; }
</style>`

function phone(screen: Run3ScreenId, scheme: Scheme, ground: string, w: Words, body: string): string {
  return `<main class="phone" data-screen="${screen}" data-scheme="${scheme}" style="background:${ground};color:${w.words}">${body}</main>`
}

// History before the first workout is a board: the play already drawn, the
// words, and the way to today's workout. No ghost rows.
export function renderHistoryEmptyPhone(scheme: Scheme): string {
  const w = wordsFor(scheme)
  const body = `<h1>History</h1><p class="empty">No workouts yet</p><div class="board">${renderOriginalPlay(scheme, 'long')}</div>${mainButton("Go to today's workout", w)}`
  return phone('history-empty', scheme, w.theme.boardSurface.hex, w, body)
}

// Done is a word in chalk or ink, not a green tick.
export function renderHistoryPhone(scheme: Scheme): string {
  const w = wordsFor(scheme)
  const s = SESSION
  const row = `<li class="session" style="border-color:${w.words}"><div><p class="name">${s.name}</p><p class="meta">${s.date} · ${s.minutes} min · ${s.phase}</p></div><span class="status">${s.status}</span></li>`
  const body = `<h1>History</h1><ul class="list">${row}</ul>`
  return phone('history', scheme, w.theme.instrumentBackground.hex, w, body)
}

export function renderReassessmentPhone(scheme: Scheme): string {
  const w = wordsFor(scheme)
  const r = REASSESSMENT
  const body = `<div class="work"><h1 class="say">You finished ${r.phase}</h1><p class="count">${r.done} of ${r.planned} sessions</p><p class="line">${r.sentence}</p></div>${mainButton('Continue', w)}`
  return phone('reassessment', scheme, w.theme.instrumentBackground.hex, w, body)
}

// The chosen item is marked by the marker as its border, nothing else. No
// red, green, blue or orange fills.
function choices(items: readonly string[], chosen: string, w: Words): string {
  return items
    .map((item) => {
      const on = item === chosen
      const border = on ? w.theme.marker.hex : w.words
      return `<button class="choice" type="button" role="radio" aria-checked="${on}" style="border-color:${border}">${item}</button>`
    })
    .join('')
}

export function renderCheckInPhone(scheme: Scheme): string {
  const w = wordsFor(scheme)
  const c = CHECK_IN
  const feel = `<div class="group" role="radiogroup" aria-labelledby="check-in-title">${choices(c.feel, c.feelChosen, w)}</div>`
  const energy = `<h2 id="energy-title">Energy</h2><div class="group three" role="radiogroup" aria-labelledby="energy-title">${choices(c.energy, c.energyChosen, w)}</div>`
  const body = `<div class="work"><h1 class="say" id="check-in-title">How did ${c.phase} feel?</h1>${feel}${energy}</div>${mainButton('Continue', w)}`
  return phone('check-in', scheme, w.theme.instrumentBackground.hex, w, body)
}

function profileBody(w: Words): string {
  const p = PROFILE
  const facts = p.facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')
  const max = `<button class="rowbtn" type="button" data-role="max-row" aria-haspopup="dialog" style="border-color:${w.words}"><span>${p.max.lift}</span><span class="val">${p.max.load} ${p.max.unit}</span></button>`
  const learn = `<button class="rowbtn" type="button" style="border-color:${w.words}"><span>${p.learn.title}<span class="sub">${p.learn.line}</span></span></button>`
  const settings = `<button class="rowbtn" type="button" style="border-color:${w.words}"><span>${p.settings}</span></button>`
  return `<h1>Profile</h1><p class="who">${p.name}</p><dl class="facts">${facts}</dl><h2>My maxes</h2>${max}<h2>Learn</h2>${learn}<h2>Settings</h2>${settings}<div class="foot">${textButton('Sign Out')}</div>`
}

export function renderProfilePhone(scheme: Scheme): string {
  const w = wordsFor(scheme)
  return phone('profile', scheme, w.theme.instrumentBackground.hex, w, profileBody(w))
}

// Settings has one action, and it is text. No invented toggles.
export function renderSettingsPhone(scheme: Scheme): string {
  const w = wordsFor(scheme)
  const body = `<h1>Settings</h1>${textButton('Sign Out')}`
  return phone('settings', scheme, w.theme.instrumentBackground.hex, w, body)
}

// The max sheet sits over a dimmed Profile. The scrim is the scheme's dark
// neutral, so it dims on both schemes. The stepper is drawn, not wired.
export function renderMaxSheetPhone(scheme: Scheme): string {
  const w = wordsFor(scheme)
  const ground = w.theme.instrumentBackground.hex
  const scrim = scheme === 'chalkboard' ? ground : w.theme.ink.hex
  const m = PROFILE.max
  const stepper = `<div class="row"><span class="lab">Load</span><span class="step"><button type="button" aria-label="Less load">−</button><output>${m.load} ${m.unit}</output><button type="button" aria-label="More load">+</button></span></div>`
  const sheet = `<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="max-sheet-title" style="background:${ground};border-color:${w.words}"><div class="grab" style="background:${w.words}"></div><div class="head"><h2 id="max-sheet-title">${m.lift}</h2>${textButton('Close')}</div>${stepper}${mainButton('Save', w)}</section>`
  const body = `<div class="under" inert aria-hidden="true">${profileBody(w)}</div><div class="scrim" style="background:${scrim}"></div>${sheet}`
  return phone('max-sheet', scheme, ground, w, body)
}

export const RUN3_PHONES: Record<Run3ScreenId, (scheme: Scheme) => string> = {
  'history-empty': renderHistoryEmptyPhone,
  history: renderHistoryPhone,
  reassessment: renderReassessmentPhone,
  'check-in': renderCheckInPhone,
  profile: renderProfilePhone,
  settings: renderSettingsPhone,
  'max-sheet': renderMaxSheetPhone,
}

function page(title: string, scheme: Scheme | null, body: string): string {
  const attr = scheme ? ` data-scheme="${scheme}"` : ''
  return `<!DOCTYPE html><html${attr}><head><meta charset="utf-8"><title>${title}</title>${STYLE}</head><body>${body}</body></html>`
}

/** A single screen's page. The checked-in pages are the chalkboard ones. */
export function renderRun3Screen(screen: Run3ScreenId, scheme: Scheme = 'chalkboard'): string {
  return page(RUN3_TITLES[screen], scheme, RUN3_PHONES[screen](scheme))
}

const ROW_SCREENS = RUN3_SCREEN_IDS.filter((id) => id !== 'max-sheet')

export const RUN3_SHEET_CELLS: { caption: string; render: () => string }[] = [
  ...(['chalkboard', 'whiteboard'] as const).flatMap((scheme) =>
    ROW_SCREENS.map((id) => ({ caption: `${RUN3_TITLES[id]} · ${scheme}`, render: () => RUN3_PHONES[id](scheme) }))
  ),
  { caption: `${RUN3_TITLES['max-sheet']} · chalkboard`, render: () => renderMaxSheetPhone('chalkboard') },
]

export function renderRun3Sheet(): string {
  const cells = RUN3_SHEET_CELLS.map(
    ({ caption, render }) => `<div class="cell"><p class="cap">${caption}</p>${render()}</div>`
  ).join('')
  return page('History, Profile and Settings', null, `<div class="contact">${cells}</div>`)
}
