import { describe, it, expect } from 'vitest'
import {
  calculateStreaks,
  calculateAverageWorkoutsPerWeek,
  toLocalDayNumber,
  toLocalDateISO,
  dateISOToDayNumber,
  getLocalDayArgs,
} from '../streaks'

// October 2026: Mon 5, Wed 7, Fri 9, Mon 12, Wed 14, Fri 16, Mon 19, Wed 21, Fri 23
const MON_WED_FRI = [1, 3, 5]

/** A UTC timestamp at the given hour on a 2026-10 date */
function oct(day: number, hourUTC = 17): number {
  return Date.UTC(2026, 9, day, hourUTC)
}

function streaks(days: number[], today: string, trainingDays = MON_WED_FRI) {
  return calculateStreaks({
    completedAt: days.map((d) => oct(d)),
    trainingDays,
    timezoneOffsetMinutes: 0,
    today,
  })
}

describe('calculateStreaks', () => {
  it('returns zero with no completed sessions', () => {
    expect(streaks([], '2026-10-21')).toEqual({ currentStreak: 0, longestStreak: 0 })
  })

  it('counts consecutive scheduled training days', () => {
    expect(streaks([12, 14, 16, 19], '2026-10-19')).toEqual({
      currentStreak: 4,
      longestStreak: 4,
    })
  })

  describe('rest days', () => {
    it('does not break the streak across rest days and weekends', () => {
      // Fri 16 → Mon 19 spans Sat/Sun; Tue 20 is also a rest day
      expect(streaks([14, 16, 19], '2026-10-20')).toEqual({
        currentStreak: 3,
        longestStreak: 3,
      })
    })

    it('counts a workout done on a rest day', () => {
      // Tue 13 is a rest day
      expect(streaks([12, 13, 14], '2026-10-14').currentStreak).toBe(3)
    })

    it('does not let a rest-day workout make up for a missed training day', () => {
      // Missed Mon 12, trained Tue 13 instead
      expect(streaks([9, 13, 14], '2026-10-14')).toEqual({
        currentStreak: 2,
        longestStreak: 2,
      })
    })
  })

  describe('missed scheduled day', () => {
    it('resets the current streak but keeps the longest', () => {
      // Missed Fri 16
      expect(streaks([9, 12, 14, 19, 21], '2026-10-21')).toEqual({
        currentStreak: 2,
        longestStreak: 3,
      })
    })

    it('is zero when the last training day before today was missed', () => {
      // Trained Mon 19, missed Wed 21, today is Thu 22 (rest day)
      expect(streaks([16, 19], '2026-10-22')).toEqual({
        currentStreak: 0,
        longestStreak: 2,
      })
    })

    it('ends a streak after a long absence', () => {
      expect(streaks([5, 7, 9], '2026-10-23').currentStreak).toBe(0)
    })
  })

  describe('today not yet trained', () => {
    it('keeps the streak when today is a training day not trained yet', () => {
      // Today is Wed 21, not trained yet
      expect(streaks([14, 16, 19], '2026-10-21').currentStreak).toBe(3)
    })

    it('adds today once trained', () => {
      expect(streaks([14, 16, 19, 21], '2026-10-21').currentStreak).toBe(4)
    })
  })

  it('counts two sessions on the same day as one day', () => {
    const result = calculateStreaks({
      completedAt: [oct(19, 9), oct(19, 18)],
      trainingDays: MON_WED_FRI,
      timezoneOffsetMinutes: 0,
      today: '2026-10-19',
    })
    expect(result.currentStreak).toBe(1)
  })

  it('treats every day as a training day when none are given', () => {
    // Tue 20 missed
    expect(streaks([19, 21], '2026-10-21', [])).toEqual({
      currentStreak: 1,
      longestStreak: 1,
    })
  })

  it('still counts sessions dated after today', () => {
    expect(streaks([19, 21], '2026-10-20').currentStreak).toBe(2)
  })

  describe('timezones', () => {
    // US Pacific (PDT) is UTC-7: getTimezoneOffset() === 420
    const PDT = 420

    it('buckets late-evening workouts into the athlete’s local day', () => {
      // Mon 19 at 11:30pm PDT is Tue 20 06:30 UTC
      const lateMonday = Date.UTC(2026, 9, 20, 6, 30)
      const result = calculateStreaks({
        completedAt: [oct(16), lateMonday],
        trainingDays: MON_WED_FRI,
        timezoneOffsetMinutes: PDT,
        today: '2026-10-20',
      })
      expect(result.currentStreak).toBe(2)

      // Read in UTC, Monday looks missed
      const utc = calculateStreaks({
        completedAt: [oct(16), lateMonday],
        trainingDays: MON_WED_FRI,
        timezoneOffsetMinutes: 0,
        today: '2026-10-20',
      })
      expect(utc.currentStreak).toBe(1)
    })

    it('buckets early-morning workouts east of UTC into the local day', () => {
      // Mon 19 at 12:30am in UTC+9 (offset -540) is Sun 18 15:30 UTC
      const earlyMonday = Date.UTC(2026, 9, 18, 15, 30)
      const result = calculateStreaks({
        completedAt: [oct(16), earlyMonday],
        trainingDays: MON_WED_FRI,
        timezoneOffsetMinutes: -540,
        today: '2026-10-19',
      })
      expect(result.currentStreak).toBe(2)
    })
  })
})

describe('day helpers', () => {
  it('converts timestamps to local day numbers', () => {
    const ts = Date.UTC(2026, 9, 20, 6, 30)
    expect(toLocalDayNumber(ts, 0)).toBe(dateISOToDayNumber('2026-10-20'))
    expect(toLocalDayNumber(ts, 420)).toBe(dateISOToDayNumber('2026-10-19'))
  })

  it('formats local dates', () => {
    expect(toLocalDateISO(Date.UTC(2026, 9, 20, 6, 30), 420)).toBe('2026-10-19')
    expect(toLocalDateISO(Date.UTC(2026, 0, 1, 1), 120)).toBe('2025-12-31')
  })

  it('builds query args from the device clock', () => {
    const now = new Date(2026, 9, 21, 12)
    expect(getLocalDayArgs(now)).toEqual({
      today: '2026-10-21',
      timezoneOffsetMinutes: now.getTimezoneOffset(),
    })
  })
})

describe('calculateAverageWorkoutsPerWeek', () => {
  const base = { timezoneOffsetMinutes: 0, programStartedAt: oct(5) }

  it('is zero with no workouts', () => {
    expect(
      calculateAverageWorkoutsPerWeek({ ...base, completedCount: 0, today: '2026-10-21' })
    ).toBe(0)
  })

  it('averages over the weeks since the program started', () => {
    // Oct 5 – Oct 18 is two full weeks
    expect(
      calculateAverageWorkoutsPerWeek({ ...base, completedCount: 6, today: '2026-10-18' })
    ).toBe(3)
  })

  it('counts the first week as a full week', () => {
    expect(
      calculateAverageWorkoutsPerWeek({ ...base, completedCount: 2, today: '2026-10-07' })
    ).toBe(2)
  })

  it('rounds to one decimal', () => {
    // 10 days elapsed → 4 / (10/7) = 2.8
    expect(
      calculateAverageWorkoutsPerWeek({ ...base, completedCount: 4, today: '2026-10-14' })
    ).toBe(2.8)
  })
})
