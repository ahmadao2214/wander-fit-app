import {
  startOfDay,
  addDays,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isSameWeek,
  isToday,
  formatDateISO,
  parseDateISO,
  findNextDayOfWeek,
  findFirstTrainingDate,
  getDateForWorkout,
  getWorkoutForDate,
  getWorkoutsInRange,
  getTotalWorkouts,
  getProgramEndDate,
  getWeekDays,
  formatWeekRange,
  getMonthCalendarDays,
  formatMonthYear,
  PHASE_ORDER,
  DEFAULT_WEEKS_PER_PHASE,
} from '../calendarUtils'

describe('calendarUtils', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // DATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('startOfDay', () => {
    it('should set time to midnight', () => {
      const date = new Date(2026, 1, 2, 14, 30, 45, 123) // Feb 2, 2026 2:30:45 PM
      const result = startOfDay(date)
      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
      expect(result.getSeconds()).toBe(0)
      expect(result.getMilliseconds()).toBe(0)
      expect(result.getDate()).toBe(2)
    })

    it('should not mutate the original date', () => {
      const date = new Date(2026, 1, 2, 14, 30)
      startOfDay(date)
      expect(date.getHours()).toBe(14)
    })
  })

  describe('addDays', () => {
    it('should add positive days', () => {
      const date = new Date(2026, 1, 2)
      const result = addDays(date, 5)
      expect(result.getDate()).toBe(7)
    })

    it('should handle month boundary', () => {
      const date = new Date(2026, 1, 28) // Feb 28
      const result = addDays(date, 3)
      expect(result.getMonth()).toBe(2) // March
      expect(result.getDate()).toBe(3)
    })

    it('should handle negative days', () => {
      const date = new Date(2026, 1, 5)
      const result = addDays(date, -3)
      expect(result.getDate()).toBe(2)
    })
  })

  describe('startOfWeek', () => {
    it('should return Sunday for any day in the week', () => {
      // Wednesday Feb 4, 2026
      const date = new Date(2026, 1, 4)
      const result = startOfWeek(date)
      expect(result.getDay()).toBe(0) // Sunday
      expect(result.getDate()).toBe(1) // Feb 1
    })

    it('should return the same day if already Sunday', () => {
      // Sunday Feb 1, 2026
      const date = new Date(2026, 1, 1)
      const result = startOfWeek(date)
      expect(result.getDate()).toBe(1)
    })
  })

  describe('endOfWeek', () => {
    it('should return Saturday for any day in the week', () => {
      // Wednesday Feb 4, 2026
      const date = new Date(2026, 1, 4)
      const result = endOfWeek(date)
      expect(result.getDay()).toBe(6) // Saturday
      expect(result.getDate()).toBe(7) // Feb 7
    })
  })

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const a = new Date(2026, 1, 2, 10, 0)
      const b = new Date(2026, 1, 2, 15, 30)
      expect(isSameDay(a, b)).toBe(true)
    })

    it('should return false for different days', () => {
      const a = new Date(2026, 1, 2)
      const b = new Date(2026, 1, 3)
      expect(isSameDay(a, b)).toBe(false)
    })
  })

  describe('isSameWeek', () => {
    it('should return true for same week (Sunday-Saturday)', () => {
      // Monday Feb 2 and Friday Feb 6 are same week
      const mon = new Date(2026, 1, 2)
      const fri = new Date(2026, 1, 6)
      expect(isSameWeek(mon, fri)).toBe(true)
    })

    it('should return true for Sunday and Saturday of same week', () => {
      // Sunday Feb 1 and Saturday Feb 7
      const sun = new Date(2026, 1, 1)
      const sat = new Date(2026, 1, 7)
      expect(isSameWeek(sun, sat)).toBe(true)
    })

    it('should return false for different weeks', () => {
      // Saturday Feb 7 and Sunday Feb 8 are different weeks
      const sat = new Date(2026, 1, 7)
      const sun = new Date(2026, 1, 8)
      expect(isSameWeek(sat, sun)).toBe(false)
    })

    it('should return false for days a week apart', () => {
      // Monday Feb 2 and Monday Feb 9
      const mon1 = new Date(2026, 1, 2)
      const mon2 = new Date(2026, 1, 9)
      expect(isSameWeek(mon1, mon2)).toBe(false)
    })

    it('should handle cross-month weeks', () => {
      // Jan 31 (Saturday) and Feb 1 (Sunday) are different weeks
      const jan31 = new Date(2026, 0, 31) // Saturday
      const feb1 = new Date(2026, 1, 1) // Sunday
      expect(isSameWeek(jan31, feb1)).toBe(false)
    })
  })

  describe('formatDateISO / parseDateISO', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2026, 1, 2)
      expect(formatDateISO(date)).toBe('2026-02-02')
    })

    it('should parse YYYY-MM-DD to Date', () => {
      const result = parseDateISO('2026-02-02')
      expect(result.getFullYear()).toBe(2026)
      expect(result.getMonth()).toBe(1) // 0-indexed
      expect(result.getDate()).toBe(2)
    })

    it('should round-trip correctly', () => {
      const original = new Date(2026, 5, 15)
      const iso = formatDateISO(original)
      const parsed = parseDateISO(iso)
      expect(isSameDay(original, parsed)).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // WORKOUT DATE MAPPING
  // ─────────────────────────────────────────────────────────────────────────────

  describe('findNextDayOfWeek', () => {
    it('should find the next Monday from Wednesday', () => {
      const wed = new Date(2026, 1, 4) // Wednesday Feb 4
      const result = findNextDayOfWeek(wed, 1) // Monday
      expect(result.getDay()).toBe(1)
      expect(result.getDate()).toBe(9) // Feb 9
    })

    it('should return same day if already on target day', () => {
      const mon = new Date(2026, 1, 2) // Monday Feb 2
      const result = findNextDayOfWeek(mon, 1) // Monday
      expect(result.getDate()).toBe(2)
    })

    it('should find next Sunday from Saturday', () => {
      const sat = new Date(2026, 1, 7) // Saturday Feb 7
      const result = findNextDayOfWeek(sat, 0) // Sunday
      expect(result.getDay()).toBe(0)
      expect(result.getDate()).toBe(8) // Feb 8
    })
  })

  describe('getDateForWorkout', () => {
    // Program starts Monday Feb 2, 2026
    // Training days: Mon (1), Wed (3), Fri (5)
    const programStart = new Date(2026, 1, 2)
    const trainingDays = [1, 3, 5]

    it('should return correct date for first workout (GPP W1D1)', () => {
      const result = getDateForWorkout(programStart, trainingDays, {
        phase: 'GPP',
        week: 1,
        day: 1,
      })
      // First Monday on or after Feb 2 = Feb 2
      expect(result.getDate()).toBe(2)
      expect(result.getDay()).toBe(1) // Monday
    })

    it('should return correct date for second workout (GPP W1D2)', () => {
      const result = getDateForWorkout(programStart, trainingDays, {
        phase: 'GPP',
        week: 1,
        day: 2,
      })
      // Wednesday after Feb 2 = Feb 4
      expect(result.getDate()).toBe(4)
      expect(result.getDay()).toBe(3) // Wednesday
    })

    it('should return correct date for third workout (GPP W1D3)', () => {
      const result = getDateForWorkout(programStart, trainingDays, {
        phase: 'GPP',
        week: 1,
        day: 3,
      })
      // Friday after Feb 2 = Feb 6
      expect(result.getDate()).toBe(6)
      expect(result.getDay()).toBe(5) // Friday
    })

    it('should return correct date for week 2 day 1 (GPP W2D1)', () => {
      const result = getDateForWorkout(programStart, trainingDays, {
        phase: 'GPP',
        week: 2,
        day: 1,
      })
      // Monday Feb 9
      expect(result.getDate()).toBe(9)
      expect(result.getDay()).toBe(1) // Monday
    })

    it('should return correct date for SPP W1D1', () => {
      const result = getDateForWorkout(programStart, trainingDays, {
        phase: 'SPP',
        week: 1,
        day: 1,
      })
      // GPP is 4 weeks * 3 days = 12 workouts
      // SPP W1D1 is workout #13 (index 12)
      // Feb 2 + 4 weeks = Mar 2
      expect(result.getMonth()).toBe(2) // March
      expect(result.getDate()).toBe(2) // Mar 2
    })

    it('should handle program starting mid-week', () => {
      // Program starts Thursday Feb 5
      const thursdayStart = new Date(2026, 1, 5)
      // Training days: Mon, Wed, Fri
      // First Mon on or after Feb 5 = Feb 9
      const result = getDateForWorkout(thursdayStart, trainingDays, {
        phase: 'GPP',
        week: 1,
        day: 1,
      })
      expect(result.getDate()).toBe(9) // Monday Feb 9
    })

    it('should throw error for empty training days', () => {
      expect(() =>
        getDateForWorkout(programStart, [], { phase: 'GPP', week: 1, day: 1 })
      ).toThrow('trainingDays must not be empty')
    })
  })

  describe('getWorkoutForDate', () => {
    const programStart = new Date(2026, 1, 2) // Monday Feb 2
    const trainingDays = [1, 3, 5] // Mon, Wed, Fri

    it('should return correct slot for training day', () => {
      // Monday Feb 2 = GPP W1D1
      const result = getWorkoutForDate(programStart, trainingDays, new Date(2026, 1, 2))
      expect(result).toEqual({ phase: 'GPP', week: 1, day: 1 })
    })

    it('should return null for non-training day', () => {
      // Tuesday Feb 3 = not a training day
      const result = getWorkoutForDate(programStart, trainingDays, new Date(2026, 1, 3))
      expect(result).toBeNull()
    })

    it('should return null for date before program start', () => {
      // Sunday Feb 1 = before program
      const result = getWorkoutForDate(programStart, trainingDays, new Date(2026, 1, 1))
      expect(result).toBeNull()
    })

    it('should return correct slot for week 2', () => {
      // Monday Feb 9 = GPP W2D1
      const result = getWorkoutForDate(programStart, trainingDays, new Date(2026, 1, 9))
      expect(result).toEqual({ phase: 'GPP', week: 2, day: 1 })
    })

    it('should return correct slot for SPP', () => {
      // Mar 2 = SPP W1D1 (GPP is 4 weeks)
      const result = getWorkoutForDate(programStart, trainingDays, new Date(2026, 2, 2))
      expect(result).toEqual({ phase: 'SPP', week: 1, day: 1 })
    })
  })

  describe('getWorkoutsInRange', () => {
    const programStart = new Date(2026, 1, 2)
    const trainingDays = [1, 3, 5]

    it('should return all workouts in a week', () => {
      // Week of Feb 2-8
      const start = new Date(2026, 1, 2)
      const end = new Date(2026, 1, 8)
      const result = getWorkoutsInRange(programStart, trainingDays, start, end)

      expect(result).toHaveLength(3)
      expect(result[0].slot).toEqual({ phase: 'GPP', week: 1, day: 1 })
      expect(result[1].slot).toEqual({ phase: 'GPP', week: 1, day: 2 })
      expect(result[2].slot).toEqual({ phase: 'GPP', week: 1, day: 3 })
    })

    it('should include absoluteWorkoutIndex', () => {
      const start = new Date(2026, 1, 2)
      const end = new Date(2026, 1, 8)
      const result = getWorkoutsInRange(programStart, trainingDays, start, end)

      expect(result[0].absoluteWorkoutIndex).toBe(0)
      expect(result[1].absoluteWorkoutIndex).toBe(1)
      expect(result[2].absoluteWorkoutIndex).toBe(2)
    })

    it('should return empty array for range with no workouts', () => {
      // Sunday only
      const start = new Date(2026, 1, 1)
      const end = new Date(2026, 1, 1)
      const result = getWorkoutsInRange(programStart, trainingDays, start, end)
      expect(result).toHaveLength(0)
    })
  })

  describe('getTotalWorkouts', () => {
    it('should calculate total for 3 days/week', () => {
      // 3 phases * 4 weeks * 3 days = 36
      expect(getTotalWorkouts([1, 3, 5])).toBe(36)
    })

    it('should calculate total for 5 days/week', () => {
      // 3 phases * 4 weeks * 5 days = 60
      expect(getTotalWorkouts([1, 2, 3, 4, 5])).toBe(60)
    })
  })

  describe('getProgramEndDate', () => {
    it('should return correct end date', () => {
      const programStart = new Date(2026, 1, 2) // Monday Feb 2
      const trainingDays = [1, 3, 5] // 3 days/week

      // 12 weeks * 3 days = 36 workouts
      // Last workout is SSP W4D3 (Friday of week 12)
      const result = getProgramEndDate(programStart, trainingDays)

      // Feb 2 + 12 weeks = Apr 27 (Monday)
      // But last workout is Friday, so Apr 24
      expect(result.getMonth()).toBe(3) // April
      expect(result.getDay()).toBe(5) // Friday
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getWeekDays', () => {
    it('should return 7 days starting from Sunday', () => {
      const date = new Date(2026, 1, 4) // Wednesday
      const result = getWeekDays(date)

      expect(result).toHaveLength(7)
      expect(result[0].getDay()).toBe(0) // Sunday
      expect(result[6].getDay()).toBe(6) // Saturday
    })
  })

  describe('formatWeekRange', () => {
    it('should format same-month range', () => {
      const date = new Date(2026, 1, 4) // Feb 4
      const result = formatWeekRange(date)
      expect(result).toBe('Feb 1 - 7, 2026')
    })

    it('should format cross-month range', () => {
      const date = new Date(2026, 1, 28) // Feb 28
      const result = formatWeekRange(date)
      // Week is Feb 22 - Feb 28
      expect(result).toContain('Feb')
    })
  })

  describe('getMonthCalendarDays', () => {
    it('should return days including padding', () => {
      // February 2026 starts on Sunday
      const result = getMonthCalendarDays(2026, 1)

      // Should start with Feb 1 (Sunday)
      expect(result[0].getMonth()).toBe(1)
      expect(result[0].getDate()).toBe(1)

      // Should include all 28 days
      expect(result.length).toBeGreaterThanOrEqual(28)
    })

    it('should pad to complete weeks', () => {
      const result = getMonthCalendarDays(2026, 1)

      // Total should be divisible by 7
      expect(result.length % 7).toBe(0)
    })
  })

  describe('formatMonthYear', () => {
    it('should format correctly', () => {
      const date = new Date(2026, 1, 15)
      expect(formatMonthYear(date)).toBe('February 2026')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // ROUND-TRIP TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('round-trip consistency', () => {
    const programStart = new Date(2026, 1, 2)
    const trainingDays = [1, 3, 5]

    it('should be consistent: getDateForWorkout -> getWorkoutForDate', () => {
      const testCases = [
        { phase: 'GPP' as const, week: 1, day: 1 },
        { phase: 'GPP' as const, week: 2, day: 3 },
        { phase: 'SPP' as const, week: 1, day: 1 },
        { phase: 'SSP' as const, week: 4, day: 3 },
      ]

      for (const slot of testCases) {
        const date = getDateForWorkout(programStart, trainingDays, slot)
        const result = getWorkoutForDate(programStart, trainingDays, date)
        expect(result).toEqual(slot)
      }
    })
  })
})
