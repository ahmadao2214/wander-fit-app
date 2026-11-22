import {
  canShowSessionReplayOptIn,
  shouldRecordSessionReplay,
  type SessionReplayGateState,
} from '../sessionReplayGate'

const VALID_ADULT_WEB_STATE: SessionReplayGateState = {
  platform: 'web',
  envEnabled: true,
  isAuthenticated: true,
  hasCompletedIntake: true,
  ageGroup: '18-35',
  analyticsOptOut: false,
  sessionReplayOptIn: true,
  normalizedRoute: '/(athlete)/program',
}

describe('sessionReplayGate', () => {
  it('allows recording only when all 7 gates pass for an opted-in adult on Web', () => {
    expect(shouldRecordSessionReplay(VALID_ADULT_WEB_STATE)).toBe(true)
    expect(shouldRecordSessionReplay({ ...VALID_ADULT_WEB_STATE, ageGroup: '36+' })).toBe(true)
  })

  it('NEVER records for youth (14-17) or unknown ageGroup', () => {
    expect(shouldRecordSessionReplay({ ...VALID_ADULT_WEB_STATE, ageGroup: '14-17' })).toBe(false)
    expect(shouldRecordSessionReplay({ ...VALID_ADULT_WEB_STATE, ageGroup: undefined })).toBe(false)
  })

  it('NEVER records on native platforms (Phase 1 Web-only scope)', () => {
    expect(shouldRecordSessionReplay({ ...VALID_ADULT_WEB_STATE, platform: 'ios' })).toBe(false)
    expect(shouldRecordSessionReplay({ ...VALID_ADULT_WEB_STATE, platform: 'android' })).toBe(false)
  })

  it('blocks recording when env flag, auth, intake, opt-out, or opt-in gate fails', () => {
    expect(shouldRecordSessionReplay({ ...VALID_ADULT_WEB_STATE, envEnabled: false })).toBe(false)
    expect(shouldRecordSessionReplay({ ...VALID_ADULT_WEB_STATE, isAuthenticated: false })).toBe(false)
    expect(shouldRecordSessionReplay({ ...VALID_ADULT_WEB_STATE, hasCompletedIntake: false })).toBe(false)
    expect(shouldRecordSessionReplay({ ...VALID_ADULT_WEB_STATE, analyticsOptOut: true })).toBe(false)
    expect(shouldRecordSessionReplay({ ...VALID_ADULT_WEB_STATE, sessionReplayOptIn: false })).toBe(false)
  })

  it('auto-stops on excluded routes even when all adult opt-in flags are true', () => {
    const excludedRoutes = [
      '/(auth)/sign-in',
      '/(first-run)/about',
      '/(reassessment)/index',
      '/(athlete)/profile',
      '/(athlete)/settings',
      '/(athlete)/workout/[id]',
    ]
    for (const normalizedRoute of excludedRoutes) {
      expect(shouldRecordSessionReplay({ ...VALID_ADULT_WEB_STATE, normalizedRoute })).toBe(false)
    }
  })

  it('hides the Settings replay opt-in toggle for 14-17, native, or unflagged builds', () => {
    expect(
      canShowSessionReplayOptIn({
        platform: 'web',
        envEnabled: true,
        isAuthenticated: true,
        hasCompletedIntake: true,
        ageGroup: '18-35',
      })
    ).toBe(true)

    expect(
      canShowSessionReplayOptIn({
        platform: 'web',
        envEnabled: true,
        isAuthenticated: true,
        hasCompletedIntake: true,
        ageGroup: '14-17',
      })
    ).toBe(false)

    expect(
      canShowSessionReplayOptIn({
        platform: 'ios',
        envEnabled: true,
        isAuthenticated: true,
        hasCompletedIntake: true,
        ageGroup: '18-35',
      })
    ).toBe(false)

    expect(
      canShowSessionReplayOptIn({
        platform: 'web',
        envEnabled: false,
        isAuthenticated: true,
        hasCompletedIntake: true,
        ageGroup: '18-35',
      })
    ).toBe(false)
  })
})
