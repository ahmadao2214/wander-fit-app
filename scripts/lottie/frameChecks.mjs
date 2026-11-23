// Pixel checks on rendered frames. Pure, so Jest can test them without the
// WASM player; check.mjs renders the frames and calls checkFrames.

import { CANVAS, SAFE_RADIUS } from './motion.mjs'

export const ALPHA_VISIBLE = 16
export const LOOP_TOLERANCE = 0.002 // share of pixels allowed to differ between first and last frame
export const CENTRE_TOLERANCE = 0.02 // share of the canvas width

// frame: { data: RGBA bytes, width, height }. Coordinates are in canvas units.
export function measure(frame) {
  const { data, width } = frame
  const scale = CANVAS / width
  let visible = 0
  let maxRadius = 0
  let minX = Infinity
  let maxX = -Infinity
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < ALPHA_VISIBLE) continue
    visible++
    const p = i / 4
    const x = ((p % width) + 0.5) * scale
    const y = (Math.floor(p / width) + 0.5) * scale
    maxRadius = Math.max(maxRadius, Math.hypot(x - CANVAS / 2, y - CANVAS / 2))
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
  }
  return { visible, maxRadius, centreX: visible ? (minX + maxX) / 2 : NaN }
}

export function differingShare(a, b) {
  let differ = 0
  for (let i = 0; i < a.data.length; i += 4) {
    const d =
      Math.abs(a.data[i] - b.data[i]) +
      Math.abs(a.data[i + 1] - b.data[i + 1]) +
      Math.abs(a.data[i + 2] - b.data[i + 2]) +
      Math.abs(a.data[i + 3] - b.data[i + 3])
    if (d > 24) differ++
  }
  return differ / (a.data.length / 4)
}

// Returns { problems, worst, loopDiff }. An empty problems list is a pass.
export function checkFrames(frames) {
  const problems = []
  if (!frames.length)
    return { problems: ['no frames rendered'], worst: { maxRadius: 0, frame: 0 }, loopDiff: 0 }
  const blank = []
  let worst = { maxRadius: 0, frame: 0 }
  frames.forEach((frame, index) => {
    const { visible, maxRadius } = measure(frame)
    if (!visible) blank.push(index)
    if (maxRadius > worst.maxRadius) worst = { maxRadius, frame: index }
  })
  if (blank.length) {
    problems.push(
      `${blank.length} of ${frames.length} frames draw nothing (first: frame ${blank[0]})`
    )
  }
  if (worst.maxRadius > SAFE_RADIUS) {
    problems.push(
      `frame ${worst.frame} draws ${worst.maxRadius.toFixed(0)} units from centre, past the ${SAFE_RADIUS} safe circle`
    )
  }
  const loopDiff = differingShare(frames[0], frames[frames.length - 1])
  if (loopDiff > LOOP_TOLERANCE) {
    problems.push(
      `last frame differs from frame 0 on ${(loopDiff * 100).toFixed(2)}% of pixels (loop jumps)`
    )
  }
  const rest = measure(frames[0])
  if (rest.visible && Math.abs(rest.centreX - CANVAS / 2) > CANVAS * CENTRE_TOLERANCE) {
    problems.push(`rest pose is off centre by ${(rest.centreX - CANVAS / 2).toFixed(0)} units`)
  }
  return { problems, worst, loopDiff }
}
