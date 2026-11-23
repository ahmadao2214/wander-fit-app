import React from 'react'
import { render } from '@testing-library/react-native'
import { TelemetryLifecycle } from '../TelemetryLifecycle'

const callOrder: string[] = []
const mockInit = jest.fn(() => callOrder.push('init'))
const mockSetOptOut = jest.fn((v: boolean) => callOrder.push(`setOptOut:${v}`))
const mockSetCaptureReady = jest.fn((v: boolean) => callOrder.push(`setCaptureReady:${v}`))
const mockIdentify = jest.fn((id: string) => callOrder.push(`identify:${id}`))
const mockReset = jest.fn(() => callOrder.push('reset'))
const mockTrackScreen = jest.fn((segs: readonly string[]) =>
  callOrder.push(`trackScreen:${segs.join('/')}`)
)
const mockSyncSessionReplay = jest.fn(
  (gate: { analyticsOptOut: boolean; sessionReplayOptIn: boolean }) =>
    callOrder.push(`syncReplay:${gate.analyticsOptOut}:${gate.sessionReplayOptIn}`)
)
const mockIsOptedOut = jest.fn(() => false)

jest.mock('../../lib/analytics', () => ({
  analytics: {
    init: () => mockInit(),
    setRuntimeContext: jest.fn(),
    setOptOut: (v: boolean) => mockSetOptOut(v),
    setCaptureReady: (v: boolean) => mockSetCaptureReady(v),
    identify: (id: string) => mockIdentify(id),
    reset: () => mockReset(),
    trackScreen: (s: readonly string[]) => mockTrackScreen(s),
    syncSessionReplay: (g: any) => mockSyncSessionReplay(g),
    isOptedOut: () => mockIsOptedOut(),
  },
}))

let mockAuthState: any
let mockSegments: string[] = ['(athlete)', 'program']

jest.mock('expo-router', () => ({
  useSegments: () => mockSegments,
}))

jest.mock('expo-constants', () => ({
  expoConfig: { version: '1.0.0' },
}))

jest.mock('convex/react', () => ({
  useQuery: () => ({ ageGroup: '18-35' }),
}))

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockAuthState,
}))

describe('TelemetryLifecycle (S3, S17)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    callOrder.length = 0
    mockSegments = ['(athlete)', 'program']
  })

  it('defers SDK init and suppresses screen events while auth/consent loads and when opted out (S3)', () => {
    mockAuthState = {
      isLoading: true,
      isAuthenticated: false,
      user: null,
      hasCompletedIntake: false,
    }

    const { rerender } = render(<TelemetryLifecycle />)
    expect(mockInit).not.toHaveBeenCalled()
    expect(mockTrackScreen).not.toHaveBeenCalled()

    // Opted-out athlete resolves -> SDK STILL never initializes
    mockAuthState = {
      isLoading: false,
      isAuthenticated: true,
      user: { _id: 'user_optout', analyticsOptOut: true, sessionReplayOptIn: false },
      hasCompletedIntake: true,
    }
    rerender(<TelemetryLifecycle />)

    expect(mockInit).not.toHaveBeenCalled()
    expect(mockIdentify).not.toHaveBeenCalled()
    expect(mockSetOptOut).toHaveBeenCalledWith(true)
  })

  it('leaves capture enabled when auth is already resolved on the first mount (S17)', () => {
    mockAuthState = {
      isLoading: false,
      isAuthenticated: true,
      user: { _id: 'user_ready', analyticsOptOut: false, sessionReplayOptIn: false },
      hasCompletedIntake: true,
    }

    render(<TelemetryLifecycle />)

    expect(mockSetCaptureReady).toHaveBeenLastCalledWith(true)
    expect(mockIdentify).toHaveBeenCalledWith('user_ready')
  })

  it('captures anonymously for a signed-in athlete with no user row yet, without identify or replay (S19)', () => {
    mockSegments = ['(first-run)', 'sport']
    mockAuthState = {
      isLoading: false,
      isAuthenticated: true,
      needsSetup: true,
      user: null,
      hasCompletedIntake: false,
    }

    render(<TelemetryLifecycle />)

    expect(mockInit).toHaveBeenCalled()
    expect(mockSetCaptureReady).toHaveBeenLastCalledWith(true)
    expect(mockTrackScreen).toHaveBeenCalledWith(['(first-run)', 'sport'])
    expect(mockIdentify).not.toHaveBeenCalled()
    expect(mockSyncSessionReplay).toHaveBeenLastCalledWith(
      expect.objectContaining({ isAuthenticated: false })
    )
  })

  it('does not carry a previous account opt-out onto a new account with no user row (S19)', () => {
    mockIsOptedOut.mockReturnValue(true)
    mockAuthState = {
      isLoading: false,
      isAuthenticated: true,
      needsSetup: true,
      user: null,
      hasCompletedIntake: false,
    }

    render(<TelemetryLifecycle />)

    expect(mockSetOptOut).toHaveBeenCalledWith(false)
    expect(mockInit).toHaveBeenCalled()
    expect(mockIdentify).not.toHaveBeenCalled()
    mockIsOptedOut.mockReturnValue(false)
  })

  it('applies opt-out and init BEFORE syncing replay when both preferences flip in one update (S17)', () => {
    mockAuthState = {
      isLoading: false,
      isAuthenticated: true,
      user: { _id: 'user_adult', analyticsOptOut: true, sessionReplayOptIn: false },
      hasCompletedIntake: true,
    }
    const { rerender } = render(<TelemetryLifecycle />)
    callOrder.length = 0

    // Both preferences flip in the same Convex snapshot
    mockAuthState = {
      isLoading: false,
      isAuthenticated: true,
      user: { _id: 'user_adult', analyticsOptOut: false, sessionReplayOptIn: true },
      hasCompletedIntake: true,
    }
    rerender(<TelemetryLifecycle />)

    const optOutClearIdx = callOrder.indexOf('setOptOut:false')
    const initIdx = callOrder.indexOf('init')
    const readyIdx = callOrder.indexOf('setCaptureReady:true')
    const syncIdx = callOrder.indexOf('syncReplay:false:true')

    expect(optOutClearIdx).toBeGreaterThanOrEqual(0)
    expect(initIdx).toBeGreaterThan(optOutClearIdx)
    expect(readyIdx).toBeGreaterThan(initIdx)
    expect(syncIdx).toBeGreaterThan(readyIdx)
  })
})
