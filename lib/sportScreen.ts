import type { ColorTokens } from 'tamagui'
import type { Phase } from '../types'
import type { SportThemeName } from './sportTamaguiTheme'
import type { PhaseName, TodaySeason } from './todayScorebug'

// The signed-in screens that moved onto the basketball sport theme (issue #209).
// Each one wraps itself in <Theme name={sportSchemeFor(scheme)}>; the app root
// stays on light and dark, so auth and unmoved screens are untouched.

/** Device scheme → sport theme. Dark is the chalkboard, anything else the whiteboard. */
export function sportSchemeFor(colorScheme: string | null | undefined): SportThemeName {
  return colorScheme === 'dark' ? 'chalkboard' : 'whiteboard'
}

/**
 * The pen. Tamagui types only the keys every theme shares, and light and dark
 * carry no marker on purpose, so the token is named here. Only a screen inside
 * a sport theme uses it.
 */
export const MARKER = '$marker' as ColorTokens

/** The phase words a moved screen shows. The GPP/SPP/SSP codes stay in the data. */
export const PHASE_WORDS: Record<Phase, PhaseName> = {
  GPP: 'Build',
  SPP: 'Train',
  SSP: 'Sharpen',
}

/** The phase word for a stored phase code; an unknown phase reads as Build. */
export function phaseWord(phase: Phase | string | null | undefined): PhaseName {
  return phase === 'SPP' || phase === 'SSP' ? PHASE_WORDS[phase] : PHASE_WORDS.GPP
}

const PHASE_ORDER: readonly Phase[] = ['GPP', 'SPP', 'SSP']

/** The phase as a step of three: GPP 1, SPP 2, SSP 3. */
export function phaseStep(phase: Phase | string | null | undefined): number {
  const i = PHASE_ORDER.indexOf(phase as Phase)
  return i < 0 ? 1 : i + 1
}

/** The week of the whole plan: phase week 2 of SPP, 4 weeks a phase, is week 6. */
export function programWeek(phase: Phase | string | null | undefined, week: number, weeksPerPhase: number): number {
  const w = Math.min(Math.max(1, week), weeksPerPhase)
  return (phaseStep(phase) - 1) * weeksPerPhase + w
}

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

type SeasonIntake = {
  intakeType: string
  completedAt: number
  weeksUntilSeason?: number | null
}

/**
 * The intake where the athlete set the season. A check-in copies the weeks
 * onto a new record and must not move the first game.
 */
export function seasonSource<T extends SeasonIntake>(intakes: readonly T[]): T | null {
  const supplied = intakes.filter(
    (row) => row.intakeType === 'initial' && typeof row.weeksUntilSeason === 'number',
  )
  if (supplied.length === 0) return null
  return supplied.reduce((earliest, row) => (row.completedAt < earliest.completedAt ? row : earliest))
}

/**
 * When the first game is, from the intake: it said the season starts
 * `weeksUntilSeason` weeks after it was answered. Null when there is no set season.
 */
export function seasonStartsAt(intakeCompletedAt: number, weeksUntilSeason: number | null | undefined): number | null {
  if (weeksUntilSeason === null || weeksUntilSeason === undefined) return null
  return intakeCompletedAt + weeksUntilSeason * WEEK_MS
}

/** Local calendar dates, so a daylight-saving night still counts as one day. */
function calendarDaysUntil(from: Date, until: Date): number {
  const fromDay = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const untilDay = Date.UTC(until.getFullYear(), until.getMonth(), until.getDate())
  return Math.round((untilDay - fromDay) / DAY_MS)
}

/**
 * The scorebug's third cell. A dated season counts down to the first game; once
 * the game is here it reads in season. With no date (no set season, or a
 * backend that doesn't send one yet) it is the plan's week of its total.
 */
export function todaySeason(input: {
  seasonStartsAt: number | null | undefined
  week: number
  programWeeks: number
  now: Date
}): TodaySeason {
  if (input.seasonStartsAt === null || input.seasonStartsAt === undefined) {
    return { kind: 'open', done: input.week, total: input.programWeeks }
  }
  const daysToGame = calendarDaysUntil(input.now, new Date(input.seasonStartsAt))
  if (daysToGame <= 0) return { kind: 'in-season' }
  return { kind: 'dated', daysToGame }
}
