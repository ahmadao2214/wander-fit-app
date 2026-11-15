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
