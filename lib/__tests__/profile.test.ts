import { experienceLabel, trainingDaysLabel } from '../profile'
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
