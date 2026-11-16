import { Easing } from 'react-native-reanimated'

/**
 * How the First Run moves (docs/first-run-v2/STYLE.md, "Motion rules"):
 * full motion on iOS, a crossfade instead of the page turn on web (the reveal
 * is kept), and stills with Reduce Motion. Unknown Reduce Motion (null)
 * counts as on, so nothing starts and then gets cut off.
 */
export interface IntakeMotion {
  /** Anything that moves: wipes, fills, the reveal's beats, icons playing. */
  moving: boolean
  /** Between questions. */
  pageTurn: 'slide' | 'fade' | 'none'
  /** False until the Reduce Motion answer arrives; wait before starting a one-shot moment. */
  known: boolean
}

export function intakeMotion(platform: string, reduced: boolean | null): IntakeMotion {
  if (reduced !== false) return { moving: false, pageTurn: 'none', known: reduced !== null }
  return { moving: true, pageTurn: platform === 'web' ? 'fade' : 'slide', known: true }
}

/** The page-turn curve, used for every entrance in the intake. */
export const PAGE_EASE = Easing.bezier(0.32, 0.72, 0, 1)
export const PAGE_TURN_MS = 420
