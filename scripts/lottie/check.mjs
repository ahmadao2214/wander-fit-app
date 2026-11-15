#!/usr/bin/env node
// Renders sport icon Lotties frame by frame with dotlottie-web (the player the
// app uses on web) and checks what was actually drawn, not what the JSON says:
//   - every pixel stays inside the tile circle the app clips icons to
//   - the last frame matches the first, so the loop has no jump
//   - the rest pose (frame 0) is centred left to right
// It also writes a contact sheet of key frames composited into the four tile
// backgrounds, for a person to look at.
//
//   node scripts/lottie/check.mjs            # every file in assets/lottie/sports
//   node scripts/lottie/check.mjs soccer     # just these slugs
//
// Native players (lottie-ios, lottie-android) can't run here; the simulator
// pass covers those. Structural checks run in Jest: lib/__tests__/sportAnimations.test.ts.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { SAFE_RADIUS, CANVAS } from './motion.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const require = createRequire(path.join(root, 'package.json'))
const { PNG } = require('pngjs')

const RENDER_SIZE = 400
const KEY_FRAMES = [0, 12, 16, 27, 38, 49, 64, 100]
const TILES = [
  { name: 'light selected', circle: '#BFDBFE', card: '#EFF6FF' },
  { name: 'light idle', circle: '#CBD5E1', card: '#FFFFFF' },
  { name: 'dark selected', circle: '#1E3A8A', card: '#0F172A' },
  { name: 'dark idle', circle: '#334155', card: '#1E293B' },
]
const ALPHA_VISIBLE = 16
const LOOP_TOLERANCE = 0.002 // share of pixels allowed to differ between first and last frame
const CENTRE_TOLERANCE = 0.02 // share of the canvas width

const assetsDir = path.join(root, 'assets/lottie/sports')
const outDir = path.join(root, 'e2e-artifacts/lottie')

// ── headless dotlottie-web ──────────────────────────────────────────────────
const wasmPath = require.resolve('@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm')
globalThis.ImageData ??= class ImageData {
  constructor(data, width, height) {
    if (typeof data === 'number') {
      height = width
      width = data
      data = new Uint8ClampedArray(width * height * 4)
    }
    Object.assign(this, { data, width, height })
  }
}
const realFetch = globalThis.fetch
globalThis.fetch = async (url, opts) =>
  String(url).startsWith('file://')
    ? new Response(readFileSync(fileURLToPath(String(url))), { headers: { 'Content-Type': 'application/wasm' } })
    : realFetch(url, opts)
globalThis.requestAnimationFrame ??= (cb) => setTimeout(() => cb(Date.now()), 16)
globalThis.cancelAnimationFrame ??= (id) => clearTimeout(id)

const { DotLottie } = await import(require.resolve('@lottiefiles/dotlottie-web'))
DotLottie.setWasmUrl('file://' + wasmPath)

async function renderAll(json) {
  let last = null
  const ctx = {
    createImageData: (w, h) => new ImageData(w, h),
    putImageData: (img) => {
      last = { data: Uint8ClampedArray.from(img.data), width: img.width, height: img.height }
    },
  }
  const canvas = { width: RENDER_SIZE, height: RENDER_SIZE, getContext: () => ctx, addEventListener() {}, removeEventListener() {}, style: {} }
  const player = new DotLottie({ canvas, data: json, autoplay: false, renderConfig: { devicePixelRatio: 1, autoResize: false } })
  await new Promise((resolve, reject) => {
    player.addEventListener('load', resolve)
    player.addEventListener('loadError', (e) => reject(e.error ?? new Error('load error')))
    setTimeout(() => reject(new Error('load timeout')), 10000)
  })
  const frames = []
  for (let f = 0; f < Math.round(player.totalFrames); f++) {
    player.setFrame(f)
    await new Promise((r) => setTimeout(r, 0))
    frames.push(last)
  }
  player.destroy()
  return frames
}

// ── checks ──────────────────────────────────────────────────────────────────
function measure(frame) {
  const { data, width } = frame
  const scale = CANVAS / width
  let maxRadius = 0
  let minX = Infinity
  let maxX = -Infinity
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < ALPHA_VISIBLE) continue
    const p = i / 4
    const x = ((p % width) + 0.5) * scale
    const y = (Math.floor(p / width) + 0.5) * scale
    maxRadius = Math.max(maxRadius, Math.hypot(x - CANVAS / 2, y - CANVAS / 2))
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
  }
  return { maxRadius, centreX: (minX + maxX) / 2 }
}

function differingShare(a, b) {
  let differ = 0
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) + Math.abs(a.data[i + 3] - b.data[i + 3])
    if (d > 24) differ++
  }
  return differ / (a.data.length / 4)
}

// ── contact sheet ───────────────────────────────────────────────────────────
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

function contactSheet(frames, cell = 160, pad = 12) {
  const picks = KEY_FRAMES.filter((f) => f < frames.length)
  const W = pad + picks.length * (cell + pad)
  const H = pad + TILES.length * (cell + pad)
  const sheet = new PNG({ width: W, height: H })
  sheet.data.fill(128)
  TILES.forEach((tile, r) => {
    const circle = hex(tile.circle)
    const card = hex(tile.card)
    picks.forEach((f, c) => {
      const img = frames[f]
      const ox = pad + c * (cell + pad)
      const oy = pad + r * (cell + pad)
      for (let y = 0; y < cell; y++) {
        for (let x = 0; x < cell; x++) {
          const dx = x + 0.5 - cell / 2
          const dy = y + 0.5 - cell / 2
          let px = card
          if (dx * dx + dy * dy <= (cell / 2) ** 2) {
            const si = (Math.floor((y / cell) * img.height) * img.width + Math.floor((x / cell) * img.width)) * 4
            const a = img.data[si + 3] / 255
            px = circle.map((v, k) => Math.round(img.data[si + k] * a + v * (1 - a)))
          }
          sheet.data.set([...px, 255], ((oy + y) * W + ox + x) * 4)
        }
      }
    })
  })
  return PNG.sync.write(sheet)
}

// ── run ─────────────────────────────────────────────────────────────────────
const wanted = process.argv.slice(2)
const slugs = wanted.length ? wanted : readdirSync(assetsDir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5))
mkdirSync(outDir, { recursive: true })

let failures = 0
for (const slug of slugs) {
  const frames = await renderAll(readFileSync(path.join(assetsDir, `${slug}.json`), 'utf8'))
  const problems = []
  let worst = { maxRadius: 0, frame: 0 }
  frames.forEach((frame, index) => {
    const { maxRadius } = measure(frame)
    if (maxRadius > worst.maxRadius) worst = { maxRadius, frame: index }
  })
  if (worst.maxRadius > SAFE_RADIUS) {
    problems.push(`frame ${worst.frame} draws ${worst.maxRadius.toFixed(0)} units from centre, past the ${SAFE_RADIUS} safe circle`)
  }
  const loopDiff = differingShare(frames[0], frames[frames.length - 1])
  if (loopDiff > LOOP_TOLERANCE) {
    problems.push(`last frame differs from frame 0 on ${(loopDiff * 100).toFixed(2)}% of pixels (loop jumps)`)
  }
  const rest = measure(frames[0])
  if (Math.abs(rest.centreX - CANVAS / 2) > CANVAS * CENTRE_TOLERANCE) {
    problems.push(`rest pose is off centre by ${(rest.centreX - CANVAS / 2).toFixed(0)} units`)
  }
  const sheetPath = path.join(outDir, `${slug}-sheet.png`)
  writeFileSync(sheetPath, contactSheet(frames))

  const summary = `${frames.length} frames, widest reach ${worst.maxRadius.toFixed(0)}/${SAFE_RADIUS} (frame ${worst.frame}), loop diff ${(loopDiff * 100).toFixed(2)}%`
  if (problems.length) {
    failures++
    console.error(`✗ ${slug}: ${summary}`)
    for (const p of problems) console.error(`    ${p}`)
  } else {
    console.log(`✓ ${slug}: ${summary}`)
  }
  console.log(`  contact sheet: ${path.relative(root, sheetPath)}`)
}
process.exit(failures ? 1 : 0)
