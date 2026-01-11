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
 * Total number of screens in the intake flow
 * sport -> age-group -> experience-years -> training-days -> season-timeline -> maxes -> results
 */
export const INTAKE_SCREEN_COUNT = 7

/**
 * Screen indices for easy reference
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
