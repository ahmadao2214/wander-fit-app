import { blockDates, blockOutcome, blockRecap, decisionCopy } from '../reassessment'

// Audit F04 acceptance: zero, partial and full completion are tested
// separately, and the wording matches the evidence.
describe('blockRecap', () => {
  it('zero sessions: says the block is over, with no celebration', () => {
    const recap = blockRecap('GPP', 0, 12)
    expect(recap).toMatchObject({
      outcome: 'none',
      title: 'Your GPP block is over',
      sessions: '0 of 12 sessions',
      celebrate: false,
    })
    expect(recap.summary).toBe('No sessions were logged in this block.')
  })

  it('some sessions: states the count, with no celebration', () => {
    expect(blockRecap('SPP', 9, 12)).toMatchObject({
      outcome: 'partial',
      title: 'Your SPP block is over',
      sessions: '9 of 12 sessions',
      summary: 'You trained 9 sessions of the 12 planned.',
      celebrate: false,
    })
  })

  it('every session: celebrates the finished block', () => {
    expect(blockRecap('SSP', 12, 12)).toMatchObject({
      outcome: 'full',
      title: 'You finished SSP',
      celebrate: true,
    })
  })

  it('never says "finished" or "completed" unless every session was done', () => {
    for (const completed of [0, 1, 11]) {
      const { title, summary } = blockRecap('GPP', completed, 12)
      expect({ completed, text: `${title} ${summary}` }).not.toEqual({
        completed,
        text: expect.stringMatching(/finished|completed|great work/i),
      })
    }
  })

  it('uses singular words for one session', () => {
    expect(blockRecap('GPP', 1, 12).summary).toBe('You trained 1 session of the 12 planned.')
    expect(blockRecap('GPP', 1, 1).sessions).toBe('1 of 1 session')
  })
})

describe('blockOutcome', () => {
  it('counts extra sessions as full and zero planned sessions as not full', () => {
    expect(blockOutcome(14, 12)).toBe('full')
    expect(blockOutcome(0, 0)).toBe('none')
    expect(blockOutcome(2, 0)).toBe('partial')
  })
})

describe('blockDates', () => {
  it('shows the start and end days', () => {
    expect(blockDates(new Date(2026, 9, 19).getTime(), new Date(2026, 10, 15).getTime())).toBe('Oct 19 – Nov 15')
  })
})

describe('decisionCopy', () => {
  it('describes repeating the same phase', () => {
    expect(decisionCopy('repeat', 'GPP', 'SPP', false)).toEqual({
      label: 'Repeat GPP',
      detail: 'Run the GPP block again from week 1.',
    })
  })

  it('describes moving on, and a new cycle after SSP', () => {
    expect(decisionCopy('move_on', 'GPP', 'SPP', false).label).toBe('Move on to SPP')
    expect(decisionCopy('move_on', 'SSP', 'GPP', true).detail).toBe('Start a new cycle at GPP, week 1.')
  })
})
