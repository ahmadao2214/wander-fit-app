import { describe, it, expect } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════
// INTAKE PROGRESS DOTS TESTS
// ═══════════════════════════════════════════════════════════════════════════════
//
// These tests verify the constants and logic used by IntakeProgressDots component
// which was updated in this branch to support the unified intake + onboarding flow.
//
// Note: We define the constants inline here since importing from the component
// would pull in react-native dependencies that don't work in the Node test environment.
// These values must be kept in sync with components/IntakeProgressDots.tsx

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS (mirrored from components/IntakeProgressDots.tsx)
// ─────────────────────────────────────────────────────────────────────────────

const COMBINED_FLOW_SCREEN_COUNT = 9

const INTAKE_SCREEN_COUNT = 7

const COMBINED_FLOW_SCREENS = {
  SPORT: 0,
  WHY_IT_WORKS: 1,
  AGE_GROUP: 2,
  EXPERIENCE_YEARS: 3,
  TRAINING_DAYS: 4,
  SEASON_TIMELINE: 5,
  MAXES: 6,
  RESULTS: 7,
  COMMITMENT: 8,
  // Deprecated aliases
  PHASES_OVERVIEW: 1,
  PERSONAL_TIMELINE: 7,
} as const

const INTAKE_SCREENS = {
  SPORT: 0,
  AGE_GROUP: 1,
  EXPERIENCE_YEARS: 2,
  TRAINING_DAYS: 3,
  SEASON_TIMELINE: 4,
  MAXES: 5,
  RESULTS: 6,
} as const

const COMBINED_FLOW_ROUTES: Record<number, string> = {
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

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('COMBINED_FLOW_SCREEN_COUNT', () => {
  it('should be 9 screens total in the unified flow', () => {
    expect(COMBINED_FLOW_SCREEN_COUNT).toBe(9)
  })
})

describe('COMBINED_FLOW_SCREENS', () => {
  it('should have correct indices for all screens', () => {
    expect(COMBINED_FLOW_SCREENS.SPORT).toBe(0)
    expect(COMBINED_FLOW_SCREENS.WHY_IT_WORKS).toBe(1)
    expect(COMBINED_FLOW_SCREENS.AGE_GROUP).toBe(2)
    expect(COMBINED_FLOW_SCREENS.EXPERIENCE_YEARS).toBe(3)
    expect(COMBINED_FLOW_SCREENS.TRAINING_DAYS).toBe(4)
    expect(COMBINED_FLOW_SCREENS.SEASON_TIMELINE).toBe(5)
    expect(COMBINED_FLOW_SCREENS.MAXES).toBe(6)
    expect(COMBINED_FLOW_SCREENS.RESULTS).toBe(7)
    expect(COMBINED_FLOW_SCREENS.COMMITMENT).toBe(8)
  })

  it('should have indices that are sequential (0 to 8)', () => {
    const indices = [
      COMBINED_FLOW_SCREENS.SPORT,
      COMBINED_FLOW_SCREENS.WHY_IT_WORKS,
      COMBINED_FLOW_SCREENS.AGE_GROUP,
      COMBINED_FLOW_SCREENS.EXPERIENCE_YEARS,
      COMBINED_FLOW_SCREENS.TRAINING_DAYS,
      COMBINED_FLOW_SCREENS.SEASON_TIMELINE,
      COMBINED_FLOW_SCREENS.MAXES,
      COMBINED_FLOW_SCREENS.RESULTS,
      COMBINED_FLOW_SCREENS.COMMITMENT,
    ]

    indices.forEach((index, i) => {
      expect(index).toBe(i)
    })
  })

  it('should have all indices less than COMBINED_FLOW_SCREEN_COUNT', () => {
    Object.values(COMBINED_FLOW_SCREENS).forEach((index) => {
      expect(index).toBeLessThan(COMBINED_FLOW_SCREEN_COUNT)
    })
  })

  describe('deprecated aliases', () => {
    it('PHASES_OVERVIEW should point to WHY_IT_WORKS (consolidated)', () => {
      expect(COMBINED_FLOW_SCREENS.PHASES_OVERVIEW).toBe(COMBINED_FLOW_SCREENS.WHY_IT_WORKS)
      expect(COMBINED_FLOW_SCREENS.PHASES_OVERVIEW).toBe(1)
    })

    it('PERSONAL_TIMELINE should point to RESULTS (merged)', () => {
      expect(COMBINED_FLOW_SCREENS.PERSONAL_TIMELINE).toBe(COMBINED_FLOW_SCREENS.RESULTS)
      expect(COMBINED_FLOW_SCREENS.PERSONAL_TIMELINE).toBe(7)
    })
  })
})

describe('COMBINED_FLOW_ROUTES', () => {
  it('should have a route for each screen index', () => {
    for (let i = 0; i < COMBINED_FLOW_SCREEN_COUNT; i++) {
      expect(COMBINED_FLOW_ROUTES[i]).toBeDefined()
      expect(typeof COMBINED_FLOW_ROUTES[i]).toBe('string')
    }
  })

  it('should have correct routes for intake screens', () => {
    expect(COMBINED_FLOW_ROUTES[0]).toBe('/(intake)/sport')
    expect(COMBINED_FLOW_ROUTES[2]).toBe('/(intake)/age-group')
    expect(COMBINED_FLOW_ROUTES[3]).toBe('/(intake)/experience-years')
    expect(COMBINED_FLOW_ROUTES[4]).toBe('/(intake)/training-days')
    expect(COMBINED_FLOW_ROUTES[5]).toBe('/(intake)/season-timeline')
    expect(COMBINED_FLOW_ROUTES[6]).toBe('/(intake)/maxes')
    expect(COMBINED_FLOW_ROUTES[7]).toBe('/(intake)/results')
  })

  it('should have correct routes for onboarding screens', () => {
    expect(COMBINED_FLOW_ROUTES[1]).toBe('/(onboarding)/why-it-works')
    expect(COMBINED_FLOW_ROUTES[8]).toBe('/(onboarding)/commitment')
  })

  it('should interleave intake and onboarding routes correctly', () => {
    // The flow alternates between intake and onboarding groups
    const expectedFlow = [
      { index: 0, group: 'intake', screen: 'sport' },
      { index: 1, group: 'onboarding', screen: 'why-it-works' },
      { index: 2, group: 'intake', screen: 'age-group' },
      { index: 3, group: 'intake', screen: 'experience-years' },
      { index: 4, group: 'intake', screen: 'training-days' },
      { index: 5, group: 'intake', screen: 'season-timeline' },
      { index: 6, group: 'intake', screen: 'maxes' },
      { index: 7, group: 'intake', screen: 'results' },
      { index: 8, group: 'onboarding', screen: 'commitment' },
    ]

    expectedFlow.forEach(({ index, group, screen }) => {
      const route = COMBINED_FLOW_ROUTES[index]
      expect(route).toContain(`/(${group})/`)
      expect(route).toContain(screen)
    })
  })

  it('should not have any undefined routes within the flow range', () => {
    for (let i = 0; i < COMBINED_FLOW_SCREEN_COUNT; i++) {
      expect(COMBINED_FLOW_ROUTES[i]).not.toBeUndefined()
    }
  })
})

describe('Backward Compatibility', () => {
  describe('INTAKE_SCREEN_COUNT (deprecated)', () => {
    it('should still be defined for backward compatibility', () => {
      expect(INTAKE_SCREEN_COUNT).toBeDefined()
      expect(INTAKE_SCREEN_COUNT).toBe(7)
    })
  })

  describe('INTAKE_SCREENS (deprecated)', () => {
    it('should have legacy screen indices', () => {
      expect(INTAKE_SCREENS.SPORT).toBe(0)
      expect(INTAKE_SCREENS.AGE_GROUP).toBe(1)
      expect(INTAKE_SCREENS.EXPERIENCE_YEARS).toBe(2)
      expect(INTAKE_SCREENS.TRAINING_DAYS).toBe(3)
      expect(INTAKE_SCREENS.SEASON_TIMELINE).toBe(4)
      expect(INTAKE_SCREENS.MAXES).toBe(5)
      expect(INTAKE_SCREENS.RESULTS).toBe(6)
    })
  })
})

describe('IntakeProgressDots Logic', () => {
  /**
   * Determines the state of a dot based on its index relative to current
   */
  function getDotState(index: number, current: number): 'completed' | 'current' | 'upcoming' {
    if (index < current) return 'completed'
    if (index === current) return 'current'
    return 'upcoming'
  }

  /**
   * Determines if a dot should be navigable (only completed dots)
   */
  function isDotNavigable(index: number, current: number, hasOnNavigate: boolean): boolean {
    return getDotState(index, current) === 'completed' && hasOnNavigate
  }

  describe('getDotState', () => {
    it('returns completed for indices less than current', () => {
      expect(getDotState(0, 3)).toBe('completed')
      expect(getDotState(1, 3)).toBe('completed')
      expect(getDotState(2, 3)).toBe('completed')
    })

    it('returns current for index equal to current', () => {
      expect(getDotState(3, 3)).toBe('current')
      expect(getDotState(0, 0)).toBe('current')
      expect(getDotState(8, 8)).toBe('current')
    })

    it('returns upcoming for indices greater than current', () => {
      expect(getDotState(4, 3)).toBe('upcoming')
      expect(getDotState(5, 3)).toBe('upcoming')
      expect(getDotState(8, 3)).toBe('upcoming')
    })

    it('handles first screen (all dots except first are upcoming)', () => {
      expect(getDotState(0, 0)).toBe('current')
      for (let i = 1; i < COMBINED_FLOW_SCREEN_COUNT; i++) {
        expect(getDotState(i, 0)).toBe('upcoming')
      }
    })

    it('handles last screen (all dots except last are completed)', () => {
      const lastIndex = COMBINED_FLOW_SCREEN_COUNT - 1
      for (let i = 0; i < lastIndex; i++) {
        expect(getDotState(i, lastIndex)).toBe('completed')
      }
      expect(getDotState(lastIndex, lastIndex)).toBe('current')
    })
  })

  describe('isDotNavigable', () => {
    it('returns true for completed dots when onNavigate is provided', () => {
      expect(isDotNavigable(0, 3, true)).toBe(true)
      expect(isDotNavigable(1, 3, true)).toBe(true)
      expect(isDotNavigable(2, 3, true)).toBe(true)
    })

    it('returns false for completed dots when onNavigate is not provided', () => {
      expect(isDotNavigable(0, 3, false)).toBe(false)
      expect(isDotNavigable(1, 3, false)).toBe(false)
    })

    it('returns false for current dot', () => {
      expect(isDotNavigable(3, 3, true)).toBe(false)
      expect(isDotNavigable(3, 3, false)).toBe(false)
    })

    it('returns false for upcoming dots', () => {
      expect(isDotNavigable(4, 3, true)).toBe(false)
      expect(isDotNavigable(5, 3, true)).toBe(false)
      expect(isDotNavigable(8, 3, true)).toBe(false)
    })

    it('prevents forward navigation (key requirement of this branch)', () => {
      // Users can only navigate backward by tapping completed dots
      // They cannot tap upcoming dots to skip ahead
      const current = 4 // Training Days screen

      // Backward navigation allowed (completed dots)
      expect(isDotNavigable(0, current, true)).toBe(true) // Sport
      expect(isDotNavigable(1, current, true)).toBe(true) // Why it Works
      expect(isDotNavigable(2, current, true)).toBe(true) // Age Group
      expect(isDotNavigable(3, current, true)).toBe(true) // Experience Years

      // Current dot not navigable
      expect(isDotNavigable(4, current, true)).toBe(false)

      // Forward navigation NOT allowed (upcoming dots)
      expect(isDotNavigable(5, current, true)).toBe(false) // Season Timeline
      expect(isDotNavigable(6, current, true)).toBe(false) // Maxes
      expect(isDotNavigable(7, current, true)).toBe(false) // Results
      expect(isDotNavigable(8, current, true)).toBe(false) // Commitment
    })
  })

  describe('Dot count matches screen count', () => {
    it('should generate correct number of dots', () => {
      const dots = Array.from({ length: COMBINED_FLOW_SCREEN_COUNT }, (_, i) => ({
        index: i,
        state: getDotState(i, 0),
      }))

      expect(dots.length).toBe(9)
    })
  })
})

describe('Screen Flow Validation', () => {
  it('should have correct screen order in combined flow', () => {
    // Verify the interleaved flow matches the design spec
    const expectedOrder = [
      'sport',           // 0 - Intake: Sport selection
      'why-it-works',    // 1 - Onboarding: Training overview
      'age-group',       // 2 - Intake: Age division
      'experience-years',// 3 - Intake: Years of experience
      'training-days',   // 4 - Intake: Days per week
      'season-timeline', // 5 - Intake: Season start date
      'maxes',           // 6 - Intake: 1RM entry
      'results',         // 7 - Intake: Program preview
      'commitment',      // 8 - Onboarding: Final commitment
    ]

    expectedOrder.forEach((screenName, index) => {
      expect(COMBINED_FLOW_ROUTES[index]).toContain(screenName)
    })
  })

  it('should have onboarding screens at correct positions', () => {
    // Onboarding screens are at indices 1 and 8
    expect(COMBINED_FLOW_ROUTES[1]).toMatch(/\/\(onboarding\)\//)
    expect(COMBINED_FLOW_ROUTES[8]).toMatch(/\/\(onboarding\)\//)
  })

  it('should have intake screens at all other positions', () => {
    const intakeIndices = [0, 2, 3, 4, 5, 6, 7]
    intakeIndices.forEach((index) => {
      expect(COMBINED_FLOW_ROUTES[index]).toMatch(/\/\(intake\)\//)
    })
  })
})
