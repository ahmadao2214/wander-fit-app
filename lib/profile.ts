/**
 * Baseline facts on Profile, in words rather than stat tiles (design audit
 * F06: Profile holds settings and baseline information, not a scoreboard).
 */

/**
 * Years of training, in the same buckets the First Run asks for. Zero is
 * "New to training", not a "0" on a tile.
 */
export function experienceLabel(years: number): string {
  if (years <= 0) return 'New to training'
  if (years < 3) return '1–2 years'
  return '3+ years'
}

/** "3 a week" */
export function trainingDaysLabel(daysPerWeek: number): string {
  return `${daysPerWeek} a week`
}
