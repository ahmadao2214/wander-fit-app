import { readdirSync, readFileSync } from 'node:fs'
import { contrastRatio } from '../contrast'
import {
  directionBPages,
  PHASE_WORDS,
  renderScreen,
  renderScreenPhone,
  renderSheet,
  rolePairs,
  SCREEN_IDS,
  SCREEN_SCHEMES,
  STYLE,
  TODAY_INPUT,
  wordsOf,
  type ScreenId,
} from '../directionB'
import { SCHEMES, SPORTS, sportTheme } from '../sportTokens'
import { renderTodayPhone, TODAY_SAMPLES } from '../todayScorebug'

const DIR = 'design/direction-b'

const DRAWN: { screen: ScreenId; scheme: (typeof SCHEMES)[number] }[] = SCREEN_IDS.flatMap((screen) =>
  SCREEN_SCHEMES[screen].map((scheme) => ({ screen, scheme }))
)

const WITH_MAIN_BUTTON: ScreenId[] = ['today', 'workout-detail', 'paywall', 'sign-in', 'scoreboard']

describe('direction B role pairs', () => {
  it('pass 4.5:1 for every sport on both schemes', () => {
    const failing = SPORTS.flatMap((sport) =>
      SCHEMES.flatMap((scheme) =>
        rolePairs(sportTheme(sport, scheme))
          .filter((pair) => contrastRatio(pair.foreground, pair.background) < 4.5)
          .map((pair) => `${sport} ${scheme} ${pair.name}`)
      )
    )
    expect(failing).toEqual([])
  })

  it('write chalk on a chalkboard and ink on a whiteboard', () => {
    expect(wordsOf(sportTheme('soccer', 'chalkboard'))).toBe(sportTheme('soccer', 'chalkboard').chalk.hex)
    expect(wordsOf(sportTheme('soccer', 'whiteboard'))).toBe(sportTheme('soccer', 'whiteboard').ink.hex)
  })
})

describe('direction B screens', () => {
  it.each(DRAWN)('$screen on the $scheme is an instrument', ({ screen, scheme }) => {
    const theme = sportTheme(TODAY_INPUT.sport, scheme)
    const html = renderScreenPhone(screen, scheme)
    expect(html).toContain(`data-screen="${screen}"`)
    expect(html).toContain(`--bg:${theme.instrumentBackground.hex}`)
    expect(html).toContain(`--words:${wordsOf(theme)}`)
    expect(html).toContain(`--button:${theme.button.hex}`)
    expect(html).toContain(`--on-button:${theme.instrumentBackground.hex}`)
    expect(html).toContain(`background:${theme.instrumentBackground.hex};color:${wordsOf(theme)}`)
    expect(html).not.toContain(theme.boardSurface.hex)
    expect(html).not.toContain(`background:${theme.marker.hex}`)
  })

  it('face the main button with theme.button and label it in the instrument background', () => {
    expect(STYLE).toContain('.btn.main { background: var(--button); border-color: var(--button); color: var(--on-button); }')
    for (const { screen, scheme } of DRAWN) {
      const mains = renderScreenPhone(screen, scheme).match(/class="btn main"/g) ?? []
      expect({ screen, scheme, mains: mains.length }).toEqual({
        screen,
        scheme,
        mains: WITH_MAIN_BUTTON.includes(screen) ? 1 : 0,
      })
    }
  })

  it('give every control at least 44px', () => {
    expect(STYLE).toContain('min-height: 52px')
    expect(STYLE).toMatch(/\.tab \{[^}]*min-height: 44px/)
    expect(STYLE).toMatch(/\.back \{[^}]*min-height: 44px/)
    expect(STYLE).toMatch(/\.consent \.box \{[^}]*width: 44px; height: 44px/)
    for (const { screen, scheme } of DRAWN) {
      const classes = [...renderScreenPhone(screen, scheme).matchAll(/<button class="([^"]+)"/g)].map((m) => m[1])
      const unsized = classes.filter((c) => !/\b(btn|tab|bug)\b/.test(c))
      expect({ screen, unsized }).toEqual({ screen, unsized: [] })
    }
  })

  it('keep every type size at 12px or more', () => {
    const small = [...STYLE.matchAll(/font-size: (\d+)px/g)].map((m) => Number(m[1])).filter((n) => n < 12)
    expect(small).toEqual([])
  })

  it('name the phases as words', () => {
    expect(PHASE_WORDS).toEqual(['Build', 'Train', 'Sharpen'])
    const paywall = renderScreenPhone('paywall', 'chalkboard')
    for (const word of PHASE_WORDS) expect(paywall).toContain(`<span class="word">${word}</span>`)
    expect(renderScreenPhone('save-plan', 'whiteboard')).toContain(
      '<div class="strip"><span>Build</span><span>Train</span><span>Sharpen</span></div>'
    )
    expect(renderScreenPhone('workout-detail', 'chalkboard')).toContain('Week 4 · Build 1/3')
  })

  it('draw no court, no route and no motion', () => {
    for (const html of Object.values(directionBPages())) {
      expect(html).not.toContain('#2563EB')
      expect(html.toLowerCase()).not.toContain('#2563eb')
      expect(html).not.toMatch(/GPP|SPP|SSP|SCORE/)
      expect(html).not.toMatch(/<(svg|path|canvas|img|script)\b/)
      expect(html).not.toMatch(/@keyframes|transition|animation|requestAnimationFrame/)
    }
  })

  it('draw the splash mark with rings, not a picture', () => {
    const html = renderScreenPhone('splash', 'whiteboard')
    expect(html).toContain('<div class="mark" role="img" aria-label="Wander Fit">')
    expect(html.match(/class="ring /g)).toHaveLength(3)
  })
})

describe('direction B Today', () => {
  it('is the basketball chalkboard sample: week 4, Build 1/3, 56 days out', () => {
    expect(TODAY_INPUT).toEqual(TODAY_SAMPLES[0].input)
    expect(() => renderScreenPhone('today', 'whiteboard')).toThrow()
  })

  it('carries the scorebug from lib/todayScorebug.ts unchanged', () => {
    const html = renderScreenPhone('today', 'chalkboard')
    const bug = renderTodayPhone(TODAY_INPUT).match(/<button class="bug"[\s\S]*?<\/button>/)?.[0]
    expect(bug).toBeDefined()
    expect(html).toContain(bug as string)
    expect(html).toContain('<span class="lab">Phase</span><span class="val">Build 1/3</span>')
    expect(html).toContain('<span class="lab">1st game</span><span class="val">8 wks</span>')
    expect(html).toContain('<h1>Today</h1>')
  })

  it("adds the day's workout and the tabs under the scorebug", () => {
    const html = renderScreenPhone('today', 'chalkboard')
    expect(html.indexOf('class="bug"')).toBeLessThan(html.indexOf('Lower Body Foundation'))
    expect(html).toContain('Wednesday, Nov 25')
    expect(html).toContain('<span class="num">45</span><span class="unit">min</span>')
    expect(html).toContain('<button class="btn main" type="button" data-action="start">Start Workout</button>')
    expect(html).toContain('<button class="tab" type="button" aria-current="page">Today</button>')
    expect(html.match(/<main /g)).toHaveLength(1)
    expect(html.endsWith('</nav></main>')).toBe(true)
  })
})

describe('direction B pages', () => {
  it('use the harness phone frame', () => {
    expect(STYLE).toContain('width: 402px; height: 874px')
    expect(STYLE).toContain('padding: 62px 16px 34px')
  })

  it('line every screen up on the sheet, one row per scheme', () => {
    const sheet = renderSheet()
    expect(sheet.match(/<main class="phone/g)).toHaveLength(DRAWN.length)
    expect(sheet).toContain(`grid-template-columns: repeat(${SCREEN_IDS.length}, 402px)`)
    const order = [...sheet.matchAll(/data-screen="([^"]+)"/g)].map((m) => m[1])
    expect(order).toEqual([...SCREEN_IDS, ...SCREEN_IDS.filter((s) => s !== 'today')])
  })

  it('match the checked-in pages', () => {
    const pages = directionBPages()
    expect(readdirSync(DIR).sort()).toEqual(Object.keys(pages).sort())
    for (const [name, html] of Object.entries(pages)) {
      expect({ name, same: readFileSync(`${DIR}/${name}`, 'utf8') === html }).toEqual({ name, same: true })
    }
    expect(pages['today.html']).toBe(renderScreen('today'))
  })
})
