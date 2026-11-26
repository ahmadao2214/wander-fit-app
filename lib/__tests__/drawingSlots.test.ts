import { ORIGINAL_PLAY } from '../originalPlay'
import { SPORTS } from '../sportTokens'
import { NON_SCORING_FINISH, SHARED_SLOTS, SLOT_TABLE, unsharedSlots } from '../drawingSlots'

describe('drawing slots', () => {
  it('gives basketball, soccer, and track the same four slots', () => {
    expect(SPORTS).toEqual(['basketball', 'soccer', 'track'])
    expect(SLOT_TABLE.map((row) => row.slot).slice(0, 4)).toEqual([...SHARED_SLOTS])
    for (const sport of SPORTS) {
      for (const slot of SHARED_SLOTS) {
        const row = SLOT_TABLE.find((item) => item.slot === slot)
        expect(row?.[sport]).not.toBe('none')
      }
    }
    const athlete = SLOT_TABLE.find((row) => row.slot === 'athlete')
    expect(athlete).toEqual({ slot: 'athlete', basketball: 'dot', soccer: 'dot', track: 'dot' })
  })

  it('names the ball, the slot the three do not share', () => {
    expect(unsharedSlots()).toEqual(['ball'])
    expect(SLOT_TABLE.find((row) => row.slot === 'ball')).toEqual({
      slot: 'ball',
      basketball: 'ball',
      soccer: 'ball',
      track: 'none',
    })
  })

  it('gives a scoring finish to the ball sports and the line to track', () => {
    expect(NON_SCORING_FINISH).toEqual(['line', 'flag'])
    expect(SLOT_TABLE.find((row) => row.slot === 'finish')).toEqual({
      slot: 'finish',
      basketball: 'scoring',
      soccer: 'scoring',
      track: 'line',
    })
  })

  it('draws no new play', () => {
    expect(Object.keys(ORIGINAL_PLAY).sort()).toEqual(['basketball', 'viewBox'])
    expect(JSON.stringify(SLOT_TABLE)).not.toMatch(/[MQ]\d/)
  })
})
