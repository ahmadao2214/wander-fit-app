import { ATHLETE_HOME, rootRoute, STEP_ROUTES } from '../firstRunRoutes'
import { FIRST_RUN_STEPS } from '../firstRunDraft'

const signedOut = { isLoading: false, isAuthenticated: false, hasProgram: false, lastStep: 'promise' as const }

describe('rootRoute', () => {
  it('opens a fresh install on the promise screen', () => {
    expect(rootRoute(signedOut)).toBe('/(first-run)')
  })

  it('reopens on the step the athlete last reached', () => {
    expect(rootRoute({ ...signedOut, lastStep: 'days' })).toBe('/(first-run)/days')
    expect(rootRoute({ ...signedOut, lastStep: 'reveal' })).toBe('/(first-run)/reveal')
  })

  it('never shows the First Run to a signed-in athlete with a program', () => {
    for (const lastStep of [null, ...FIRST_RUN_STEPS]) {
      expect(rootRoute({ isLoading: false, isAuthenticated: true, hasProgram: true, lastStep })).toBe(ATHLETE_HOME)
    }
  })

  it('sends a signed-in account with no program back to its draft', () => {
    expect(rootRoute({ isLoading: false, isAuthenticated: true, hasProgram: false, lastStep: 'reveal' })).toBe(
      '/(first-run)/reveal'
    )
  })

  it('waits while auth or the draft is loading', () => {
    expect(rootRoute({ ...signedOut, isLoading: true })).toBeNull()
    expect(rootRoute({ ...signedOut, lastStep: null })).toBeNull()
  })

  it('has a screen for every step', () => {
    expect(Object.keys(STEP_ROUTES)).toEqual([...FIRST_RUN_STEPS])
  })
})
