/**
 * Pure schedule preview math for the WanderFit Beta On-Ramp hero calendar.
 *
 * Mirrors `convex/programShape.ts`, `convex/weekMapping.ts`, and `lib/firstRun.ts`
 * 1:1 so the landing page preview never promises a different phase structure
 * than the live app builds during First Run.
 *
 * Strictly follows `GLOSSARY.md`: 3 phases (GPP -> SPP -> SSP), no banned
 * synonyms ("block", "stage", "foundation phase", "peak phase"), and no
 * unbuilt 4th taper phase.
 */

export const NO_SEASON_PROGRAM_WEEKS = 12
export const DEFAULT_WEEKS_PER_PHASE = 4
export const MIN_WEEKS_PER_PHASE = 2
export const MAX_WEEKS_PER_PHASE = 8
export const MAX_SEASON_WEEKS = 52
export const NUMBER_OF_PHASES = 3

/** Mon, Wed, Fri (0 = Sunday ... 6 = Saturday), matching `DEFAULT_TRAINING_DAYS`. */
export const DEFAULT_TRAINING_DAYS = [1, 3, 5]

/** Visible calendar grid rows starting from Monday of the current week. */
export const CALENDAR_WEEKS = 14

/** Canonical phases from `GLOSSARY.md`. */
export const PHASES = {
  GPP: {
    id: 'gpp',
    code: 'GPP',
    name: 'General Physical Preparedness',
    summary: 'Builds general fitness and movement quality.',
  },
  SPP: {
    id: 'spp',
    code: 'SPP',
    name: 'Specific Physical Preparedness',
    summary: 'Shifts training toward the demands of your sport.',
  },
  SSP: {
    id: 'ssp',
    code: 'SSP',
    name: 'Sport-Specific Preparedness',
    summary: 'Sharpens you for the season itself.',
  },
}

export const PHASE_ORDER = [PHASES.GPP, PHASES.SPP, PHASES.SSP]

export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Calendar-day difference from `today` to ISO `YYYY-MM-DD`, safe across DST transitions. */
export function daysUntil(value, today = new Date()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  if (dateKey(parsed) !== value) return null
  return Math.round(
    (Date.UTC(year, month - 1, day) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      86400000
  )
}

/**
 * Whole weeks from today until the season/tryout date, rounded up, clamped to
 * `1..MAX_SEASON_WEEKS` — mirrors `weeksUntilSeason` in `lib/firstRun.ts`.
 */
export function weeksUntilSeason(days) {
  if (typeof days !== 'number' || !Number.isFinite(days) || days < 1) return null
  return Math.max(1, Math.min(MAX_SEASON_WEEKS, Math.ceil(days / 7)))
}

/**
 * Equal weeks per phase — exact match to `calculateWeeksPerPhase` in
 * `convex/weekMapping.ts` and `programShape` in `convex/programShape.ts`.
 */
export function calculateWeeksPerPhase(totalWeeks, numberOfPhases = NUMBER_OF_PHASES) {
  const calculated = Math.floor(totalWeeks / numberOfPhases)
  return Math.max(MIN_WEEKS_PER_PHASE, Math.min(MAX_WEEKS_PER_PHASE, calculated))
}

/**
 * Per-phase weeks array `[GPP, SPP, SSP]` distributing remainder weeks to later
 * phases first — exact match to `calculateWeeksPerPhaseArray` in `convex/weekMapping.ts`.
 */
export function calculateWeeksPerPhaseArray(totalWeeks) {
  const baseWeeks = Math.floor(totalWeeks / NUMBER_OF_PHASES)
  const remainder = totalWeeks % NUMBER_OF_PHASES
  const clampedBase = Math.max(MIN_WEEKS_PER_PHASE, Math.min(MAX_WEEKS_PER_PHASE, baseWeeks))

  const sspWeeks = clampedBase + (remainder >= 1 ? 1 : 0)
  const sppWeeks = clampedBase + (remainder >= 2 ? 1 : 0)
  const gppWeeks = clampedBase

  return [
    Math.min(MAX_WEEKS_PER_PHASE, gppWeeks),
    Math.min(MAX_WEEKS_PER_PHASE, sppWeeks),
    Math.min(MAX_WEEKS_PER_PHASE, sspWeeks),
  ]
}

/**
 * Build the 3-phase `GPP -> SPP -> SSP` program summary for the hero preview.
 *
 * Pass `days = null` (or `undefined`) for "No date yet" to get the live app's
 * 12-week default (`NO_SEASON_PROGRAM_WEEKS = 12`).
 */
export function buildPlan(days, trainingDaysPerWeek = DEFAULT_TRAINING_DAYS.length) {
  const perWeek = Math.max(1, Math.min(7, Math.floor(trainingDaysPerWeek)))

  if (days === null || days === undefined) {
    const weeksPerPhase = calculateWeeksPerPhase(NO_SEASON_PROGRAM_WEEKS)
    const programWeeks = weeksPerPhase * NUMBER_OF_PHASES
    return {
      isDefault: true,
      days: null,
      weeksUntil: NO_SEASON_PROGRAM_WEEKS,
      weeksPerPhase,
      programWeeks,
      sessions: programWeeks * perWeek,
      phases: PHASE_ORDER.map((phase) => ({ ...phase, weeks: weeksPerPhase })),
    }
  }

  if (typeof days !== 'number' || !Number.isFinite(days) || days < 1) return null

  const weeksUntil = weeksUntilSeason(days)
  const weeksPerPhase = calculateWeeksPerPhase(weeksUntil)
  const programWeeks = weeksPerPhase * NUMBER_OF_PHASES

  return {
    isDefault: false,
    days,
    weeksUntil,
    weeksPerPhase,
    programWeeks,
    sessions: programWeeks * perWeek,
    phases: PHASE_ORDER.map((phase) => ({ ...phase, weeks: weeksPerPhase })),
  }
}

/**
 * Map each day offset `1..days-1` between today (0) and the selected date (`days`)
 * to `'gpp' | 'spp' | 'ssp'` across three even stretches.
 * Index 0 is `null` (today).
 */
export function dayPhases(days) {
  if (typeof days !== 'number' || !Number.isFinite(days) || days < 1) return []
  const out = Array.from({ length: days }, () => null)
  const span = days - 1
  if (span <= 0) return out

  const gppEnd = Math.ceil(span / 3)
  const sppEnd = Math.ceil((span * 2) / 3)
  for (let k = 1; k < days; k++) {
    out[k] = k <= gppEnd ? 'gpp' : k <= sppEnd ? 'spp' : 'ssp'
  }
  return out
}

/** Scheduled training days (Mon/Wed/Fri by default) for any active phase cell. */
export function isLiftDay(phase, weekday, trainingDays = DEFAULT_TRAINING_DAYS) {
  if (!phase) return false
  return trainingDays.includes(weekday)
}
