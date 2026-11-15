import {
  AGE_GROUP_CHOICES,
  DEFAULT_TRAINING_DAYS,
  YEARS_CHOICES,
  intakeArgs,
  isComplete,
  normalizeTrainingDays,
  revealProgram,
  seasonWeeksArg,
  seasonStartForWeeks,
  formatSeasonDate,
  weeksUntilSeason,
  yearsForChoice,
  type CompleteFirstRunAnswers,
} from '../firstRun'
import { getSkillLevel } from '../calculations'
import { calculateWeeksPerPhase } from '../../convex/weekMapping'

const NOW = new Date(2026, 10, 15, 9, 30) // Sun 15 Nov 2026, 9:30 local

function isoDaysFrom(base: Date, days: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const complete: CompleteFirstRunAnswers = {
  sportId: 'sport_1',
  seasonStart: null,
  trainingDays: [1, 3, 5],
  ageGroup: '14-17',
  years: 'new',
}

describe('years choices', () => {
  it('maps each choice to Novice, Moderate and Advanced', () => {
    const levels = YEARS_CHOICES.map((c) => getSkillLevel(yearsForChoice(c.value)))
    expect(levels).toEqual(['Novice', 'Moderate', 'Advanced'])
  })

  it('reveals the same skill level getSkillLevel gives', () => {
    for (const choice of YEARS_CHOICES) {
      const shape = revealProgram({ ...complete, years: choice.value }, NOW)
      expect({ choice: choice.value, level: shape.skillLevel }).toEqual({
        choice: choice.value,
        level: getSkillLevel(choice.years),
      })
    }
  })
})

describe('age groups', () => {
  it('offers exactly the groups completeIntake accepts', () => {
    expect(AGE_GROUP_CHOICES.map((c) => c.value)).toEqual(['14-17', '18-35', '36+'])
  })
})

describe('weeksUntilSeason', () => {
  it('rounds part weeks up', () => {
    expect(weeksUntilSeason(isoDaysFrom(NOW, 7), NOW)).toBe(1)
    expect(weeksUntilSeason(isoDaysFrom(NOW, 8), NOW)).toBe(2)
    expect(weeksUntilSeason(isoDaysFrom(NOW, 84), NOW)).toBe(12)
  })

  it('ignores the time of day', () => {
    const late = new Date(2026, 10, 15, 23, 59)
    expect(weeksUntilSeason(isoDaysFrom(NOW, 14), late)).toBe(2)
  })

  it('never goes below 1 or above 52', () => {
    expect(weeksUntilSeason(isoDaysFrom(NOW, 0), NOW)).toBe(1)
    expect(weeksUntilSeason(isoDaysFrom(NOW, -10), NOW)).toBe(1)
    expect(weeksUntilSeason(isoDaysFrom(NOW, 400), NOW)).toBe(52)
  })

  it('treats "No set season" as no weeks, so completeIntake uses its default', () => {
    expect(seasonWeeksArg(null, NOW)).toBeUndefined()
  })
})

describe('revealProgram', () => {
  it('matches the phase weeks completeIntake stores for every season length', () => {
    const mismatches: string[] = []
    for (let weeks = 1; weeks <= 52; weeks++) {
      const shape = revealProgram({ ...complete, seasonStart: isoDaysFrom(NOW, weeks * 7) }, NOW)
      // completeIntake: totalProgramWeeks = weeksUntilSeason, weeksPerPhase = calculateWeeksPerPhase(it)
      if (shape.totalProgramWeeks !== weeks || shape.weeksPerPhase !== calculateWeeksPerPhase(weeks)) {
        mismatches.push(`${weeks}: ${shape.totalProgramWeeks}/${shape.weeksPerPhase}`)
      }
    }
    expect(mismatches).toEqual([])
  })

  it('uses 12 weeks, 4 per phase, with no set season', () => {
    const shape = revealProgram(complete, NOW)
    expect(shape.totalProgramWeeks).toBe(12)
    expect(shape.weeksPerPhase).toBe(4)
    expect(shape.programWeeks).toBe(12)
  })

  it('counts sessions as phase weeks times three times training days', () => {
    expect(revealProgram(complete, NOW).sessionCount).toBe(36)
    expect(revealProgram({ ...complete, trainingDays: [1, 2, 4, 5] }, NOW).sessionCount).toBe(48)
  })

  it('caps phases at 8 weeks, so a far season still runs 24 weeks', () => {
    const shape = revealProgram({ ...complete, seasonStart: isoDaysFrom(NOW, 52 * 7) }, NOW)
    expect(shape.weeksPerPhase).toBe(8)
    expect(shape.programWeeks).toBe(24)
  })

  it('keeps phases at least 2 weeks, so a near season still runs 6 weeks', () => {
    const shape = revealProgram({ ...complete, seasonStart: isoDaysFrom(NOW, 7) }, NOW)
    expect(shape.weeksPerPhase).toBe(2)
    expect(shape.programWeeks).toBe(6)
  })
})

describe('training days', () => {
  it('defaults to Mon, Wed, Fri', () => {
    expect(DEFAULT_TRAINING_DAYS).toEqual([1, 3, 5])
    expect(normalizeTrainingDays(undefined)).toEqual([1, 3, 5])
    expect(normalizeTrainingDays([])).toEqual([1, 3, 5])
  })

  it('sorts, de-duplicates and drops invalid days', () => {
    expect(normalizeTrainingDays([5, 1, 5, 9, -1, 0])).toEqual([0, 1, 5])
  })
})

describe('isComplete', () => {
  it('needs every answer, with "No set season" counting as answered', () => {
    expect(isComplete(complete)).toBe(true)
    expect(isComplete({ ...complete, seasonStart: undefined })).toBe(false)
    expect(isComplete({ ...complete, sportId: undefined })).toBe(false)
    expect(isComplete({ ...complete, trainingDays: [] })).toBe(false)
    expect(isComplete({ ...complete, ageGroup: undefined })).toBe(false)
    expect(isComplete({ ...complete, years: undefined })).toBe(false)
  })
})

describe('intakeArgs', () => {
  it('builds completeIntake arguments from the answers', () => {
    expect(
      intakeArgs(
        { ...complete, seasonStart: isoDaysFrom(NOW, 63), trainingDays: [5, 1], years: '1-2' },
        NOW
      )
    ).toEqual({
      sportId: 'sport_1',
      yearsOfExperience: 1,
      preferredTrainingDaysPerWeek: 2,
      selectedTrainingDays: [1, 5],
      weeksUntilSeason: 9,
      ageGroup: '14-17',
    })
  })

  it('leaves weeksUntilSeason out with no set season', () => {
    expect(intakeArgs(complete, NOW).weeksUntilSeason).toBeUndefined()
  })
})

describe('seasonStartForWeeks', () => {
  it('round-trips with weeksUntilSeason for every slider position', () => {
    const off: number[] = []
    for (let w = 1; w <= 52; w++) if (weeksUntilSeason(seasonStartForWeeks(w, NOW), NOW) !== w) off.push(w)
    expect(off).toEqual([])
  })

  it('formats the date for display', () => {
    expect(formatSeasonDate('2027-03-06')).toBe('Sat, Mar 6')
  })
})
