/**
 * Zero-dependency ISO/IEC 18004 QR Code encoder (Byte mode, Error Correction Level M,
 * Versions 1–10, up to 213 UTF-8 bytes) and SVG renderer for `landing/`.
 *
 * Designed for crisp inline desktop QR codes in the Beta Access Panel and
 * printable gym-flyer QR assets with zero third-party packages.
 */

// ISO/IEC 18004 Table 9 for EC Level M, Versions 1..10:
// [totalDataCodewords, ecCodewordsPerBlock, g1Blocks, g1Data, g2Blocks, g2Data]
const VERSION_TABLE_M = [
  null, // 1-indexed
  [16, 10, 1, 16, 0, 0], // V1 (21x21)
  [28, 16, 1, 28, 0, 0], // V2 (25x25)
  [44, 26, 1, 44, 0, 0], // V3 (29x29)
  [64, 18, 2, 32, 0, 0], // V4 (33x33)
  [86, 24, 2, 43, 0, 0], // V5 (37x37)
  [108, 16, 4, 27, 0, 0], // V6 (41x41)
  [124, 18, 4, 31, 0, 0], // V7 (45x45)
  [154, 22, 2, 38, 2, 39], // V8 (49x49)
  [182, 22, 3, 36, 2, 37], // V9 (53x53)
  [216, 26, 4, 43, 1, 44], // V10 (57x57)
]

// Alignment pattern center coordinates (ISO/IEC 18004 Annex E), Versions 1..10
const ALIGNMENT_COORDS = [
  null,
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
]

// GF(256) exp/log tables with primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11d)
const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)
{
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]
  }
}

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

function rsGeneratorPoly(degree) {
  let poly = new Uint8Array([1])
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1)
    const factor = GF_EXP[i]
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], factor)
    }
    poly = next
  }
  return poly
}

function rsComputeEcc(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount)
  const rem = new Uint8Array(ecCount)
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ rem[0]
    rem.copyWithin(0, 1)
    rem[ecCount - 1] = 0
    if (factor !== 0) {
      for (let j = 0; j < ecCount; j++) {
        rem[j] ^= gfMul(gen[j + 1], factor)
      }
    }
  }
  return rem
}

function selectVersion(byteLength) {
  for (let v = 1; v < VERSION_TABLE_M.length; v++) {
    const [dataCodewords] = VERSION_TABLE_M[v]
    const countBits = v <= 9 ? 8 : 16
    const totalBits = 4 + countBits + byteLength * 8
    if (totalBits <= dataCodewords * 8) return v
  }
  throw new RangeError(`QR payload too long (${byteLength} bytes; max 213 bytes for V10-M).`)
}

function encodeDataCodewords(bytes, version) {
  const [totalData] = VERSION_TABLE_M[version]
  const bits = []
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1)
  }

  // Mode indicator: Byte = 0100
  pushBits(0b0100, 4)
  // Character count indicator: 8 bits for V1-V9, 16 bits for V10+
  pushBits(bytes.length, version <= 9 ? 8 : 16)
  for (const b of bytes) pushBits(b, 8)

  const capacityBits = totalData * 8
  // Terminator (up to 4 zero bits)
  const termLen = Math.min(4, capacityBits - bits.length)
  for (let i = 0; i < termLen; i++) bits.push(0)
  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0)

  const codewords = new Uint8Array(totalData)
  const usedBytes = bits.length / 8
  for (let i = 0; i < usedBytes; i++) {
    let byte = 0
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i * 8 + b]
    codewords[i] = byte
  }

  // Pad alternating 0xEC, 0x11
  const pad = [0xec, 0x11]
  for (let i = usedBytes; i < totalData; i++) {
    codewords[i] = pad[(i - usedBytes) % 2]
  }
  return codewords
}

function interleaveCodewords(dataCodewords, version) {
  const [, ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data] = VERSION_TABLE_M[version]
  const dataBlocks = []
  const ecBlocks = []
  let offset = 0

  for (let i = 0; i < g1Blocks; i++) {
    const slice = dataCodewords.subarray(offset, offset + g1Data)
    dataBlocks.push(slice)
    ecBlocks.push(rsComputeEcc(slice, ecPerBlock))
    offset += g1Data
  }
  for (let i = 0; i < g2Blocks; i++) {
    const slice = dataCodewords.subarray(offset, offset + g2Data)
    dataBlocks.push(slice)
    ecBlocks.push(rsComputeEcc(slice, ecPerBlock))
    offset += g2Data
  }

  const maxDataLen = Math.max(g1Data, g2Data)
  const out = []
  for (let col = 0; col < maxDataLen; col++) {
    for (const block of dataBlocks) {
      if (col < block.length) out.push(block[col])
    }
  }
  for (let col = 0; col < ecPerBlock; col++) {
    for (const ec of ecBlocks) out.push(ec[col])
  }
  return Uint8Array.from(out)
}

function bchFormatBits(mask) {
  // EC Level M = 00
  const data = (0b00 << 3) | (mask & 0b111)
  let rem = data << 10
  for (let i = 14; i >= 10; i--) {
    if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10)
  }
  return ((data << 10) | rem) ^ 0x5412
}

function bchVersionBits(version) {
  let rem = version << 12
  for (let i = 17; i >= 12; i--) {
    if ((rem >>> i) & 1) rem ^= 0x1f25 << (i - 12)
  }
  return (version << 12) | rem
}

function buildBaseMatrix(version) {
  const size = version * 4 + 17
  const modules = Array.from({ length: size }, () => new Uint8Array(size))
  const isFunction = Array.from({ length: size }, () => new Uint8Array(size))

  const setFn = (r, c, dark) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return
    modules[r][c] = dark ? 1 : 0
    isFunction[r][c] = 1
  }

  // Finder patterns + 1-module white separators
  const drawFinder = (top, left) => {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const dist = Math.max(Math.abs(dy - 3), Math.abs(dx - 3))
        const dark = dist !== 2 && dist !== 4
        setFn(top + dy, left + dx, dark)
      }
    }
  }
  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFn(6, i, i % 2 === 0)
    setFn(i, 6, i % 2 === 0)
  }

  // Alignment patterns (V2+)
  const centers = ALIGNMENT_COORDS[version]
  for (let i = 0; i < centers.length; i++) {
    for (let j = 0; j < centers.length; j++) {
      const cy = centers[i]
      const cx = centers[j]
      // Skip corners overlapping the three finder patterns
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === centers.length - 1) ||
        (i === centers.length - 1 && j === 0)
      ) {
        continue
      }
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const dist = Math.max(Math.abs(dy), Math.abs(dx))
          setFn(cy + dy, cx + dx, dist !== 1)
        }
      }
    }
  }

  // Reserve format info areas + dark module
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      setFn(8, i, false)
      setFn(i, 8, false)
    }
  }
  for (let i = size - 8; i < size; i++) {
    setFn(8, i, false)
    setFn(i, 8, false)
  }
  setFn(size - 8, 8, true) // Dark module (4*v + 9, 8)

  // Version info areas (V7+)
  if (version >= 7) {
    const vBits = bchVersionBits(version)
    for (let i = 0; i < 18; i++) {
      const dark = ((vBits >>> i) & 1) === 1
      const a = Math.floor(i / 3)
      const b = size - 11 + (i % 3)
      setFn(a, b, dark)
      setFn(b, a, dark)
    }
  }

  return { size, modules, isFunction }
}

function placeCodewords(size, modules, isFunction, codewords) {
  let bitIdx = 0
  const totalBits = codewords.length * 8
  let upward = true

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5 // Skip vertical timing column
    for (let step = 0; step < size; step++) {
      const y = upward ? size - 1 - step : step
      for (let dx = 0; dx < 2; dx++) {
        const x = right - dx
        if (isFunction[y][x]) continue
        let dark = 0
        if (bitIdx < totalBits) {
          dark = (codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1
          bitIdx++
        }
        modules[y][x] = dark
      }
    }
    upward = !upward
  }
}

function maskCondition(mask, r, c) {
  switch (mask) {
    case 0:
      return (r + c) % 2 === 0
    case 1:
      return r % 2 === 0
    case 2:
      return c % 3 === 0
    case 3:
      return (r + c) % 3 === 0
    case 4:
      return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0
    case 5:
      return ((r * c) % 2) + ((r * c) % 3) === 0
    case 6:
      return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0
    case 7:
      return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
    default:
      return false
  }
}

function drawFormatBits(size, modules, mask) {
  const bits = bchFormatBits(mask)

  // Copy 1: around top-left finder
  for (let i = 0; i <= 5; i++) modules[8][i] = (bits >>> (14 - i)) & 1
  modules[8][7] = (bits >>> 8) & 1
  modules[8][8] = (bits >>> 7) & 1
  modules[7][8] = (bits >>> 6) & 1
  for (let i = 9; i < 15; i++) modules[14 - i][8] = (bits >>> (14 - i)) & 1

  // Copy 2: bottom-left & top-right
  for (let i = 0; i < 8; i++) modules[8][size - 1 - i] = (bits >>> i) & 1
  for (let i = 8; i < 15; i++) modules[size - 15 + i][8] = (bits >>> i) & 1
  modules[size - 8][8] = 1 // Dark module
}

function penaltyScore(size, modules) {
  let score = 0

  // Rule 1: runs of 5+ same-colored modules in rows & columns
  const scoreLine = (get) => {
    let runColor = get(0)
    let runLen = 1
    for (let i = 1; i < size; i++) {
      const c = get(i)
      if (c === runColor) {
        runLen++
      } else {
        if (runLen >= 5) score += 3 + (runLen - 5)
        runColor = c
        runLen = 1
      }
    }
    if (runLen >= 5) score += 3 + (runLen - 5)
  }
  for (let r = 0; r < size; r++) scoreLine((c) => modules[r][c])
  for (let c = 0; c < size; c++) scoreLine((r) => modules[r][c])

  // Rule 2: 2x2 same-colored blocks
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = modules[r][c]
      if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) {
        score += 3
      }
    }
  }

  // Rule 3: finder-like 1:1:3:1:1 patterns with 4 light modules on either side
  const isPattern = (get, i) => {
    const p1 =
      get(i) === 1 &&
      get(i + 1) === 0 &&
      get(i + 2) === 1 &&
      get(i + 3) === 1 &&
      get(i + 4) === 1 &&
      get(i + 5) === 0 &&
      get(i + 6) === 1 &&
      get(i + 7) === 0 &&
      get(i + 8) === 0 &&
      get(i + 9) === 0 &&
      get(i + 10) === 0
    const p2 =
      get(i) === 0 &&
      get(i + 1) === 0 &&
      get(i + 2) === 0 &&
      get(i + 3) === 0 &&
      get(i + 4) === 1 &&
      get(i + 5) === 0 &&
      get(i + 6) === 1 &&
      get(i + 7) === 1 &&
      get(i + 8) === 1 &&
      get(i + 9) === 0 &&
      get(i + 10) === 1
    return p1 || p2
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      if (isPattern((k) => modules[r][k], c)) score += 40
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 11; r++) {
      if (isPattern((k) => modules[k][c], r)) score += 40
    }
  }

  // Rule 4: balance of dark vs light modules
  let darkCount = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) darkCount += modules[r][c]
  }
  const percent = (darkCount * 100) / (size * size)
  const deviation = Math.floor(Math.abs(percent - 50) / 5)
  score += deviation * 10

  return score
}

/**
 * Encode a UTF-8 string (e.g. an HTTPS URL) into an ISO/IEC 18004 QR matrix (EC Level M).
 */
export function encodeQr(text) {
  if (typeof text !== 'string' || text.length === 0) {
    throw new TypeError('QR text must be a non-empty string.')
  }
  const bytes = new TextEncoder().encode(text)
  const version = selectVersion(bytes.length)
  const dataCodewords = encodeDataCodewords(bytes, version)
  const fullCodewords = interleaveCodewords(dataCodewords, version)

  const { size, modules: base, isFunction } = buildBaseMatrix(version)
  placeCodewords(size, base, isFunction, fullCodewords)

  let bestMask = 0
  let bestScore = Infinity
  let bestModules = null

  for (let mask = 0; mask < 8; mask++) {
    const candidate = base.map((row, r) => {
      const copy = new Uint8Array(row)
      for (let c = 0; c < size; c++) {
        if (!isFunction[r][c] && maskCondition(mask, r, c)) {
          copy[c] ^= 1
        }
      }
      return copy
    })
    drawFormatBits(size, candidate, mask)
    const score = penaltyScore(size, candidate)
    if (score < bestScore) {
      bestScore = score
      bestMask = mask
      bestModules = candidate
    }
  }

  return { version, size, mask: bestMask, modules: bestModules }
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Render an accessible, crisp single-`<path>` SVG QR code for any URL.
 */
export function renderQrSvg(
  text,
  {
    margin = 4,
    size: pixelSize = 160,
    fg = '#0b1220',
    bg = '#ffffff',
    label = `QR code for ${text}`,
    className = 'qr-svg',
  } = {}
) {
  const { size, modules } = encodeQr(text)
  const viewSize = size + margin * 2
  const parts = []

  for (let r = 0; r < size; r++) {
    let c = 0
    while (c < size) {
      if (!modules[r][c]) {
        c++
        continue
      }
      const start = c
      while (c < size && modules[r][c]) c++
      parts.push(`M${start + margin},${r + margin}h${c - start}v1h-${c - start}z`)
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" width="${pixelSize}" height="${pixelSize}" class="${escapeAttr(className)}" role="img" aria-label="${escapeAttr(label)}" shape-rendering="crispEdges">`,
    `<rect width="100%" height="100%" fill="${escapeAttr(bg)}"/>`,
    `<path d="${parts.join('')}" fill="${escapeAttr(fg)}"/>`,
    `</svg>`,
  ].join('')
}
