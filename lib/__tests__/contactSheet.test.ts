import { readFileSync } from 'node:fs'
import { ORIGINAL_PLAY, renderOriginalPlay } from '../originalPlay'
import { SCHEMES, sportTheme } from '../sportTokens'
import { renderContactSheet } from '../contactSheet'

const LONG = ['M58 394 Q26 316 66 232', 'M66 232 Q150 318 254 268', 'M254 268 Q302 214 214 172']

function section(html: string, screen: 'program' | 'execute', scheme: (typeof SCHEMES)[number]): string {
  const match = html.match(new RegExp(`<section data-screen="${screen}" data-scheme="${scheme}"[\\s\\S]*?</section>`))
  if (!match) throw new Error(`missing ${screen} ${scheme}`)
  return match[0]
}

describe('program and execute contact sheet', () => {
  const sheet = renderContactSheet()

  it('draws the original play on Program in both schemes', () => {
    for (const scheme of SCHEMES) {
      const program = section(sheet, 'program', scheme)
      const theme = sportTheme('basketball', scheme)
      expect(program).toContain(renderOriginalPlay(scheme))
      for (const leg of LONG) expect(program).toContain(leg)
      expect(program).toContain(theme.boardSurface.hex)
      expect(program).toContain(theme.marker.hex)
      expect(program).not.toContain('<text')
    }
  })

  it('gives Execute no court in both schemes', () => {
    for (const scheme of SCHEMES) {
      const execute = section(sheet, 'execute', scheme)
      const theme = sportTheme('basketball', scheme)
      expect(execute).toContain(theme.instrumentBackground.hex)
      expect(execute).not.toContain('<svg')
      expect(execute).not.toContain('<path')
      expect(execute).not.toContain('<rect')
      for (const leg of LONG) expect(execute).not.toContain(leg)
      expect(execute).not.toContain(theme.boardSurface.hex)
    }
  })

  it('paints the main button with the neutral face on both screens', () => {
    expect(sheet).not.toContain('#2563EB')
    for (const scheme of SCHEMES) {
      const theme = sportTheme('basketball', scheme)
      const label = scheme === 'chalkboard' ? theme.ink.hex : theme.chalk.hex
      for (const screen of ['program', 'execute'] as const) {
        const frame = section(sheet, screen, scheme)
        expect(frame).toContain(`data-role="main-button" style="background:${theme.button.hex};color:${label}"`)
        expect(frame).not.toContain(`background:${theme.marker.hex}`)
      }
    }
  })

  it('leaves the original play as basketball', () => {
    expect(Object.keys(ORIGINAL_PLAY).sort()).toEqual(['basketball', 'viewBox'])
    expect(sheet).not.toMatch(/\b(GPP|SPP|SSP)\b/)
    expect(readFileSync('design/program-execute-contact.html', 'utf8')).toBe(sheet)
  })
})
