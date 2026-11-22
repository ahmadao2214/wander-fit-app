import { AnalyticsService } from '../analytics'
import type { TelemetryTransport } from '../telemetryTypes'

function createMockTransport(overrides?: Partial<TelemetryTransport>) {
  const calls = {
    capture: [] as Array<{ event: string; properties?: Record<string, unknown> }>,
    identify: [] as string[],
    reset: 0,
    optOut: 0,
    optIn: 0,
    startSessionRecording: 0,
    stopSessionRecording: 0,
  }

  const transport: TelemetryTransport = {
    isActive: true,
    supportsSessionReplay: true,
    capture: (event, properties) => {
      calls.capture.push({ event, properties })
    },
    identify: (distinctId) => {
      calls.identify.push(distinctId)
    },
    reset: () => {
      calls.reset += 1
    },
    optOut: () => {
      calls.optOut += 1
    },
    optIn: () => {
      calls.optIn += 1
    },
    getSessionId: () => 'sess_test_123',
    startSessionRecording: () => {
      calls.startSessionRecording += 1
    },
    stopSessionRecording: () => {
      calls.stopSessionRecording += 1
    },
    ...overrides,
  }

  return { transport, calls }
}

describe('AnalyticsService', () => {
  it('stays completely off when EXPO_PUBLIC_POSTHOG_API_KEY is unset', () => {
    const factory = jest.fn()
    const svc = new AnalyticsService({
      transportFactory: factory,
      getApiKey: () => undefined,
    })

    svc.init()
    svc.identify('user_123')
    svc.trackWorkoutOpened({
      phase: 'GPP',
      week: 1,
      day: 1,
      intensity: 'Moderate',
      is_redo: false,
      has_custom_order: false,
    })

    expect(factory).not.toHaveBeenCalled()
    expect(svc.isActive()).toBe(false)
    expect(svc.getSessionId()).toBeUndefined()
  })

  it('identifies strictly by opaque Convex userId with zero traits and respects opt-out', () => {
    const { transport, calls } = createMockTransport()
    const svc = new AnalyticsService({
      transportFactory: () => transport,
      getApiKey: () => 'phc_test_key',
    })

    svc.setRuntimeContext({ platform: 'ios', app_version: '1.0.0' })
    svc.init()
    svc.identify('k17abc123')
    svc.identify('k17abc123') // deduped

    expect(calls.identify).toEqual(['k17abc123'])
    expect(svc.getSessionId()).toBe('sess_test_123')

    // Opt out stops events and hides session ID
    svc.setOptOut(true)
    expect(calls.optOut).toBe(1)
    expect(svc.getSessionId()).toBeUndefined()

    svc.trackFeedbackSubmitted({ kind: 'rating', stars: 5 })
    expect(calls.capture).toEqual([])
  })

  it('re-applies opt-out immediately after reset() on sign-out', () => {
    const { transport, calls } = createMockTransport()
    const order: string[] = []
    transport.reset = () => {
      calls.reset += 1
      order.push('reset')
    }
    transport.optOut = () => {
      calls.optOut += 1
      order.push('optOut')
    }

    const svc = new AnalyticsService({
      transportFactory: () => transport,
      getApiKey: () => 'phc_test_key',
    })

    svc.init()
    svc.setOptOut(true)
    order.length = 0

    svc.reset({ keepOptOut: true })

    expect(order).toEqual(['reset', 'optOut'])
    expect(svc.isOptedOut()).toBe(true)
  })

  it('dedupes screen views on normalized route patterns and never leaks raw IDs', () => {
    const { transport, calls } = createMockTransport()
    const svc = new AnalyticsService({
      transportFactory: () => transport,
      getApiKey: () => 'phc_test_key',
    })

    svc.setRuntimeContext({ platform: 'web', app_version: '1.0.0' })
    svc.init()

    svc.trackScreen(['(athlete)', 'workout', 'execute', 'jh7123456789abcdef0123456789abcd'])
    svc.trackScreen(['(athlete)', 'workout', 'execute', 'jh7999999999abcdef0123456789abcd'])
    svc.trackScreen(['(athlete)', 'program'])

    expect(calls.capture).toEqual([
      {
        event: '$screen',
        properties: {
          platform: 'web',
          app_version: '1.0.0',
          screen_name: '/(athlete)/workout/execute/[id]',
        },
      },
      {
        event: '$screen',
        properties: {
          platform: 'web',
          app_version: '1.0.0',
          screen_name: '/(athlete)/program',
        },
      },
    ])
  })

  it('starts and stops Web session replay cleanly across gate and route transitions', () => {
    const { transport, calls } = createMockTransport({ supportsSessionReplay: true })
    const svc = new AnalyticsService({
      transportFactory: () => transport,
      getApiKey: () => 'phc_test_key',
    })
    svc.init()

    const baseGate = {
      platform: 'web' as const,
      envEnabled: true,
      isAuthenticated: true,
      hasCompletedIntake: true,
      ageGroup: '18-35' as const,
      analyticsOptOut: false,
      sessionReplayOptIn: true,
      normalizedRoute: '/(athlete)/program',
    }

    // Starts once
    svc.syncSessionReplay(baseGate)
    svc.syncSessionReplay(baseGate)
    expect(calls.startSessionRecording).toBe(1)
    expect(calls.stopSessionRecording).toBe(0)

    // Auto-stops on entering excluded route (Profile)
    svc.syncSessionReplay({ ...baseGate, normalizedRoute: '/(athlete)/profile' })
    expect(calls.stopSessionRecording).toBe(1)

    // Does not start for 14-17 even on allowed route
    svc.syncSessionReplay({ ...baseGate, ageGroup: '14-17' })
    expect(calls.startSessionRecording).toBe(1)
  })

  it('emits zero-PII feedback_submitted for Thread B3 contract', () => {
    const { transport, calls } = createMockTransport()
    const svc = new AnalyticsService({
      transportFactory: () => transport,
      getApiKey: () => 'phc_test_key',
    })
    svc.setRuntimeContext({ platform: 'ios', app_version: '1.0.0' })
    svc.init()

    svc.trackFeedbackSubmitted({
      kind: 'bug_report',
      severity: 'blocking',
      source: 'workout_execute',
    })

    expect(calls.capture).toEqual([
      {
        event: 'feedback_submitted',
        properties: {
          platform: 'ios',
          app_version: '1.0.0',
          kind: 'bug_report',
          severity: 'blocking',
          source: 'workout_execute',
        },
      },
    ])
  })

  it('suppresses cold-launch screen and identify events while captureReady is false until opt-out resolves (S3)', () => {
    const { transport, calls } = createMockTransport()
    const svc = new AnalyticsService({
      transportFactory: () => transport,
      getApiKey: () => 'phc_test_key',
    })

    svc.setCaptureReady(false)
    svc.init()

    // Cold launch screen view while auth/opt-out is loading must NOT fire
    svc.trackScreen(['(athlete)', 'index'])
    expect(calls.capture).toEqual([])
    expect(svc.getSessionId()).toBeUndefined()

    // Opted-out athlete resolves: still zero events emitted
    svc.setOptOut(true)
    svc.setCaptureReady(true)
    svc.identify('user_opted_out')
    svc.trackScreen(['(athlete)', 'index'])
    expect(calls.identify).toEqual([])
    expect(calls.capture).toEqual([])

    // Signed-out / opted-in athlete resolves: capture now works
    svc.setOptOut(false)
    svc.trackScreen(['(first-run)', 'index'])
    expect(calls.capture).toEqual([
      {
        event: '$screen',
        properties: {
          screen_name: '/(first-run)/index',
        },
      },
    ])
  })
})
