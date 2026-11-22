import {
  NIGHT,
  STORY_CATEGORIES,
  countdownLine,
  daysSummary,
  mixHex,
  monthGrid,
  movementFamily,
  phaseCaption,
  splitSports,
  storyCategory,
  tintedGround,
  weekDayLine,
  weekStrip,
  workoutShortName,
  workoutTag,
} from '../firstRunStory'

describe('mixHex', () => {
  it('returns the base at 0, the color at 1, and a blend between', () => {
    expect(mixHex('#FFFFFF', '#000000', 0)).toBe('#000000')
    expect(mixHex('#FFFFFF', '#000000', 1)).toBe('#FFFFFF')
    expect(mixHex('#FFFFFF', '#000000', 0.5)).toBe('#808080')
    expect(mixHex('#fff', '#000', 0.5)).toBe('#808080')
  })
})

describe('categories', () => {
  it('names the four categories the way athletes see them, with the storyboard colors', () => {
    expect([1, 2, 3, 4].map((id) => [storyCategory(id).name, storyCategory(id).color])).toEqual([
      ['Endurance', '#14B8A6'],
      ['Power', '#A855F7'],
      ['Rotation', '#F97316'],
      ['Strength', '#3B82F6'],
    ])
  })

  it('falls back to Strength for an unknown id', () => {
    expect(storyCategory(9).name).toBe('Strength')
    expect(storyCategory(undefined).name).toBe('Strength')
  })

  it('tints the ground only once a category is known', () => {
    expect(tintedGround(null)).toBe(NIGHT.ink)
    expect(tintedGround(STORY_CATEGORIES[2].color)).toBe(mixHex('#A855F7', NIGHT.ink, 0.16))
  })
})

describe('splitSports', () => {
  it('puts the six Popular sports first in their order and the rest alphabetically', () => {
    const names = ['Wrestling', 'Volleyball', 'Badminton', 'Soccer', 'Basketball', 'Track (Sprints/Jumps)', 'Football', 'Baseball', 'Golf']
    const { popular, rest } = splitSports(names.map((name) => ({ name })))
    expect(popular.map((s) => s.name)).toEqual(['Basketball', 'Soccer', 'Football', 'Baseball', 'Volleyball', 'Track (Sprints/Jumps)'])
    expect(rest.map((s) => s.name)).toEqual(['Badminton', 'Golf', 'Wrestling'])
  })
})

describe('movementFamily', () => {
  it('maps roll, bounce and water sports, and leaves the rest plain', () => {
    const got = ['Soccer', 'Field Hockey', 'Lacrosse', 'Rugby', 'Basketball', 'Volleyball', 'Swimming', 'Diving', 'Football', 'Golf'].map(
      (s) => [s, movementFamily(s)]
    )
    expect(got).toEqual([
      ['Soccer', 'roll'],
      ['Field Hockey', null],
      ['Lacrosse', null],
      ['Rugby', 'roll'],
      ['Basketball', 'bounce'],
      ['Volleyball', 'bounce'],
      ['Swimming', 'water'],
      ['Diving', 'water'],
      ['Football', null],
      ['Golf', null],
    ])
    expect(movementFamily(undefined)).toBeNull()
  })
})

describe('daysSummary', () => {
  it('counts sessions and lists days Monday first', () => {
    expect(daysSummary([5, 1, 3])).toEqual({ count: '3 sessions a week', list: 'Mon / Wed / Fri' })
    expect(daysSummary([0])).toEqual({ count: '1 session a week', list: 'Sun' })
  })
})

describe('monthGrid', () => {
  it('pads to whole weeks, Sunday first, and disables today and earlier', () => {
    // November 2026 starts on a Sunday and has 30 days.
    const cells = monthGrid(2026, 10, new Date(2026, 10, 15, 9))
    expect(cells.length % 7).toBe(0)
    expect(cells[0]).toEqual({ day: 1, iso: '2026-11-01', disabled: true })
    expect(cells[14]).toEqual({ day: 15, iso: '2026-11-15', disabled: true })
    expect(cells[15]).toEqual({ day: 16, iso: '2026-11-16', disabled: false })
    // December 2026 starts on a Tuesday.
    expect(monthGrid(2026, 11, new Date(2026, 10, 15)).slice(0, 3).map((c) => c?.day ?? null)).toEqual([null, null, 1])
  })
})

describe('phaseCaption', () => {
  const power = STORY_CATEGORIES[2]
  it('explains each phase in plain English, with the category focus for SPP', () => {
    expect(phaseCaption('GPP', 'Basketball', power, false)).toMatch(/^General fitness and how you move/)
    expect(phaseCaption('SPP', 'Basketball', power, false)).toBe('Training shifts to jumping, landing and stopping fast for basketball.')
    expect(phaseCaption('SSP', 'Basketball', power, false)).toMatch(/fresh for your first game\.$/)
    expect(phaseCaption('SSP', 'Basketball', power, true)).toMatch(/fresh for the season\.$/)
  })
})

describe('countdownLine', () => {
  it('names the first game and the weeks, or the no-season plan', () => {
    expect(countdownLine('2027-02-07', 12, 12)).toBe('First game Sun, Feb 7 · 12 weeks')
    expect(countdownLine('2026-11-22', 1, 6)).toBe('First game Sun, Nov 22 · 1 week')
    expect(countdownLine(null, 0, 12)).toBe('No set season · 12-week plan')
  })
})

describe('workout names', () => {
  it('drops the block suffix and picks a one-word tag', () => {
    expect(workoutShortName('Lower Body A - Foundation')).toBe('Lower Body A')
    expect(['Lower Body A - Foundation', 'Upper Body B', 'Power & Conditioning', 'Full Body Athletic', 'Active Recovery'].map(workoutTag)).toEqual([
      'LOWER',
      'UPPER',
      'POWER',
      'FULL',
      'RECOVER',
    ])
  })
})

describe('weekStrip', () => {
  const T = [
    { day: 1, name: 'Lower Body A - Foundation', estimatedDurationMinutes: 28 },
    { day: 2, name: 'Upper Body A - Foundation', estimatedDurationMinutes: 29 },
    { day: 3, name: 'Power & Conditioning', estimatedDurationMinutes: 30 },
  ]

  it('starts Day 1 on the next training day and keeps the program order around the week', () => {
    // Sunday Nov 15, 2026: the next training day is Monday.
    const sunday = new Date(2026, 10, 15, 9)
    const week = weekStrip([1, 3, 5], T, sunday)
    expect(week.map((d) => [d.short, d.programDay, d.tag])).toEqual([
      ['Mon', 1, 'LOWER'],
      ['Tue', null, null],
      ['Wed', 2, 'UPPER'],
      ['Thu', null, null],
      ['Fri', 3, 'POWER'],
      ['Sat', null, null],
      ['Sun', null, null],
    ])
    // On a Thursday, Friday is next, so it's Day 1 and Monday wraps to Day 2.
    const thursday = new Date(2026, 10, 19, 9)
    expect(weekStrip([1, 3, 5], T, thursday).filter((d) => d.programDay).map((d) => [d.short, d.programDay])).toEqual([
      ['Mon', 2],
      ['Wed', 3],
      ['Fri', 1],
    ])
  })

  it('writes the line under the strip for a training day, Day 1 and a rest day', () => {
    const sunday = new Date(2026, 10, 15, 9)
    const week = weekStrip([1, 3, 5], T, sunday)
    expect(weekDayLine(week[0], [1, 3, 5], sunday)).toBe('Day 1 · Tomorrow · Lower Body A · About 28 min')
    expect(weekDayLine(week[2], [1, 3, 5], sunday)).toBe('Day 2 · Wed · Upper Body A · About 29 min')
    expect(weekDayLine(week[1], [1, 3, 5], sunday)).toBe('Tue · Rest day')
  })

  it('still lists the days before the templates load', () => {
    const week = weekStrip([1, 3, 5], [], new Date(2026, 10, 15, 9))
    expect(weekDayLine(week[0], [1, 3, 5], new Date(2026, 10, 15, 9))).toBe('Day 1 · Tomorrow')
  })
})
