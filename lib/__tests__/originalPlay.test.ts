import { SCHEMES, sportTheme } from '../sportTokens'
import { ORIGINAL_PLAY, renderOriginalPlay } from '../originalPlay'

// The route in play-final.html. These strings are the geometry contract.
const LONG = ['M58 394 Q26 316 66 232', 'M66 232 Q150 318 254 268', 'M254 268 Q302 214 214 172']
const SHORT = ['M90 356 Q66 290 106 234', 'M106 234 Q180 304 250 262', 'M250 262 Q290 212 214 172']

function pathData(svg: string): string[] {
  return [...svg.matchAll(/<path d="([^"]+)"/g)].map((match) => match[1])
}

describe('original play', () => {
  it('keeps the play-final route', () => {
    expect([...ORIGINAL_PLAY.basketball.long]).toEqual(LONG)
    expect([...ORIGINAL_PLAY.basketball.short]).toEqual(SHORT)
    expect(ORIGINAL_PLAY.viewBox).toBe('0 0 340 700')
  })

  it('draws that route in both schemes, and only the colours change', () => {
    const drawings = SCHEMES.map((scheme) => renderOriginalPlay(scheme))
    for (const svg of drawings) {
      expect(pathData(svg)).toEqual(LONG)
      expect(svg).toContain('viewBox="0 0 340 700"')
      expect(svg).not.toContain('<text')
    }
    expect(pathData(drawings[0])).toEqual(pathData(drawings[1]))

    const chalkboard = sportTheme('basketball', 'chalkboard')
    const whiteboard = sportTheme('basketball', 'whiteboard')
    expect(drawings[0]).toContain(chalkboard.boardSurface.hex)
    expect(drawings[0]).toContain(chalkboard.marker.hex)
    expect(drawings[1]).toContain(whiteboard.boardSurface.hex)
    expect(drawings[1]).toContain(whiteboard.marker.hex)
    expect(drawings[0]).not.toContain(whiteboard.marker.hex)
    expect(drawings[1]).not.toContain(chalkboard.marker.hex)
  })

  it('draws the 8-week legs from the same file', () => {
    for (const scheme of SCHEMES) {
      expect(pathData(renderOriginalPlay(scheme, 'short'))).toEqual(SHORT)
    }
  })
})
