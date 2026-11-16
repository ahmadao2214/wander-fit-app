/**
 * First Run rules: the intake answers an athlete gives before having an
 * account, and how they turn into the program the reveal shows and
 * `completeIntake` saves. Pure functions only; the device draft lives in
 * `lib/firstRunDraft.ts`.
 */
import type { AgeGroup } from '../types'
import { programShape, skillLevelFromYears, type ProgramShape, type SkillLevel } from '../convex/programShape'

// ─── Choices ────────────────────────────────────────────────────────────────

export type YearsChoice = 'new' | '1-2' | '3+'

/** Years training for their sport, as three choices. */
export const YEARS_CHOICES: readonly { value: YearsChoice; label: string; years: number }[] = [
  { value: 'new', label: 'New to training', years: 0 },
  { value: '1-2', label: '1–2 years', years: 1 },
  { value: '3+', label: '3+ years', years: 3 },
]

export const AGE_GROUP_CHOICES: readonly { value: AgeGroup; label: string; range: string }[] = [
  { value: '14-17', label: 'Youth', range: '14–17' },
  { value: '18-35', label: 'Performance', range: '18–35' },
  { value: '36+', label: 'Vitality', range: '36+' },
]

/** Mon, Wed, Fri (0 = Sunday … 6 = Saturday, as `completeIntake` expects). */
export const DEFAULT_TRAINING_DAYS: readonly number[] = [1, 3, 5]

/** The season picker reaches 12 months out. */
export const MAX_SEASON_WEEKS = 52

export function yearsForChoice(choice: YearsChoice): number {
  const match = YEARS_CHOICES.find((c) => c.value === choice)
  if (!match) throw new Error(`Unknown years choice: ${choice}`)
  return match.years
}

/** The level a years choice trains at: Novice, Moderate or Advanced. */
export function skillLevelLabel(choice: YearsChoice): SkillLevel {
  return skillLevelFromYears(yearsForChoice(choice))
}

// ─── Answers ────────────────────────────────────────────────────────────────

export interface FirstRunAnswers {
  sportId?: string
  /**
   * First game as a local date, `YYYY-MM-DD`. `null` means the athlete chose
   * "No set season"; `undefined` means the question isn't answered yet.
   */
  seasonStart?: string | null
  /** Days of the week, 0 = Sunday. Defaults to Mon/Wed/Fri. */
  trainingDays?: number[]
  ageGroup?: AgeGroup
  years?: YearsChoice
}

export type CompleteFirstRunAnswers = Required<Omit<FirstRunAnswers, 'seasonStart'>> & {
  seasonStart: string | null
}

export function isComplete(answers: FirstRunAnswers): answers is CompleteFirstRunAnswers {
  return (
    !!answers.sportId &&
    answers.seasonStart !== undefined &&
    !!answers.trainingDays &&
    answers.trainingDays.length > 0 &&
    !!answers.ageGroup &&
    !!answers.years
  )
}

/** Sorted, de-duplicated days, never empty. */
export function normalizeTrainingDays(days: readonly number[] | undefined): number[] {
  const valid = [...new Set(days ?? [])].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  return valid.length > 0 ? valid.sort((a, b) => a - b) : [...DEFAULT_TRAINING_DAYS]
}

// ─── Season ─────────────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000

function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Whole weeks from today until the first game, rounded up, between 1 and
 * `MAX_SEASON_WEEKS`. Counts calendar days so daylight saving can't shift it.
 */
export function weeksUntilSeason(seasonStart: string, now: Date): number {
  const days = Math.round(
    (parseLocalDate(seasonStart).getTime() - startOfLocalDay(now).getTime()) / MS_PER_DAY
  )
  return Math.min(MAX_SEASON_WEEKS, Math.max(1, Math.ceil(days / 7)))
}

/** Local `YYYY-MM-DD` for a date. */
export function toIsoDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

/** The first-game date `weeks` whole weeks from today. */
export function seasonStartForWeeks(weeks: number, now: Date): string {
  const w = Math.min(MAX_SEASON_WEEKS, Math.max(1, Math.round(weeks)))
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + w * 7))
}

/** "Sat, Mar 6" for a stored season date. */
export function formatSeasonDate(seasonStart: string): string {
  return parseLocalDate(seasonStart).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** The first training day on or after today. */
export function firstTrainingDate(trainingDays: readonly number[] | undefined, now: Date): Date {
  const days = normalizeTrainingDays(trainingDays)
  const today = startOfLocalDay(now)
  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
    if (days.includes(d.getDay())) return d
  }
  return today
}

/** "Today", "Tomorrow" or "Wed, Nov 18". */
export function dayLabel(date: Date, now: Date): string {
  const diff = Math.round((startOfLocalDay(date).getTime() - startOfLocalDay(now).getTime()) / MS_PER_DAY)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** Default slider position: the existing 12-week program. */
export const DEFAULT_SEASON_WEEKS = 12

/** `weeksUntilSeason` as `completeIntake` takes it: undefined for no season. */
export function seasonWeeksArg(seasonStart: string | null, now: Date): number | undefined {
  return seasonStart === null ? undefined : weeksUntilSeason(seasonStart, now)
}

// ─── Program ────────────────────────────────────────────────────────────────

/** The program the reveal shows. Same function `completeIntake` stores. */
export function revealProgram(answers: CompleteFirstRunAnswers, now: Date): ProgramShape {
  return programShape({
    yearsOfExperience: yearsForChoice(answers.years),
    weeksUntilSeason: seasonWeeksArg(answers.seasonStart, now),
    trainingDaysPerWeek: normalizeTrainingDays(answers.trainingDays).length,
  })
}

/** Arguments for `completeIntake`, minus the typed sport id. */
export function intakeArgs(answers: CompleteFirstRunAnswers, now: Date) {
  const selectedTrainingDays = normalizeTrainingDays(answers.trainingDays)
  return {
    sportId: answers.sportId,
    yearsOfExperience: yearsForChoice(answers.years),
    preferredTrainingDaysPerWeek: selectedTrainingDays.length,
    selectedTrainingDays,
    weeksUntilSeason: seasonWeeksArg(answers.seasonStart, now),
    ageGroup: answers.ageGroup,
  }
}
