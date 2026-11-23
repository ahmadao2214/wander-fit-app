import config from '../../tamagui.config'
import { contrastRatio } from '../../lib/contrast'

// Resolve a light-theme token ("$color10") to its color string
const light = (config as any).themes.light as Record<string, { val: string } | string>
function token(name: string): string {
  const entry = light[name.replace(/^\$/, '')]
  if (entry === undefined) throw new Error(`No light-theme token ${name}`)
  return typeof entry === 'string' ? entry : entry.val
}
const ratio = (fg: string, bg: string) =>
  contrastRatio(fg.startsWith('$') ? token(fg) : fg, token(bg))

const NORMAL = 4.5
const LARGE_OR_ICON = 3

describe('contrastRatio', () => {
  it('matches known WCAG values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0)
    expect(contrastRatio('#FFFFFF', '#2563EB')).toBeCloseTo(5.17, 1)
    expect(contrastRatio('#FFFFFF', '#F59E0B')).toBeCloseTo(2.15, 1)
  })
})

// The pairs the retained athlete and auth screens rely on. Phase fills
// ($blue9/$orange9/$green9) are unchanged; text on them is large or navy.
// Phase names shown as text keep their phase color until the palette pass,
// so they aren't checked here.
describe('Light theme text pairs meet WCAG AA', () => {
  const normalText: [string, string, string][] = [
    ['$color10', '$background', 'secondary text and tracked labels'],
    ['$color10', '$surface', 'secondary text on cards'],
    ['$color11', '$brand1', 'Today card label and meta on its tint'],
    ['$green11', '$surface', '"Done" and completed status text'],
    ['$orange11', '$brand1', 'skill level on the Profile header'],
    ['$red11', '$red2', 'auth error message'],
    ['$red11', '$surface', 'auth field error'],
    ['$intensityLow9', '$intensityLow2', 'Training Science intensity headings'],
    ['$intensityMed9', '$intensityMed2', 'Training Science intensity headings'],
    ['$intensityHigh9', '$intensityHigh2', 'Training Science intensity headings'],
    ['$color12', '$blue9', 'numbers on GPP-colored badges'],
    ['$color12', '$orange9', 'numbers on SPP-colored badges'],
    ['$color12', '$green9', 'numbers on SSP-colored badges'],
    ['#FFFFFF', '$primary', 'white labels on primary buttons'],
    ['#FFFFFF', '$red11', 'Exit workout button'],
    ['#FFFFFF', '$green11', "warmup Let's Go button"],
  ]

  for (const [fg, bg, where] of normalText) {
    it(`${fg} on ${bg} (${where})`, () => {
      expect(Number(ratio(fg, bg).toFixed(2))).toBeGreaterThanOrEqual(NORMAL)
    })
  }

  const largeTextOrIcons: [string, string, string][] = [
    ['#FFFFFF', '$blue9', '19px bold labels on GPP-filled buttons'],
    ['#FFFFFF', '$orange9', '19px bold labels on SPP-filled buttons'],
    ['#FFFFFF', '$green9', '19px bold labels on SSP-filled buttons'],
    ['#FFFFFF', '$green10', 'check icons on completed badges'],
    ['$green10', '$surface', 'completed icons'],
    ['$color10', '$surface', 'chevrons and calendar status icons'],
  ]

  for (const [fg, bg, where] of largeTextOrIcons) {
    it(`${fg} on ${bg} (${where})`, () => {
      expect(Number(ratio(fg, bg).toFixed(2))).toBeGreaterThanOrEqual(LARGE_OR_ICON)
    })
  }
})
