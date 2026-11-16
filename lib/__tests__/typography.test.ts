import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import config from '../../tamagui.config'
import { contrastRatio } from '../contrast'
import { MIN_FONT_SIZE, TYPE_SCALE } from '../typeScale'

// Type roles from design audit F08: one small scale, sentence case, no text
// under 12pt, and secondary text that still passes AA.
const themes = (config as unknown as { themes: Record<string, Record<string, { val: string }>> }).themes

describe('type scale', () => {
  const roles = Object.entries(TYPE_SCALE)

  it('steps down from display to caption', () => {
    const sizes = roles.map(([, r]) => r.size)
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a))
  })

  it('never goes below the 12pt floor', () => {
    expect(MIN_FONT_SIZE).toBe(12)
    expect(roles.filter(([, r]) => r.size < MIN_FONT_SIZE)).toEqual([])
  })

  it('gives every role a line height of 1.2× to 1.6× its size', () => {
    const off = roles.filter(([, r]) => r.lineHeight / r.size < 1.2 || r.lineHeight / r.size > 1.6)
    expect(off).toEqual([])
  })

  for (const mode of ['light', 'dark'] as const) {
    it(`${mode}: supporting ($color11) and caption ($color10) text pass AA on the background and cards`, () => {
      const t = themes[mode]
      for (const text of ['color10', 'color11']) {
        for (const bg of ['background', 'surface']) {
          expect({ text, bg, ok: contrastRatio(t[text].val, t[bg].val) >= 4.5 }).toEqual({ text, bg, ok: true })
        }
      }
    })
  }
})

describe('athlete screens use the type roles', () => {
  const ROOT = join(__dirname, '..', '..')
  // First Run owns its new screens
  const SKIP = /__tests__|\(first-run\)|components\/first-run/

  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)
      if (SKIP.test(path)) return []
      if (statSync(path).isDirectory()) return files(path)
      return path.endsWith('.tsx') ? [path] : []
    })
  }

  const sources = [...files(join(ROOT, 'app')), ...files(join(ROOT, 'components'))].map((file) => ({
    file: file.replace(ROOT, ''),
    source: readFileSync(file, 'utf8'),
  }))

  // Tamagui's body font tokens: $1 is 11pt
  const TINY = /fontSize(?:=\{?|:\s*)(\d+)\b|fontSize="\$1"/g

  it(`has no text under ${MIN_FONT_SIZE}pt`, () => {
    const offenders: string[] = []
    for (const { file, source } of sources) {
      for (const match of source.matchAll(TINY)) {
        if (match[1] === undefined || Number(match[1]) < MIN_FONT_SIZE) offenders.push(`${file}: ${match[0]}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('keeps strings in sentence case instead of forcing caps', () => {
    const offenders = sources
      .filter(({ source }) => /textTransform[=:]\s*["']uppercase|\.toUpperCase\(\)/.test(source))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })
})
