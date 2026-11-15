/**
 * Phase names and colors for the First Run reveal.
 *
 * Placeholder until PR #110 lands `lib/phase.ts`: the names are the approved
 * expansions, and the colors are one brand hue deepening GPP → SPP → SSP,
 * never red, amber or green. When #110 merges, replace this file's exports
 * with `PHASE_NAMES` and `phaseTokens()` from `lib/phase.ts`.
 */
import type { ColorTokens } from 'tamagui'

export type Phase = 'GPP' | 'SPP' | 'SSP'

export const PHASES: readonly Phase[] = ['GPP', 'SPP', 'SSP']

export const PHASE_NAMES: Record<Phase, string> = {
  GPP: 'General Physical Preparedness',
  SPP: 'Specific Physical Preparedness',
  SSP: 'Sport-Specific Preparedness',
}

export function phaseFill(phase: Phase): { fill: ColorTokens; onFill: ColorTokens } {
  switch (phase) {
    case 'GPP':
      return { fill: '$brand6', onFill: '$brand12' }
    case 'SPP':
      return { fill: '$brand8', onFill: 'white' as ColorTokens }
    case 'SSP':
      return { fill: '$brand10', onFill: 'white' as ColorTokens }
  }
}
