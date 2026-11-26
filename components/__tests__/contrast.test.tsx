import config from '../../tamagui.config'
import { contrastRatio } from '../../lib/contrast'

// Resolve a light-theme token ("$color10") to its color string
const light = (config as any).themes.light as Record<string, { val: string } | string>
function token(name: string): string {
  const entry = light[name.replace(/^\$/, '')]
  if (entry === undefined) throw new Error(`No light-theme token ${name}`)
  return typeof entry === 'string' ? entry : entry.val
}
const ratio = (fg: string, bg: string) => contrastRatio(fg.startsWith('$') ? token(fg) : fg, token(bg))

const NORMAL = 4.5
const LARGE_OR_ICON = 3

describe('contrastRatio', () => {
  it('matches known WCAG values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0)
    expect(contrastRatio('#FFFFFF', '#0F172A')).toBeCloseTo(17.85, 1)
    expect(contrastRatio('#FFFFFF', '#F59E0B')).toBeCloseTo(2.15, 1)
  })
})

// The pairs the retained athlete and auth screens rely on. Phases have no
// colour (issue #210), so no phase-fill pairs. The primary is the neutral
// button face: labels on it are $background, and Done is the words colour.
describe('Light theme text pairs meet WCAG AA', () => {
  const normalText: [string, string, string][] = [
    ['$color10', '$background', 'secondary text and tracked labels'],
    ['$color10', '$surface', 'secondary text on cards'],
    ['$color11', '$brand1', "Today card label and meta on its tint"],
    ['$color', '$surface', '"Done" and completed status text'],
    ['$color', '$background', '"Done" on the Today card and warmup rows'],
    ['$orange11', '$brand1', 'skill level on the Profile header'],
    ['$red11', '$red2', 'auth error message'],
    ['$red11', '$surface', 'auth field error'],
    ['$intensityLow9', '$intensityLow2', 'Training Science intensity headings'],
    ['$intensityMed9', '$intensityMed2', 'Training Science intensity headings'],
    ['$intensityHigh9', '$intensityHigh2', 'Training Science intensity headings'],
    ['$background', '$primary', 'labels on primary buttons'],
    ['$background', '$primaryPress', 'labels on pressed primary buttons'],
    ['$primaryText', '$background', 'action text and spinners'],
    ['$primaryText', '$surface', 'action text on cards'],
    ['#FFFFFF', '$red11', 'Exit workout button'],
  ]

  for (const [fg, bg, where] of normalText) {
    it(`${fg} on ${bg} (${where})`, () => {
      expect(Number(ratio(fg, bg).toFixed(2))).toBeGreaterThanOrEqual(NORMAL)
    })
  }

  const largeTextOrIcons: [string, string, string][] = [
    ['$background', '$color', 'check icons on completed badges'],
    ['$color', '$surface', 'completed icons'],
    ['$color', '$color3', 'completed icons on their quiet badge'],
    ['$primary', '$background', 'the button fill against the page'],
    ['$color10', '$surface', 'chevrons and calendar status icons'],
  ]

  for (const [fg, bg, where] of largeTextOrIcons) {
    it(`${fg} on ${bg} (${where})`, () => {
      expect(Number(ratio(fg, bg).toFixed(2))).toBeGreaterThanOrEqual(LARGE_OR_ICON)
    })
  }
})
