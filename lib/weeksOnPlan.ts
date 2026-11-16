/**
 * Weeks on plan: the training streak, derived from completed sessions.
 *
 * Decided with Azhar on 2026-11-16 (design audit F06). A streak counts weeks,
 * not days, so it means the same thing for a 2-day and a 7-day program:
 * - A week runs Monday to Sunday in the athlete's local time.
 * - A week is on plan when the athlete completed at least as many workouts as
 *   they schedule per week, on any days. A Wednesday session done on Thursday
 *   still counts.
 * - A finished week below that count ends the streak. It isn't shown, so the
 *   number quietly drops out (callers show it only from 2 up).
 * - Some weeks never end it, even when they're short: the week in progress,
 *   the week of the first workout (a program can start midweek), and weeks
 *   while the program is paused.
 *
 * Nothing is stored. The query recomputes this from the sessions, so there is
 * no counter that can drift.
 *
 * Days are bucketed with the athlete's current UTC offset
 * (`Date#getTimezoneOffset()`, minutes, positive west of UTC). A session done
 * within an hour of midnight on the far side of a DST change can land on the
 * neighbouring day, which only matters on a Sunday night.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_MINUTE = 60 * 1000
/** 1970-01-01 was a Thursday; day 4 (Jan 5) was the first Monday */
const FIRST_MONDAY = 4

export interface WeeksOnPlanInput {
  /** completedAt timestamps (ms) of the program's completed sessions */
  completedAt: readonly number[]
  /** Workouts the athlete schedules per week (1–7) */
  workoutsPerWeek: number
  /** The athlete's local date today, "YYYY-MM-DD" */
  today: string
  /** The athlete's UTC offset, as returned by Date#getTimezoneOffset() */
  timezoneOffsetMinutes: number
  /** When the program was paused, if it is paused now */
  pausedAt?: number
}

/** Days since 1970-01-01 of the local calendar day a timestamp falls on */
export function toLocalDayNumber(timestamp: number, timezoneOffsetMinutes: number): number {
  return Math.floor((timestamp - timezoneOffsetMinutes * MS_PER_MINUTE) / MS_PER_DAY)
}

/** Days since 1970-01-01 of a "YYYY-MM-DD" date */
export function dateToDayNumber(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY)
}

/** Monday-to-Sunday week number of a day number */
function weekOf(dayNumber: number): number {
  return Math.floor((dayNumber - FIRST_MONDAY) / 7)
}

/**
 * The athlete's local date and UTC offset, as `getProgressSummary` takes them.
 * Passing the date also makes the query re-run when the day changes.
 */
export function localDayArgs(now: Date = new Date()): {
  today: string
  timezoneOffsetMinutes: number
} {
  const timezoneOffsetMinutes = now.getTimezoneOffset()
  const day = toLocalDayNumber(now.getTime(), timezoneOffsetMinutes)
  return {
    today: new Date(day * MS_PER_DAY).toISOString().slice(0, 10),
    timezoneOffsetMinutes,
  }
}

/** Consecutive weeks on plan, up to and including this week if it's on plan */
export function weeksOnPlan({
  completedAt,
  workoutsPerWeek,
  today,
  timezoneOffsetMinutes,
  pausedAt,
}: WeeksOnPlanInput): number {
  if (completedAt.length === 0) return 0
  const target = Math.min(7, Math.max(1, Math.round(workoutsPerWeek) || 1))

  const perWeek = new Map<number, number>()
  for (const ts of completedAt) {
    const week = weekOf(toLocalDayNumber(ts, timezoneOffsetMinutes))
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1)
  }

  // Walk only the weeks with sessions, so the work is bounded by the session
  // count whatever dates the caller sends
  const weeks = [...perWeek.keys()].sort((a, b) => a - b)
  const firstWeek = weeks[0]
  const currentWeek = weekOf(dateToDayNumber(today))
  const pausedWeek =
    pausedAt === undefined ? Infinity : weekOf(toLocalDayNumber(pausedAt, timezoneOffsetMinutes))
  // A short week ends the run once it's over, unless the program was paused.
  // Sessions dated after "today" (clock skew) still count.
  const ends = (week: number) => week < currentWeek && week < pausedWeek

  let run = 0
  let previous = firstWeek - 1
  for (const week of weeks) {
    // An empty week between two trained ones
    if (week - previous > 1 && ends(previous + 1)) run = 0
    if ((perWeek.get(week) ?? 0) >= target) {
      run++
    } else if (week !== firstWeek && ends(week)) {
      run = 0
    }
    previous = week
  }
  // An empty week since the last trained one
  if (ends(previous + 1)) run = 0
  return run
}
