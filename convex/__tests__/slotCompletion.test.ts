import { countsAsDone, doneSlots, isWorkoutDone, programLayout, slotKey } from '../blockCompletion'

/** Templates for one phase, weeks 1-4, two days each: "GPP-W2D1" and so on. */
const templates = ['GPP', 'SPP', 'SSP'].flatMap((phase) =>
  [1, 2, 3, 4].flatMap((week) =>
    [1, 2].map((day) => ({ _id: `${phase}-W${week}D${day}`, phase, week, day }))
  )
)
const session = (templateId: string, completedAt: number) => ({
  templateId,
  startedAt: completedAt,
  completedAt,
})

describe('programLayout', () => {
  it('repeats the week-2 and week-3 workouts in a 6-week phase', () => {
    const gpp = programLayout(templates, [], 6).filter((s) => s.phase === 'GPP')
    expect(gpp.map((s) => `${s.week}:${s.templateId}`)).toEqual([
      '1:GPP-W1D1',
      '1:GPP-W1D2',
      '2:GPP-W2D1',
      '2:GPP-W2D2',
      '3:GPP-W2D1',
      '3:GPP-W2D2',
      '4:GPP-W3D1',
      '4:GPP-W3D2',
      '5:GPP-W3D1',
      '5:GPP-W3D2',
      '6:GPP-W4D1',
      '6:GPP-W4D2',
    ])
  })

  it('puts an overridden workout in its slot', () => {
    const layout = programLayout(
      templates,
      [{ phase: 'GPP', week: 1, day: 1, templateId: 'GPP-W1D2' }],
      4
    )
    expect(layout.slice(0, 2).map((s) => s.templateId)).toEqual(['GPP-W1D2', 'GPP-W1D2'])
  })
})

describe('doneSlots', () => {
  const layout = programLayout(templates, [], 5)

  it('a workout done once fills its first slot only (regression: week 3 of a 5-week phase)', () => {
    const done = doneSlots(layout, [session('GPP-W2D1', 1)])
    expect(done.has('GPP-2-1')).toBe(true)
    expect(done.has('GPP-3-1')).toBe(false)
  })

  it('a second session of the same workout fills the next slot', () => {
    const done = doneSlots(layout, [session('GPP-W2D1', 2), session('GPP-W2D1', 1)])
    expect(done.get('GPP-2-1')?.completedAt).toBe(1)
    expect(done.get('GPP-3-1')?.completedAt).toBe(2)
  })

  it('keeps the 4-week mapping one slot per workout', () => {
    const four = programLayout(templates, [], 4)
    const done = doneSlots(
      four,
      templates.map((t, i) => session(t._id, i))
    )
    expect(done.size).toBe(four.length)
  })
})

describe('isWorkoutDone', () => {
  const layout = programLayout(templates, [], 5)
  const at = (week: number) => ({ currentPhase: 'GPP', currentWeek: week })

  it('is done in week 2 after one session', () => {
    const done = doneSlots(layout, [session('GPP-W2D1', 1)])
    expect(isWorkoutDone(layout, done, 'GPP-W2D1', at(2))).toBe(true)
  })

  it('is not done in week 3 until it is done again (regression)', () => {
    const once = doneSlots(layout, [session('GPP-W2D1', 1)])
    expect(isWorkoutDone(layout, once, 'GPP-W2D1', at(3))).toBe(false)
    const twice = doneSlots(layout, [session('GPP-W2D1', 1), session('GPP-W2D1', 2)])
    expect(isWorkoutDone(layout, twice, 'GPP-W2D1', at(3))).toBe(true)
  })

  it("counts a later week's workout done early once its first slot is done", () => {
    const done = doneSlots(layout, [session('GPP-W3D1', 1)])
    expect(isWorkoutDone(layout, done, 'GPP-W3D1', at(1))).toBe(true)
  })

  it('is not done for a workout that is not in the program', () => {
    expect(isWorkoutDone(layout, new Map(), 'other', at(1))).toBe(false)
    expect(slotKey({ phase: 'GPP', week: 1, day: 2 })).toBe('GPP-1-2')
  })
})

describe('countsAsDone and Redo', () => {
  const program = { currentPhase: 'GPP', phaseStartDate: 0 }
  it('a Redo is not progress', () => {
    expect(
      countsAsDone(
        {
          status: 'completed',
          startedAt: 1,
          completedAt: 1,
          templateSnapshot: { phase: 'GPP' },
          redo: true,
        },
        program
      )
    ).toBe(false)
    expect(
      countsAsDone(
        { status: 'completed', startedAt: 1, completedAt: 1, templateSnapshot: { phase: 'GPP' } },
        program
      )
    ).toBe(true)
  })
})
