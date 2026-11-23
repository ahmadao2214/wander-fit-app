import { ageInYears, evaluateBirthDate, isValidBirthDate } from '../ageGate'

// Fixed "today": May 15, 2026, local time.
const NOW = new Date(2026, 4, 15, 12)

describe('evaluateBirthDate', () => {
  it('turns away a 12-year-old', () => {
    expect(evaluateBirthDate(5, 2014, NOW)).toEqual({
      eligible: false,
      reason: 'under_minimum_age',
    })
  })

  it('turns away a 13-year-old', () => {
    expect(evaluateBirthDate(5, 2013, NOW)).toEqual({
      eligible: false,
      reason: 'under_minimum_age',
    })
    expect(evaluateBirthDate(1, 2013, NOW)).toEqual({
      eligible: false,
      reason: 'under_minimum_age',
    })
  })

  it('counts an athlete turning 14 this month as 14', () => {
    expect(evaluateBirthDate(5, 2012, NOW)).toEqual({
      eligible: true,
      ageGroup: '14-17',
      requiresGuardianNotice: true,
    })
  })

  it('does not count an athlete turning 14 next month as 14 yet', () => {
    expect(evaluateBirthDate(6, 2012, NOW)).toEqual({
      eligible: false,
      reason: 'under_minimum_age',
    })
    expect(evaluateBirthDate(12, 2012, NOW)).toEqual({
      eligible: false,
      reason: 'under_minimum_age',
    })
  })

  it('puts a 17-year-old in 14-17, with the guardian notice', () => {
    expect(evaluateBirthDate(5, 2009, NOW)).toEqual({
      eligible: true,
      ageGroup: '14-17',
      requiresGuardianNotice: true,
    })
    // Turns 18 next month: still 17.
    expect(evaluateBirthDate(6, 2008, NOW)).toEqual({
      eligible: true,
      ageGroup: '14-17',
      requiresGuardianNotice: true,
    })
  })

  it('puts an 18-year-old in 18-35, with no guardian notice', () => {
    expect(evaluateBirthDate(5, 2008, NOW)).toEqual({
      eligible: true,
      ageGroup: '18-35',
      requiresGuardianNotice: false,
    })
  })

  it('keeps a 35-year-old in 18-35', () => {
    expect(evaluateBirthDate(6, 1990, NOW)).toEqual({
      eligible: true,
      ageGroup: '18-35',
      requiresGuardianNotice: false,
    })
  })

  it('puts a 36-year-old in 36+', () => {
    expect(evaluateBirthDate(5, 1990, NOW)).toEqual({
      eligible: true,
      ageGroup: '36+',
      requiresGuardianNotice: false,
    })
    expect(evaluateBirthDate(1, 1960, NOW)).toEqual({
      eligible: true,
      ageGroup: '36+',
      requiresGuardianNotice: false,
    })
  })

  it('handles February, including a leap day', () => {
    const leapDay = new Date(2028, 1, 29, 12)
    expect(evaluateBirthDate(2, 2014, leapDay)).toEqual({
      eligible: true,
      ageGroup: '14-17',
      requiresGuardianNotice: true,
    })
    expect(evaluateBirthDate(3, 2014, leapDay)).toEqual({
      eligible: false,
      reason: 'under_minimum_age',
    })
    const firstOfFeb = new Date(2026, 1, 1, 0, 0, 1)
    expect(evaluateBirthDate(2, 2012, firstOfFeb).eligible).toBe(true)
    expect(evaluateBirthDate(1, 2012, firstOfFeb).eligible).toBe(true)
    expect(evaluateBirthDate(3, 2012, firstOfFeb).eligible).toBe(false)
  })

  it('counts across the new year', () => {
    const january = new Date(2026, 0, 3, 12)
    expect(evaluateBirthDate(12, 2011, january).eligible).toBe(true)
    expect(evaluateBirthDate(1, 2012, january).eligible).toBe(true)
    expect(evaluateBirthDate(2, 2012, january)).toEqual({
      eligible: false,
      reason: 'under_minimum_age',
    })
  })

  it('rejects input that is not a birth date, without calling it underage', () => {
    const invalid: [number, number][] = [
      [0, 2000],
      [13, 2000],
      [1.5, 2000],
      [Number.NaN, 2000],
      [5, Number.NaN],
      [5, 2000.5],
      [5, 2027], // a future year
      [6, 2026], // later this year
      [5, 1800], // a typo, not a 226-year-old
    ]
    const results = invalid.map(([m, y]) => ({ m, y, result: evaluateBirthDate(m, y, NOW) }))
    expect(
      results.filter((r) => r.result.eligible || r.result.reason !== 'invalid_birth_date')
    ).toEqual([])
  })

  it('treats a birth date this month as age 0, so underage rather than invalid', () => {
    expect(evaluateBirthDate(5, 2026, NOW)).toEqual({
      eligible: false,
      reason: 'under_minimum_age',
    })
  })
})

describe('ageInYears', () => {
  it('counts whole years from the first of the birth month', () => {
    expect(ageInYears(5, 2012, NOW)).toBe(14)
    expect(ageInYears(6, 2012, NOW)).toBe(13)
  })
})

describe('isValidBirthDate', () => {
  it('accepts a real month and year and rejects the rest', () => {
    expect(isValidBirthDate(5, 2000, NOW)).toBe(true)
    expect(isValidBirthDate(12, 1906, NOW)).toBe(true)
    expect(isValidBirthDate(5, 1905, NOW)).toBe(false)
    expect(isValidBirthDate(13, 2000, NOW)).toBe(false)
  })
})
