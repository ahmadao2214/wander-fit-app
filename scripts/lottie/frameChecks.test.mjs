import { checkFrames } from './frameChecks.mjs'

const SIZE = 40

// A frame with an opaque square of side `side` centred at (cx, cy) pixels.
function frame({ cx = SIZE / 2, cy = SIZE / 2, side = 10 } = {}) {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (Math.abs(x + 0.5 - cx) <= side / 2 && Math.abs(y + 0.5 - cy) <= side / 2)
        data.set([255, 0, 0, 255], (y * SIZE + x) * 4)
    }
  }
  return { data, width: SIZE, height: SIZE }
}
const blank = () => ({ data: new Uint8ClampedArray(SIZE * SIZE * 4), width: SIZE, height: SIZE })

describe('checkFrames', () => {
  it('passes centred artwork that loops', () => {
    expect(checkFrames([frame(), frame({ cy: 16 }), frame()]).problems).toEqual([])
  })

  it('fails when every frame is blank', () => {
    expect(checkFrames([blank(), blank(), blank()]).problems).toEqual([
      expect.stringContaining('3 of 3 frames draw nothing'),
    ])
  })

  it('fails when one frame is blank', () => {
    expect(checkFrames([frame(), blank(), frame()]).problems).toEqual([
      expect.stringContaining('frame 1'),
    ])
  })

  it('fails artwork past the safe circle', () => {
    expect(checkFrames([frame({ side: 40 })]).problems).toEqual([
      expect.stringContaining('past the 470 safe circle'),
    ])
  })

  it('fails a loop whose last frame jumps', () => {
    expect(checkFrames([frame(), frame({ cy: 12 })]).problems).toEqual([
      expect.stringContaining('loop jumps'),
    ])
  })

  it('fails an off-centre rest pose', () => {
    expect(checkFrames([frame({ cx: 12 })]).problems).toEqual([
      expect.stringContaining('off centre'),
    ])
  })
})
