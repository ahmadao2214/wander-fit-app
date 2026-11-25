import { convexTest } from 'convex-test'
import schema from '../schema'
import { internal } from '../_generated/api'
import { cleanContact, CLOSED_REQUEST_RETENTION_MS, MAX_MESSAGE_LENGTH } from '../contact'
import { RATE_LIMIT_MAX_REQUESTS } from '../waitlist'
import { convexModules } from '../../jest/convexModules'

const modules = convexModules()

const request = {
  topic: 'delete_account',
  email: ' Parent@Example.test ',
  message: "Please delete my daughter's account.\nHer email is maya@example.test.",
}

describe('cleanContact', () => {
  it('normalizes the email and keeps line breaks in the message', () => {
    expect(cleanContact(request)).toEqual({
      ok: true,
      value: {
        topic: 'delete_account',
        email: 'parent@example.test',
        message: "Please delete my daughter's account.\nHer email is maya@example.test.",
      },
    })
  })

  it.each([
    ['a body that is not an object', 'text', 'Send the request as JSON.'],
    ['an unknown topic', { ...request, topic: 'sales' }, 'Choose what you need help with.'],
    ['a bad email', { ...request, email: 'parent@' }, 'Enter a valid email address.'],
    ['an empty message', { ...request, message: ' \n ' }, 'Tell us what you need.'],
  ])('rejects %s', (_name, body, error) => {
    expect(cleanContact(body)).toEqual({ ok: false, error })
  })

  it.each([
    ['is over 254 characters', `${'a'.repeat(250)}@example.museum`],
    ['holds a control character', 'par\u0000ent@example.test'],
    ['starts with a tab', '\tparent@example.test'],
    ['ends with a line break', 'parent@example.test\n'],
    ['holds a C1 control character', 'par\u0085ent@example.test'],
  ])('refuses an email that %s, and never cuts it into another address', (_name, email) => {
    expect(cleanContact({ ...request, email })).toEqual({
      ok: false,
      error: 'Enter a valid email address.',
    })
  })

  it('drops a filled honeypot as spam', () => {
    expect(cleanContact({ ...request, website: 'https://spam.test' })).toEqual({
      ok: false,
      spam: true,
    })
  })

  it('cuts a long message and strips control characters', () => {
    const result = cleanContact({ ...request, message: `a\u0000b${'x'.repeat(5000)}` })
    expect(result.ok && result.value.message.startsWith('ab')).toBe(true)
    expect(result.ok && result.value.message.length).toBe(MAX_MESSAGE_LENGTH)
  })
})

describe('record', () => {
  it('saves the request as open', async () => {
    const t = convexTest(schema, modules)
    const cleaned = cleanContact(request)
    if (!cleaned.ok) throw new Error('expected a valid request')
    await t.mutation(internal.contact.record, cleaned.value)
    const rows = await t.run((ctx) => ctx.db.query('contact_requests').collect())
    expect(rows.map(({ topic, email, status }) => ({ topic, email, status }))).toEqual([
      { topic: 'delete_account', email: 'parent@example.test', status: 'open' },
    ])
  })
})

describe('pruneClosed', () => {
  it('deletes closed requests after 90 days and keeps open and recent ones', async () => {
    const t = convexTest(schema, modules)
    const now = Date.now()
    const old = now - CLOSED_REQUEST_RETENTION_MS - 1000
    await t.run(async (ctx) => {
      const row = { topic: 'support' as const, email: 'a@example.test' }
      await ctx.db.insert('contact_requests', {
        ...row,
        message: 'old done',
        status: 'done',
        createdAt: old,
      })
      await ctx.db.insert('contact_requests', {
        ...row,
        message: 'old open',
        status: 'open',
        createdAt: old,
      })
      await ctx.db.insert('contact_requests', {
        ...row,
        message: 'new done',
        status: 'done',
        createdAt: now,
      })
    })
    expect(await t.mutation(internal.contact.pruneClosed, { now })).toEqual({ deleted: 1 })
    const left = await t.run((ctx) => ctx.db.query('contact_requests').collect())
    expect(left.map((row) => row.message).sort()).toEqual(['new done', 'old open'])
  })
})

describe('POST /contact', () => {
  const post = (t: ReturnType<typeof convexTest>, body: unknown, ip = '203.0.113.7') =>
    t.fetch('/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  const count = (t: ReturnType<typeof convexTest>) =>
    t.run(async (ctx) => (await ctx.db.query('contact_requests').collect()).length)

  it('saves a valid request', async () => {
    const t = convexTest(schema, modules)
    const response = await post(t, request)
    expect([response.status, await response.json(), await count(t)]).toEqual([200, { ok: true }, 1])
  })

  it('accepts a full-length message in a multi-byte script', async () => {
    const t = convexTest(schema, modules)
    const response = await post(t, { ...request, message: '删'.repeat(MAX_MESSAGE_LENGTH) })
    expect([response.status, await count(t)]).toEqual([200, 1])
  })

  it('answers a filled honeypot like a real request and saves nothing', async () => {
    const t = convexTest(schema, modules)
    const response = await post(t, { ...request, website: 'https://spam.test' })
    expect([response.status, await count(t)]).toEqual([200, 0])
  })

  it.each([
    ['a body that is not JSON', 'not json', 400],
    ['an invalid request', { ...request, email: 'nope' }, 400],
    ['a body over the cap', { ...request, message: 'x'.repeat(20000) }, 413],
  ])('refuses %s', async (_name, body, status) => {
    const t = convexTest(schema, modules)
    const response = await post(t, body)
    expect([response.status, await count(t)]).toEqual([status, 0])
  })

  it('rate limits one email across IP addresses', async () => {
    const t = convexTest(schema, modules)
    const statuses: number[] = []
    for (let i = 0; i <= RATE_LIMIT_MAX_REQUESTS; i++) {
      statuses.push((await post(t, request, `203.0.113.${i}`)).status)
    }
    expect(statuses.at(-1)).toBe(429)
    expect(await count(t)).toBe(RATE_LIMIT_MAX_REQUESTS)
  })
})
