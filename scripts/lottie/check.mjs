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
// pass covers those. Structural checks run in Jest: lib/__tests__/sportAnimations.test.ts;
// the pixel checks themselves live in frameChecks.mjs, tested in Jest too.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { SAFE_RADIUS } from './motion.mjs'
import { checkFrames } from './frameChecks.mjs'

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
    ? new Response(readFileSync(fileURLToPath(String(url))), {
        headers: { 'Content-Type': 'application/wasm' },
      })
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
  const canvas = {
    width: RENDER_SIZE,
    height: RENDER_SIZE,
    getContext: () => ctx,
    addEventListener() {},
    removeEventListener() {},
    style: {},
  }
  const player = new DotLottie({
    canvas,
    data: json,
    autoplay: false,
    renderConfig: { devicePixelRatio: 1, autoResize: false },
  })
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

// ── contact sheet ───────────────────────────────────────────────────────────
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

// Paints one rendered frame into a tile circle on a sheet.
function paintTile(sheet, W, img, tile, ox, oy, cell) {
  const circle = hex(tile.circle)
  const card = hex(tile.card)
  for (let y = 0; y < cell; y++) {
    for (let x = 0; x < cell; x++) {
      const dx = x + 0.5 - cell / 2
      const dy = y + 0.5 - cell / 2
      let px = card
      if (dx * dx + dy * dy <= (cell / 2) ** 2) {
        const si =
          (Math.floor((y / cell) * img.height) * img.width + Math.floor((x / cell) * img.width)) * 4
        const a = img.data[si + 3] / 255
        px = circle.map((v, k) => Math.round(img.data[si + k] * a + v * (1 - a)))
      }
      sheet.data.set([...px, 255], ((oy + y) * W + ox + x) * 4)
    }
  }
}

/** Every checked sport side by side: rest pose on each tile, then the top of the first hop. */
function gallery(entries, cell = 110, pad = 10) {
  const rows = [...TILES.map((tile) => ({ tile, pose: 'rest' })), { tile: TILES[0], pose: 'hop' }]
  const W = pad + entries.length * (cell + pad)
  const H = pad + rows.length * (cell + pad)
  const sheet = new PNG({ width: W, height: H })
  sheet.data.fill(128)
  entries.forEach((entry, c) => {
    rows.forEach(({ tile, pose }, r) => {
      paintTile(sheet, W, entry[pose], tile, pad + c * (cell + pad), pad + r * (cell + pad), cell)
    })
  })
  return PNG.sync.write(sheet)
}

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
            const si =
              (Math.floor((y / cell) * img.height) * img.width +
                Math.floor((x / cell) * img.width)) *
              4
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
const slugs = wanted.length
  ? wanted
  : readdirSync(assetsDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5))
mkdirSync(outDir, { recursive: true })

let failures = 0
const rendered = []
for (const slug of slugs) {
  const frames = await renderAll(readFileSync(path.join(assetsDir, `${slug}.json`), 'utf8'))
  const { problems, worst, loopDiff } = checkFrames(frames)
  // Frame 27 is the top of the first hop (motion.mjs BEATS).
  rendered.push({ slug, rest: frames[0], hop: frames[27] })
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
const galleryPath = path.join(outDir, 'gallery.png')
writeFileSync(galleryPath, gallery(rendered))
console.log(
  `gallery (${rendered.map((r) => r.slug).join(', ')}): ${path.relative(root, galleryPath)}`
)
process.exit(failures ? 1 : 0)
