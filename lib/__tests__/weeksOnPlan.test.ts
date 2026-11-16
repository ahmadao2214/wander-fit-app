import { weeksOnPlan, localDayArgs, toLocalDayNumber, dateToDayNumber } from '../weeksOnPlan'

// Mondays: 2026-10-26, 11-02, 11-09, 11-16, 11-23
/** Noon UTC on a date, so the UTC tests never sit near midnight */
const at = (date: string, hourUtc = 12) => Date.parse(`${date}T${String(hourUtc).padStart(2, '0')}:00:00Z`)
const utc = { timezoneOffsetMinutes: 0 }

/** A Mon/Wed/Fri athlete's sessions for the week starting on a Monday */
const monWedFri = (monday: string) => {
  const d = dateToDayNumber(monday)
  return [0, 2, 4].map((offset) => new Date((d + offset) * 86_400_000 + 12 * 3_600_000).getTime())
}

describe('weeksOnPlan', () => {
  it('is 0 with no workouts', () => {
    expect(weeksOnPlan({ completedAt: [], workoutsPerWeek: 3, today: '2026-11-18', ...utc })).toBe(0)
  })

  it('counts consecutive full weeks, including this week once it is on plan', () => {
    const completedAt = [...monWedFri('2026-11-02'), ...monWedFri('2026-11-09'), ...monWedFri('2026-11-16')]
    expect(weeksOnPlan({ completedAt, workoutsPerWeek: 3, today: '2026-11-21', ...utc })).toBe(3)
  })

  it('counts a week by how many workouts were done, on any days', () => {
    // Scheduled Mon/Wed/Fri, trained Tue/Thu/Sun instead
    const completedAt = [
      ...monWedFri('2026-11-02'),
      at('2026-11-10'), at('2026-11-12'), at('2026-11-15'),
    ]
    expect(weeksOnPlan({ completedAt, workoutsPerWeek: 3, today: '2026-11-16', ...utc })).toBe(2)
  })

  it('counts two workouts on one day as two', () => {
    const completedAt = [at('2026-11-02', 9), at('2026-11-02', 15), at('2026-11-09'), at('2026-11-11')]
    expect(weeksOnPlan({ completedAt, workoutsPerWeek: 2, today: '2026-11-12', ...utc })).toBe(2)
  })

  it('does not let the week in progress end the streak before it is over', () => {
    // Two full weeks; this week has one of three so far
    const completedAt = [...monWedFri('2026-11-02'), ...monWedFri('2026-11-09'), at('2026-11-16')]
    expect(weeksOnPlan({ completedAt, workoutsPerWeek: 3, today: '2026-11-18', ...utc })).toBe(2)
  })

  it('starts over after a finished week falls short', () => {
    const completedAt = [
      ...monWedFri('2026-10-26'),
      ...monWedFri('2026-11-02'),
      at('2026-11-09'), // 1 of 3
      ...monWedFri('2026-11-16'),
    ]
    expect(weeksOnPlan({ completedAt, workoutsPerWeek: 3, today: '2026-11-21', ...utc })).toBe(1)
  })

  it('ends at 0 after a whole week with no workouts', () => {
    const completedAt = [...monWedFri('2026-11-02'), ...monWedFri('2026-11-09')]
    expect(weeksOnPlan({ completedAt, workoutsPerWeek: 3, today: '2026-11-24', ...utc })).toBe(0)
  })

  it('does not count a short first week against the athlete (a program can start midweek)', () => {
    // Started on a Friday with one workout, then two full weeks
    const completedAt = [at('2026-11-06'), ...monWedFri('2026-11-09'), ...monWedFri('2026-11-16')]
    expect(weeksOnPlan({ completedAt, workoutsPerWeek: 3, today: '2026-11-21', ...utc })).toBe(2)
  })

  it('does not end the streak while the program is paused', () => {
    const completedAt = [...monWedFri('2026-11-02'), ...monWedFri('2026-11-09')]
    const pausedAt = at('2026-11-15')
    expect(weeksOnPlan({ completedAt, workoutsPerWeek: 3, today: '2026-11-25', pausedAt, ...utc })).toBe(2)
  })

  it('means the same for a 2-day and a 7-day program', () => {
    const twoDay = [at('2026-11-02'), at('2026-11-05'), at('2026-11-09'), at('2026-11-12')]
    expect(weeksOnPlan({ completedAt: twoDay, workoutsPerWeek: 2, today: '2026-11-16', ...utc })).toBe(2)
    const sevenDay = Array.from({ length: 14 }, (_, i) => (dateToDayNumber('2026-11-02') + i) * 86_400_000 + 43_200_000)
    expect(weeksOnPlan({ completedAt: sevenDay, workoutsPerWeek: 7, today: '2026-11-16', ...utc })).toBe(2)
    // Six of seven is short: the finished week ends the run
    expect(weeksOnPlan({ completedAt: sevenDay.slice(0, 13), workoutsPerWeek: 7, today: '2026-11-17', ...utc })).toBe(0)
  })

  it('treats a missing or out-of-range weekly count as 1 to 7', () => {
    const completedAt = [at('2026-11-02'), at('2026-11-09')]
    expect(weeksOnPlan({ completedAt, workoutsPerWeek: 0, today: '2026-11-16', ...utc })).toBe(2)
    expect(weeksOnPlan({ completedAt, workoutsPerWeek: Number.NaN, today: '2026-11-16', ...utc })).toBe(2)
    expect(weeksOnPlan({ completedAt, workoutsPerWeek: 12, today: '2026-11-10', ...utc })).toBe(0)
  })

  it("puts a Sunday-night workout in the athlete's week, west of UTC", () => {
    // Sunday 2026-11-08, 9pm in New York (UTC-5) is Monday 02:00 UTC
    const sundayNight = at('2026-11-09', 2)
    const completedAt = [at('2026-11-02', 15), at('2026-11-04', 15), sundayNight, at('2026-11-10', 15), at('2026-11-12', 15)]
    const newYork = { timezoneOffsetMinutes: 300 }
    expect(weeksOnPlan({ completedAt, workoutsPerWeek: 3, today: '2026-11-13', ...newYork })).toBe(1)
    // In UTC the same workout lands on Monday, so week one is short and week two full
    expect(weeksOnPlan({ completedAt, workoutsPerWeek: 3, today: '2026-11-13', ...utc })).toBe(1)
    expect(weeksOnPlan({ completedAt, workoutsPerWeek: 2, today: '2026-11-13', ...newYork })).toBe(2)
  })

  it('counts sessions dated after today (clock skew)', () => {
    const completedAt = [...monWedFri('2026-11-02'), ...monWedFri('2026-11-09')]
    expect(weeksOnPlan({ completedAt, workoutsPerWeek: 3, today: '2026-11-08', ...utc })).toBe(2)
  })
})

describe('day helpers', () => {
  it('buckets a timestamp into the local day', () => {
    // 2026-11-16 03:00 UTC is still the 15th in Los Angeles (UTC-8)
    expect(toLocalDayNumber(at('2026-11-16', 3), 480)).toBe(dateToDayNumber('2026-11-15'))
    expect(toLocalDayNumber(at('2026-11-16', 3), 0)).toBe(dateToDayNumber('2026-11-16'))
    // East of UTC: 22:00 UTC is the next day in Tokyo (UTC+9)
    expect(toLocalDayNumber(at('2026-11-16', 22), -540)).toBe(dateToDayNumber('2026-11-17'))
  })

  it('gives the local date and offset for the query', () => {
    const now = new Date(2026, 10, 16, 23, 30)
    expect(localDayArgs(now)).toEqual({ today: '2026-11-16', timezoneOffsetMinutes: now.getTimezoneOffset() })
  })
})
