import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import config from '../../tamagui.config'
import { contrastRatio } from '../contrast'

// The action color has two jobs: $primary fills buttons under white labels,
// and $primaryText colors blue text and icons on the screen and on cards.
const themes = (config as unknown as { themes: Record<string, Record<string, { val: string }>> }).themes

describe('action color', () => {
  for (const mode of ['light', 'dark'] as const) {
    const t = themes[mode]
    const v = (key: string) => t[key].val

    it(`${mode}: white labels pass AA on the fill and its pressed state`, () => {
      expect(contrastRatio('#FFFFFF', v('primary'))).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio('#FFFFFF', v('primaryPress'))).toBeGreaterThanOrEqual(4.5)
    })

    it(`${mode}: blue text passes AA on the background and on cards`, () => {
      expect(contrastRatio(v('primaryText'), v('background'))).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(v('primaryText'), v('surface'))).toBeGreaterThanOrEqual(4.5)
    })

    it(`${mode}: a $brand1 tinted card differs from the page and keeps its text readable`, () => {
      expect(v('brand1')).not.toBe(v('background'))
      for (const text of ['color10', 'color11', 'color12', 'primaryText']) {
        expect({ text, ok: contrastRatio(v(text), v('brand1')) >= 4.5 }).toEqual({ text, ok: true })
      }
    })

    it(`${mode}: the button fill stands out from the background (3:1)`, () => {
      expect(contrastRatio(v('primary'), v('background'))).toBeGreaterThanOrEqual(3)
    })

    it(`${mode}: tab labels pass AA on the tab bar`, () => {
      // app/(athlete)/_layout.tsx: white bar in light, navy in dark
      const bar = mode === 'light' ? '#FFFFFF' : '#0F172A'
      expect(contrastRatio(v('tabActive'), bar)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(v('tabInactive'), bar)).toBeGreaterThanOrEqual(4.5)
    })
  }
})

// Pressing a $primary button must switch to the tested $primaryPress fill.
// Fading it with opacity blends in the screen color: at 0.9 over a light
// background, white labels drop to 4.4:1.
describe('pressed action buttons', () => {
  const ROOT = join(__dirname, '..', '..')
  const SKIP = /__tests__/
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)
      if (SKIP.test(path)) return []
      if (statSync(path).isDirectory()) return files(path)
      return path.endsWith('.tsx') ? [path] : []
    })
  }

  // JSX opening tags, ending at the first `>` outside braces, so an
  // `onPress={() => …}` inside the tag doesn't cut it short
  function openingTags(source: string): string[] {
    const tags: string[] = []
    for (const match of source.matchAll(/<[A-Z][A-Za-z.]*\b/g)) {
      let depth = 0
      for (let i = match.index! + match[0].length; i < source.length; i++) {
        const c = source[i]
        if (c === '{') depth++
        else if (c === '}') depth--
        else if (c === '>' && depth === 0) {
          tags.push(source.slice(match.index!, i + 1))
          break
        }
      }
    }
    return tags
  }

  it('finds a fading $primary button even after an arrow-function prop', () => {
    const tag = '<Button onPress={() => go()} bg="$primary" pressStyle={{ opacity: 0.9 }}>'
    const [found] = openingTags(tag)
    expect(found).toBe(tag)
  })

  it('use $primaryPress, not opacity, on press', () => {
    const offenders: string[] = []
    for (const file of [...files(join(ROOT, 'app')), ...files(join(ROOT, 'components'))]) {
      const source = readFileSync(file, 'utf8')
      // Opening tags that fill with $primary and fade on press
      for (const tag of openingTags(source)) {
        if (tag.includes('bg="$primary"') && /pressStyle=\{\{[^}]*opacity/.test(tag)) {
          offenders.push(file.replace(ROOT, ''))
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
