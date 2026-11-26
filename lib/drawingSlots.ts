import { SPORTS } from './sportTokens'

// Decision 11. Surface, marker, finish, and the athlete dot are on every sport.
// Ball sports finish by scoring. Track finishes on the line from play-final.html.
// A sport with no ball may finish on a line or a flag. The route stays in originalPlay.
export const SHARED_SLOTS = ['surface', 'marker', 'finish', 'athlete'] as const
export const NON_SCORING_FINISH = ['line', 'flag'] as const

type SharedSlot = (typeof SHARED_SLOTS)[number]
type NonScoringFinish = (typeof NON_SCORING_FINISH)[number]
type Fill = 'surface' | 'marker' | 'dot' | 'scoring' | 'ball' | 'none' | NonScoringFinish

export type SlotRow = {
  slot: SharedSlot | 'ball'
  basketball: Fill
  soccer: Fill
  track: Fill
}

export const SLOT_TABLE = [
  { slot: 'surface', basketball: 'surface', soccer: 'surface', track: 'surface' },
  { slot: 'marker', basketball: 'marker', soccer: 'marker', track: 'marker' },
  { slot: 'finish', basketball: 'scoring', soccer: 'scoring', track: 'line' },
  { slot: 'athlete', basketball: 'dot', soccer: 'dot', track: 'dot' },
  { slot: 'ball', basketball: 'ball', soccer: 'ball', track: 'none' },
] as const satisfies readonly SlotRow[]

export function unsharedSlots(): Array<(typeof SLOT_TABLE)[number]['slot']> {
  return SLOT_TABLE.filter((row) => SPORTS.some((sport) => row[sport] === 'none')).map((row) => row.slot)
}
