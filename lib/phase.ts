import type { Phase } from '../types'

/**
 * The one source of phase names.
 *
 * Decided 2026-11-14 (design audit): every screen uses these exact
 * expansions. Phases have no colour (issue #210): on screen they read Build,
 * Train, Sharpen, and the stored codes stay GPP, SPP, SSP.
 */

export const PHASES: readonly Phase[] = ['GPP', 'SPP', 'SSP'] as const

export const PHASE_NAMES: Record<Phase, string> = {
  GPP: 'General Physical Preparedness',
  SPP: 'Specific Physical Preparedness',
  SSP: 'Sport-Specific Preparedness',
}

/** "GPP: General Physical Preparedness" */
export function phaseTitle(phase: Phase): string {
  return `${phase}: ${PHASE_NAMES[phase]}`
}
