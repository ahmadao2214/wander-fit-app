import { convexTest } from 'convex-test'
import schema from '../schema'
import { internal } from '../_generated/api'
import { cleanSignup, RATE_LIMIT_MAX_REQUESTS } from '../waitlist'
import { convexModules } from '../../jest/convexModules'

const modules = convexModules()
const newTest = () => convexTest(schema, modules)

const TODAY = '2026-11-21'

const youthAthlete = {
  role: 'athlete_14_17',
  email: 'Maya@Example.com',
  parentEmail: 'Parent@Example.com',
  intent: 'season_pass',
  seasonDate: '2027-02-13',
  source: 'gym-flyer',
}

describe('cleanSignup', () => {
  it('accepts a youth athlete (14-17) with optional parent email and normalizes emails', () => {
    expect(cleanSignup(youthAthlete, TODAY)).toEqual({
      ok: true,
      value: {
        role: 'athlete_14_17',
        email: 'maya@example.com',
        parentEmail: 'parent@example.com',
        intent: 'season_pass',
        seasonDate: '2027-02-13',
        source: 'gym-flyer',
      },
    })
  })

  it('allows athlete_14_17 without a parent email', () => {
    const result = cleanSignup({ ...youthAthlete, parentEmail: '' }, TODAY)
    expect(result).toEqual({
      ok: true,
      value: {
        role: 'athlete_14_17',
        email: 'maya@example.com',
        intent: 'season_pass',
        seasonDate: '2027-02-13',
        source: 'gym-flyer',
      },
    })
  })

  it('accepts adult athlete (18+) and parent roles and strips any stray parentEmail', () => {
    const adult = cleanSignup(
      { ...youthAthlete, role: 'athlete_18_plus', intent: 'monthly', seasonDate: '' },
      TODAY
    )
    expect(adult).toEqual({
      ok: true,
      value: {
        role: 'athlete_18_plus',
        email: 'maya@example.com',
        intent: 'monthly',
        source: 'gym-flyer',
      },
    })

    const parent = cleanSignup({ ...youthAthlete, role: 'parent', intent: 'free_beta_only' }, TODAY)
    expect(parent.ok && parent.value.parentEmail).toBeUndefined()
  })

  it('defaults omitted intent to free_beta_only', () => {
    const result = cleanSignup({ role: 'parent', email: 'p@example.com' }, TODAY)
    expect(result).toEqual({
      ok: true,
      value: {
        role: 'parent',
        email: 'p@example.com',
        intent: 'free_beta_only',
      },
    })
  })

  const rejections: Array<[string, Record<string, unknown>, string]> = [
    [
      'unknown role',
      { role: 'coach' },
      'Choose whether you are an athlete (14–17), adult athlete (18+), or parent.',
    ],
    ['missing email', { email: '   ' }, 'Enter a valid email address.'],
    ['invalid email', { email: 'not-an-email' }, 'Enter a valid email address.'],
    [
      'invalid parent email for 14-17',
      { parentEmail: 'bad-email' },
      'Enter a valid parent email, or leave it blank.',
    ],
    ['unknown intent', { intent: 'lifetime' }, 'Pick a beta plan preference.'],
    ['seasonDate equal to today', { seasonDate: TODAY }, 'Pick a season date after today.'],
    ['past seasonDate', { seasonDate: '2026-11-01' }, 'Pick a season date after today.'],
    ['impossible seasonDate', { seasonDate: '2027-02-30' }, 'Pick a valid season date.'],
    [
      'seasonDate beyond 52 weeks',
      { seasonDate: '2028-01-01' },
      'Pick a season date within the next 12 months.',
    ],
  ]

  it.each(rejections)('rejects %s', (_label, change, error) => {
    expect(cleanSignup({ ...youthAthlete, ...change }, TODAY)).toEqual({ ok: false, error })
  })

  it('flags the honeypot as spam', () => {
    expect(cleanSignup({ ...youthAthlete, website: 'https://spam.example' }, TODAY)).toEqual({
      ok: false,
      spam: true,
    })
  })

  it('strips control characters and caps source length to 80 chars', () => {
    const result = cleanSignup({ ...youthAthlete, source: `\n\t${'a'.repeat(120)}` }, TODAY)
    expect(result.ok && result.value.source?.length).toBe(80)
  })
})

describe('waitlist.record', () => {
  it('upserts by normalized email, preserving createdAt and initial source', async () => {
    const t = newTest()
    const firstPayload = (cleanSignup(youthAthlete, TODAY) as { ok: true; value: any }).value
    const first = await t.mutation(internal.waitlist.record, firstPayload)
    expect(first.updated).toBe(false)

    const second = await t.mutation(internal.waitlist.record, {
      role: 'athlete_14_17',
      email: 'maya@example.com',
      intent: 'monthly',
    })
    expect(second.updated).toBe(true)
    expect(second.id).toBe(first.id)

    const rows = await t.run((ctx) => ctx.db.query('waitlist_signups').collect())
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      email: 'maya@example.com',
      intent: 'monthly',
      seasonDate: '2027-02-13',
      source: 'gym-flyer',
    })
  })
})

describe('waitlist.checkRateLimit', () => {
  it('blocks after reaching the limit and resets once the window expires', async () => {
    const t = newTest()
    const start = 1_700_000_000_000
    const windowMs = 60_000

    for (let i = 0; i < 3; i++) {
      const res = await t.mutation(internal.waitlist.checkRateLimit, {
        key: 'ip:1.2.3.4',
        now: start + i * 1000,
        limit: 3,
        windowMs,
      })
      expect(res.allowed).toBe(true)
    }

    const blocked = await t.mutation(internal.waitlist.checkRateLimit, {
      key: 'ip:1.2.3.4',
      now: start + 10_000,
      limit: 3,
      windowMs,
    })
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBe(50)

    const afterReset = await t.mutation(internal.waitlist.checkRateLimit, {
      key: 'ip:1.2.3.4',
      now: start + windowMs + 1,
      limit: 3,
      windowMs,
    })
    expect(afterReset.allowed).toBe(true)
    expect(afterReset.remaining).toBe(2)
  })
})

describe('POST /waitlist', () => {
  const futureDate = () => {
    const d = new Date(Date.now() + 84 * 86400000)
    return d.toISOString().slice(0, 10)
  }

  const post = (
    t: ReturnType<typeof newTest>,
    body: string,
    headers: Record<string, string> = {}
  ) =>
    t.fetch('/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body,
    })

  it('saves a valid Beta On-Ramp sign-up and allows cross-origin requests', async () => {
    const t = newTest()
    const res = await post(t, JSON.stringify({ ...youthAthlete, seasonDate: futureDate() }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    const rows = await t.run((ctx) => ctx.db.query('waitlist_signups').collect())
    expect(rows.map((r) => [r.role, r.email, r.intent])).toEqual([
      ['athlete_14_17', 'maya@example.com', 'season_pass'],
    ])
  })

  it('returns 400 with validation error and saves nothing', async () => {
    const t = newTest()
    const res = await post(t, JSON.stringify({ role: 'parent', email: 'bad' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Enter a valid email address.' })
    expect(await t.run((ctx) => ctx.db.query('waitlist_signups').collect())).toEqual([])
  })

  it('answers honeypot spam with 200 ok but saves nothing', async () => {
    const t = newTest()
    const res = await post(
      t,
      JSON.stringify({ ...youthAthlete, seasonDate: futureDate(), website: 'bot' })
    )
    expect(res.status).toBe(200)
    expect(await t.run((ctx) => ctx.db.query('waitlist_signups').collect())).toEqual([])
  })

  it('rejects malformed JSON (400) and oversized payloads (413)', async () => {
    const t = newTest()
    expect((await post(t, 'not json')).status).toBe(400)
    expect(
      (await post(t, JSON.stringify({ ...youthAthlete, source: 'x'.repeat(5000) }))).status
    ).toBe(413)
  })

  it('enforces IP rate limiting with 429 and Retry-After header', async () => {
    const t = newTest()
    const payload = JSON.stringify({
      role: 'athlete_18_plus',
      email: 'tester@example.com',
      intent: 'free_beta_only',
    })

    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      const res = await post(t, payload, { 'x-forwarded-for': '203.0.113.42' })
      expect(res.status).toBe(200)
    }

    const limited = await post(t, payload, { 'x-forwarded-for': '203.0.113.42' })
    expect(limited.status).toBe(429)
    expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThan(0)
  })

  it('answers the CORS preflight', async () => {
    const t = newTest()
    const res = await t.fetch('/waitlist', { method: 'OPTIONS' })
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
  })
})
