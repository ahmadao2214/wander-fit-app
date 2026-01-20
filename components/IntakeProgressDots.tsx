import { XStack, Circle, styled } from 'tamagui'
import { Vibration } from 'react-native'

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
  /** Callback when a completed dot is tapped (for backward navigation) */
  onNavigate?: (index: number) => void
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
 * Completed dots can be tapped to navigate backward.
 *
 * @example
 * <IntakeProgressDots total={7} current={2} onNavigate={(i) => goToScreen(i)} />
 */
export function IntakeProgressDots({
  total,
  current,
  size = 10,
  gap = '$2',
  onNavigate,
}: IntakeProgressDotsProps) {
  const handleDotPress = (index: number, state: 'completed' | 'current' | 'upcoming') => {
    // Only allow navigating to completed screens (backward navigation)
    if (state === 'completed' && onNavigate) {
      Vibration.vibrate(10)
      onNavigate(index)
    }
  }

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

        const isNavigable = state === 'completed' && onNavigate

        return (
          <Dot
            key={index}
            size={size}
            state={state}
            animation="quick"
            cursor={isNavigable ? 'pointer' : 'default'}
            pressStyle={isNavigable ? { scale: 1.5, opacity: 0.8 } : {}}
            onPress={() => handleDotPress(index, state)}
            // Make tappable dots slightly larger for better touch target
            hitSlop={isNavigable ? { top: 10, bottom: 10, left: 6, right: 6 } : undefined}
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
 * Interleaved flow (9 screens):
 * 1. Sport Selection         ← Intake
 * 2. Training Overview       ← Onboarding (consolidated: Science-Backed + 3 Phases)
 * 3. Age Group               ← Intake
 * 4. Experience Years        ← Intake
 * 5. Training Days           ← Intake
 * 6. Season Timeline         ← Intake
 * 7. Maxes                   ← Intake (Know Your Starting Point)
 * 8. Results                 ← Intake (Program Preview + Timeline)
 * 9. Commitment              ← Onboarding (Final step - create program)
 */
export const COMBINED_FLOW_SCREEN_COUNT = 9

/** @deprecated Use COMBINED_FLOW_SCREEN_COUNT instead */
export const INTAKE_SCREEN_COUNT = 7

/**
 * Screen indices for the combined flow
 */
export const COMBINED_FLOW_SCREENS = {
  SPORT: 0,
  WHY_IT_WORKS: 1, // Now consolidated "Training Overview" screen
  AGE_GROUP: 2,
  EXPERIENCE_YEARS: 3,
  TRAINING_DAYS: 4,
  SEASON_TIMELINE: 5,
  MAXES: 6,
  RESULTS: 7,
  COMMITMENT: 8,
  /** @deprecated Phases overview consolidated into WHY_IT_WORKS */
  PHASES_OVERVIEW: 1,
  /** @deprecated Personal timeline merged into Results */
  PERSONAL_TIMELINE: 7,
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

/**
 * Route paths for each screen index in the combined flow
 * Used for backward navigation from progress dots
 */
export const COMBINED_FLOW_ROUTES: Record<number, string> = {
  0: '/(intake)/sport',
  1: '/(onboarding)/why-it-works',
  2: '/(intake)/age-group',
  3: '/(intake)/experience-years',
  4: '/(intake)/training-days',
  5: '/(intake)/season-timeline',
  6: '/(intake)/maxes',
  7: '/(intake)/results',
  8: '/(onboarding)/commitment',
}
