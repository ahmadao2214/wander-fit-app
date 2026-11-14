/**
 * Pure helpers for the Today tab.
 */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Saturday, Nov 14": the Today heading. Built by hand so it doesn't depend on the device's Intl data. */
export function todayHeading(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`
}

export type WeekSegment = 'done' | 'current' | 'upcoming'

/**
 * One segment per week of the current phase: weeks before the current one
 * are done, the current week is current, the rest are upcoming.
 */
export function phaseWeekSegments(currentWeek: number, weeksPerPhase: number): WeekSegment[] {
  const total = Math.max(1, Math.floor(weeksPerPhase))
  const current = Math.min(Math.max(1, Math.floor(currentWeek)), total)
  return Array.from({ length: total }, (_, index) => {
    const week = index + 1
    if (week < current) return 'done'
    if (week === current) return 'current'
    return 'upcoming'
  })
}

/**
 * "3 workouts done · 2-day streak". Null before the first workout, so the
 * tab doesn't show a row of zeros.
 */
export function progressCaption({
  workoutsCompleted,
  currentStreak,
}: {
  workoutsCompleted: number
  currentStreak: number
}): string | null {
  if (workoutsCompleted <= 0) return null
  const parts = [`${workoutsCompleted} ${workoutsCompleted === 1 ? 'workout' : 'workouts'} done`]
  if (currentStreak > 1) parts.push(`${currentStreak}-day streak`)
  return parts.join(' · ')
}

/** Exercises outside the warmup: what the athlete reads as "7 exercises". */
export function countMainExercises(
  exercises: readonly { section?: string; notes?: string }[] | undefined
): number {
  if (!exercises) return 0
  return exercises.filter((ex) => ex.section !== 'warmup' && !(!ex.section && ex.notes === 'Warmup')).length
}
