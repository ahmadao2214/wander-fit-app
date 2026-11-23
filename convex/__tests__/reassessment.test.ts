export {}

type Phase = 'GPP' | 'SPP' | 'SSP'
type SkillLevel = 'Novice' | 'Moderate' | 'Advanced'
type PhaseDifficulty = 'too_easy' | 'just_right' | 'challenging' | 'too_hard'

function getNextPhase(phase: Phase): Phase {
  switch (phase) {
    case 'GPP':
      return 'SPP'
    case 'SPP':
      return 'SSP'
    case 'SSP':
      return 'GPP'
  }
}

function calculateCompletionRate(
  completedSessions: number,
  weeksPerPhase: number,
  preferredDays: number
): number {
  const expected = weeksPerPhase * preferredDays
  return expected > 0 ? Math.min(1, completedSessions / expected) : 0
}

function determineSkillUpgrade(
  currentLevel: SkillLevel,
  difficulty: PhaseDifficulty,
  completionRate: number,
  completedReassessments: number
): { upgraded: boolean; newLevel: SkillLevel } {
  const isEasyOrRight = difficulty === 'too_easy' || difficulty === 'just_right'

  if (isEasyOrRight) {
    if (currentLevel === 'Novice' && completionRate >= 0.75) {
      return { upgraded: true, newLevel: 'Moderate' }
    }
    if (currentLevel === 'Moderate' && completionRate >= 0.8 && completedReassessments >= 2) {
      return { upgraded: true, newLevel: 'Advanced' }
    }
  }

  return { upgraded: false, newLevel: currentLevel }
}

describe('Phase transitions', () => {
  it('GPP → SPP', () => {
    expect(getNextPhase('GPP')).toBe('SPP')
  })

  it('SPP → SSP', () => {
    expect(getNextPhase('SPP')).toBe('SSP')
  })

  it('SSP → GPP (full cycle wrap)', () => {
    expect(getNextPhase('SSP')).toBe('GPP')
  })
})

describe('Completion rate calculation', () => {
  it('should calculate 100% when all expected workouts completed', () => {
    expect(calculateCompletionRate(16, 4, 4)).toBe(1)
  })

  it('should calculate 75% correctly', () => {
    expect(calculateCompletionRate(12, 4, 4)).toBe(0.75)
  })

  it('should cap at 100% even with extra sessions', () => {
    expect(calculateCompletionRate(20, 4, 4)).toBe(1)
  })

  it('should handle zero expected workouts', () => {
    expect(calculateCompletionRate(5, 0, 0)).toBe(0)
  })

  it('should handle 3 days per week', () => {
    expect(calculateCompletionRate(9, 4, 3)).toBe(0.75)
  })
})

describe('Skill upgrade criteria', () => {
  describe('Novice → Moderate', () => {
    it('should upgrade with "too_easy" and ≥75% completion', () => {
      const result = determineSkillUpgrade('Novice', 'too_easy', 0.75, 0)
      expect(result).toEqual({ upgraded: true, newLevel: 'Moderate' })
    })

    it('should upgrade with "just_right" and ≥75% completion', () => {
      const result = determineSkillUpgrade('Novice', 'just_right', 0.8, 0)
      expect(result).toEqual({ upgraded: true, newLevel: 'Moderate' })
    })

    it('should NOT upgrade with "challenging" even at 90% completion', () => {
      const result = determineSkillUpgrade('Novice', 'challenging', 0.9, 0)
      expect(result).toEqual({ upgraded: false, newLevel: 'Novice' })
    })

    it('should NOT upgrade with "too_hard" even at 100% completion', () => {
      const result = determineSkillUpgrade('Novice', 'too_hard', 1.0, 0)
      expect(result).toEqual({ upgraded: false, newLevel: 'Novice' })
    })

    it('should NOT upgrade with low completion rate', () => {
      const result = determineSkillUpgrade('Novice', 'too_easy', 0.5, 0)
      expect(result).toEqual({ upgraded: false, newLevel: 'Novice' })
    })

    it('should upgrade at exactly 75% threshold', () => {
      const result = determineSkillUpgrade('Novice', 'just_right', 0.75, 0)
      expect(result).toEqual({ upgraded: true, newLevel: 'Moderate' })
    })
  })

  describe('Moderate → Advanced', () => {
    it('should upgrade with "too_easy", ≥80% completion, and 2+ reassessments', () => {
      const result = determineSkillUpgrade('Moderate', 'too_easy', 0.85, 2)
      expect(result).toEqual({ upgraded: true, newLevel: 'Advanced' })
    })

    it('should upgrade with "just_right", ≥80% completion, and 2+ reassessments', () => {
      const result = determineSkillUpgrade('Moderate', 'just_right', 0.8, 3)
      expect(result).toEqual({ upgraded: true, newLevel: 'Advanced' })
    })

    it('should NOT upgrade with only 1 completed reassessment', () => {
      const result = determineSkillUpgrade('Moderate', 'just_right', 0.85, 1)
      expect(result).toEqual({ upgraded: false, newLevel: 'Moderate' })
    })

    it('should NOT upgrade with <80% completion', () => {
      const result = determineSkillUpgrade('Moderate', 'too_easy', 0.79, 2)
      expect(result).toEqual({ upgraded: false, newLevel: 'Moderate' })
    })

    it('should NOT upgrade with "challenging" difficulty', () => {
      const result = determineSkillUpgrade('Moderate', 'challenging', 0.9, 3)
      expect(result).toEqual({ upgraded: false, newLevel: 'Moderate' })
    })
  })

  describe('Advanced (max level)', () => {
    it('should stay Advanced regardless of inputs', () => {
      const result = determineSkillUpgrade('Advanced', 'too_easy', 1.0, 5)
      expect(result).toEqual({ upgraded: false, newLevel: 'Advanced' })
    })

    it('should stay Advanced with any difficulty', () => {
      const result = determineSkillUpgrade('Advanced', 'too_hard', 0.5, 0)
      expect(result).toEqual({ upgraded: false, newLevel: 'Advanced' })
    })
  })
})

describe('Full cycle behavior', () => {
  it('SSP completion should cycle back to GPP', () => {
    expect(getNextPhase('SSP')).toBe('GPP')
  })

  it('should correctly identify full cycle completion', () => {
    const isFullCycle = (phase: Phase) => phase === 'SSP'
    expect(isFullCycle('GPP')).toBe(false)
    expect(isFullCycle('SPP')).toBe(false)
    expect(isFullCycle('SSP')).toBe(true)
  })
})
