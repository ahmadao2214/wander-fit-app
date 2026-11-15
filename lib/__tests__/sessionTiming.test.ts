import { activeSeconds, pausedLabel, pausedSecondsAfterResume } from '../sessionTiming'

const MIN = 60_000
const start = new Date(2026, 10, 14, 9, 0, 0).getTime()

describe('activeSeconds', () => {
  it('counts from the start when the session was never paused', () => {
    expect(activeSeconds({ startedAt: start }, start + 10 * MIN)).toBe(600)
  })

  it('leaves out time spent paused before a resume', () => {
    expect(activeSeconds({ startedAt: start, pausedSeconds: 3600 }, start + 70 * MIN)).toBe(600)
  })

  it('stops at the pause while the session is still paused', () => {
    expect(activeSeconds({ startedAt: start, pausedAt: start + 5 * MIN }, start + 24 * 60 * MIN)).toBe(300)
  })

  it('never goes negative', () => {
    expect(activeSeconds({ startedAt: start, pausedSeconds: 999 }, start)).toBe(0)
  })
})

describe('pausedSecondsAfterResume', () => {
  it('adds the length of the pause that just ended', () => {
    expect(pausedSecondsAfterResume({ startedAt: start, pausedAt: start + MIN, pausedSeconds: 30 }, start + 3 * MIN)).toBe(150)
  })

  it('keeps the total when the session is not paused', () => {
    expect(pausedSecondsAfterResume({ startedAt: start, pausedSeconds: 30 }, start + 3 * MIN)).toBe(30)
  })
})

describe('pausedLabel', () => {
  const now = new Date(2026, 10, 14, 18, 0, 0)

  it('says today for a pause earlier the same day', () => {
    expect(pausedLabel(new Date(2026, 10, 14, 7, 0, 0).getTime(), now)).toBe('Paused earlier today')
  })

  it('says yesterday across midnight', () => {
    expect(pausedLabel(new Date(2026, 10, 13, 23, 30, 0).getTime(), now)).toBe('Paused yesterday')
  })

  it('names the date for an older pause', () => {
    expect(pausedLabel(new Date(2026, 10, 10, 12, 0, 0).getTime(), now)).toBe('Paused Tuesday, Nov 10')
  })
})
