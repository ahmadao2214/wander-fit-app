import { XStack, Circle, styled } from 'tamagui'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface IntakeProgressDotsProps {
  /** Total number of screens in the flow */
  total: number
  /** Current screen index (0-based) */
  current: number
  /** Size of each dot (default: 8) */
  size?: number
  /** Gap between dots (default: $2) */
  gap?: '$1' | '$1.5' | '$2' | '$2.5' | '$3'
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const Dot = styled(Circle, {
  variants: {
    state: {
      completed: {
        bg: '$primary',
      },
      current: {
        bg: '$primary',
        scale: 1.25,
      },
      upcoming: {
        bg: '$color6',
      },
    },
  } as const,
})

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IntakeProgressDots
 *
 * A simple progress indicator using dots for the intake flow.
 * Shows completed, current, and upcoming screens.
 *
 * @example
 * <IntakeProgressDots total={7} current={2} />
 */
export function IntakeProgressDots({
  total,
  current,
  size = 8,
  gap = '$2',
}: IntakeProgressDotsProps) {
  return (
    <XStack items="center" justify="center" gap={gap}>
      {Array.from({ length: total }, (_, index) => {
        let state: 'completed' | 'current' | 'upcoming'

        if (index < current) {
          state = 'completed'
        } else if (index === current) {
          state = 'current'
        } else {
          state = 'upcoming'
        }

        return (
          <Dot
            key={index}
            size={size}
            state={state}
            animation="quick"
          />
        )
      })}
    </XStack>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Total number of screens in the combined intake + onboarding flow
 *
 * Interleaved flow (10 screens):
 * 1. Sport Selection         ← Intake
 * 2. Why This Works          ← Onboarding
 * 3. The Three Phases        ← Onboarding
 * 4. Age Group               ← Intake
 * 5. Experience Years        ← Intake
 * 6. Training Days           ← Intake
 * 7. Season Timeline         ← Intake
 * 8. Maxes                   ← Intake (Know Your Starting Point)
 * 9. Results                 ← Intake (Program Preview + Timeline)
 * 10. Commitment             ← Onboarding (Final step - create program)
 */
export const COMBINED_FLOW_SCREEN_COUNT = 10

/** @deprecated Use COMBINED_FLOW_SCREEN_COUNT instead */
export const INTAKE_SCREEN_COUNT = 7

/**
 * Screen indices for the combined flow
 */
export const COMBINED_FLOW_SCREENS = {
  SPORT: 0,
  WHY_IT_WORKS: 1,
  PHASES_OVERVIEW: 2,
  AGE_GROUP: 3,
  EXPERIENCE_YEARS: 4,
  TRAINING_DAYS: 5,
  SEASON_TIMELINE: 6,
  MAXES: 7,
  RESULTS: 8,
  COMMITMENT: 9,
  /** @deprecated Personal timeline merged into Results */
  PERSONAL_TIMELINE: 8,
} as const

/**
 * @deprecated Use COMBINED_FLOW_SCREENS instead
 * Legacy screen indices for backward compatibility
 */
export const INTAKE_SCREENS = {
  SPORT: 0,
  AGE_GROUP: 1,
  EXPERIENCE_YEARS: 2,
  TRAINING_DAYS: 3,
  SEASON_TIMELINE: 4,
  MAXES: 5,
  RESULTS: 6,
} as const
