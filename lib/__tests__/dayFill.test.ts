import { BALL, BOUNCE_CONTACTS, BOUNCE_MS, dayChoreography, surfaceY, valueAt } from '../dayFill'

const H = 132

describe('dayChoreography', () => {
  it('the plain gauge fill takes 200 ms with no ball', () => {
    const c = dayChoreography(null, true, H)
    expect(c.duration).toBe(200)
    expect(valueAt(c.fill, 0)).toBe(0)
    expect(valueAt(c.fill, 200)).toBe(1)
    expect(valueAt(c.ballOpacity, 100)).toBe(0)
  })

  it('basketball dribbles exactly three times, each contact landing on the surface and raising it a third', () => {
    const c = dayChoreography('bounce', true, H)
    expect(c.duration).toBe(BOUNCE_MS)
    // A contact is a key where the ball reaches its lowest point between rises.
    const ys = c.ballY.map((k) => k.v)
    const lows = c.ballY.filter((k, i) => i > 0 && i < ys.length - 1 && k.v > ys[i - 1] && k.v > ys[i + 1]).map((k) => k.at)
    expect(lows).toEqual(BOUNCE_CONTACTS)
    // At each contact, the ball's bottom sits exactly on the fill's surface.
    const gaps = BOUNCE_CONTACTS.map((at) => Math.abs(valueAt(c.ballY, at) + BALL - surfaceY(H, valueAt(c.fill, at))))
    expect(gaps.every((g) => g < 0.001)).toBe(true)
    // Each contact raises the fill by a third, ending full.
    const after = BOUNCE_CONTACTS.map((at) => Math.round(valueAt(c.fill, at + 80) * 3))
    expect(after).toEqual([1, 2, 3])
    expect(valueAt(c.fill, BOUNCE_MS)).toBe(1)
    expect(valueAt(c.ballOpacity, BOUNCE_MS)).toBe(0)
  })

  it('the roll keeps the ball riding the surface the whole way up, then rolls it out', () => {
    const c = dayChoreography('roll', true, H)
    const off = [0, 200, 475, 700, 950].map((at) => valueAt(c.ballY, at) + BALL * 0.6 - surfaceY(H, valueAt(c.fill, at)))
    expect(off.every((d) => Math.abs(d) < 0.001)).toBe(true)
    expect(valueAt(c.fill, 950)).toBe(1)
    expect(valueAt(c.ballOpacity, c.duration)).toBe(0)
    expect(valueAt(c.ballRotate, 950)).toBeLessThan(0)
  })

  it('water fills like a lane with a ripple that settles', () => {
    const c = dayChoreography('water', true, H)
    expect(valueAt(c.fill, 900)).toBe(1)
    expect(valueAt(c.waveOpacity, 500)).toBe(1)
    expect(valueAt(c.waveOpacity, c.duration)).toBe(0)
  })

  it('every family empties when turned off', () => {
    const ends = (['roll', 'bounce', 'water', null] as const).map((f) => {
      const c = dayChoreography(f, false, H)
      return [f, valueAt(c.fill, 0), valueAt(c.fill, c.duration)]
    })
    expect(ends).toEqual([
      ['roll', 1, 0],
      ['bounce', 1, 0],
      ['water', 1, 0],
      [null, 1, 0],
    ])
  })
})
