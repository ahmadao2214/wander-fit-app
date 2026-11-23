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
 * "5 workouts done · 3 weeks on plan". Null before the first workout, so the
 * tab doesn't show a row of zeros. Weeks on plan (lib/weeksOnPlan) shows from
 * 2 up and is left out otherwise: never "0 weeks", never "streak lost".
 * Only History passes it; Today stays about the next session.
 */
export function progressCaption({
  workoutsCompleted,
  weeksOnPlan = 0,
}: {
  workoutsCompleted: number
  weeksOnPlan?: number
}): string | null {
  if (workoutsCompleted <= 0) return null
  const parts = [`${workoutsCompleted} ${workoutsCompleted === 1 ? 'workout' : 'workouts'} done`]
  if (weeksOnPlan > 1) parts.push(`${weeksOnPlan} weeks on plan`)
  return parts.join(' · ')
}

/** Exercises outside the warmup: what the athlete reads as "7 exercises". */
export function countMainExercises(
  exercises: readonly { section?: string; notes?: string }[] | undefined
): number {
  if (!exercises) return 0
  return exercises.filter(
    (ex) => ex.section !== 'warmup' && !(!ex.section && ex.notes === 'Warmup')
  ).length
}

/** Milliseconds from `date` until the next local midnight. */
export function msUntilNextMidnight(date: Date): number {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  return next.getTime() - date.getTime()
}
