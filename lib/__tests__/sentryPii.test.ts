import type { Breadcrumb, ErrorEvent } from '@sentry/core'
import {
  REDACTED,
  isSensitiveKey,
  resolveSentryConfig,
  sanitizeSentryUser,
  scrubPiiString,
  scrubSentryBreadcrumb,
  scrubSentryEvent,
  scrubUrl,
  scrubValue,
} from '../sentryPii'

describe('resolveSentryConfig', () => {
  it('stays disabled when EXPO_PUBLIC_SENTRY_DSN is missing', () => {
    const cfg = resolveSentryConfig({}, false)
    expect(cfg.enabled).toBe(false)
    expect(cfg.disabledReason).toBe('missing_dsn')
    expect(cfg.dsn).toBeUndefined()
    expect(cfg.environment).toBe('production')
    expect(cfg.diagnosticsEnabled).toBe(false)
  })

  it('stays disabled in dev even with a DSN unless EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV=true', () => {
    const cfg = resolveSentryConfig(
      { EXPO_PUBLIC_SENTRY_DSN: 'https://abc@o123.ingest.sentry.io/456' },
      true
    )
    expect(cfg.enabled).toBe(false)
    expect(cfg.disabledReason).toBe('dev_disabled')
    expect(cfg.environment).toBe('development')
  })

  it('enables in dev when EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV=true', () => {
    const cfg = resolveSentryConfig(
      {
        EXPO_PUBLIC_SENTRY_DSN: 'https://abc@o123.ingest.sentry.io/456',
        EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV: 'true',
        EXPO_PUBLIC_SENTRY_DEBUG_TOOLS: 'true',
      },
      true
    )
    expect(cfg.enabled).toBe(true)
    expect(cfg.disabledReason).toBeNull()
    expect(cfg.diagnosticsEnabled).toBe(true)
  })

  it('enables in production with trimmed DSN and explicit environment', () => {
    const cfg = resolveSentryConfig(
      {
        EXPO_PUBLIC_SENTRY_DSN: '  https://abc@o123.ingest.sentry.io/456  ',
        EXPO_PUBLIC_SENTRY_ENVIRONMENT: 'preview',
      },
      false
    )
    expect(cfg.enabled).toBe(true)
    expect(cfg.dsn).toBe('https://abc@o123.ingest.sentry.io/456')
    expect(cfg.environment).toBe('preview')
  })
})

describe('PII string and URL scrubbing', () => {
  it('redacts emails, phone numbers, JWTs, Bearer tokens, and Clerk keys', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyJ9.signature12345'
    const raw = `Auth failed for teen.athlete@school.edu (555-234-5678) Bearer secretToken999 ${jwt} pk_test_ZWxlY3RyaWMtbGVvcGFyZC03NQ`
    const scrubbed = scrubPiiString(raw)

    expect(scrubbed).not.toContain('teen.athlete@school.edu')
    expect(scrubbed).not.toContain('555-234-5678')
    expect(scrubbed).not.toContain('secretToken999')
    expect(scrubbed).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
    expect(scrubbed).not.toContain('pk_test_ZWxlY3RyaWMtbGVvcGFyZC03NQ')
    expect(scrubbed).toContain(`Bearer ${REDACTED}`)
  })

  it('strips query parameters and hash fragments from URLs', () => {
    expect(scrubUrl('https://app.wanderfit.com/callback?code=oauth123&email=a@b.com#frag')).toBe(
      'https://app.wanderfit.com/callback'
    )
    expect(scrubUrl('/(first-run)/reveal?token=abc')).toBe('/(first-run)/reveal')
  })

  it('identifies youth-sensitive and credential keys', () => {
    expect(isSensitiveKey('email')).toBe(true)
    expect(isSensitiveKey('primaryEmailAddress')).toBe(true)
    expect(isSensitiveKey('dateOfBirth')).toBe(true)
    expect(isSensitiveKey('selfAssessment')).toBe(true)
    expect(isSensitiveKey('notes')).toBe(true)
    expect(isSensitiveKey('Authorization')).toBe(true)
    expect(isSensitiveKey('X-Forwarded-For')).toBe(true)
    expect(isSensitiveKey('phase')).toBe(false)
    expect(isSensitiveKey('gppCategoryId')).toBe(false)
  })

  it('recursively scrubs nested objects while preserving non-sensitive technical fields', () => {
    const cleaned = scrubValue({
      phase: 'GPP',
      week: 2,
      athlete: {
        name: 'Jordan',
        email: 'jordan@example.com',
        dateOfBirth: '2010-05-14',
        notes: 'Knee felt tight after practice',
      },
      redirectUrl: 'https://wanderfit.app/ready?code=1234',
    }) as Record<string, any>

    expect(cleaned.phase).toBe('GPP')
    expect(cleaned.week).toBe(2)
    expect(cleaned.athlete.name).toBe(REDACTED)
    expect(cleaned.athlete.email).toBe(REDACTED)
    expect(cleaned.athlete.dateOfBirth).toBe(REDACTED)
    expect(cleaned.athlete.notes).toBe(REDACTED)
    expect(cleaned.redirectUrl).toBe('https://wanderfit.app/ready')
  })
})

describe('sanitizeSentryUser', () => {
  it('keeps only pseudonymous id and strips email, name, username, and IP', () => {
    expect(
      sanitizeSentryUser({
        id: 'user_2abcXYZ',
        email: 'athlete@example.com',
        username: 'athlete14',
        ip_address: '192.168.1.5',
      })
    ).toEqual({ id: 'user_2abcXYZ' })
  })

  it('rejects email addresses used as id', () => {
    expect(sanitizeSentryUser({ id: 'teen@example.com' })).toBeUndefined()
  })

  it('returns undefined when user has no valid id', () => {
    expect(sanitizeSentryUser(undefined)).toBeUndefined()
    expect(sanitizeSentryUser({ email: 'a@b.com' })).toBeUndefined()
  })
})

describe('scrubSentryBreadcrumb', () => {
  it('drops touch, ui.*, user, and console breadcrumbs so youth labels and logs never leave the device', () => {
    expect(
      scrubSentryBreadcrumb({
        category: 'touch',
        type: 'user',
        message: 'Touch event in Youth, 14–17',
        data: {
          path: [{ name: 'Pressable', label: 'Youth, 14–17' }],
        },
      })
    ).toBeNull()

    expect(
      scrubSentryBreadcrumb({
        category: 'ui.click',
        message: 'button[aria-label="Youth, 14–17"]',
      })
    ).toBeNull()

    expect(
      scrubSentryBreadcrumb({
        category: 'ui.input',
        message: 'typed jordan@example.com',
        data: { value: 'Secret Password', label: 'Email' },
      })
    ).toBeNull()

    expect(
      scrubSentryBreadcrumb({
        category: 'console',
        message: 'Saved athlete {"name":"Jordan Lee","dob":"2010-05-14","notes":"sore knee"}',
      })
    ).toBeNull()
  })

  it('keeps structural HTTP breadcrumbs with query strings, auth, and bodies stripped', () => {
    const httpCrumb: Breadcrumb = {
      type: 'http',
      category: 'fetch',
      data: {
        url: 'https://clerk.example.com/v1/client?token=secret#frag',
        status_code: 200,
        body: '{"email":"teen@example.com"}',
        authorization: 'Bearer abc',
      },
    }
    const cleanedHttp = scrubSentryBreadcrumb(httpCrumb)
    expect(cleanedHttp?.data).toEqual({
      url: 'https://clerk.example.com/v1/client',
      status_code: 200,
      body: REDACTED,
      authorization: REDACTED,
    })
  })
})

describe('scrubSentryEvent', () => {
  it('scrubs PII, omits raw exception values/messages and console/touch breadcrumbs, and keeps stack frames', () => {
    const event: ErrorEvent = {
      type: undefined,
      message: 'Failed saving profile for Jordan Lee (2010-05-14)',
      logentry: { message: 'Serialized athlete note: sore knee' },
      user: {
        id: 'user_999',
        email: 'athlete@school.org',
        username: 'teen_name',
        ip_address: '203.0.113.10',
      },
      request: {
        url: 'https://app.wanderfit.com/(athlete)/profile?email=athlete@school.org',
        cookies: { __session: 'abc' },
        data: { name: 'Teen Athlete', notes: 'Personal note' },
        query_string: 'email=athlete@school.org',
        headers: {
          Authorization: 'Bearer super-secret',
          'CF-Connecting-IP': '203.0.113.10',
          'User-Agent': 'WanderFit/1.0',
        },
        env: {
          REMOTE_ADDR: '203.0.113.10',
          NODE_ENV: 'production',
        },
      },
      exception: {
        values: [
          {
            type: 'TypeError',
            value: 'Athlete Jordan Lee DOB 2010-05-14 injury: twisted ankle',
            mechanism: { type: 'generic', handled: true, data: { note: 'sensitive' } },
            stacktrace: {
              frames: [
                {
                  filename: 'app:///bundle.js?token=secret',
                  abs_path: 'app:///bundle.js?token=secret',
                  function: 'submitIntake',
                  lineno: 42,
                  colno: 7,
                  in_app: true,
                  vars: { athleteName: 'Jordan Lee' },
                },
              ],
            },
          },
        ],
      },
      tags: {
        error_boundary: 'first-run',
        email: 'athlete@school.org',
      },
      extra: {
        __serialized__: {
          athlete: 'Jordan Lee',
          ageBand: 'Youth, 14–17',
          injuryNote: 'sore knee',
        },
        selfAssessment: { notes: 'Felt exhausted', phaseDifficulty: 'too_hard' },
        phase: 'GPP',
      },
      contexts: {
        os: { name: 'iOS', version: '27.2' },
        device: { name: "Jordan's iPhone", model: 'iPhone16,1' },
        route: {
          name: '/(athlete)/workout/[id]',
          path: '/(athlete)/workout/123?token=abc',
          params: { id: '123', email: 'athlete@school.org' },
        },
      },
      breadcrumbs: [
        {
          category: 'touch',
          message: 'Youth, 14–17',
          data: { path: [{ label: 'Youth, 14–17' }] },
        },
        {
          category: 'console',
          message: 'athlete={"name":"Jordan","notes":"knee pain"}',
        },
        {
          category: 'navigation',
          data: {
            from: '/(auth)/sign-in?email=athlete@school.org',
            to: '/(athlete)/profile',
          },
        },
      ],
    }

    const cleaned = scrubSentryEvent(event)

    expect(cleaned.user).toEqual({ id: 'user_999' })
    expect(cleaned.message).toBeUndefined()
    expect(cleaned.logentry).toBeUndefined()
    expect(cleaned.request?.url).toBe('https://app.wanderfit.com/(athlete)/profile')
    expect(cleaned.request?.cookies).toBeUndefined()
    expect(cleaned.request?.data).toBeUndefined()
    expect(cleaned.request?.query_string).toBeUndefined()
    expect(cleaned.request?.headers).toEqual({
      Authorization: REDACTED,
      'CF-Connecting-IP': REDACTED,
      'User-Agent': 'WanderFit/1.0',
    })
    expect(cleaned.request?.env).toEqual({ NODE_ENV: 'production' })
    expect(cleaned.exception?.values?.[0]).toEqual({
      type: 'TypeError',
      mechanism: { type: 'generic', handled: true },
      stacktrace: {
        frames: [
          {
            filename: 'app:///bundle.js',
            abs_path: 'app:///bundle.js',
            function: 'submitIntake',
            lineno: 42,
            colno: 7,
            in_app: true,
          },
        ],
      },
    })
    expect(cleaned.tags).toEqual({
      error_boundary: 'first-run',
      email: REDACTED,
    })
    expect(cleaned.extra).toEqual({
      selfAssessment: REDACTED,
      phase: 'GPP',
    })
    expect(cleaned.extra?.__serialized__).toBeUndefined()
    expect(cleaned.contexts?.os).toEqual({ name: 'iOS', version: '27.2' })
    expect(cleaned.contexts?.device).toEqual({ name: REDACTED, model: 'iPhone16,1' })
    expect(cleaned.contexts?.route).toEqual({
      name: '/(athlete)/workout/[id]',
      path: '/(athlete)/workout/123',
    })
    expect(cleaned.breadcrumbs).toEqual([
      {
        category: 'navigation',
        data: {
          from: '/(auth)/sign-in',
          to: '/(athlete)/profile',
        },
      },
    ])
  })
})
