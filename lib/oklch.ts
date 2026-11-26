// Ottosson OKLCH with CSS Color 4 matrices. Lightness is 0–1.

export type Oklch = { l: number; c: number; h: number }

function cube(value: number): number {
  return value * value * value
}

function linearSrgb(l: number, c: number, h: number): [number, number, number] {
  const radians = (h * Math.PI) / 180
  const a = c * Math.cos(radians)
  const b = c * Math.sin(radians)
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.291485548 * b
  const l3 = cube(l_)
  const m3 = cube(m_)
  const s3 = cube(s_)
  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ]
}

function inGamut(rgb: [number, number, number]): boolean {
  return rgb.every((channel) => channel >= -1e-6 && channel <= 1 + 1e-6)
}

export function maxChroma(l: number, h: number): number {
  if (!inGamut(linearSrgb(l, 0, h))) return 0
  let lo = 0
  // sRGB OKLCH chroma stays under 0.4.
  let hi = 0.5
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(linearSrgb(l, mid, h))) lo = mid
    else hi = mid
  }
  return lo
}

function encode(channel: number): number {
  const clamped = Math.min(1, Math.max(0, channel))
  const encoded = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055
  return Math.round(Math.min(1, Math.max(0, encoded)) * 255)
}

export function oklchToHex(l: number, c: number, h: number): string {
  const digits = linearSrgb(l, c, h).map(encode)
  return '#' + digits.map((digit) => digit.toString(16).padStart(2, '0')).join('')
}

function linearFromSrgb(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

export function channels(hex: string): Oklch {
  const match = hex.trim().match(/^#([0-9a-f]{6})$/i)
  if (!match) throw new Error(`Unsupported color: ${hex}`)
  const digits = match[1]
  const [r, g, b] = [0, 2, 4].map((index) => linearFromSrgb(parseInt(digits.slice(index, index + 2), 16) / 255))
  const lmsL = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const lmsM = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const lmsS = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
  const l_ = Math.cbrt(lmsL)
  const m_ = Math.cbrt(lmsM)
  const s_ = Math.cbrt(lmsS)
  const l = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const bLab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  const c = Math.hypot(a, bLab)
  let h = (Math.atan2(bLab, a) * 180) / Math.PI
  if (h < 0) h += 360
  return { l, c, h }
}
