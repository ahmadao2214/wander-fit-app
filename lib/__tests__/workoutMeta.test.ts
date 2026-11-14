import { warmupSummary, workoutMetaLine } from '../workoutMeta'

describe('warmupSummary', () => {
  it('reads a full warmup as duration, phases and exercises', () => {
    expect(warmupSummary({ durationMin: 8, phaseCount: 3, exerciseCount: 9 })).toBe(
      '~8 min · 3 phases · 9 exercises'
    )
  })

  it('leaves out zero duration and zero phases instead of printing them', () => {
    // A legacy warmup: one exercise marked by notes, with no warmupPhase
    expect(warmupSummary({ durationMin: 0, phaseCount: 0, exerciseCount: 1 })).toBe('1 exercise')
  })

  it('uses the singular for one phase', () => {
    expect(warmupSummary({ durationMin: 2, phaseCount: 1, exerciseCount: 3 })).toBe(
      '~2 min · 1 phase · 3 exercises'
    )
  })

  it('is empty when there is nothing to say', () => {
    expect(warmupSummary({ durationMin: 0, phaseCount: 0, exerciseCount: 0 })).toBe('')
  })
})

describe('workoutMetaLine', () => {
  it('joins minutes, exercise count and intensity', () => {
    expect(workoutMetaLine({ minutes: 40, exerciseCount: 7, intensity: 'Moderate' })).toBe(
      '~40 min · 7 exercises · Moderate'
    )
  })

  it('skips parts that are missing or zero', () => {
    expect(workoutMetaLine({ minutes: 0, exerciseCount: 1 })).toBe('1 exercise')
    expect(workoutMetaLine({ minutes: 35 })).toBe('~35 min')
  })
})
