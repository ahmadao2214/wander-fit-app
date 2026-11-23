import { experienceLabel, phaseTrack, trainingDaysLabel } from '../profile'
import { YEARS_CHOICES } from '../firstRun'

describe('experienceLabel', () => {
  it('says "New to training" instead of 0', () => {
    expect(experienceLabel(0)).toBe('New to training')
  })

  it('matches the First Run choice each answer came from', () => {
    for (const choice of YEARS_CHOICES) {
      expect({ years: choice.years, label: experienceLabel(choice.years) }).toEqual({
        years: choice.years,
        label: choice.label,
      })
    }
  })

  it('buckets older exact answers the same way', () => {
    expect(experienceLabel(0.5)).toBe('Under a year')
    expect(experienceLabel(2)).toBe('1–2 years')
    expect(experienceLabel(7)).toBe('3+ years')
  })
})

describe('trainingDaysLabel', () => {
  it('reads as a sentence fragment', () => {
    expect(trainingDaysLabel(3)).toBe('3 a week')
  })
})

describe('phaseTrack', () => {
  const fills = (t: ReturnType<typeof phaseTrack>) => t.segments.map((s) => s.fill)
  const labels = (t: ReturnType<typeof phaseTrack>) => t.segments.map((s) => s.label)

  it('keeps GPP, SPP, SSP order', () => {
    const t = phaseTrack({ phase: 'SPP', week: 2, weeksPerPhase: 4, totalProgramWeeks: 12 })
    expect(t.segments.map((s) => s.phase)).toEqual(['GPP', 'SPP', 'SSP'])
  })

  it('fills part of GPP and leaves later phases empty', () => {
    const t = phaseTrack({ phase: 'GPP', week: 3, weeksPerPhase: 4, totalProgramWeeks: 12 })
    expect(fills(t)).toEqual([0.75, 0, 0])
    expect(t.segments.map((s) => s.current)).toEqual([true, false, false])
    expect(labels(t)).toEqual(['Week 3 of 4', '4 weeks', '4 weeks'])
    expect(t.overallWeek).toBe(3)
    expect(t.totalWeeks).toBe(12)
    expect(t.summary).toBe('Week 3 of 12')
  })

  it('fills GPP in SPP', () => {
    const t = phaseTrack({ phase: 'SPP', week: 2, weeksPerPhase: 4, totalProgramWeeks: 12 })
    expect(fills(t)).toEqual([1, 0.5, 0])
    expect(t.segments.map((s) => s.current)).toEqual([false, true, false])
    expect(labels(t)).toEqual(['4 weeks', 'Week 2 of 4', '4 weeks'])
    expect(t.summary).toBe('Week 6 of 12')
  })

  it('fills GPP and SPP in SSP', () => {
    const t = phaseTrack({ phase: 'SSP', week: 1, weeksPerPhase: 4, totalProgramWeeks: 12 })
    expect(fills(t)).toEqual([1, 1, 0.25])
    expect(labels(t)).toEqual(['4 weeks', '4 weeks', 'Week 1 of 4'])
    expect(t.summary).toBe('Week 9 of 12')
  })

  it('starts the program at week 1', () => {
    const t = phaseTrack({ phase: 'GPP', week: 1, weeksPerPhase: 4, totalProgramWeeks: 12 })
    expect(fills(t)).toEqual([0.25, 0, 0])
    expect(t.summary).toBe('Week 1 of 12')
  })

  it('fills every segment on the last week', () => {
    const t = phaseTrack({ phase: 'SSP', week: 4, weeksPerPhase: 4, totalProgramWeeks: 12 })
    expect(fills(t)).toEqual([1, 1, 1])
    expect(labels(t)).toEqual(['4 weeks', '4 weeks', 'Week 4 of 4'])
    expect(t.summary).toBe('Week 12 of 12')
  })

  it('falls back to 4 weeks a phase when weeksPerPhase is missing', () => {
    for (const weeksPerPhase of [null, undefined]) {
      const t = phaseTrack({ phase: 'SPP', week: 1, weeksPerPhase, totalProgramWeeks: 12 })
      expect({ weeksPerPhase, labels: labels(t), summary: t.summary }).toEqual({
        weeksPerPhase,
        labels: ['4 weeks', 'Week 1 of 4', '4 weeks'],
        summary: 'Week 5 of 12',
      })
    }
  })

  it('works out the program length when totalProgramWeeks is missing', () => {
    expect(
      phaseTrack({ phase: 'GPP', week: 2, weeksPerPhase: 6, totalProgramWeeks: null }).summary
    ).toBe('Week 2 of 18')
    expect(phaseTrack({ phase: 'GPP', week: 2 }).summary).toBe('Week 2 of 12')
  })

  it('clamps a week past the phase length to the last week', () => {
    const t = phaseTrack({ phase: 'GPP', week: 9, weeksPerPhase: 4, totalProgramWeeks: 12 })
    expect(fills(t)).toEqual([1, 0, 0])
    expect(t.segments[0].label).toBe('Week 4 of 4')
    expect(t.overallWeek).toBe(4)
  })

  it('reads a week below 1 as week 1', () => {
    const t = phaseTrack({ phase: 'SPP', week: 0, weeksPerPhase: 4, totalProgramWeeks: 12 })
    expect(fills(t)).toEqual([1, 0.25, 0])
    expect(t.segments[1].label).toBe('Week 1 of 4')
    expect(t.overallWeek).toBe(5)
  })

  it('counts to the end of the three phases when the season is further away', () => {
    // 14 weeks to the season schedules 3 × 4
    const t = phaseTrack({ phase: 'SSP', week: 4, weeksPerPhase: 4, totalProgramWeeks: 14 })
    expect(t.summary).toBe('Week 12 of 12')
    expect(t.segments.map((s) => s.fill)).toEqual([1, 1, 1])
  })

  it('counts the scheduled weeks when the season is closer than the program', () => {
    // 1 week to the season still schedules 3 × 2
    expect(
      phaseTrack({ phase: 'GPP', week: 1, weeksPerPhase: 2, totalProgramWeeks: 1 }).summary
    ).toBe('Week 1 of 6')
    expect(
      phaseTrack({ phase: 'SSP', week: 2, weeksPerPhase: 2, totalProgramWeeks: 1 }).summary
    ).toBe('Week 6 of 6')
  })

  it('never puts the overall week past the program length when only the total is known', () => {
    const t = phaseTrack({ phase: 'SSP', week: 4, weeksPerPhase: null, totalProgramWeeks: 10 })
    expect(t.overallWeek).toBe(10)
    expect(t.summary).toBe('Week 10 of 10')
  })

  it('treats an unknown phase as GPP', () => {
    const t = phaseTrack({ phase: 'XYZ', week: 2, weeksPerPhase: 4, totalProgramWeeks: 12 })
    expect(t.segments.map((s) => s.current)).toEqual([true, false, false])
    expect(fills(t)).toEqual([0.5, 0, 0])
    expect(t.summary).toBe('Week 2 of 12')
  })

  it('says "1 week" for one-week phases', () => {
    const t = phaseTrack({ phase: 'SPP', week: 1, weeksPerPhase: 1, totalProgramWeeks: null })
    expect(fills(t)).toEqual([1, 1, 0])
    expect(labels(t)).toEqual(['1 week', 'Week 1 of 1', '1 week'])
    expect(t.summary).toBe('Week 2 of 3')
  })

  it('builds one spoken label for the whole track', () => {
    const t = phaseTrack({ phase: 'GPP', week: 3, weeksPerPhase: 4, totalProgramWeeks: 12 })
    expect(t.accessibilityLabel).toBe('GPP, week 3 of 4. SPP, 4 weeks. SSP, 4 weeks.')
  })
})
