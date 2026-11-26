import { readFileSync } from 'node:fs'
import { sportTheme } from '../sportTokens'
import { gameReadout, renderToday, renderTodaySheet, thirdCell, TODAY_SAMPLES, type TodayInput } from '../todayScorebug'

const OPEN = TODAY_SAMPLES[0].input
const DAYS = TODAY_SAMPLES[1].input
const PLAN = TODAY_SAMPLES[2].input
const SEASON = TODAY_SAMPLES[3].input

function page(input: TodayInput): string {
  return renderToday(input)
}

describe('Today scorebug', () => {
  it('reads weeks until the last two weeks, then days', () => {
    expect(gameReadout(56)).toBe('8 wks')
    expect(gameReadout(15)).toBe('2 wks')
    expect(gameReadout(14)).toBe('14 days')
    expect(gameReadout(10)).toBe('10 days')
  })

  it('fills the third cell from the season the caller passes', () => {
    expect(thirdCell(OPEN.season)).toEqual({ label: '1st game', value: '8 wks' })
    expect(thirdCell(DAYS.season)).toEqual({ label: '1st game', value: '10 days' })
    expect(thirdCell(PLAN.season)).toEqual({ label: 'Plan', value: '4 of 12' })
    expect(thirdCell(SEASON.season)).toEqual({ label: 'Season', value: 'In season, week 1' })
  })

  it('renders three cells, with the week in the sport colour', () => {
    const theme = sportTheme('basketball', 'chalkboard')
    const html = page(OPEN)
    expect(html.match(/class="cell"/g)).toHaveLength(3)
    expect(html).toContain(`<span class="val sport" style="color:${theme.marker.hex}">4</span>`)
    expect(html).toContain('<span class="lab">Phase</span><span class="val">Build 1/3</span>')
    expect(html).toContain('<span class="lab">1st game</span><span class="val">8 wks</span>')
    expect(html.split(theme.marker.hex).length - 1).toBe(1)
    expect(html).not.toContain('4 / 12')
    expect(html).not.toContain(sportTheme('soccer', 'chalkboard').marker.hex)
  })

  it('keeps the phase as words on both schemes', () => {
    for (const input of [OPEN, DAYS, PLAN, SEASON]) {
      const theme = sportTheme(input.sport, input.scheme)
      const html = page(input)
      expect(html).toContain(`background:${theme.instrumentBackground.hex}`)
      expect(html).toContain(`color:${theme[input.scheme === 'chalkboard' ? 'chalk' : 'ink'].hex}`)
      expect(html).not.toContain(`background:${theme.boardSurface.hex}`)
      expect(html).not.toContain(`background:${theme.marker.hex}`)
      expect(html).not.toContain(`background:${theme.button.hex}`)
      expect(html).toContain(`<span class="val">${input.phase} ${input.phaseStep}/${input.phaseOf}</span>`)
    }
  })

  it('opens Program from a 44px control and plays nothing', () => {
    const html = page(OPEN)
    expect(html).toContain('<button class="bug" type="button" data-open="program"')
    expect(html).toContain('min-height: 44px')
    expect(html.match(/<button/g)).toHaveLength(1)
    expect(html).not.toContain('<svg')
    expect(html).not.toContain('<path')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('@keyframes')
    expect(html).not.toContain('transition')
    expect(html).not.toContain('animation')
    expect(html).not.toContain('requestAnimationFrame')
    expect(html).not.toContain('#2563EB')
    expect(html).not.toMatch(/\b(GPP|SPP|SSP|SCORE)\b/)
  })

  it('wraps the large-text page with the same three cells', () => {
    const html = page({ ...OPEN, large: true })
    expect(html).toContain('<html data-scheme="chalkboard" data-large="1">')
    expect(html).toContain('html[data-large="1"] { font-size: 22px; }')
    expect(html).toContain('flex-wrap: wrap')
    expect(html).toContain('flex: 1 1 7.5em')
    expect(html.match(/class="cell"/g)).toHaveLength(3)
    expect(page(OPEN)).toContain('<html data-scheme="chalkboard">')
  })

  it('matches the checked-in pages', () => {
    expect(readFileSync('design/today/open.html', 'utf8')).toBe(page(OPEN))
    expect(readFileSync('design/today/large.html', 'utf8')).toBe(page({ ...OPEN, large: true }))
    const sheet = renderTodaySheet()
    expect(readFileSync('design/today/sheet.html', 'utf8')).toBe(sheet)
    expect(sheet.match(/class="cell"/g)).toHaveLength(12)
    expect(sheet).toContain('In season, week 1')
    expect(sheet).toContain('4 of 12')
    expect(sheet).toContain('10 days')
  })
})
