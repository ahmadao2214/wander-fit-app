/**
 * Training Streaks & Consistency
 *
 * Pure helpers that derive consistency metrics from completed workout
 * sessions at read time. Used by `userPrograms.getProgressSummary`; nothing is
 * stored, so there is no counter to drift out of sync with the sessions.
 *
 * STREAK RULE
 * A streak counts training days, judged against the athlete's scheduled
 * training days (intake `selectedTrainingDays`), not every calendar day:
 * - Each local calendar day with at least one completed session counts once
 *   (two sessions on the same day are still one day).
 * - Rest days (days not in the schedule) never break a streak.
 * - A workout completed on a rest day still counts toward the streak (e.g. a
 *   workout swapped onto a rest day), but it does not make up for a missed
 *   scheduled day.
 * - A scheduled training day that ended without a completed session breaks
 *   the streak.
 * - Today never breaks the streak: if today is a training day that hasn't
 *   been trained yet, the streak carries over from earlier days.
 *
 * DAYS & TIMEZONES
 * "Day" means the athlete's local calendar day. Timestamps are bucketed with
 * the athlete's current UTC offset (`Date#getTimezoneOffset()`, minutes,
 * positive west of UTC). A session finished within an hour of midnight on the
 * other side of a DST change may land on the neighbouring day; that is
 * accepted in exchange for not needing timezone data on the server.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_MINUTE = 60 * 1000

/** Every day of the week, used when no training days are given */
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

export interface StreakInput {
  /** completedAt timestamps (ms) of the athlete's completed sessions */
  completedAt: number[]
  /** Scheduled training days of the week (0=Sun, 6=Sat) */
  trainingDays: number[]
  /** The athlete's UTC offset, as returned by Date#getTimezoneOffset() */
  timezoneOffsetMinutes: number
  /** The athlete's local date today, "YYYY-MM-DD" */
  today: string
}

export interface StreakResult {
  currentStreak: number
  longestStreak: number
}

// ─────────────────────────────────────────────────────────────────────────────
// DAY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Days since 1970-01-01 of the local calendar day a timestamp falls on
 */
export function toLocalDayNumber(timestamp: number, timezoneOffsetMinutes: number): number {
  return Math.floor((timestamp - timezoneOffsetMinutes * MS_PER_MINUTE) / MS_PER_DAY)
}

/**
 * Local calendar date of a timestamp as "YYYY-MM-DD"
 */
export function toLocalDateISO(timestamp: number, timezoneOffsetMinutes: number): string {
  const day = toLocalDayNumber(timestamp, timezoneOffsetMinutes)
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10)
}

/**
 * Days since 1970-01-01 of a "YYYY-MM-DD" date
 */
export function dateISOToDayNumber(dateISO: string): number {
  const [year, month, day] = dateISO.split('-').map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY)
}

/**
 * Day of the week (0=Sun, 6=Sat) of a day number. 1970-01-01 was a Thursday.
 */
function dayOfWeek(dayNumber: number): number {
  return (((dayNumber + 4) % 7) + 7) % 7
}

/**
 * The athlete's local date and UTC offset right now, as passed to
 * `userPrograms.getProgressSummary`
 */
export function getLocalDayArgs(now: Date = new Date()): {
  today: string
  timezoneOffsetMinutes: number
} {
  const timezoneOffsetMinutes = now.getTimezoneOffset()
  return {
    today: toLocalDateISO(now.getTime(), timezoneOffsetMinutes),
    timezoneOffsetMinutes,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// METRICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Current and longest streak of training days (see STREAK RULE above)
 */
export function calculateStreaks({
  completedAt,
  trainingDays,
  timezoneOffsetMinutes,
  today,
}: StreakInput): StreakResult {
  const trainedDays = new Set(
    completedAt.map((ts) => toLocalDayNumber(ts, timezoneOffsetMinutes))
  )
  if (trainedDays.size === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  const validDays = trainingDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  const scheduled = new Set(validDays.length > 0 ? validDays : ALL_DAYS)

  const todayDay = dateISOToDayNumber(today)
  const firstDay = Math.min(...trainedDays)
  // Sessions dated after "today" (clock skew) still count
  const lastDay = Math.max(todayDay, ...trainedDays)

  let run = 0
  let longest = 0
  for (let day = firstDay; day <= lastDay; day++) {
    if (trainedDays.has(day)) {
      run++
      longest = Math.max(longest, run)
    } else if (day < todayDay && scheduled.has(dayOfWeek(day))) {
      run = 0
    }
  }

  return { currentStreak: run, longestStreak: longest }
}

/**
 * Completed sessions per week since the program started, to one decimal.
 * The first week counts as a full week so early averages aren't inflated.
 */
export function calculateAverageWorkoutsPerWeek({
  completedCount,
  programStartedAt,
  timezoneOffsetMinutes,
  today,
}: {
  completedCount: number
  programStartedAt: number
  timezoneOffsetMinutes: number
  today: string
}): number {
  if (completedCount <= 0) return 0
  const startDay = toLocalDayNumber(programStartedAt, timezoneOffsetMinutes)
  const daysElapsed = dateISOToDayNumber(today) - startDay + 1
  const weeksElapsed = Math.max(1, daysElapsed / 7)
  return Math.round((completedCount / weeksElapsed) * 10) / 10
}
