import { sportTheme, type Scheme, type Sport, type SportTheme } from './sportTokens'
import { renderToday, renderTodayPhone, type TodayInput } from './todayScorebug'

// Direction B, revised onto the sport role tokens. Every screen is an
// instrument: instrumentBackground behind chalk (chalkboard) or ink
// (whiteboard) words, the main button face is theme.button, and the marker is
// the only sport colour. No court, no route, no drawing. Phases are the words
// Build, Train and Sharpen.
//
// The words come from the direction B prototypes (redesign/proto-b today and
// workout-detail; redesign/run2-set-b paywall, save-plan-sheet, sign-in,
// splash and scoreboard). The phone frame and the Today scorebug come from
// lib/todayScorebug.ts, unchanged.

export const SAMPLE_SPORT: Sport = 'basketball'

export const TODAY_INPUT: TodayInput = {
  sport: 'basketball',
  scheme: 'chalkboard',
  week: 4,
  phase: 'Build',
  phaseStep: 1,
  phaseOf: 3,
  season: { kind: 'dated', daysToGame: 56 },
}

export const SCREEN_IDS = [
  'today',
  'workout-detail',
  'paywall',
  'save-plan',
  'sign-in',
  'splash',
  'scoreboard',
] as const

export type ScreenId = (typeof SCREEN_IDS)[number]

export const SCREEN_TITLES: Record<ScreenId, string> = {
  today: 'Today',
  'workout-detail': 'Workout detail',
  paywall: 'Paywall',
  'save-plan': 'Save plan',
  'sign-in': 'Sign in',
  splash: 'Splash',
  scoreboard: 'Scoreboard',
}

/** Today is one sample (chalkboard). Every other screen draws in both schemes. */
export const SCREEN_SCHEMES: Record<ScreenId, readonly Scheme[]> = {
  today: ['chalkboard'],
  'workout-detail': ['chalkboard', 'whiteboard'],
  paywall: ['chalkboard', 'whiteboard'],
  'save-plan': ['chalkboard', 'whiteboard'],
  'sign-in': ['chalkboard', 'whiteboard'],
  splash: ['chalkboard', 'whiteboard'],
  scoreboard: ['chalkboard', 'whiteboard'],
}

// ---------------------------------------------------------------------------
// Words

const COPY = {
  athleteLine: 'Basketball · Power',
  dateLabel: 'Wednesday, Nov 25',
  startLabel: 'Start Workout',
  tabs: ['Today', 'Program', 'History', 'Profile'],
  workout: {
    name: 'Lower Body Foundation',
    minutes: 45,
    exerciseCount: 5,
    facts: '45 min · 5 exercises',
    exercises: [
      { name: 'Back Squat', sets: 4, reps: '6', load: '135 lb' },
      { name: 'Trap Bar Deadlift', sets: 3, reps: '5', load: '185 lb' },
      { name: 'Single-Leg Romanian Deadlift', sets: 3, reps: '8 each side', load: '30 lb' },
      { name: 'Walking Lunge', sets: 3, reps: '10 each side', load: '25 lb' },
      { name: 'Plank', sets: 3, reps: '30s', load: null },
    ],
  },
  plan: {
    title: 'Basketball plan',
    countdown: 'First game Fri, Feb 19 · 13 weeks',
    phases: [
      { word: 'Build', label: 'Build the base', weeks: 'Weeks 1–4' },
      { word: 'Train', label: 'Train for your sport', weeks: 'Weeks 5–8' },
      { word: 'Sharpen', label: 'Sharpen for the season', weeks: 'Weeks 9–12' },
    ],
  },
  paywall: {
    title: 'Keep your plan',
    hero: 'Week 2 done · 10 of 10 sessions',
    covers: 'Your 12-week plan through your first game',
    planFacts: 'Basketball · 12 weeks · 5 days a week',
    offer: 'Season Pass',
    priceNote: 'one time',
    price: '$35',
    lines: [
      'Your 2-week free trial ends today',
      'Pay once. It does not renew.',
      'Nothing is charged unless you choose it.',
    ],
    button: 'Get Season Pass · $35',
    quiet: 'Not now',
  },
  savePlan: {
    title: 'Save your plan',
    subtitle: "So it's here tomorrow.",
    terms: [
      { text: 'I agree to the ' },
      { text: 'Terms of Service', link: true },
      { text: ' and ' },
      { text: 'Privacy Policy', link: true },
      { text: ', and I acknowledge the ' },
      { text: 'Health & Fitness Disclaimer', link: true },
      { text: ' (general strength and conditioning guidance only, not medical advice).' },
    ],
    apple: 'Continue with Apple',
    google: 'Continue with Google',
    email: 'Continue with email',
  },
  signIn: {
    title: 'Welcome back',
    subtitle: 'Sign in to continue your training journey',
    apple: 'Continue with Apple',
    google: 'Continue with Google',
    emailLabel: 'Email address',
    button: 'Continue',
    newHere: 'New here? Build my plan',
  },
  splash: { label: 'Wander Fit' },
  season: {
    title: "When's your first game?",
    weeks: 13,
    weeksAway: 'Weeks away',
    date: 'Fri, Feb 19',
    noSeason: { title: 'No set season', body: "We'll build a 12-week plan" },
    button: 'Continue',
  },
} as const

export const PHASE_WORDS = COPY.plan.phases.map((p) => p.word)

function esc(text: string | number): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ---------------------------------------------------------------------------
// Roles

/** The words on an instrument: chalk on a chalkboard, ink on a whiteboard. */
export function wordsOf(theme: SportTheme): string {
  return (theme.scheme === 'chalkboard' ? theme.chalk : theme.ink).hex
}

/** The colour pairs a direction B screen draws, foreground on background. */
export function rolePairs(theme: SportTheme): { name: string; foreground: string; background: string }[] {
  const bg = theme.instrumentBackground.hex
  return [
    { name: 'words on instrument', foreground: wordsOf(theme), background: bg },
    { name: 'marker on instrument', foreground: theme.marker.hex, background: bg },
    { name: 'label on button', foreground: bg, background: theme.button.hex },
  ]
}

function roleVars(theme: SportTheme): string {
  return [
    `--bg:${theme.instrumentBackground.hex}`,
    `--words:${wordsOf(theme)}`,
    `--marker:${theme.marker.hex}`,
    `--button:${theme.button.hex}`,
    `--on-button:${theme.instrumentBackground.hex}`,
  ].join(';')
}

// ---------------------------------------------------------------------------
// Style. The phone frame (.phone), the title (h1) and the scorebug come from
// the Today scorebug page, so the frame and the bug match design/today.

function scorebugStyle(): string {
  const match = renderToday(TODAY_INPUT).match(/<style>([\s\S]*?)<\/style>/)
  if (!match) throw new Error('todayScorebug page has no style block')
  return match[1]
}

const OWN_STYLE = `
  .phone { position: relative; overflow: hidden; gap: 16px; }
  .phone > h1 { margin-bottom: 0; }
  .bug { margin: 0; }
  button { font: inherit; color: inherit; }
  .top { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; }
  .top .note { font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .display { margin: 0; font-size: 34px; line-height: 1.05; font-weight: 800; font-stretch: condensed; letter-spacing: 0.01em; text-transform: uppercase; overflow-wrap: break-word; }
  .title { margin: 0; font-size: 22px; line-height: 1.2; font-weight: 700; }
  .line { margin: 0; font-size: 17px; line-height: 1.35; font-variant-numeric: tabular-nums; }
  .small { margin: 0; font-size: 15px; line-height: 1.35; font-variant-numeric: tabular-nums; }
  .eyebrow { margin: 0; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .stack { display: flex; flex-direction: column; gap: 4px; }
  .tile { box-sizing: border-box; display: flex; flex-direction: column; gap: 16px; padding: 16px; border: 1px solid var(--words); border-radius: 12px; }
  .stats { display: flex; gap: 32px; }
  .stat { display: flex; flex-direction: column; }
  .stat .num { font-size: 34px; line-height: 1.05; font-weight: 800; font-variant-numeric: tabular-nums; }
  .stat .unit { font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .btn { box-sizing: border-box; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 52px; margin: 0; padding: 12px 16px; border: 1px solid var(--words); border-radius: 12px; background: transparent; color: var(--words); font-size: 17px; font-weight: 700; text-align: center; }
  .btn.main { background: var(--button); border-color: var(--button); color: var(--on-button); }
  .btn.quiet { border-color: transparent; font-weight: 600; }
  .back { width: auto; min-width: 44px; min-height: 44px; padding: 0 8px 0 0; justify-content: flex-start; }
  .foot { margin-top: auto; display: flex; flex-direction: column; gap: 8px; }
  .rows { display: flex; flex-direction: column; gap: 8px; }
  .row { box-sizing: border-box; display: flex; align-items: center; gap: 16px; min-height: 72px; padding: 12px 16px; border: 1px solid var(--words); border-radius: 12px; }
  .row .name { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 17px; font-weight: 700; line-height: 1.2; }
  .row .name .small { font-weight: 400; }
  .row .count { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .phases { display: flex; gap: 8px; }
  .phase { flex: 1 1 0; min-width: 0; box-sizing: border-box; display: flex; flex-direction: column; gap: 4px; padding: 12px; border: 1px solid var(--words); border-top-width: 4px; border-radius: 12px; }
  .phase .word { font-size: 13px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
  .phase .label { font-size: 15px; font-weight: 700; line-height: 1.2; }
  .strip { display: flex; gap: 4px; }
  .strip span { flex: 1 1 0; padding-top: 6px; border-top: 4px solid var(--words); font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  .offer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .price { font-size: 44px; line-height: 1; font-weight: 800; font-variant-numeric: tabular-nums; }
  .consent { display: flex; align-items: flex-start; gap: 6px; padding: 12px 16px 12px 6px; border: 1px solid var(--words); border-radius: 12px; font-size: 15px; line-height: 1.35; }
  .consent .box { flex: none; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; }
  .consent .box span { box-sizing: border-box; width: 24px; height: 24px; border: 2px solid var(--words); border-radius: 6px; }
  .consent .text { padding-top: 10px; }
  .consent u { font-weight: 700; }
  .field { display: flex; flex-direction: column; gap: 6px; font-size: 15px; font-weight: 600; }
  .field .input { box-sizing: border-box; min-height: 52px; border: 1px solid var(--words); border-radius: 12px; }
  .tabs { margin: auto -16px -34px; padding: 4px 16px 34px; display: flex; border-top: 1px solid var(--words); }
  .tab { flex: 1 1 0; min-height: 44px; margin: 0; padding: 0; border: 0; background: transparent; font-size: 13px; font-weight: 600; }
  .tab[aria-current="page"] { font-weight: 800; text-decoration: underline; text-underline-offset: 4px; }
  .band { margin: 0 -16px; padding: 18px 16px; display: flex; flex-direction: column; align-items: center; gap: 2px; border-top: 1px solid var(--words); border-bottom: 1px solid var(--words); text-align: center; }
  .band .display { text-align: center; }
  .band .hero { font-size: 96px; line-height: 1; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--marker); }
  .phone.splash { align-items: center; justify-content: center; }
  .mark { position: relative; display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; }
  .mark .ring { position: absolute; box-sizing: border-box; border: 2px solid var(--words); border-radius: 50%; }
  .mark .r1 { width: 64px; height: 64px; }
  .mark .r2 { width: 46px; height: 46px; }
  .mark .r3 { width: 28px; height: 28px; }
  .mark .dot { width: 12px; height: 12px; border-radius: 50%; background: var(--words); }
`

const SHEET_STYLE = `
  body.direction-sheet { background: #e8e6e3; color: #1c1a18; padding: 24px; }
  .screens { display: grid; grid-template-columns: repeat(${SCREEN_IDS.length}, 402px); gap: 28px 20px; }
  .frame-cap { margin: 0 0 8px; font-size: 13px; font-weight: 600; }
  .frame .phone { outline: 1px solid rgba(0, 0, 0, 0.18); }
`

export const STYLE = `${scorebugStyle()}${OWN_STYLE}`

// ---------------------------------------------------------------------------
// Pieces

function mainButton(label: string, id: string): string {
  return `<button class="btn main" type="button" data-action="${id}">${esc(label)}</button>`
}

function lineButton(label: string, id: string): string {
  return `<button class="btn" type="button" data-action="${id}">${esc(label)}</button>`
}

function quietButton(label: string, id: string): string {
  return `<button class="btn quiet" type="button" data-action="${id}">${esc(label)}</button>`
}

function backButton(label = 'Back'): string {
  return `<button class="btn quiet back" type="button" data-action="${label.toLowerCase()}">${esc(label)}</button>`
}

function phone(screen: ScreenId, theme: SportTheme, inner: string, extraClass = ''): string {
  const cls = extraClass ? `phone ${extraClass}` : 'phone'
  return `<main class="${cls}" data-screen="${screen}" data-sport="${theme.sport}" data-scheme="${theme.scheme}" style="${roleVars(theme)};background:${theme.instrumentBackground.hex};color:${wordsOf(theme)}">${inner}</main>`
}

// ---------------------------------------------------------------------------
// Screens

export function todayPhone(): string {
  const theme = sportTheme(TODAY_INPUT.sport, TODAY_INPUT.scheme)
  const base = renderTodayPhone(TODAY_INPUT)
  const w = COPY.workout
  const content =
    `<div class="stack"><p class="small">${esc(COPY.athleteLine)}</p><p class="title">${esc(COPY.dateLabel)}</p></div>` +
    `<section class="tile"><h2 class="title">${esc(w.name)}</h2>` +
    `<div class="stats"><span class="stat"><span class="num">${w.minutes}</span><span class="unit">min</span></span><span class="stat"><span class="num">${w.exerciseCount}</span><span class="unit">exercises</span></span></div>` +
    `${mainButton(COPY.startLabel, 'start')}</section>` +
    `<nav class="tabs">${COPY.tabs
      .map((tab) => `<button class="tab" type="button"${tab === 'Today' ? ' aria-current="page"' : ''}>${tab}</button>`)
      .join('')}</nav>`
  const withRoles = base
    .replace('<main class="phone"', '<main class="phone" data-screen="today"')
    .replace('style="background:', `style="${roleVars(theme)};background:`)
  const end = withRoles.lastIndexOf('</main>')
  return `${withRoles.slice(0, end)}${content}</main>`
}

function workoutDetailPhone(theme: SportTheme): string {
  const w = COPY.workout
  const rows = w.exercises
    .map((e) => {
      const space = e.reps.indexOf(' ')
      const reps = space === -1 ? e.reps : e.reps.slice(0, space)
      const note = space === -1 ? '' : e.reps.slice(space + 1)
      const meta = [e.load, note || null].filter(Boolean).join(' · ')
      return `<li class="row"><span class="name">${esc(e.name)}${meta ? `<span class="small">${esc(meta)}</span>` : ''}</span><span class="count">${e.sets} × ${esc(reps)}</span></li>`
    })
    .join('')
  const phase = `${TODAY_INPUT.phase} ${TODAY_INPUT.phaseStep}/${TODAY_INPUT.phaseOf}`
  return phone(
    'workout-detail',
    theme,
    `<div class="top">${backButton()}<span class="note">Week ${TODAY_INPUT.week} · ${phase}</span></div>` +
      `<div class="stack"><h1 class="display">${esc(w.name)}</h1><p class="line">${esc(w.facts)}</p></div>` +
      `<ul class="rows" style="margin:0;padding:0;list-style:none">${rows}</ul>` +
      `<div class="foot">${mainButton(COPY.startLabel, 'start')}</div>`
  )
}

function paywallPhone(theme: SportTheme): string {
  const p = COPY.paywall
  const phases = COPY.plan.phases
    .map((ph) => `<div class="phase"><span class="word">${ph.word}</span><span class="label">${esc(ph.label)}</span><span class="small">${ph.weeks}</span></div>`)
    .join('')
  return phone(
    'paywall',
    theme,
    `<div class="top">${backButton('Close')}</div>` +
      `<div class="stack"><h1 class="display">${esc(p.title)}</h1><p class="line">${esc(p.hero)}</p></div>` +
      `<section class="stack" style="gap:12px"><h2 class="title">${esc(p.covers)}</h2><div class="phases">${phases}</div><p class="small">${esc(p.planFacts)}</p></section>` +
      `<section class="tile" style="gap:12px"><div class="offer"><div class="stack" style="gap:2px"><span class="title">${esc(p.offer)}</span><span class="eyebrow">${esc(p.priceNote)}</span></div><span class="price">${esc(p.price)}</span></div>` +
      `<div class="stack" style="gap:6px">${p.lines.map((l) => `<p class="small">${esc(l)}</p>`).join('')}</div></section>` +
      `<div class="foot" style="gap:4px">${mainButton(p.button, 'buy')}${quietButton(p.quiet, 'not-now')}</div>`
  )
}

function planTile(): string {
  const strip = COPY.plan.phases.map((ph) => `<span>${ph.word}</span>`).join('')
  return `<section class="tile" style="gap:12px"><div class="stack" style="gap:2px"><span class="line" style="font-weight:700">${esc(COPY.plan.title)}</span><span class="small">${esc(COPY.plan.countdown)}</span></div><div class="strip">${strip}</div></section>`
}

function savePlanPhone(theme: SportTheme): string {
  const s = COPY.savePlan
  const terms = s.terms.map((part) => ('link' in part ? `<u>${esc(part.text)}</u>` : esc(part.text))).join('')
  return phone(
    'save-plan',
    theme,
    `<div class="top">${backButton()}</div>` +
      planTile() +
      `<div class="stack"><h1 class="display">${esc(s.title)}</h1><p class="line">${esc(s.subtitle)}</p></div>` +
      `<div class="consent" role="checkbox" aria-checked="false"><span class="box"><span></span></span><span class="text">${terms}</span></div>` +
      `<div class="rows">${lineButton(s.apple, 'apple')}${lineButton(s.google, 'google')}${lineButton(s.email, 'email')}</div>`
  )
}

function signInPhone(theme: SportTheme): string {
  const s = COPY.signIn
  return phone(
    'sign-in',
    theme,
    `<div class="top">${backButton()}</div>` +
      `<div class="stack"><h1 class="display">${esc(s.title)}</h1><p class="line">${esc(s.subtitle)}</p></div>` +
      `<div class="rows">${lineButton(s.apple, 'apple')}${lineButton(s.google, 'google')}</div>` +
      `<div class="stack" style="gap:24px"><label class="field">${esc(s.emailLabel)}<span class="input"></span></label>${mainButton(s.button, 'continue')}</div>` +
      `<div class="foot">${quietButton(s.newHere, 'new-here')}</div>`
  )
}

function splashPhone(theme: SportTheme): string {
  return phone(
    'splash',
    theme,
    `<div class="mark" role="img" aria-label="${esc(COPY.splash.label)}"><span class="ring r1"></span><span class="ring r2"></span><span class="ring r3"></span><span class="dot"></span></div>`,
    'splash'
  )
}

function scoreboardPhone(theme: SportTheme): string {
  const s = COPY.season
  return phone(
    'scoreboard',
    theme,
    `<div class="top">${backButton()}</div>` +
      `<section class="band"><h1 class="display">${esc(s.title)}</h1><span class="hero">${s.weeks}</span><span class="eyebrow">${esc(s.weeksAway)}</span><span class="small">${esc(s.date)}</span></section>` +
      `<section class="tile" style="gap:4px"><span class="line" style="font-weight:700">${esc(s.noSeason.title)}</span><span class="small">${esc(s.noSeason.body)}</span></section>` +
      `<div class="foot">${mainButton(s.button, 'continue')}</div>`
  )
}

export function renderScreenPhone(screen: ScreenId, scheme: Scheme): string {
  if (screen === 'today') {
    if (scheme !== TODAY_INPUT.scheme) throw new Error('Today is drawn on the chalkboard sample only')
    return todayPhone()
  }
  const theme = sportTheme(SAMPLE_SPORT, scheme)
  switch (screen) {
    case 'workout-detail':
      return workoutDetailPhone(theme)
    case 'paywall':
      return paywallPhone(theme)
    case 'save-plan':
      return savePlanPhone(theme)
    case 'sign-in':
      return signInPhone(theme)
    case 'splash':
      return splashPhone(theme)
    case 'scoreboard':
      return scoreboardPhone(theme)
  }
}

// ---------------------------------------------------------------------------
// Pages

function page(title: string, scheme: Scheme | null, body: string, extraStyle = '', bodyClass = ''): string {
  const schemeAttr = scheme ? ` data-scheme="${scheme}"` : ''
  const cls = bodyClass ? ` class="${bodyClass}"` : ''
  return `<!DOCTYPE html><html${schemeAttr}><head><meta charset="utf-8"><title>${esc(title)}</title><style>${STYLE}${extraStyle}</style></head><body${cls}>${body}</body></html>`
}

/** One screen, on the chalkboard sample. */
export function renderScreen(screen: ScreenId): string {
  return page(`Direction B · ${SCREEN_TITLES[screen]}`, 'chalkboard', renderScreenPhone(screen, 'chalkboard'))
}

/** Every screen lined up: chalkboard on the first row, whiteboard under it. */
export function renderSheet(): string {
  const row = (scheme: Scheme) =>
    SCREEN_IDS.map((screen) =>
      SCREEN_SCHEMES[screen].includes(scheme)
        ? `<div class="frame"><p class="frame-cap">${SCREEN_TITLES[screen]} · ${SAMPLE_SPORT} · ${scheme}</p>${renderScreenPhone(screen, scheme)}</div>`
        : '<div class="frame" aria-hidden="true"></div>'
    ).join('')
  return page(
    'Direction B',
    null,
    `<div class="screens">${row('chalkboard')}${row('whiteboard')}</div>`,
    SHEET_STYLE,
    'direction-sheet'
  )
}

/** The checked-in pages under design/direction-b/, by file name. */
export function directionBPages(): Record<string, string> {
  const pages: Record<string, string> = {}
  for (const screen of SCREEN_IDS) pages[`${screen}.html`] = renderScreen(screen)
  pages['sheet.html'] = renderSheet()
  return pages
}
