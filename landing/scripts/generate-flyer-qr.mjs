#!/usr/bin/env node
/**
 * Generate the printable gym-flyer QR code asset (`landing/assets/flyer-qr.svg`).
 *
 * Usage:
 *   node landing/scripts/generate-flyer-qr.mjs [base-url] [ref]
 *
 * Example:
 *   node landing/scripts/generate-flyer-qr.mjs https://wanderfit.app gym-flyer
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderQrSvg } from '../qr.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const landingDir = resolve(here, '..')
const outFile = resolve(landingDir, 'assets', 'flyer-qr.svg')

const baseUrl = (process.argv[2] || 'https://wanderfit.app').replace(/\/+$/, '')
const ref = process.argv[3] || 'gym-flyer'
const targetUrl = `${baseUrl}/?ref=${encodeURIComponent(ref)}`

const svg = renderQrSvg(targetUrl, {
  size: 512,
  margin: 4,
  fg: '#0b1220',
  bg: '#ffffff',
  label: `WanderFit gym flyer QR code (${targetUrl})`,
  className: 'flyer-qr',
})

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, `${svg}\n`, 'utf8')
console.log(`Wrote ${outFile} -> ${targetUrl}`)
