import type { Phase } from '../types'
import { phaseWord } from './sportScreen'

/**
 * The end-of-block check-in, told truthfully (design audit F04, approved
 * 2026-11-14): a block ending is not the same as a block finished. Only a
 * finished block is celebrated, and the athlete chooses what comes next.
 */

/** How much of the block's planned training got done. */
export type BlockOutcome = 'none' | 'partial' | 'full'

export function blockOutcome(completed: number, expected: number): BlockOutcome {
  if (completed <= 0) return 'none'
  if (expected > 0 && completed >= expected) return 'full'
  return 'partial'
}

export interface BlockRecap {
  outcome: BlockOutcome
  /** Screen heading. Only a finished block says "finished". */
  title: string
  /** The sessions line: "9 of 12 sessions". */
  sessions: string
  /** One plain sentence about what the numbers mean. */
  summary: string
  /** The block was finished, so its title says so. Screens on the sport theme show no confetti. */
  celebrate: boolean
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function blockRecap(phase: Phase, completed: number, expected: number): BlockRecap {
  const outcome = blockOutcome(completed, expected)
  const sessions = `${completed} of ${plural(expected, 'session')}`
  switch (outcome) {
    case 'full':
      return {
        outcome,
        title: `You finished ${phaseWord(phase)}`,
        sessions,
        summary: 'You trained every planned session in this block.',
        celebrate: true,
      }
    case 'partial':
      return {
        outcome,
        title: `Your ${phaseWord(phase)} block is over`,
        sessions,
        summary: `You trained ${plural(completed, 'session')} of the ${expected} planned.`,
        celebrate: false,
      }
    case 'none':
      return {
        outcome,
        title: `Your ${phaseWord(phase)} block is over`,
        sessions,
        summary: 'No sessions were logged in this block.',
        celebrate: false,
      }
  }
}

/** "Oct 19 – Nov 15", from the block's start to the given day. */
/**
 * The last day of a block: its planned length from the start, or today if
 * the block was cut short. Fixed once the block has run its length, so the
 * recap doesn't grow while a check-in waits.
 */
export function blockEnd(startedAt: number, weeks: number, now: number = Date.now()): number {
  // Calendar days, so a clock change inside the block doesn't shift the day
  const last = new Date(startedAt)
  last.setDate(last.getDate() + weeks * 7 - 1)
  return Math.min(now, last.getTime())
}

export function blockDates(startedAt: number, endedAt: number): string {
  const format = (ms: number) =>
    new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${format(startedAt)} – ${format(endedAt)}`
}

export type ReassessmentDecision = 'move_on' | 'repeat'

/** What each choice on the decision screen does, in the athlete's terms. */
export function decisionCopy(
  decision: ReassessmentDecision,
  phase: Phase,
  nextPhase: Phase,
  isFullCycleComplete: boolean,
) {
  if (decision === 'repeat') {
    return {
      label: `Repeat ${phaseWord(phase)}`,
      detail: `Run the ${phaseWord(phase)} block again from week 1.`,
    }
  }
  return {
    label: `Move on to ${phaseWord(nextPhase)}`,
    detail: isFullCycleComplete
      ? `Start a new cycle at ${phaseWord(nextPhase)}, week 1.`
      : `Start ${phaseWord(nextPhase)} at week 1.`,
  }
}
