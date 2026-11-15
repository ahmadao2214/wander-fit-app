/**
 * Where the app opens, and which screen each First Run step lives on.
 * Pure, so the routing rules are tested without rendering.
 */
import type { FirstRunStep } from './firstRunDraft'

export const STEP_ROUTES = {
  promise: '/(first-run)',
  sport: '/(first-run)/sport',
  season: '/(first-run)/season',
  days: '/(first-run)/days',
  about: '/(first-run)/about',
  reveal: '/(first-run)/reveal',
} as const satisfies Record<FirstRunStep, string>

export type FirstRunRoute = (typeof STEP_ROUTES)[FirstRunStep]
export const ATHLETE_HOME = '/(athlete)'

export interface RootState {
  isLoading: boolean
  isAuthenticated: boolean
  /** True once the account has a saved program (an intake). */
  hasProgram: boolean
  /** The draft's last step, or null while the draft is still loading. */
  lastStep: FirstRunStep | null
}

/**
 * - Signed in with a program: the athlete tabs. The First Run never shows again.
 * - Otherwise: the First Run, at the step the athlete last reached. An account
 *   without a program (sign-up finished but the save didn't) resumes there
 *   too, and the reveal saves the program to the signed-in account.
 * - Null while auth or the draft is still loading.
 */
export function rootRoute(state: RootState): FirstRunRoute | typeof ATHLETE_HOME | null {
  if (state.isLoading) return null
  if (state.isAuthenticated && state.hasProgram) return ATHLETE_HOME
  if (state.lastStep === null) return null
  return STEP_ROUTES[state.lastStep]
}
