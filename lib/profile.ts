import type { Phase } from '../types'
import { PHASES } from './phase'

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
  // Older intakes stored exact answers, such as 0.5
  if (years < 1) return 'Under a year'
  if (years < 3) return '1–2 years'
  return '3+ years'
}

/** "3 a week" */
export function trainingDaysLabel(daysPerWeek: number): string {
  return `${daysPerWeek} a week`
}

/**
 * Weeks per phase when the program doesn't say. Mirrors
 * DEFAULT_WEEKS_PER_PHASE in convex/weekMapping.ts; lib doesn't import from
 * convex, so keep the two in step.
 */
const DEFAULT_WEEKS_PER_PHASE = 4

export interface PhaseTrackSegment {
  phase: Phase
  /** 0..1: earlier phases 1, later phases 0, the current one week / weeksPerPhase */
  fill: number
  current: boolean
  /** "Week 3 of 4" for the current phase, "4 weeks" for the others */
  label: string
}

export interface PhaseTrack {
  /** GPP, SPP, SSP, in that order */
  segments: PhaseTrackSegment[]
  /** Week of the whole program, 1-based */
  overallWeek: number
  totalWeeks: number
  /** "Week 3 of 12" */
  summary: string
  /** "Week 3 of 12. GPP, week 3 of 4. SPP, 4 weeks. SSP, 4 weeks." */
  accessibilityLabel: string
}

export interface PhaseTrackInput {
  phase: Phase | string | null | undefined
  week: number
  weeksPerPhase?: number | null
  totalProgramWeeks?: number | null
}

function positiveWhole(n: number | null | undefined): number | null {
  return typeof n === 'number' && Number.isFinite(n) && n >= 1 ? Math.floor(n) : null
}

function weeksLabel(n: number): string {
  return n === 1 ? '1 week' : `${n} weeks`
}

/**
 * Where the athlete is in the three-phase program, for the Profile header's
 * phase track. An unknown phase reads as GPP, as lib/phase.ts does.
 */
export function phaseTrack({
  phase,
  week,
  weeksPerPhase,
  totalProgramWeeks,
}: PhaseTrackInput): PhaseTrack {
  const current: Phase = phase === 'SPP' || phase === 'SSP' ? phase : 'GPP'
  const perPhase = positiveWhole(weeksPerPhase) ?? DEFAULT_WEEKS_PER_PHASE
  // The scheduled program is three phases of perPhase weeks. totalProgramWeeks
  // is the weeks until the season: longer when it doesn't divide by three (14
  // weeks, 3 × 4) and shorter when the season is close (1 week, 3 × 2). It only
  // stands in when the phase length is unknown.
  const knownPerPhase = positiveWhole(weeksPerPhase)
  const totalWeeks = knownPerPhase
    ? knownPerPhase * PHASES.length
    : (positiveWhole(totalProgramWeeks) ?? perPhase * PHASES.length)
  const currentIndex = PHASES.indexOf(current)
  const clampedWeek = Math.min(Math.max(Number.isFinite(week) ? Math.floor(week) : 1, 1), perPhase)

  const segments = PHASES.map((p, i): PhaseTrackSegment => {
    if (i === currentIndex) {
      return {
        phase: p,
        fill: clampedWeek / perPhase,
        current: true,
        label: `Week ${clampedWeek} of ${perPhase}`,
      }
    }
    return {
      phase: p,
      fill: i < currentIndex ? 1 : 0,
      current: false,
      label: weeksLabel(perPhase),
    }
  })

  const overallWeek = Math.min(currentIndex * perPhase + clampedWeek, totalWeeks)
  const summary = `Week ${overallWeek} of ${totalWeeks}`
  const accessibilityLabel = [
    summary,
    ...segments.map((s) => `${s.phase}, ${s.current ? s.label.replace(/^Week/, 'week') : s.label}`),
  ].join('. ')

  return {
    segments,
    overallWeek,
    totalWeeks,
    summary,
    accessibilityLabel: `${accessibilityLabel}.`,
  }
}
