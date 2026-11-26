import { readFileSync } from 'node:fs'

const doc = readFileSync('DESIGN.md', 'utf8')

describe('DESIGN.md', () => {
  it('names the roles and the file they come from', () => {
    for (const role of ['marker', 'boardSurface', 'ink', 'chalk', 'button', 'instrumentBackground']) {
      expect(doc).toContain(role)
    }
    expect(doc).toContain('board surface')
    expect(doc).toContain('neutral button')
    expect(doc).toContain('lib/sportTokens.ts')
  })

  it('says what paints a board screen and what paints an instrument screen', () => {
    const board = doc.slice(doc.indexOf('A board screen'), doc.indexOf('An instrument screen'))
    const instrument = doc.slice(doc.indexOf('An instrument screen'), doc.indexOf('## Button'))
    expect(board).toContain('boardSurface')
    expect(board).toContain('marker')
    expect(instrument).toContain('instrumentBackground')
    expect(instrument).toContain('button')
    expect(instrument).toContain('no court')
  })

  it('records the motion durations from the motion proof', () => {
    const motion = doc.slice(doc.indexOf('## Motion'), doc.indexOf('## Instrument screen'))
    expect(motion).toContain('lib/motion.ts')
    expect(motion).toContain('480')
    expect(motion).toContain('442')
    expect(motion).toContain('1364')
    expect(motion).toContain('180')
    expect(motion).toContain('0 ms')
    expect(motion).toContain('Bounce is 0')
  })

  it('shows the instrument button on the neutral token', () => {
    const correct = doc.slice(doc.indexOf('## Instrument screen'), doc.indexOf('## Slots'))
    expect(correct).toContain('background: theme.button.hex')
    expect(correct).toContain('background: theme.instrumentBackground.hex')
    expect(correct).not.toContain('theme.marker')
    expect(correct).not.toContain('#2563EB')
    expect(correct).not.toContain('GPP')
    expect(correct).not.toContain('<svg')
  })
})
