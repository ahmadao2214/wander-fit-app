/**
 * Short meta lines shown under workout titles and in the warmup row.
 * Zero counts are left out instead of printed ("~0 min · 0 phases").
 */

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

/**
 * "~8 min · 3 phases · 9 exercises", dropping any part that is zero.
 * A warmup whose exercises carry no phase reads "1 exercise".
 */
export function warmupSummary({
  durationMin,
  phaseCount,
  exerciseCount,
}: {
  durationMin: number
  phaseCount: number
  exerciseCount: number
}): string {
  const parts: string[] = []
  if (durationMin > 0) parts.push(`~${durationMin} min`)
  if (phaseCount > 0) parts.push(plural(phaseCount, 'phase', 'phases'))
  if (exerciseCount > 0) parts.push(plural(exerciseCount, 'exercise', 'exercises'))
  return parts.join(' · ')
}

/**
 * The meta line under a workout's title: "~40 min · 7 exercises · Moderate".
 * Parts with no value are left out.
 */
export function workoutMetaLine({
  minutes,
  exerciseCount,
  intensity,
}: {
  minutes?: number
  exerciseCount?: number
  intensity?: string
}): string {
  const parts: string[] = []
  if (minutes && minutes > 0) parts.push(`~${minutes} min`)
  if (exerciseCount && exerciseCount > 0) parts.push(plural(exerciseCount, 'exercise', 'exercises'))
  if (intensity) parts.push(intensity)
  return parts.join(' · ')
}
