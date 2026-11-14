import { todayHeading, phaseWeekSegments, progressCaption, countMainExercises } from '../today'

describe('todayHeading', () => {
  it('names the weekday, short month and day', () => {
    expect(todayHeading(new Date(2026, 10, 14))).toBe('Saturday, Nov 14')
    expect(todayHeading(new Date(2027, 0, 4))).toBe('Monday, Jan 4')
  })
})

describe('phaseWeekSegments', () => {
  it('marks earlier weeks done, this week current, later weeks upcoming', () => {
    expect(phaseWeekSegments(2, 4)).toEqual(['done', 'current', 'upcoming', 'upcoming'])
  })

  it('starts a phase with the first week current', () => {
    expect(phaseWeekSegments(1, 4)).toEqual(['current', 'upcoming', 'upcoming', 'upcoming'])
  })

  it('clamps a week past the end of the phase to the last segment', () => {
    expect(phaseWeekSegments(6, 3)).toEqual(['done', 'done', 'current'])
  })

  it('always returns at least one segment', () => {
    expect(phaseWeekSegments(1, 0)).toEqual(['current'])
  })
})

describe('progressCaption', () => {
  it('is null before the first workout, instead of a row of zeros', () => {
    expect(progressCaption({ workoutsCompleted: 0, currentStreak: 0 })).toBeNull()
  })

  it('counts workouts and adds a streak only once it is longer than a day', () => {
    expect(progressCaption({ workoutsCompleted: 1, currentStreak: 1 })).toBe('1 workout done')
    expect(progressCaption({ workoutsCompleted: 5, currentStreak: 3 })).toBe('5 workouts done · 3-day streak')
  })
})

describe('countMainExercises', () => {
  it('leaves out warmup exercises, marked by section or by the older notes field', () => {
    expect(
      countMainExercises([
        { section: 'warmup' },
        { notes: 'Warmup' },
        { section: 'main' },
        {},
        { section: 'main', notes: 'Warmup' },
      ])
    ).toBe(3)
  })

  it('handles a missing list', () => {
    expect(countMainExercises(undefined)).toBe(0)
  })
})
