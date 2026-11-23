import { PostHog } from 'posthog-js'
import { buildWebPostHogConfig, createWebPostHogTransport } from '../telemetryTransport.web'
import { scrubWebPostHogPayload } from '../telemetryWebPayload'

describe('Web PostHog transport & payload scrubbing (S1, S2, S4)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('strips URLs, raw IDs, query strings, referrers, and $set/$set_once from events and $identify, writes zero localStorage, emits zero $opt_in, and drops $snapshot when recording stops', () => {
    const localStorageWrites: Array<[string, string]> = []
    const memoryStore = new Map<string, string>()

    const fakeLocalStorage = {
      getItem: (k: string) => memoryStore.get(k) ?? null,
      setItem: (k: string, v: string) => {
        localStorageWrites.push([k, v])
        memoryStore.set(k, v)
      },
      removeItem: (k: string) => {
        memoryStore.delete(k)
      },
      clear: () => {
        memoryStore.clear()
      },
      key: () => null,
      length: 0,
    }

    const prevWindow = (global as any).window
    const prevDocument = (global as any).document
    const prevNavigator = (global as any).navigator
    const prevLocalStorage = (global as any).localStorage
    const prevFetch = global.fetch

    const syntheticDynamicUrl =
      'https://app.wanderfit.app/workout/execute/jh7123456789abcdef0123456789abcd?email=kid@example.com&token=secret'
    const syntheticReferrer = 'https://mail.example.com/invite?email=parent@example.com'

    ;(global as any).window = {
      location: {
        href: syntheticDynamicUrl,
        pathname: '/workout/execute/jh7123456789abcdef0123456789abcd',
        search: '?email=kid@example.com&token=secret',
        hash: '',
        host: 'app.wanderfit.app',
        hostname: 'app.wanderfit.app',
        protocol: 'https:',
      },
      document: {
        referrer: syntheticReferrer,
        cookie: '',
        title: 'WanderFit',
      },
      navigator: {
        userAgent: 'Mozilla/5.0 TestBrowser',
        language: 'en-US',
      },
      localStorage: fakeLocalStorage,
      sessionStorage: fakeLocalStorage,
      addEventListener: () => {},
      removeEventListener: () => {},
    }
    ;(global as any).document = (global as any).window.document
    ;(global as any).navigator = (global as any).window.navigator
    ;(global as any).localStorage = fakeLocalStorage
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch

    try {
      const observedPayloads: Array<Record<string, unknown>> = []
      const sdk = new PostHog()

      // Use PostHog's public `before_send` pipeline: first run our real config's
      // scrub filter, then record whatever survives (returning null so no network request fires).
      const transport = createWebPostHogTransport(
        sdk,
        {
          apiKey: 'phc_test_web_key',
          host: 'https://us.i.posthog.com',
          defaultOptOut: false,
        },
        {
          disable_external_dependency_loading: true,
          advanced_disable_feature_flags: true,
          advanced_disable_feature_flags_on_first_load: true,
          request_batching: false,
        }
      )

      const existingBeforeSend = sdk.config.before_send
      const existingList = Array.isArray(existingBeforeSend)
        ? existingBeforeSend
        : existingBeforeSend
          ? [existingBeforeSend]
          : []
      sdk.set_config({
        before_send: [
          ...existingList,
          (event) => {
            if (event) {
              observedPayloads.push(event as unknown as Record<string, unknown>)
            }
            return null // network-disabled test sink
          },
        ],
      })

      // Exercise optOut -> blocked capture -> optIn -> identify -> custom capture -> reset
      transport.optOut()
      transport.capture('workout_opened', { phase: 'GPP' })
      transport.optIn()
      transport.identify('k17athlete123')
      transport.capture('workout_opened', { phase: 'GPP', week: 1, day: 1 })
      transport.reset()

      // S2: Zero localStorage writes and zero $opt_in / $opt_out events
      expect(localStorageWrites).toEqual([])
      expect(observedPayloads.some((p) => p.event === '$opt_in' || p.event === '$opt_out')).toBe(
        false
      )

      // Both $identify and workout_opened survived scrubbing (opted-out event was dropped)
      const eventNames = observedPayloads.map((p) => p.event)
      expect(eventNames).toEqual(['$identify', 'workout_opened'])

      // S1: Final outgoing payloads contain ZERO raw IDs, query strings, referrers, or $set_once
      const serialized = JSON.stringify(observedPayloads)
      expect(serialized).not.toContain('jh7123456789abcdef0123456789abcd')
      expect(serialized).not.toContain('kid@example.com')
      expect(serialized).not.toContain('parent@example.com')
      expect(serialized).not.toContain('mail.example.com')
      expect(serialized).not.toContain('$set_once')
      expect(serialized).not.toContain('$current_url')
      expect(serialized).not.toContain('$pathname')
      expect(serialized).not.toContain('$referrer')

      // S1 + S4: Replay $snapshot events are dropped immediately when recordingAllowed is false,
      // and rrweb data.href URLs are normalized to allowlisted route patterns when allowed.
      const droppedSnapshot = scrubWebPostHogPayload(
        {
          event: '$snapshot',
          properties: { $snapshot_data: [{ type: 2 }] },
        } as any,
        { optedOut: false, recordingAllowed: false }
      )
      expect(droppedSnapshot).toBeNull()

      const allowedSnapshot = scrubWebPostHogPayload(
        {
          event: '$snapshot',
          properties: {
            $snapshot_data: [
              {
                type: 4,
                data: {
                  href: syntheticDynamicUrl,
                  width: 1280,
                  height: 720,
                },
              },
              {
                type: 5,
                data: {
                  tag: 'navigate',
                  payload: { href: syntheticReferrer },
                },
              },
            ],
            $current_url: syntheticDynamicUrl,
          },
        } as any,
        { optedOut: false, recordingAllowed: true }
      )
      expect(allowedSnapshot).not.toBeNull()
      expect(allowedSnapshot?.properties?.$current_url).toBeUndefined()
      const snapshotSerialized = JSON.stringify(allowedSnapshot)
      expect(snapshotSerialized).not.toContain('jh7123456789abcdef0123456789abcd')
      expect(snapshotSerialized).not.toContain('kid@example.com')
      expect(snapshotSerialized).not.toContain('parent@example.com')
      expect(snapshotSerialized).toContain('https://app.wanderfit.app/workout/execute/[id]')

      // S14 + S15: Config keeps persistence memory-only, disables feature flags WITHOUT
      // blocking remote replay config, and locks console/network/canvas channels OFF locally
      // so remote config responses cannot turn them on.
      const defaultCfg = buildWebPostHogConfig('https://us.i.posthog.com', {
        optedOut: false,
        recordingAllowed: false,
      })
      expect(defaultCfg.persistence).toBe('memory')
      expect(defaultCfg.disable_session_recording).toBe(true)
      expect(defaultCfg.save_referrer).toBe(false)
      expect(defaultCfg.advanced_disable_flags).toBeUndefined()
      expect(defaultCfg.advanced_disable_feature_flags).toBe(true)
      expect(defaultCfg.enable_recording_console_log).toBe(false)
      expect(defaultCfg.capture_performance).toBe(false)
      expect(defaultCfg.session_recording?.blockSelector).toContain('[data-ph-no-capture]')
      expect(defaultCfg.session_recording?.recordHeaders).toBe(false)
      expect(defaultCfg.session_recording?.recordBody).toBe(false)
      expect(defaultCfg.session_recording?.streamNetworkBody).toBe(false)
      expect(defaultCfg.session_recording?.captureCanvas).toEqual({ recordCanvas: false })
      expect(defaultCfg.session_recording?.canvasCapture?.maskRegionsFn?.({} as any)).toBeNull()
      expect(defaultCfg.get_current_url?.(syntheticDynamicUrl)).toBe(
        'https://app.wanderfit.app/workout/execute/[id]'
      )
    } finally {
      ;(global as any).window = prevWindow
      ;(global as any).document = prevDocument
      ;(global as any).navigator = prevNavigator
      ;(global as any).localStorage = prevLocalStorage
      global.fetch = prevFetch
    }
  })
})
