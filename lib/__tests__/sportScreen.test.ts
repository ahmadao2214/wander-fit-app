import { PHASE_WORDS, phaseStep, phaseWord, programWeek, seasonStartsAt, sportSchemeFor, todaySeason } from '../sportScreen'

describe('sportSchemeFor', () => {
  it('maps dark to the chalkboard and everything else to the whiteboard', () => {
    expect([sportSchemeFor('dark'), sportSchemeFor('light'), sportSchemeFor(null), sportSchemeFor(undefined)]).toEqual([
      'chalkboard',
      'whiteboard',
      'whiteboard',
      'whiteboard',
    ])
  })
})

describe('phase words', () => {
  it('names the phases Build, Train and Sharpen', () => {
    expect(PHASE_WORDS).toEqual({ GPP: 'Build', SPP: 'Train', SSP: 'Sharpen' })
    expect([phaseWord('GPP'), phaseWord('SPP'), phaseWord('SSP'), phaseWord(undefined)]).toEqual([
      'Build',
      'Train',
      'Sharpen',
      'Build',
    ])
  })

  it('steps the phases 1, 2, 3', () => {
    expect([phaseStep('GPP'), phaseStep('SPP'), phaseStep('SSP'), phaseStep(null)]).toEqual([1, 2, 3, 1])
  })
})

describe('programWeek', () => {
  it('counts weeks across the whole plan', () => {
    expect([programWeek('GPP', 1, 4), programWeek('SPP', 2, 4), programWeek('SSP', 4, 4)]).toEqual([1, 6, 12])
  })

  it('clamps a phase week into the phase', () => {
    expect([programWeek('GPP', 0, 4), programWeek('SPP', 9, 4)]).toEqual([1, 8])
  })
})

describe('seasonStartsAt', () => {
  it('adds the intake weeks to when the intake was answered', () => {
    const answered = new Date(2026, 10, 1).getTime()
    expect(seasonStartsAt(answered, 8)).toBe(answered + 8 * 7 * 24 * 60 * 60 * 1000)
  })

  it('is null with no set season', () => {
    expect([seasonStartsAt(0, undefined), seasonStartsAt(0, null)]).toEqual([null, null])
  })
})

describe('todaySeason', () => {
  const now = new Date(2026, 10, 14, 18, 30)

  it('counts the days to a dated first game', () => {
    const game = new Date(2026, 10, 24, 9, 0).getTime()
    expect(todaySeason({ seasonStartsAt: game, week: 11, programWeeks: 12, now })).toEqual({ kind: 'dated', daysToGame: 10 })
  })

  it('reads in season once the game day comes', () => {
    const game = new Date(2026, 10, 14, 7, 0).getTime()
    expect(todaySeason({ seasonStartsAt: game, week: 12, programWeeks: 12, now })).toEqual({ kind: 'in-season' })
  })

  it('falls back to the plan count with no date', () => {
    expect([
      todaySeason({ seasonStartsAt: null, week: 4, programWeeks: 12, now }),
      todaySeason({ seasonStartsAt: undefined, week: 4, programWeeks: 12, now }),
    ]).toEqual([
      { kind: 'open', done: 4, total: 12 },
      { kind: 'open', done: 4, total: 12 },
    ])
  })
})
