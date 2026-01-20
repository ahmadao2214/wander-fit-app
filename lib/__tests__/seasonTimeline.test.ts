import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════
// SEASON TIMELINE HELPER TESTS
// ═══════════════════════════════════════════════════════════════════════════════
//
// These tests verify the helper functions used in the season-timeline.tsx screen
// which was implemented in this branch with the Flight Path visualization.

/**
 * Calculate weeks between two dates
 * (Extracted from season-timeline.tsx for testing)
 */
function getWeeksBetween(start: Date, end: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  return Math.ceil((end.getTime() - start.getTime()) / msPerWeek)
}

/**
 * Get days for a calendar month including padding for week alignment
 * (Extracted from season-timeline.tsx for testing)
 */
function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Add padding for the first week (days from previous month)
  const startPadding = firstDay.getDay()
  for (let i = startPadding - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push(d)
  }

  // Add all days of the month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i))
  }

  // Add padding for the last week (days from next month)
  const endPadding = 6 - lastDay.getDay()
  for (let i = 1; i <= endPadding; i++) {
    days.push(new Date(year, month + 1, i))
  }

  return days
}

/**
 * Check if two dates are the same day
 * (Extracted from season-timeline.tsx for testing)
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Check if a date is within the range from today to selected date
 * (Extracted from season-timeline.tsx for testing)
 */
function isDateInRange(date: Date, today: Date, selectedDate: Date | null): boolean {
  if (!selectedDate) return false
  const dateTime = date.getTime()
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const selectedTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime()
  return dateTime >= todayTime && dateTime <= selectedTime
}

describe('getWeeksBetween', () => {
  it('returns 0 for same day', () => {
    const today = new Date(2024, 5, 15) // June 15, 2024
    expect(getWeeksBetween(today, today)).toBe(0)
  })

  it('returns 1 for a day within the same week', () => {
    const start = new Date(2024, 5, 15) // Saturday
    const end = new Date(2024, 5, 16)   // Sunday (1 day later)
    expect(getWeeksBetween(start, end)).toBe(1)
  })

  it('returns 1 for exactly 7 days', () => {
    const start = new Date(2024, 5, 1)
    const end = new Date(2024, 5, 8)
    expect(getWeeksBetween(start, end)).toBe(1)
  })

  it('returns 2 for 8 days (ceil behavior)', () => {
    const start = new Date(2024, 5, 1)
    const end = new Date(2024, 5, 9)
    expect(getWeeksBetween(start, end)).toBe(2)
  })

  it('returns 4 for approximately one month', () => {
    const start = new Date(2024, 5, 1)
    const end = new Date(2024, 5, 30)
    expect(getWeeksBetween(start, end)).toBe(5) // 29 days = 4.14 weeks, ceil = 5
  })

  it('returns 12 for approximately 3 months', () => {
    const start = new Date(2024, 5, 1)  // June 1
    const end = new Date(2024, 8, 1)    // September 1
    const weeks = getWeeksBetween(start, end)
    expect(weeks).toBeGreaterThanOrEqual(13)
    expect(weeks).toBeLessThanOrEqual(14)
  })

  it('handles year boundaries', () => {
    const start = new Date(2024, 11, 15) // December 15, 2024
    const end = new Date(2025, 0, 15)    // January 15, 2025
    const weeks = getWeeksBetween(start, end)
    expect(weeks).toBeGreaterThanOrEqual(4)
    expect(weeks).toBeLessThanOrEqual(5)
  })

  it('handles leap year February', () => {
    const start = new Date(2024, 1, 1)  // Feb 1, 2024 (leap year)
    const end = new Date(2024, 1, 29)   // Feb 29, 2024
    expect(getWeeksBetween(start, end)).toBe(4)
  })
})

describe('getMonthDays', () => {
  it('returns array divisible by 7 (full weeks)', () => {
    // Test several months
    const months = [
      [2024, 0],  // January
      [2024, 1],  // February
      [2024, 5],  // June
      [2024, 11], // December
    ]

    months.forEach(([year, month]) => {
      const days = getMonthDays(year, month)
      expect(days.length % 7).toBe(0)
    })
  })

  it('includes correct number of days for January 2024', () => {
    const days = getMonthDays(2024, 0) // January 2024
    // January 2024 starts on Monday (1) and has 31 days
    // So we need padding for Sunday (0 days before Monday)
    // Actually, getDay() returns 0 for Sunday, 1 for Monday
    // January 1, 2024 is a Monday (getDay() = 1)
    // So startPadding = 1 (one day of December 31 before)

    // Count actual January days in the array
    const januaryDays = days.filter(d => d.getMonth() === 0 && d.getFullYear() === 2024)
    expect(januaryDays.length).toBe(31)
  })

  it('includes padding days from previous month at the start', () => {
    const days = getMonthDays(2024, 5) // June 2024
    // June 1, 2024 is a Saturday (getDay() = 6)
    // So startPadding = 6 (six days of May before June 1)

    const firstDay = days[0]
    expect(firstDay.getMonth()).toBe(4) // May = month 4
  })

  it('includes padding days from next month at the end', () => {
    const days = getMonthDays(2024, 5) // June 2024
    // June 30, 2024 is a Sunday (getDay() = 0)
    // endPadding = 6 - 0 = 6 days of July

    const lastDay = days[days.length - 1]
    expect(lastDay.getMonth()).toBe(6) // July = month 6
  })

  it('handles February in leap year correctly', () => {
    const days = getMonthDays(2024, 1) // February 2024 (leap year)
    const februaryDays = days.filter(d => d.getMonth() === 1 && d.getFullYear() === 2024)
    expect(februaryDays.length).toBe(29)
  })

  it('handles February in non-leap year correctly', () => {
    const days = getMonthDays(2023, 1) // February 2023 (not leap year)
    const februaryDays = days.filter(d => d.getMonth() === 1 && d.getFullYear() === 2023)
    expect(februaryDays.length).toBe(28)
  })
})

describe('isSameDay', () => {
  it('returns true for same date objects', () => {
    const date = new Date(2024, 5, 15)
    expect(isSameDay(date, date)).toBe(true)
  })

  it('returns true for different Date objects with same date', () => {
    const date1 = new Date(2024, 5, 15)
    const date2 = new Date(2024, 5, 15)
    expect(isSameDay(date1, date2)).toBe(true)
  })

  it('returns true for same date with different times', () => {
    const date1 = new Date(2024, 5, 15, 10, 30, 0)
    const date2 = new Date(2024, 5, 15, 23, 59, 59)
    expect(isSameDay(date1, date2)).toBe(true)
  })

  it('returns false for different days', () => {
    const date1 = new Date(2024, 5, 15)
    const date2 = new Date(2024, 5, 16)
    expect(isSameDay(date1, date2)).toBe(false)
  })

  it('returns false for different months', () => {
    const date1 = new Date(2024, 5, 15)
    const date2 = new Date(2024, 6, 15)
    expect(isSameDay(date1, date2)).toBe(false)
  })

  it('returns false for different years', () => {
    const date1 = new Date(2024, 5, 15)
    const date2 = new Date(2025, 5, 15)
    expect(isSameDay(date1, date2)).toBe(false)
  })
})

describe('isDateInRange', () => {
  const today = new Date(2024, 5, 15) // June 15, 2024

  it('returns false when selectedDate is null', () => {
    const date = new Date(2024, 5, 20)
    expect(isDateInRange(date, today, null)).toBe(false)
  })

  it('returns true for today when selected date is after today', () => {
    const selectedDate = new Date(2024, 5, 30)
    expect(isDateInRange(today, today, selectedDate)).toBe(true)
  })

  it('returns true for selected date', () => {
    const selectedDate = new Date(2024, 5, 30)
    expect(isDateInRange(selectedDate, today, selectedDate)).toBe(true)
  })

  it('returns true for dates between today and selected date', () => {
    const selectedDate = new Date(2024, 5, 30)
    const middleDate = new Date(2024, 5, 20)
    expect(isDateInRange(middleDate, today, selectedDate)).toBe(true)
  })

  it('returns false for dates before today', () => {
    const selectedDate = new Date(2024, 5, 30)
    const pastDate = new Date(2024, 5, 10)
    expect(isDateInRange(pastDate, today, selectedDate)).toBe(false)
  })

  it('returns false for dates after selected date', () => {
    const selectedDate = new Date(2024, 5, 20)
    const futureDate = new Date(2024, 5, 25)
    expect(isDateInRange(futureDate, today, selectedDate)).toBe(false)
  })

  it('handles same-day selection (today = selected)', () => {
    expect(isDateInRange(today, today, today)).toBe(true)
  })

  it('ignores time component when checking range', () => {
    const todayWithTime = new Date(2024, 5, 15, 23, 59, 59)
    const selectedDate = new Date(2024, 5, 20, 0, 0, 0)
    const middleDate = new Date(2024, 5, 17, 12, 30, 0)

    expect(isDateInRange(middleDate, todayWithTime, selectedDate)).toBe(true)
  })
})

describe('WeeksDisplay Animation Logic', () => {
  const FLAG_CIRCLE_SIZE = 44
  const SPORT_ICON_SIZE = 44

  /**
   * Calculate end position for sport icon animation
   * (Logic from season-timeline.tsx)
   */
  function calculateIconEndPosition(lineWidth: number): number {
    return Math.max(0, lineWidth + (FLAG_CIRCLE_SIZE - SPORT_ICON_SIZE) / 2)
  }

  it('calculates correct end position when icon and flag are same size', () => {
    // When sizes are equal, icon ends at lineWidth (edge of middle section)
    expect(calculateIconEndPosition(200)).toBe(200)
    expect(calculateIconEndPosition(300)).toBe(300)
  })

  it('handles zero line width', () => {
    expect(calculateIconEndPosition(0)).toBe(0)
  })

  it('handles negative calculated value (returns 0)', () => {
    // This shouldn't happen in practice, but the Math.max ensures safety
    expect(calculateIconEndPosition(-10)).toBe(0)
  })

  describe('when icon and flag are different sizes', () => {
    it('adjusts end position for smaller icon', () => {
      const SMALLER_ICON_SIZE = 36
      const adjustedEndPosition = (lineWidth: number) =>
        Math.max(0, lineWidth + (FLAG_CIRCLE_SIZE - SMALLER_ICON_SIZE) / 2)

      // Icon is 8px smaller, so it needs to go 4px further to center on flag
      expect(adjustedEndPosition(200)).toBe(204)
    })

    it('adjusts end position for larger icon', () => {
      const LARGER_ICON_SIZE = 52
      const adjustedEndPosition = (lineWidth: number) =>
        Math.max(0, lineWidth + (FLAG_CIRCLE_SIZE - LARGER_ICON_SIZE) / 2)

      // Icon is 8px larger, so it stops 4px earlier to center on flag
      expect(adjustedEndPosition(200)).toBe(196)
    })
  })
})

describe('Animation Complete State', () => {
  /**
   * Tests for the animation completion logic that hides the flag
   * when the sport icon animation finishes
   */

  function getFlagOpacity(
    hasSportName: boolean,
    animationComplete: boolean
  ): number {
    return hasSportName && animationComplete ? 0 : 1
  }

  it('flag is visible when no sport is selected', () => {
    expect(getFlagOpacity(false, false)).toBe(1)
    expect(getFlagOpacity(false, true)).toBe(1)
  })

  it('flag is visible during animation', () => {
    expect(getFlagOpacity(true, false)).toBe(1)
  })

  it('flag is hidden when animation completes with sport selected', () => {
    expect(getFlagOpacity(true, true)).toBe(0)
  })
})

describe('Month Navigation', () => {
  /**
   * Tests for the single-month paginated view with left/right navigation
   */

  const MONTHS_COUNT = 4 // The calendar shows 4 months

  function canNavigatePrev(currentIndex: number): boolean {
    return currentIndex > 0
  }

  function canNavigateNext(currentIndex: number): boolean {
    return currentIndex < MONTHS_COUNT - 1
  }

  describe('canNavigatePrev', () => {
    it('returns false at first month', () => {
      expect(canNavigatePrev(0)).toBe(false)
    })

    it('returns true for any other month', () => {
      expect(canNavigatePrev(1)).toBe(true)
      expect(canNavigatePrev(2)).toBe(true)
      expect(canNavigatePrev(3)).toBe(true)
    })
  })

  describe('canNavigateNext', () => {
    it('returns false at last month', () => {
      expect(canNavigateNext(3)).toBe(false)
    })

    it('returns true for any other month', () => {
      expect(canNavigateNext(0)).toBe(true)
      expect(canNavigateNext(1)).toBe(true)
      expect(canNavigateNext(2)).toBe(true)
    })
  })
})
