import assert from 'node:assert/strict'
import { encodeQr, renderQrSvg } from './qr.mjs'

test('encodes short and long URLs into valid ISO/IEC 18004 matrices with finder & timing patterns', () => {
  const samples = [
    'https://wanderfit.app/?ref=gym-flyer',
    'https://testflight.apple.com/join/AbCdEfGh',
    'https://app.wanderfit.app/?ref=desktop-qr&utm_source=landing&utm_medium=beta-on-ramp',
    'https://wanderfit.app/' + 'a'.repeat(160), // Exercises V9/V10 + version info bits
  ]

  for (const url of samples) {
    const qr = encodeQr(url)
    assert.equal(qr.size, qr.version * 4 + 17)
    assert.equal(qr.modules.length, qr.size)

    // Top-left 7x7 finder outer border must all be dark
    for (let i = 0; i < 7; i++) {
      assert.equal(qr.modules[0][i], 1)
      assert.equal(qr.modules[6][i], 1)
      assert.equal(qr.modules[i][0], 1)
      assert.equal(qr.modules[i][6], 1)
    }
    // Dark module at (4*version + 9, 8)
    assert.equal(qr.modules[qr.size - 8][8], 1)
    // Horizontal & vertical timing patterns alternate starting dark at index 8
    for (let i = 8; i < qr.size - 8; i++) {
      assert.equal(qr.modules[6][i], i % 2 === 0 ? 1 : 0)
      assert.equal(qr.modules[i][6], i % 2 === 0 ? 1 : 0)
    }
  }
})

test('renderQrSvg returns an accessible crisp SVG with escaped attributes', () => {
  const svg = renderQrSvg('https://wanderfit.app/?ref=gym-flyer&x=1', {
    size: 200,
    label: 'Scan for WanderFit & beta',
  })
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'))
  assert.ok(svg.includes('role="img"'))
  assert.ok(svg.includes('aria-label="Scan for WanderFit &amp; beta"'))
  assert.ok(svg.includes('width="200" height="200"'))
  assert.ok(svg.includes('<path d="M'))
  assert.ok(svg.endsWith('</svg>'))
})

test('rejects empty and oversized payloads cleanly', () => {
  assert.throws(() => encodeQr(''), TypeError)
  assert.throws(() => encodeQr('x'.repeat(250)), RangeError)
})
