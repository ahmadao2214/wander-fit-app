import { readFileSync } from 'node:fs'
import { ORIGINAL_PLAY } from '../originalPlay'
import {
  RUN3_PHONES,
  RUN3_SCREEN_IDS,
  renderCheckInPhone,
  renderHistoryEmptyPhone,
  renderHistoryPhone,
  renderMaxSheetPhone,
  renderProfilePhone,
  renderReassessmentPhone,
  renderRun3Screen,
  renderRun3Sheet,
  renderSettingsPhone,
  type Run3ScreenId,
} from '../run3Harness'
import { SCHEMES, sportTheme, type Scheme } from '../sportTokens'

const LONG = ['M58 394 Q26 316 66 232', 'M66 232 Q150 318 254 268', 'M254 268 Q302 214 214 172']
const INSTRUMENTS: Run3ScreenId[] = ['history', 'reassessment', 'check-in', 'profile', 'settings', 'max-sheet']

const theme = (scheme: Scheme) => sportTheme('basketball', scheme)
const wordsHex = (scheme: Scheme) => (scheme === 'chalkboard' ? theme(scheme).chalk.hex : theme(scheme).ink.hex)
const labelHex = (scheme: Scheme) => (scheme === 'chalkboard' ? theme(scheme).ink.hex : theme(scheme).chalk.hex)

const mainButton = (text: string, scheme: Scheme) =>
  `<button class="main" type="button" data-role="main-button" style="background:${theme(scheme).button.hex};color:${labelHex(scheme)}">${text}</button>`

function filledButtons(html: string, scheme: Scheme): string[] {
  const face = theme(scheme).button.hex
  return html.match(new RegExp(`<button[^>]*background:${face}[^>]*>[^<]*</button>`, 'g')) ?? []
}

/** The px value of one declaration in one CSS rule of the page's style block. */
function cssPx(html: string, selector: string, property: string): number {
  const style = html.slice(html.indexOf('<style>'), html.indexOf('</style>'))
  const rule = style.split('\n').find((line) => line.trim().startsWith(`${selector} {`))
  const match = rule?.match(new RegExp(`(?:^|[ ;{])${property}: (\\d+)px`))
  return match ? Number(match[1]) : NaN
}

const BANNED = [
  /#2563EB/i,
  /\bGPP\b/,
  /\bSPP\b/,
  /\bSSP\b/,
  /\bSCORE\b/i,
  /confetti/i,
  /script/i,
  /animation/i,
  /transition/i,
  /keyframes/i,
  /12-week/i,
  /13 weeks/i,
  /\$35/,
  /requestAnimationFrame/,
  /stroke-dashoffset/,
]

function expectHouseRules(html: string) {
  const hits = BANNED.filter((re) => re.test(html)).map(String)
  expect(hits).toEqual([])
  expect(html).toContain('font-family: system-ui')
  expect(html).toContain('width: 402px; height: 874px')
  expect(html).toContain('padding: 62px 16px 34px')
}

function expectPhaseWordsOnly(html: string) {
  const text = html.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, ' ')
  expect(text).not.toMatch(/\b(Base|Peak|Taper|Deload|Strength|Power|Hypertrophy|Prep)\b/)
}

function expectInstrument(html: string, scheme: Scheme) {
  const t = theme(scheme)
  expect(html).toContain(`style="background:${t.instrumentBackground.hex};color:${wordsHex(scheme)}"`)
  expect(html).not.toContain('<svg')
  expect(html).not.toContain('<path')
  expect(html).not.toContain(t.boardSurface.hex)
  expect(html).not.toMatch(/court|field/i)
  for (const d of [...LONG, ...ORIGINAL_PLAY.basketball.short]) expect(html).not.toContain(d)
}

describe('Run 3 harness', () => {
  it('uses the committed long legs', () => {
    expect([...ORIGINAL_PLAY.basketball.long]).toEqual(LONG)
  })

  describe.each(SCHEMES)('on %s', (scheme) => {
    const t = theme(scheme)

    it('keeps every screen in the phone frame and inside the house rules', () => {
      for (const id of RUN3_SCREEN_IDS) {
        const html = renderRun3Screen(id, scheme)
        expect(html).toContain(`<main class="phone" data-screen="${id}" data-scheme="${scheme}"`)
        expectHouseRules(html)
        expectPhaseWordsOnly(html)
      }
    })

    it('shows History empty as a board with the play already drawn', () => {
      const html = renderRun3Screen('history-empty', scheme)
      expect(html).toContain(`data-screen="history-empty" data-scheme="${scheme}" style="background:${t.boardSurface.hex};color:${wordsHex(scheme)}"><h1>History</h1>`)
      expect(html).toContain(`<rect width="340" height="700" fill="${t.boardSurface.hex}"/>`)
      for (const d of LONG) {
        expect(html).toContain(`<path d="${d}" fill="none" stroke="${t.marker.hex}" stroke-width="2.8" stroke-linecap="round"/>`)
      }
      expect(html.match(/<path /g)).toHaveLength(3)
      for (const d of ORIGINAL_PLAY.basketball.short) expect(html).not.toContain(d)
      expect(html).not.toContain(t.instrumentBackground.hex)
      expect(html).toContain('<p class="empty">No workouts yet</p>')
      expect(html).not.toContain('<li')
      expect(html).not.toContain('class="session"')
      expect(filledButtons(html, scheme)).toEqual([mainButton("Go to today's workout", scheme)])
      expect(html.match(/<button/g)).toHaveLength(1)
    })

    it.each(INSTRUMENTS)('keeps %s an instrument', (id) => {
      expectInstrument(renderRun3Screen(id, scheme), scheme)
    })

    it('shows one History row with Done in the words colour', () => {
      const html = renderHistoryPhone(scheme)
      expect(html.match(/<li /g)).toHaveLength(1)
      expect(html).toContain('<p class="name">Lower Body Foundation</p>')
      expect(html).toContain('<p class="meta">Wed, Nov 25 · 45 min · Build</p>')
      expect(html).toContain('<span class="status">Done</span>')
      expect(html).not.toContain(t.marker.hex)
      expect(html.match(/<button/g)).toBeNull()
    })

    it('shows the reassessment with one Continue and nothing thrown', () => {
      const html = renderReassessmentPhone(scheme)
      expect(html).toContain('<h1 class="say">You finished Build</h1>')
      expect(html).toContain('<p class="count">10 of 10 sessions</p>')
      expect(html).toContain('<p class="line">You trained every planned session in this block.</p>')
      expect(filledButtons(html, scheme)).toEqual([mainButton('Continue', scheme)])
      expect(html.match(/<button/g)).toHaveLength(1)
      expect(html).not.toContain(t.marker.hex)
    })

    it('marks the chosen check-in items with the marker border only', () => {
      const html = renderCheckInPhone(scheme)
      expect(html).toContain('<h1 class="say" id="check-in-title">How did Build feel?</h1>')
      const choice = (text: string, on: boolean) =>
        `<button class="choice" type="button" role="radio" aria-checked="${on}" style="border-color:${on ? t.marker.hex : wordsHex(scheme)}">${text}</button>`
      for (const item of ['Too easy', 'Challenging', 'Too hard', 'Low', 'High']) expect(html).toContain(choice(item, false))
      expect(html).toContain(choice('Just right', true))
      expect(html).toContain(choice('Moderate', true))
      expect(html.match(/aria-checked="true"/g)).toHaveLength(2)
      expect(html.split(t.marker.hex).length - 1).toBe(2)
      expect(html.match(new RegExp(`border-color:${t.marker.hex}`, 'g'))).toHaveLength(2)
      expect(html.match(/class="choice"[^>]*background/g)).toBeNull()
      expect(filledButtons(html, scheme)).toEqual([mainButton('Continue', scheme)])
    })

    it('shows Profile with the maxes row, Learn, Settings and a text Sign Out', () => {
      const html = renderProfilePhone(scheme)
      expect(html).toContain('<h1>Profile</h1><p class="who">Jordan Lee</p>')
      for (const [k, v] of [
        ['Sport', 'Basketball'],
        ['Phase', 'Build'],
        ['Week', '4'],
        ['Training', '3 a week'],
        ['Experience', '1–2 years'],
      ]) {
        expect(html).toContain(`<dt>${k}</dt><dd>${v}</dd>`)
      }
      expect(html).toContain('<h2>My maxes</h2><button class="rowbtn" type="button" data-role="max-row" aria-haspopup="dialog"')
      expect(html).toContain('<span>Back squat</span><span class="val">135 lb</span>')
      expect(html).toContain('<h2>Learn</h2>')
      expect(html).toContain('Training Science<span class="sub">Understand your program</span>')
      expect(html).toContain('<h2>Settings</h2>')
      expect(html).toContain('<span>App settings</span>')
      expect(html).toContain('<button class="text" type="button">Sign Out</button>')
      expect(filledButtons(html, scheme)).toEqual([])
      expect(html).not.toContain(`background:${t.button.hex}`)
    })

    it('gives Settings one text action and no toggles', () => {
      const html = renderSettingsPhone(scheme)
      expect(html).toContain('<h1>Settings</h1><button class="text" type="button">Sign Out</button></main>')
      expect(html.match(/<button/g)).toHaveLength(1)
      expect(html).not.toMatch(/switch|checkbox|toggle/i)
      expect(filledButtons(html, scheme)).toEqual([])
    })

    it('puts the max sheet over a dimmed, inert Profile', () => {
      const html = renderMaxSheetPhone(scheme)
      const scrim = scheme === 'chalkboard' ? t.instrumentBackground.hex : t.ink.hex
      expect(html).toContain('<div class="under" inert aria-hidden="true"><h1>Profile</h1>')
      expect(html).toContain(`<div class="scrim" style="background:${scrim}"></div>`)
      expect(html.indexOf('class="under"')).toBeLessThan(html.indexOf('class="scrim"'))
      expect(html.indexOf('class="scrim"')).toBeLessThan(html.indexOf('class="sheet"'))

      const sheet = html.slice(html.indexOf('<section class="sheet"'), html.indexOf('</section>'))
      expect(sheet).toContain('role="dialog" aria-modal="true" aria-labelledby="max-sheet-title"')
      expect(sheet).toContain(`style="background:${t.instrumentBackground.hex};`)
      expect(sheet).toContain('<h2 id="max-sheet-title">Back squat</h2><button class="text" type="button">Close</button>')
      expect(sheet).toContain('<button type="button" aria-label="Less load">−</button><output>135 lb</output><button type="button" aria-label="More load">+</button>')
      expect(filledButtons(sheet, scheme)).toEqual([mainButton('Save', scheme)])
      expect(filledButtons(html, scheme)).toEqual([mainButton('Save', scheme)])
      expect(sheet).not.toContain('<input')
    })
  })

  it('makes the scrim 0.72 opaque', () => {
    expect(renderRun3Screen('max-sheet')).toContain('.scrim { position: absolute; inset: 0; opacity: 0.72; }')
  })

  it('draws the main button 48px tall with a 14px radius', () => {
    const html = renderRun3Screen('reassessment')
    expect(cssPx(html, '.main', 'height')).toBe(48)
    expect(cssPx(html, '.main', 'border-radius')).toBe(14)
  })

  it('keeps every tapped control at least 44px', () => {
    const html = renderRun3Screen('max-sheet')
    expect(cssPx(html, '.main', 'height')).toBeGreaterThanOrEqual(44)
    expect(cssPx(html, '.step button', 'width')).toBeGreaterThanOrEqual(44)
    expect(cssPx(html, '.step button', 'height')).toBeGreaterThanOrEqual(44)
    expect(cssPx(html, '.rowbtn', 'min-height')).toBeGreaterThanOrEqual(44)
    expect(cssPx(html, '.text', 'min-height')).toBeGreaterThanOrEqual(44)
    expect(cssPx(html, '.text', 'min-width')).toBeGreaterThanOrEqual(44)
    expect(cssPx(html, '.choice', 'min-height')).toBeGreaterThanOrEqual(44)
  })

  it('gives every button a class the 44px rules cover', () => {
    const covered = ['main', 'text', 'rowbtn', 'choice']
    for (const id of RUN3_SCREEN_IDS) {
      for (const scheme of SCHEMES) {
        const html = RUN3_PHONES[id](scheme)
        const sheetPart = html.slice(html.indexOf('<section'))
        const stepButtons = (sheetPart.match(/<button type="button" aria-label="(Less|More) load">/g) ?? []).length
        const classed = (html.match(/<button class="([a-z]+)"/g) ?? []).map((b) => b.slice(15, -1))
        const uncovered = classed.filter((c) => !covered.includes(c))
        expect({ id, uncovered }).toEqual({ id, uncovered: [] })
        expect((html.match(/<button/g) ?? []).length).toBe(classed.length + stepButtons)
      }
    }
  })

  it('matches the checked-in pages', () => {
    for (const id of RUN3_SCREEN_IDS) {
      const file = readFileSync(`design/run3/${id}.html`, 'utf8')
      expect({ id, same: file === renderRun3Screen(id, 'chalkboard') }).toEqual({ id, same: true })
    }
    expect(readFileSync('design/run3/sheet.html', 'utf8')).toBe(renderRun3Sheet())
  })

  it('shows six screens per scheme and one chalkboard max sheet on the sheet', () => {
    const sheet = renderRun3Sheet()
    expectHouseRules(sheet)
    expect(sheet).toContain('grid-template-columns: repeat(6, 402px)')
    for (const id of RUN3_SCREEN_IDS.filter((s) => s !== 'max-sheet')) {
      for (const scheme of SCHEMES) {
        expect(sheet).toContain(`data-screen="${id}" data-scheme="${scheme}"`)
      }
      expect(sheet.match(new RegExp(`data-screen="${id}"`, 'g'))).toHaveLength(2)
    }
    expect(sheet.match(/data-screen="max-sheet"/g)).toHaveLength(1)
    expect(sheet).toContain('data-screen="max-sheet" data-scheme="chalkboard"')
    expect(sheet.match(/<p class="cap">/g)).toHaveLength(13)
    expect(sheet).toContain('<p class="cap">History empty · chalkboard</p>')
    expect(sheet).toContain('<p class="cap">Settings · whiteboard</p>')
    expect(sheet).toContain('<p class="cap">Max sheet · chalkboard</p>')
    expect(sheet.match(/<svg/g)).toHaveLength(2)
    for (const d of LONG) expect(sheet.split(d).length - 1).toBe(2)
  })

  it('draws the play on History empty only', () => {
    for (const scheme of SCHEMES) {
      for (const d of LONG) {
        expect(renderHistoryEmptyPhone(scheme)).toContain(d)
        for (const id of INSTRUMENTS) expect(RUN3_PHONES[id](scheme)).not.toContain(d)
      }
    }
  })
})
