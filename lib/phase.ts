import type { Phase } from '../types'

/**
 * The one source of phase names and phase colors.
 *
 * Decided 2026-11-14 (design audit): every screen uses these exact
 * expansions, and the phases share one brand hue whose tints deepen from GPP
 * to SSP. Red, amber and green stay free for intensity and status. Color is
 * never the only signal: wherever a phase color appears, the phase name
 * appears too.
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

/**
 * Raw values behind the `$phase*` theme tokens in tamagui.config.ts.
 * - `fill`: dots, bars, filled badges and buttons
 * - `onFill`: text and icons on `fill`
 * - `text`: phase-colored text on the screen background or a surface
 * - `tint`: a quiet background for a phase-scoped card; `text` reads on it
 */
export interface PhaseSwatch {
  fill: string
  onFill: string
  text: string
  tint: string
}

export const PHASE_SWATCHES: Record<'light' | 'dark', Record<Phase, PhaseSwatch>> = {
  light: {
    GPP: { fill: '#60A5FA', onFill: '#0F172A', text: '#2563EB', tint: '#EFF6FF' },
    SPP: { fill: '#2563EB', onFill: '#FFFFFF', text: '#1D4ED8', tint: '#DBEAFE' },
    SSP: { fill: '#1E3A8A', onFill: '#FFFFFF', text: '#1E3A8A', tint: '#BFDBFE' },
  },
  dark: {
    GPP: { fill: '#BFDBFE', onFill: '#0F172A', text: '#BFDBFE', tint: '#172554' },
    SPP: { fill: '#60A5FA', onFill: '#0F172A', text: '#93C5FD', tint: '#172554' },
    SSP: { fill: '#2563EB', onFill: '#FFFFFF', text: '#60A5FA', tint: '#172554' },
  },
}

/** Theme token names, so components never hardcode a phase color. */
export interface PhaseTokens {
  fill: `$phase${Phase}`
  onFill: `$phase${Phase}OnFill`
  text: `$phase${Phase}Text`
  tint: `$phase${Phase}Tint`
}

export function phaseTokens(phase: Phase | undefined | null): PhaseTokens {
  const p: Phase = phase === 'SPP' || phase === 'SSP' ? phase : 'GPP'
  return {
    fill: `$phase${p}`,
    onFill: `$phase${p}OnFill`,
    text: `$phase${p}Text`,
    tint: `$phase${p}Tint`,
  }
}

type PhaseThemeKey =
  | `phase${Phase}`
  | `phase${Phase}OnFill`
  | `phase${Phase}Text`
  | `phase${Phase}Tint`

/** Flat token map merged into each Tamagui theme. */
export function phaseThemeColors(mode: 'light' | 'dark'): Record<PhaseThemeKey, string> {
  const out = {} as Record<PhaseThemeKey, string>
  for (const phase of PHASES) {
    const s = PHASE_SWATCHES[mode][phase]
    out[`phase${phase}`] = s.fill
    out[`phase${phase}OnFill`] = s.onFill
    out[`phase${phase}Text`] = s.text
    out[`phase${phase}Tint`] = s.tint
  }
  return out
}
