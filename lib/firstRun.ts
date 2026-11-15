/**
 * First Run rules: the intake answers an athlete gives before having an
 * account, and how they turn into the program the reveal shows and
 * `completeIntake` saves. Pure functions only; the device draft lives in
 * `lib/firstRunDraft.ts`.
 */
import type { AgeGroup } from '../types'
import { programShape, type ProgramShape } from '../convex/programShape'

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
