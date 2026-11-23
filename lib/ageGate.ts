/**
 * The First Run age gate: a birth month and year in, an age group out.
 * Pure, so the screen can't drift from the rule. The raw month and year stay
 * in the screen's state; only the age group is ever saved.
 */
import type { AgeGroup } from '../types'

/** The youngest age WanderFit is available for. */
export const MINIMUM_AGE = 14

/** Birth years older than this many years are treated as a typo. */
const MAX_AGE = 120

export type BirthDateResult =
  | { eligible: false; reason: 'under_minimum_age' | 'invalid_birth_date' }
  | { eligible: true; ageGroup: AgeGroup; requiresGuardianNotice: boolean }

/**
 * Whole years old at `now`, from a birth month (1–12) and year. With no day,
 * the birthday counts from the first of the birth month: an athlete born in
 * May 2012 turns 14 in May 2026, not April. Local time.
 */
export function ageInYears(month: number, year: number, now: Date): number {
  const currentMonth = now.getMonth() + 1
  return now.getFullYear() - year - (currentMonth < month ? 1 : 0)
}

/** True for a month and year that could be a real birth date at `now`. */
export function isValidBirthDate(month: number, year: number, now: Date): boolean {
  if (!Number.isInteger(month) || month < 1 || month > 12) return false
  if (!Number.isInteger(year)) return false
  const age = ageInYears(month, year, now)
  return age >= 0 && age <= MAX_AGE
}

export function ageGroupForAge(age: number): AgeGroup {
  if (age <= 17) return '14-17'
  if (age <= 35) return '18-35'
  return '36+'
}

export function evaluateBirthDate(month: number, year: number, now: Date): BirthDateResult {
  if (!isValidBirthDate(month, year, now)) return { eligible: false, reason: 'invalid_birth_date' }
  const age = ageInYears(month, year, now)
  if (age < MINIMUM_AGE) return { eligible: false, reason: 'under_minimum_age' }
  const ageGroup = ageGroupForAge(age)
  return { eligible: true, ageGroup, requiresGuardianNotice: ageGroup === '14-17' }
}
