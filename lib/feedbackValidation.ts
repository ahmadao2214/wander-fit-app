/**
 * Shared validation constants, category/severity metadata, and sanitizers
 * for in-app ratings, bug reports, and feature requests.
 */

export const FEEDBACK_TITLE_MAX = 120
export const FEEDBACK_DETAILS_MAX = 2000
export const FEEDBACK_RATING_NOTE_MAX = 1000
export const FEEDBACK_ERROR_CODE_MAX = 64
export const FEEDBACK_POSTHOG_SESSION_MAX = 128

export const FEEDBACK_RATE_LIMIT_MAX = 10
export const FEEDBACK_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

export type BugSeverity = 'blocking' | 'annoying' | 'minor'
export type BugSource = 'profile' | 'error_boundary' | 'workout_detail' | 'workout_execute'
export type FeatureCategory =
  | 'workouts_exercises'
  | 'program_schedule'
  | 'progress_maxes'
  | 'equipment_gym_home'
  | 'app_experience'
  | 'other'
export type RatingTrigger = 'post_workout_prompt' | 'profile_manual'

export const BUG_SEVERITY_OPTIONS: ReadonlyArray<{
  value: BugSeverity
  label: string
  hint: string
}> = [
  { value: 'blocking', label: 'Blocking', hint: 'Stopped my workout' },
  { value: 'annoying', label: 'Annoying', hint: 'Messed up or confusing' },
  { value: 'minor', label: 'Minor', hint: 'Small visual or text issue' },
]

export const FEATURE_CATEGORY_OPTIONS: ReadonlyArray<{
  value: FeatureCategory
  label: string
}> = [
  { value: 'workouts_exercises', label: 'Workouts & Exercises' },
  { value: 'program_schedule', label: 'Program & Schedule' },
  { value: 'progress_maxes', label: 'Progress & Maxes' },
  { value: 'equipment_gym_home', label: 'Equipment & Gym/Home' },
  { value: 'app_experience', label: 'App Experience' },
  { value: 'other', label: 'Other' },
]

export function validateStars(stars: number): number {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new Error('Rating must be a whole number between 1 and 5.')
  }
  return stars
}

export function normalizeRequiredText(
  value: string,
  fieldLabel: string,
  maxLength: number
): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    throw new Error(`${fieldLabel} is required.`)
  }
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldLabel} must be ${maxLength} characters or fewer.`)
  }
  return trimmed
}

export function normalizeOptionalText(
  value: string | undefined,
  fieldLabel: string,
  maxLength: number
): string | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (trimmed.length === 0) return undefined
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldLabel} must be ${maxLength} characters or fewer.`)
  }
  return trimmed
}

export function truncateOptionalText(
  value: string | undefined,
  maxLength: number
): string | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (trimmed.length === 0) return undefined
  return trimmed.slice(0, maxLength)
}
