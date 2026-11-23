import assert from 'node:assert/strict'
import {
  buildPlan,
  calculateWeeksPerPhase,
  calculateWeeksPerPhaseArray,
  dateKey,
  dayPhases,
  daysUntil,
  isLiftDay,
  MAX_SEASON_WEEKS,
  MAX_WEEKS_PER_PHASE,
  MIN_WEEKS_PER_PHASE,
  NO_SEASON_PROGRAM_WEEKS,
  weeksUntilSeason,
} from './plan.mjs'

test('date math uses calendar days across daylight-saving boundaries', () => {
  assert.equal(daysUntil('2026-11-02', new Date(2026, 9, 31)), 2)
  assert.equal(daysUntil('2027-03-15', new Date(2027, 2, 13)), 2)
  assert.equal(dateKey(new Date(2026, 10, 21)), '2026-11-21')
})

test('invalid and past dates cannot create a plan', () => {
  for (const value of ['', '2026-02-30', 'not-a-date', null]) {
    assert.equal(daysUntil(value), null)
  }
  assert.equal(buildPlan(-1), null)
  assert.equal(buildPlan(0), null)
  assert.equal(buildPlan(NaN), null)
})

test('no-date default mirrors NO_SEASON_PROGRAM_WEEKS (12 weeks, 4w per phase, 36 sessions)', () => {
  const plan = buildPlan(null)
  assert.equal(plan.isDefault, true)
  assert.equal(plan.weeksUntil, NO_SEASON_PROGRAM_WEEKS)
  assert.equal(plan.weeksPerPhase, 4)
  assert.equal(plan.programWeeks, 12)
  assert.equal(plan.sessions, 36)
  assert.deepEqual(
    plan.phases.map((p) => [p.code, p.weeks]),
    [
      ['GPP', 4],
      ['SPP', 4],
      ['SSP', 4],
    ]
  )
})

test('calculateWeeksPerPhase matches convex/weekMapping.ts across 1..52 weeks', () => {
  assert.equal(calculateWeeksPerPhase(5), 2)
  assert.equal(calculateWeeksPerPhase(6), 2)
  assert.equal(calculateWeeksPerPhase(9), 3)
  assert.equal(calculateWeeksPerPhase(12), 4)
  assert.equal(calculateWeeksPerPhase(18), 6)
  assert.equal(calculateWeeksPerPhase(24), 8)
  assert.equal(calculateWeeksPerPhase(52), 8)

  for (let w = 1; w <= MAX_SEASON_WEEKS; w++) {
    const perPhase = calculateWeeksPerPhase(w)
    assert.ok(perPhase >= MIN_WEEKS_PER_PHASE && perPhase <= MAX_WEEKS_PER_PHASE)
    const plan = buildPlan(w * 7)
    assert.equal(plan.weeksUntil, w)
    assert.equal(plan.weeksPerPhase, perPhase)
    assert.equal(plan.programWeeks, perPhase * 3)
    assert.equal(plan.sessions, perPhase * 3 * 3)
    assert.deepEqual(
      plan.phases.map((p) => p.code),
      ['GPP', 'SPP', 'SSP']
    )
  }
})

test('calculateWeeksPerPhaseArray distributes remainder weeks to SSP then SPP', () => {
  assert.deepEqual(calculateWeeksPerPhaseArray(12), [4, 4, 4])
  assert.deepEqual(calculateWeeksPerPhaseArray(14), [4, 5, 5])
  assert.deepEqual(calculateWeeksPerPhaseArray(15), [5, 5, 5])
  assert.deepEqual(calculateWeeksPerPhaseArray(16), [5, 5, 6])
})

test('weeksUntilSeason rounds up partial weeks and clamps to 52 weeks', () => {
  assert.equal(weeksUntilSeason(1), 1)
  assert.equal(weeksUntilSeason(7), 1)
  assert.equal(weeksUntilSeason(8), 2)
  assert.equal(weeksUntilSeason(84), 12)
  assert.equal(weeksUntilSeason(500), 52)
})

test('dayPhases shades days across gpp -> spp -> ssp with no taper phase', () => {
  const phases = dayPhases(85)
  assert.equal(phases.length, 85)
  assert.equal(phases[0], null)
  assert.equal(phases[1], 'gpp')
  assert.equal(phases[28], 'gpp')
  assert.equal(phases[29], 'spp')
  assert.equal(phases[56], 'spp')
  assert.equal(phases[57], 'ssp')
  assert.equal(phases[84], 'ssp')
  assert.ok(phases.slice(1).every((p) => p === 'gpp' || p === 'spp' || p === 'ssp'))
})

test('isLiftDay marks Mon/Wed/Fri by default for any active phase', () => {
  assert.equal(isLiftDay('gpp', 1), true)
  assert.equal(isLiftDay('spp', 3), true)
  assert.equal(isLiftDay('ssp', 5), true)
  assert.equal(isLiftDay('ssp', 2), false)
  assert.equal(isLiftDay(null, 1), false)
})

test('short and distant season dates keep the program phase boundaries', () => {
  expect(dayPhases(5)).toEqual([null, 'gpp', 'gpp', 'gpp', 'gpp'])
  const phases = dayPhases(364)
  expect(phases[56]).toBe('gpp')
  expect(phases[57]).toBe('spp')
  expect(phases[113]).toBe('ssp')
  expect(phases).toHaveLength(169)
})
