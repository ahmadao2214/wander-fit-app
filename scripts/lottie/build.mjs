#!/usr/bin/env node
// Builds the sport icon Lotties into assets/lottie/sports/<slug>.json.
//   node scripts/lottie/build.mjs           # every sport with a definition
//   node scripts/lottie/build.mjs soccer    # just these slugs
//
// The checks that gate these files live in lib/sportAnimationChecks.ts and
// run in Vitest (lib/__tests__/sportAnimations.test.ts).

import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import soccer from './sports/soccer.mjs'

const SPORTS = { soccer }

const SOFT_LIMIT = 15 * 1024
const HARD_LIMIT = 20 * 1024

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const outDir = path.join(root, 'assets/lottie/sports')

const wanted = process.argv.slice(2)
const unknown = wanted.filter((slug) => !SPORTS[slug])
if (unknown.length) {
  console.error(`No generator for: ${unknown.join(', ')}. Known: ${Object.keys(SPORTS).join(', ')}`)
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })
let failed = false
for (const slug of wanted.length ? wanted : Object.keys(SPORTS)) {
  const json = JSON.stringify(SPORTS[slug]())
  const bytes = Buffer.byteLength(json)
  writeFileSync(path.join(outDir, `${slug}.json`), json)
  const kb = (bytes / 1024).toFixed(1)
  if (bytes > HARD_LIMIT) {
    failed = true
    console.error(`✗ ${slug}.json ${kb} KB is over the 20 KB hard limit`)
  } else if (bytes > SOFT_LIMIT) {
    console.warn(`! ${slug}.json ${kb} KB is over the 15 KB target`)
  } else {
    console.log(`✓ ${slug}.json ${kb} KB`)
  }
}
process.exit(failed ? 1 : 0)
