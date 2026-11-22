import type { SanitizedProperties, TelemetryPrimitive } from './telemetryTypes'

export type FirstRunStepName = 'promise' | 'sport' | 'season' | 'days' | 'about' | 'reveal'

export type AuthMethod = 'apple' | 'google' | 'email' | 'existing_session'

export type WorkoutStartTrigger = 'warmup_completed' | 'first_set_logged'

export type FeedbackKind = 'rating' | 'bug_report' | 'feature_request'

export type FeedbackSeverity = 'blocking' | 'annoying' | 'minor'

export type FeedbackCategory =
  | 'workouts_exercises'
  | 'program_schedule'
  | 'progress_maxes'
  | 'equipment_gym_home'
  | 'app_experience'
  | 'other'

export type FeedbackSource =
  | 'profile'
  | 'error_boundary'
  | 'workout_detail'
  | 'workout_execute'

export type CanonicalAnalyticsEvent =
  | '$screen'
  | 'first_run_step_viewed'
  | 'first_run_step_advanced'
  | 'first_run_save_sheet_opened'
  | 'first_run_completed'
  | 'workout_opened'
  | 'workout_started'
  | 'workout_completed'
  | 'workout_paused'
  | 'workout_abandoned'
  | 'feedback_submitted'

export interface ScreenViewedProps {
  screen_name: string
}

export interface FirstRunStepViewedProps {
  step: FirstRunStepName
  step_index: number
}

export interface FirstRunStepAdvancedProps {
  step: FirstRunStepName
  step_index: number
  sport_category_id?: number
  training_days_per_week?: number
  weeks_until_season?: number
  age_group?: '14-17' | '18-35' | '36+'
}

export interface FirstRunSaveSheetOpenedProps {
  has_draft: boolean
}

export interface FirstRunCompletedProps {
  auth_method: AuthMethod
  kept_existing_program: boolean
  sport_category_id?: number
  age_group?: '14-17' | '18-35' | '36+'
}

export interface WorkoutOpenedProps {
  phase: 'GPP' | 'SPP' | 'SSP'
  week: number
  day: number
  intensity: 'Low' | 'Moderate' | 'High'
  is_redo: boolean
  has_custom_order: boolean
}

export interface WorkoutStartedProps {
  trigger: WorkoutStartTrigger
  phase: 'GPP' | 'SPP' | 'SSP'
  week: number
  day: number
  intensity: 'Low' | 'Moderate' | 'High'
  resumed: boolean
}

export interface WorkoutCompletedProps {
  phase: 'GPP' | 'SPP' | 'SSP'
  week: number
  day: number
  intensity: 'Low' | 'Moderate' | 'High'
  duration_seconds: number
  sets_completed: number
  sets_skipped: number
  triggers_reassessment: boolean
}

export interface WorkoutPausedProps {
  phase: 'GPP' | 'SPP' | 'SSP'
  week: number
  day: number
  elapsed_seconds: number
  sets_completed: number
}

export interface WorkoutAbandonedProps {
  phase?: 'GPP' | 'SPP' | 'SSP'
  week?: number
  day?: number
}

export interface FeedbackSubmittedProps {
  kind: FeedbackKind
  stars?: number
  severity?: FeedbackSeverity | string
  category?: FeedbackCategory | string
  source?: FeedbackSource | string
}

export const SHARED_PROPERTY_KEYS = new Set<string>(['platform', 'app_version'])

export const EVENT_PROPERTY_ALLOWLIST: Record<CanonicalAnalyticsEvent, ReadonlySet<string>> = {
  $screen: new Set(['screen_name']),
  first_run_step_viewed: new Set(['step', 'step_index']),
  first_run_step_advanced: new Set([
    'step',
    'step_index',
    'sport_category_id',
    'training_days_per_week',
    'weeks_until_season',
    'age_group',
  ]),
  first_run_save_sheet_opened: new Set(['has_draft']),
  first_run_completed: new Set([
    'auth_method',
    'kept_existing_program',
    'sport_category_id',
    'age_group',
  ]),
  workout_opened: new Set([
    'phase',
    'week',
    'day',
    'intensity',
    'is_redo',
    'has_custom_order',
  ]),
  workout_started: new Set([
    'trigger',
    'phase',
    'week',
    'day',
    'intensity',
    'resumed',
  ]),
  workout_completed: new Set([
    'phase',
    'week',
    'day',
    'intensity',
    'duration_seconds',
    'sets_completed',
    'sets_skipped',
    'triggers_reassessment',
  ]),
  workout_paused: new Set([
    'phase',
    'week',
    'day',
    'elapsed_seconds',
    'sets_completed',
  ]),
  workout_abandoned: new Set(['phase', 'week', 'day']),
  feedback_submitted: new Set(['kind', 'stars', 'severity', 'category', 'source']),
}

/**
 * Finite value sets for every categorical property so free-text or PII can
 * NEVER leak through an allowlisted string field.
 */
const ENUM_PROPERTY_VALUES: Record<string, ReadonlySet<string>> = {
  platform: new Set(['ios', 'android', 'web']),
  step: new Set(['promise', 'sport', 'season', 'days', 'about', 'reveal']),
  auth_method: new Set(['apple', 'google', 'email', 'existing_session']),
  age_group: new Set(['14-17', '18-35', '36+']),
  phase: new Set(['GPP', 'SPP', 'SSP']),
  intensity: new Set(['Low', 'Moderate', 'High']),
  trigger: new Set(['warmup_completed', 'first_set_logged']),
  kind: new Set(['rating', 'bug_report', 'feature_request']),
  severity: new Set(['blocking', 'annoying', 'minor']),
  category: new Set([
    'workouts_exercises',
    'program_schedule',
    'progress_maxes',
    'equipment_gym_home',
    'app_experience',
    'other',
  ]),
  source: new Set(['profile', 'error_boundary', 'workout_detail', 'workout_execute']),
}

/**
 * Hard PII denylist applied even before allowlist checks (belt-and-suspenders).
 * Keys are compared case-insensitively with non-alphanumeric characters stripped.
 */
const FORBIDDEN_PII_KEYS = new Set<string>([
  'email',
  'emailaddress',
  'name',
  'firstname',
  'lastname',
  'fullname',
  'username',
  'clerkid',
  'dateofbirth',
  'dob',
  'birthdate',
  'phone',
  'phonenumber',
  'notes',
  'note',
  'details',
  'title',
  'message',
  'errormessage',
  'body',
  'ip',
  'ipaddress',
  'password',
  'token',
])

const MAX_STRING_LENGTH = 64

function normalizeKeyForDenyCheck(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function isCanonicalAnalyticsEvent(event: string): event is CanonicalAnalyticsEvent {
  return Object.prototype.hasOwnProperty.call(EVENT_PROPERTY_ALLOWLIST, event)
}

function sanitizeFieldValue(key: string, value: unknown): TelemetryPrimitive | undefined {
  // Validate strictly-constrained fields BEFORE generic primitive handling (S7)
  const enumSet = ENUM_PROPERTY_VALUES[key]
  if (enumSet) {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return enumSet.has(trimmed) ? trimmed : undefined
  }

  if (key === 'stars') {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5
      ? value
      : undefined
  }

  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) return undefined
    return trimmed.length > MAX_STRING_LENGTH ? trimmed.slice(0, MAX_STRING_LENGTH) : trimmed
  }
  return undefined
}

/**
 * Strips any non-allowlisted, forbidden PII, invalid enum, non-primitive, or
 * over-length properties before an event leaves the app.
 */
export function sanitizeEventProperties(
  event: CanonicalAnalyticsEvent,
  rawProperties?: Record<string, unknown>,
  sharedContext?: Record<string, unknown>
): SanitizedProperties {
  const allowed = EVENT_PROPERTY_ALLOWLIST[event]
  const sanitized: SanitizedProperties = {}

  if (sharedContext) {
    for (const [key, value] of Object.entries(sharedContext)) {
      if (!SHARED_PROPERTY_KEYS.has(key)) continue
      if (FORBIDDEN_PII_KEYS.has(normalizeKeyForDenyCheck(key))) continue
      const clean = sanitizeFieldValue(key, value)
      if (clean !== undefined) {
        sanitized[key] = clean
      }
    }
  }

  if (rawProperties) {
    for (const [key, value] of Object.entries(rawProperties)) {
      if (FORBIDDEN_PII_KEYS.has(normalizeKeyForDenyCheck(key))) continue
      if (!allowed.has(key) && !SHARED_PROPERTY_KEYS.has(key)) continue
      const clean = sanitizeFieldValue(key, value)
      if (clean !== undefined) {
        sanitized[key] = clean
      }
    }
  }

  return sanitized
}
