/**
 * Calendar Utilities for Workout Calendar Feature
 *
 * Maps workout coordinates (phase, week, day) to actual calendar dates
 * based on user's selected training days and program start date.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type Phase = 'GPP' | 'SPP' | 'SSP'

export interface WorkoutSlot {
  phase: Phase
  week: number // 1-4 within phase
  day: number // 1-7 within week (workout day, not calendar day)
}

export interface CalendarWorkout {
  date: Date
  slot: WorkoutSlot
  absoluteWorkoutIndex: number // 0-based index across entire program
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const PHASE_ORDER: Phase[] = ['GPP', 'SPP', 'SSP']
export const DEFAULT_WEEKS_PER_PHASE = 4 // Fallback for backwards compatibility

// Day names for display
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const DAY_NAMES_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

// ─────────────────────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the start of a day (midnight) in local timezone
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Get the start of the week (Sunday) for a given date
 */
export function startOfWeek(date: Date): Date {
  const result = startOfDay(date)
  const day = result.getDay()
  result.setDate(result.getDate() - day)
  return result
}

/**
 * Get the end of the week (Saturday) for a given date
 */
export function endOfWeek(date: Date): Date {
  const result = startOfWeek(date)
  result.setDate(result.getDate() + 6)
  return result
}

/**
 * Check if two dates are the same calendar day
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Check if two dates are in the same calendar week (Sunday-Saturday)
 */
export function isSameWeek(a: Date, b: Date): boolean {
  return isSameDay(startOfWeek(a), startOfWeek(b))
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

/**
 * Format date as ISO string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse ISO date string to Date
 */
export function parseDateISO(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKOUT DATE MAPPING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the next occurrence of a specific day of week on or after a given date
 *
 * @param startDate - The date to start searching from
 * @param dayOfWeek - Day of week (0=Sunday, 6=Saturday)
 * @returns The next occurrence of that day
 */
export function findNextDayOfWeek(startDate: Date, dayOfWeek: number): Date {
  const result = startOfDay(startDate)
  const currentDay = result.getDay()
  const daysUntil = (dayOfWeek - currentDay + 7) % 7
  result.setDate(result.getDate() + daysUntil)
  return result
}

/**
 * Find the soonest training day on or after the start date
 * This handles the case where the program is created mid-week
 *
 * @param startDate - The date to start looking from
 * @param trainingDays - Array of day indices (0=Sun, 6=Sat), must be sorted
 * @returns Object with the first training date and the index in trainingDays
 */
export function findFirstTrainingDate(
  startDate: Date,
  trainingDays: number[]
): { date: Date; dayIndex: number } {
  const start = startOfDay(startDate)
  const startDayOfWeek = start.getDay()

  // Find the first training day on or after startDayOfWeek
  let dayIndex = trainingDays.findIndex(d => d >= startDayOfWeek)

  if (dayIndex === -1) {
    // All training days are before startDayOfWeek in the week
    // So we wrap to the first training day next week
    dayIndex = 0
    const daysUntil = (trainingDays[0] - startDayOfWeek + 7) % 7
    const date = addDays(start, daysUntil === 0 ? 7 : daysUntil)
    return { date, dayIndex }
  }

  // Found a training day in the current week
  const daysUntil = trainingDays[dayIndex] - startDayOfWeek
  const date = addDays(start, daysUntil)
  return { date, dayIndex }
}

/**
 * Get the date for a specific workout given program parameters
 *
 * @param programStartDate - When the program started (user_programs.createdAt)
 * @param trainingDays - Array of training day indices [1, 3, 5] for Mon/Wed/Fri (0=Sun, 6=Sat)
 * @param slot - The workout slot (phase, week, day)
 * @param weeksPerPhase - Number of weeks per phase (defaults to 4 for backwards compatibility)
 * @returns The calendar date for this workout
 */
export function getDateForWorkout(
  programStartDate: Date,
  trainingDays: number[],
  slot: WorkoutSlot,
  weeksPerPhase: number = DEFAULT_WEEKS_PER_PHASE
): Date {
  // Validate inputs
  if (trainingDays.length === 0) {
    throw new Error('trainingDays must not be empty')
  }

  // Sort training days to ensure consistent ordering
  const sortedDays = [...trainingDays].sort((a, b) => a - b)

  // Calculate total workout index (0-based)
  // Phase index * (weeks per phase * workouts per week) + (week - 1) * workouts per week + (day - 1)
  const phaseIndex = PHASE_ORDER.indexOf(slot.phase)
  if (phaseIndex === -1) {
    throw new Error(`Invalid phase: ${slot.phase}`)
  }

  const workoutsPerWeek = sortedDays.length
  const absoluteIndex =
    phaseIndex * weeksPerPhase * workoutsPerWeek +
    (slot.week - 1) * workoutsPerWeek +
    (slot.day - 1)

  const start = startOfDay(programStartDate)

  // Use findFirstTrainingDate to handle mid-week program starts
  // This ensures workouts start on the soonest training day (could be today)
  const { date: firstTrainingDate, dayIndex: startDayIndex } = findFirstTrainingDate(start, sortedDays)

  let workoutCount = 0
  let currentDate = firstTrainingDate
  let currentDayIndex = startDayIndex

  while (workoutCount < absoluteIndex) {
    currentDayIndex = (currentDayIndex + 1) % sortedDays.length
    if (currentDayIndex === 0) {
      // Wrapped around to start of week - move to next calendar week
      currentDate = addDays(
        currentDate,
        7 - (sortedDays[sortedDays.length - 1] - sortedDays[0])
      )
      currentDate = findNextDayOfWeek(currentDate, sortedDays[0])
    } else {
      // Move to next training day in same week
      const daysDiff = sortedDays[currentDayIndex] - sortedDays[currentDayIndex - 1]
      currentDate = addDays(currentDate, daysDiff)
    }
    workoutCount++
  }

  return currentDate
}

/**
 * Get the workout slot for a given date
 *
 * @param programStartDate - When the program started
 * @param trainingDays - Array of training day indices
 * @param date - The date to look up
 * @param weeksPerPhase - Number of weeks per phase (defaults to 4 for backwards compatibility)
 * @returns The workout slot for this date, or null if no workout on this date
 */
export function getWorkoutForDate(
  programStartDate: Date,
  trainingDays: number[],
  date: Date,
  weeksPerPhase: number = DEFAULT_WEEKS_PER_PHASE
): WorkoutSlot | null {
  const targetDate = startOfDay(date)
  const targetDayOfWeek = targetDate.getDay()

  // Check if this is a training day
  const sortedDays = [...trainingDays].sort((a, b) => a - b)
  if (!sortedDays.includes(targetDayOfWeek)) {
    return null // Not a training day
  }

  const start = startOfDay(programStartDate)

  // Use findFirstTrainingDate to handle mid-week program starts
  const { date: firstTrainingDate, dayIndex: startDayIndex } = findFirstTrainingDate(start, sortedDays)

  if (targetDate < firstTrainingDate) {
    return null // Before program start
  }

  // Count how many workouts from start to this date
  let workoutIndex = 0
  let currentDate = firstTrainingDate
  let currentDayIndex = startDayIndex

  // Increase limit for longer programs (max 8 weeks × 3 phases × 7 days = 168)
  const maxWorkouts = weeksPerPhase * PHASE_ORDER.length * sortedDays.length + 50

  while (!isSameDay(currentDate, targetDate)) {
    currentDayIndex = (currentDayIndex + 1) % sortedDays.length
    if (currentDayIndex === 0) {
      // Moving to next week - jump to the first training day
      currentDate = addDays(
        currentDate,
        7 - (sortedDays[sortedDays.length - 1] - sortedDays[0])
      )
      currentDate = findNextDayOfWeek(currentDate, sortedDays[0])
    } else {
      const daysDiff = sortedDays[currentDayIndex] - sortedDays[currentDayIndex - 1]
      currentDate = addDays(currentDate, daysDiff)
    }
    workoutIndex++

    if (workoutIndex > maxWorkouts) {
      return null
    }
  }

  // Convert workout index back to (phase, week, day)
  const workoutsPerWeek = sortedDays.length
  const totalWorkoutsPerPhase = weeksPerPhase * workoutsPerWeek

  const phaseIndex = Math.floor(workoutIndex / totalWorkoutsPerPhase)
  if (phaseIndex >= PHASE_ORDER.length) {
    return null // Beyond program end
  }

  const withinPhaseIndex = workoutIndex % totalWorkoutsPerPhase
  const week = Math.floor(withinPhaseIndex / workoutsPerWeek) + 1
  const day = (withinPhaseIndex % workoutsPerWeek) + 1

  return {
    phase: PHASE_ORDER[phaseIndex],
    week,
    day,
  }
}

/**
 * Generate all workout dates for a date range
 *
 * @param programStartDate - When the program started
 * @param trainingDays - Array of training day indices
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @param weeksPerPhase - Number of weeks per phase (defaults to 4)
 * @returns Array of calendar workouts within the range
 */
export function getWorkoutsInRange(
  programStartDate: Date,
  trainingDays: number[],
  startDate: Date,
  endDate: Date,
  weeksPerPhase: number = DEFAULT_WEEKS_PER_PHASE
): CalendarWorkout[] {
  const workouts: CalendarWorkout[] = []
  const sortedDays = [...trainingDays].sort((a, b) => a - b)
  const workoutsPerWeek = sortedDays.length

  // Iterate through each day in range
  let currentDate = startOfDay(startDate)
  const end = startOfDay(endDate)

  while (currentDate <= end) {
    const slot = getWorkoutForDate(programStartDate, trainingDays, currentDate, weeksPerPhase)
    if (slot) {
      const phaseIndex = PHASE_ORDER.indexOf(slot.phase)
      const absoluteWorkoutIndex =
        phaseIndex * weeksPerPhase * workoutsPerWeek +
        (slot.week - 1) * workoutsPerWeek +
        (slot.day - 1)

      workouts.push({
        date: new Date(currentDate),
        slot,
        absoluteWorkoutIndex,
      })
    }
    currentDate = addDays(currentDate, 1)
  }

  return workouts
}

/**
 * Get the total number of workouts in the program
 *
 * @param trainingDays - Array of training day indices
 * @param weeksPerPhase - Number of weeks per phase (defaults to 4)
 * @returns Total workout count
 */
export function getTotalWorkouts(
  trainingDays: number[],
  weeksPerPhase: number = DEFAULT_WEEKS_PER_PHASE
): number {
  return PHASE_ORDER.length * weeksPerPhase * trainingDays.length
}

/**
 * Get program end date
 *
 * @param programStartDate - When the program started
 * @param trainingDays - Array of training day indices
 * @param weeksPerPhase - Number of weeks per phase (defaults to 4)
 * @returns The date of the last workout
 */
export function getProgramEndDate(
  programStartDate: Date,
  trainingDays: number[],
  weeksPerPhase: number = DEFAULT_WEEKS_PER_PHASE
): Date {
  return getDateForWorkout(programStartDate, trainingDays, {
    phase: 'SSP',
    week: weeksPerPhase,
    day: trainingDays.length,
  }, weeksPerPhase)
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEK VIEW HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all days in a week (Sunday-Saturday)
 *
 * @param date - Any date within the week
 * @returns Array of 7 dates for the week
 */
export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/**
 * Get the week date range string (e.g., "Feb 2 - 8, 2026")
 *
 * @param date - Any date within the week
 * @returns Formatted date range string
 */
export function formatWeekRange(date: Date): string {
  const start = startOfWeek(date)
  const end = endOfWeek(date)

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })

  if (start.getMonth() === end.getMonth()) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`
  } else if (start.getFullYear() === end.getFullYear()) {
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${start.getFullYear()}`
  } else {
    return `${startMonth} ${start.getDate()}, ${start.getFullYear()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTH VIEW HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all days to display in a month calendar view (includes padding from adjacent months)
 *
 * @param year - Year
 * @param month - Month (0-11)
 * @returns Array of dates for the calendar grid (always starts on Sunday)
 */
export function getMonthCalendarDays(year: number, month: number): Date[] {
  const days: Date[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Add padding days from previous month
  const startPadding = firstDay.getDay()
  for (let i = startPadding - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i))
  }

  // Add all days of the month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i))
  }

  // Add padding days from next month to complete the grid
  const endPadding = 6 - lastDay.getDay()
  for (let i = 1; i <= endPadding; i++) {
    days.push(new Date(year, month + 1, i))
  }

  return days
}

/**
 * Format month and year (e.g., "February 2026")
 *
 * @param date - Any date within the month
 * @returns Formatted month/year string
 */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
