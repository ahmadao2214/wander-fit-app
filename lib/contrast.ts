/**
 * WCAG 2 contrast ratio between two colors given as #rrggbb or hsl(h, s%, l%).
 * AA needs 4.5:1 for normal text, 3:1 for large text (24px, or 18.66px bold)
 * and for meaningful icons and borders.
 */

type RGB = [number, number, number]

function parseColor(color: string): RGB {
  const value = color.trim()
  const hex = value.match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const n = hex[1]
    return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255) as RGB
  }
  const hsl = value.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/i)
  if (hsl) {
    const h = Number(hsl[1]) / 360
    const s = Number(hsl[2]) / 100
    const l = Number(hsl[3]) / 100
    if (s === 0) return [l, l, l]
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const channel = (t: number) => {
      const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t
      if (x < 1 / 6) return p + (q - p) * 6 * x
      if (x < 1 / 2) return q
      if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
      return p
    }
    return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)]
  }
  throw new Error(`Unsupported color: ${color}`)
}

function luminance([r, g, b]: RGB): number {
  const linear = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

export function contrastRatio(foreground: string, background: string): number {
  const [a, b] = [luminance(parseColor(foreground)), luminance(parseColor(background))].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}
