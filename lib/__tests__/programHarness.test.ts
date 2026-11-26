import { readFileSync } from 'node:fs'
import { ORIGINAL_PLAY } from '../originalPlay'
import {
  renderExecute,
  renderExecutePhone,
  renderProgram,
  renderProgramPhone,
  renderProgramSheet,
  renderSetEdit,
  renderSetEditPhone,
} from '../programHarness'
import { SCHEMES, sportTheme, type Scheme } from '../sportTokens'

const LONG = ['M58 394 Q26 316 66 232', 'M66 232 Q150 318 254 268', 'M254 268 Q302 214 214 172']

const wordsHex = (scheme: Scheme) => {
  const theme = sportTheme('basketball', scheme)
  return scheme === 'chalkboard' ? theme.chalk.hex : theme.ink.hex
}
const labelHex = (scheme: Scheme) => {
  const theme = sportTheme('basketball', scheme)
  return scheme === 'chalkboard' ? theme.ink.hex : theme.chalk.hex
}

function filledButtons(html: string, scheme: Scheme): string[] {
  const face = sportTheme('basketball', scheme).button.hex
  return html.match(new RegExp(`<button[^>]*background:${face}[^>]*>[^<]*</button>`, 'g')) ?? []
}

function expectNoMotion(html: string) {
  expect(html).not.toContain('requestAnimationFrame')
  expect(html).not.toContain('stroke-dashoffset')
  expect(html).not.toContain('@keyframes')
  expect(html).not.toContain('<script')
}

function expectHouseRules(html: string) {
  expect(html).not.toMatch(/#2563EB/i)
  expect(html).not.toMatch(/\b(GPP|SPP|SSP|SCORE)\b/)
  expect(html).toContain('font-family: system-ui')
  expect(html).toContain('width: 402px; height: 874px')
  expect(html).toContain('padding: 62px 16px 34px')
  expect(html).toContain('height: 48px')
  expect(html).toContain('border-radius: 14px')
}

function expectInstrument(html: string, scheme: Scheme) {
  const theme = sportTheme('basketball', scheme)
  expect(html).toContain(`background:${theme.instrumentBackground.hex};color:${wordsHex(scheme)}`)
  expect(html).not.toContain('<svg')
  expect(html).not.toContain('<path')
  expect(html).not.toContain(theme.boardSurface.hex)
  expect(html).not.toContain(theme.marker.hex)
  expect(html).not.toMatch(/court|field/i)
  for (const d of LONG) expect(html).not.toContain(d)
  for (const d of ORIGINAL_PLAY.basketball.short) expect(html).not.toContain(d)
}

describe('Program harness', () => {
  it('uses the committed long legs', () => {
    expect([...ORIGINAL_PLAY.basketball.long]).toEqual(LONG)
  })

  it.each(SCHEMES)('shows Program on %s as a board with the play already drawn', (scheme) => {
    const theme = sportTheme('basketball', scheme)
    const html = renderProgram(scheme)
    expect(html).toContain(`<main class="phone" data-screen="program" data-scheme="${scheme}" style="background:${theme.boardSurface.hex};color:${wordsHex(scheme)}"><h1>Program</h1>`)
    expect(html).toContain(`<rect width="340" height="700" fill="${theme.boardSurface.hex}"/>`)
    for (const d of LONG) {
      expect(html).toContain(`<path d="${d}" fill="none" stroke="${theme.marker.hex}" stroke-width="2.8" stroke-linecap="round"/>`)
    }
    expect(html.match(/<path /g)).toHaveLength(3)
    for (const d of ORIGINAL_PLAY.basketball.short) expect(html).not.toContain(d)
    expect(html).not.toContain(`background:${theme.instrumentBackground.hex}`)
    expectNoMotion(html)
    expectHouseRules(html)
  })

  it.each(SCHEMES)('gives Program on %s one neutral Start button', (scheme) => {
    const theme = sportTheme('basketball', scheme)
    const html = renderProgram(scheme)
    expect(filledButtons(html, scheme)).toEqual([
      `<button class="main" type="button" data-role="main-button" style="background:${theme.button.hex};color:${labelHex(scheme)}">Start</button>`,
    ])
    expect(html.match(/<button/g)).toHaveLength(1)
  })

  it('labels the button ink on a chalkboard and chalk on a whiteboard', () => {
    const chalkboard = sportTheme('basketball', 'chalkboard')
    const whiteboard = sportTheme('basketball', 'whiteboard')
    expect(renderProgram('chalkboard')).toContain(`background:${chalkboard.button.hex};color:${chalkboard.ink.hex}">Start`)
    expect(renderProgram('whiteboard')).toContain(`background:${whiteboard.button.hex};color:${whiteboard.chalk.hex}">Start`)
  })

  it.each(SCHEMES)('keeps Execute on %s an instrument with the set as copy', (scheme) => {
    const theme = sportTheme('basketball', scheme)
    const html = renderExecute(scheme)
    expectInstrument(html, scheme)
    expectNoMotion(html)
    expectHouseRules(html)
    expect(html).toContain('<h1>Execute</h1>')
    expect(html).toContain('<p class="lift">Back squat</p>')
    expect(html).toContain('<p class="set">Set 2 of 4</p>')
    expect(html).toContain('<span>6</span> reps')
    expect(html).toContain('<span>135</span> lb')
    expect(filledButtons(html, scheme)).toEqual([
      `<button class="main" type="button" data-role="main-button" style="background:${theme.button.hex};color:${labelHex(scheme)}">Log Set</button>`,
    ])
    expect(html.match(/<button/g)).toHaveLength(1)
  })

  it.each(SCHEMES)('puts Set Edit on %s in a sheet over a dimmed Execute', (scheme) => {
    const theme = sportTheme('basketball', scheme)
    const html = renderSetEdit(scheme)
    expectInstrument(html, scheme)
    expectNoMotion(html)
    expectHouseRules(html)
    expect(html).toContain('<div class="under" inert aria-hidden="true"><h1>Execute</h1>')
    expect(html).toContain('<div class="scrim" style="background:')
    expect(html.indexOf('class="under"')).toBeLessThan(html.indexOf('class="scrim"'))
    expect(html.indexOf('class="scrim"')).toBeLessThan(html.indexOf('class="sheet"'))

    const sheet = html.slice(html.indexOf('<section class="sheet"'), html.indexOf('</section>'))
    expect(sheet).toContain(`style="background:${theme.instrumentBackground.hex};`)
    expect(sheet).toContain('<h2 id="set-edit-title">Set 2</h2>')
    expect(sheet).toContain('<span class="lab">Reps</span>')
    expect(sheet).toContain('<output>6</output>')
    expect(sheet).toContain('<span class="lab">Load</span>')
    expect(sheet).toContain('<output>135 lb</output>')
    expect(sheet.match(/aria-label="Less /g)).toHaveLength(2)
    expect(sheet.match(/aria-label="More /g)).toHaveLength(2)
    expect(sheet).toContain('<button class="close" type="button">Close</button>')
    expect(filledButtons(sheet, scheme)).toEqual([
      `<button class="main" type="button" data-role="main-button" style="background:${theme.button.hex};color:${labelHex(scheme)}">Save</button>`,
    ])
    expect(sheet).not.toContain('<input')
  })

  it('keeps every Set Edit control at least 44px', () => {
    const html = renderSetEdit('chalkboard')
    expect(html).toContain('.close { min-width: 44px; min-height: 44px;')
    expect(html).toContain('.step button { width: 44px; height: 44px;')
  })

  it('draws the play on Program only', () => {
    for (const scheme of SCHEMES) {
      for (const d of LONG) {
        expect(renderProgramPhone(scheme)).toContain(d)
        expect(renderExecutePhone(scheme)).not.toContain(d)
        expect(renderSetEditPhone(scheme)).not.toContain(d)
      }
    }
  })

  it('matches the checked-in pages', () => {
    expect(readFileSync('design/program/program.html', 'utf8')).toBe(renderProgram('chalkboard'))
    expect(readFileSync('design/program/execute.html', 'utf8')).toBe(renderExecute('chalkboard'))
    expect(readFileSync('design/program/set-edit.html', 'utf8')).toBe(renderSetEdit('chalkboard'))
    expect(readFileSync('design/program/sheet.html', 'utf8')).toBe(renderProgramSheet())
  })

  it('shows Program and Execute in both schemes and one Set Edit on the sheet', () => {
    const sheet = renderProgramSheet()
    expect(sheet.match(/data-screen="program"/g)).toHaveLength(2)
    expect(sheet.match(/data-screen="execute"/g)).toHaveLength(2)
    expect(sheet.match(/data-screen="set-edit" data-scheme="chalkboard"/g)).toHaveLength(1)
    expect(sheet.match(/data-screen="set-edit"/g)).toHaveLength(1)
    for (const scheme of SCHEMES) {
      expect(sheet).toContain(`data-screen="program" data-scheme="${scheme}"`)
      expect(sheet).toContain(`data-screen="execute" data-scheme="${scheme}"`)
    }
    expect(sheet.match(/<svg/g)).toHaveLength(2)
    for (const d of LONG) expect(sheet.split(d).length - 1).toBe(2)
    expectNoMotion(sheet)
  })
})
