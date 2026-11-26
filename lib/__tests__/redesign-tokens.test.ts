import { contrastRatio } from '../contrast'
import {
  DIRECTIONS,
  MIN_CONTRAST,
  MIN_TAP_PX,
  MIN_TEXT_PX,
  SCHEMES,
  type Tokens,
} from '../../stories/redesign/contract'
import { tokens as a } from '../../stories/redesign/a/tokens'
import { tokens as b } from '../../stories/redesign/b/tokens'
import { tokens as reference } from '../../stories/redesign/b-reference/tokens'
import { tokens as c } from '../../stories/redesign/c/tokens'
import { tokens as play } from '../../stories/redesign/play/tokens'

// The redesign prototypes' token tables (stories/redesign/<set>/tokens.ts).
// Run 2: a, b and c are three layout sets that all re-export B's tokens from
// b-reference/. Each lists the text/background pairs it promises to use
// together; every one of them must pass WCAG AA in both schemes.
const ALL: Record<(typeof DIRECTIONS)[number], Tokens> = { a, b, c }

describe('run-2 sets', () => {
  it("use B's tokens unchanged, with only their own name", () => {
    const strip = ({ name, ...rest }: Tokens) => rest
    expect(DIRECTIONS.map((d) => strip(ALL[d]))).toEqual(DIRECTIONS.map(() => strip(reference)))
    expect(DIRECTIONS.map((d) => ALL[d].name)).toEqual(['Set 1 · recommended', 'Set 2', 'Set 3'])
  })

  it("include the play, also on B's tokens with only its own name (its board colours are in play/colors.ts)", () => {
    const strip = ({ name, ...rest }: Tokens) => rest
    expect([strip(play), play.name]).toEqual([strip(reference), 'Play'])
  })
})
const SIX_DIGIT_HEX = /^#[0-9a-f]{6}$/i

describe.each(DIRECTIONS.flatMap((d) => SCHEMES.map((s) => [d, s] as const)))(
  'direction %s, %s',
  (direction, scheme) => {
    const palette = ALL[direction][scheme]

    it('writes every text and background role as six-digit hex', () => {
      const roles = { ...palette.text, ...palette.background }
      const notHex = Object.entries(roles)
        .filter(([, color]) => !SIX_DIGIT_HEX.test(color))
        .map(([role, color]) => `${role}: ${color}`)
      expect(notHex).toEqual([])
    })

    it('promises at least one contrast pair, each naming real roles', () => {
      expect(palette.contrastPairs.length).toBeGreaterThan(0)
      const unknown = palette.contrastPairs
        .filter(([fg, bg]) => !(fg in palette.text) || !(bg in palette.background))
        .map(([fg, bg]) => `${fg} on ${bg}`)
      expect(unknown).toEqual([])
    })

    it('passes WCAG AA (4.5:1) for every promised pair', () => {
      const failing = palette.contrastPairs
        .map(([fg, bg]) => ({
          pair: `${fg} ${palette.text[fg]} on ${bg} ${palette.background[bg]}`,
          ratio: Math.round(contrastRatio(palette.text[fg], palette.background[bg]) * 100) / 100,
        }))
        .filter(({ ratio }) => ratio < MIN_CONTRAST)
      expect(failing).toEqual([])
    })
  }
)

describe.each(DIRECTIONS)('direction %s scale', (direction) => {
  const t = ALL[direction]

  it(`keeps every type size at ${MIN_TEXT_PX}pt or more`, () => {
    const small = Object.entries(t.type).filter(([, size]) => size < MIN_TEXT_PX)
    expect(small).toEqual([])
  })

  it(`keeps tap targets at ${MIN_TAP_PX}pt or more`, () => {
    expect({ tapTarget: t.tapTarget, ok: t.tapTarget >= MIN_TAP_PX }).toEqual({
      tapTarget: t.tapTarget,
      ok: true,
    })
  })

  it('lists its spacing scale smallest first', () => {
    expect([...t.space]).toEqual([...t.space].sort((x, y) => x - y))
  })
})
