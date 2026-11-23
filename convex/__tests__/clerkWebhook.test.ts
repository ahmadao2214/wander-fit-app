import { convexTest } from 'convex-test'
import schema from '../schema'
import { signSvixPayload, verifySvixSignature } from '../clerkWebhook'
import { convexModules } from '../../jest/convexModules'

const modules = convexModules()

// A Svix-format secret: whsec_ + base64 key. Test value only.
const SECRET = `whsec_${Buffer.from('wander-fit-unit-test-signing-key').toString('base64')}`
const OTHER_SECRET = `whsec_${Buffer.from('some-other-endpoint-signing-key!').toString('base64')}`

const nowSeconds = () => Math.floor(Date.now() / 1000)

async function signedHeaders(body: string, secret = SECRET, timestamp = String(nowSeconds())) {
  const id = 'msg_unit_1'
  const signature = await signSvixPayload(secret, id, timestamp, body)
  return {
    'Content-Type': 'application/json',
    'svix-id': id,
    'svix-timestamp': timestamp,
    'svix-signature': `v1,${signature}`,
  }
}

const deletedEvent = (id: string) =>
  JSON.stringify({ type: 'user.deleted', object: 'event', data: { id, deleted: true } })

let current: ReturnType<typeof convexTest> | null = null

async function setup() {
  const t = convexTest(schema, modules)
  current = t
  const userId = await t.run((ctx) =>
    ctx.db.insert('users', {
      email: 'athlete@example.com',
      name: 'Athlete',
      clerkId: 'clerk_athlete',
      createdAt: Date.now(),
    })
  )
  return { t, userId }
}

const saved = { ...process.env }
beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] })
  process.env.CLERK_WEBHOOK_SECRET = SECRET
  delete process.env.POSTHOG_PERSONAL_API_KEY
  delete process.env.POSTHOG_PROJECT_ID
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(async () => {
  // The purge schedules the PostHog deletion; finish it inside the test.
  if (current) await current.finishAllScheduledFunctions(jest.runAllTimers)
  current = null
  jest.useRealTimers()
  jest.restoreAllMocks()
  process.env = { ...saved }
})

describe('POST /clerk-webhook', () => {
  it('purges the athlete on a validly signed user.deleted event', async () => {
    const { t, userId } = await setup()
    const body = deletedEvent('clerk_athlete')

    const response = await t.fetch('/clerk-webhook', {
      method: 'POST',
      headers: await signedHeaders(body),
      body,
    })

    expect(response.status).toBe(200)
    expect(await t.run((ctx) => ctx.db.get(userId))).toBeNull()
  })

  it('answers 200 again when Clerk retries a deletion that already ran', async () => {
    const { t } = await setup()
    const body = deletedEvent('clerk_athlete')
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await t.fetch('/clerk-webhook', {
        method: 'POST',
        headers: await signedHeaders(body),
        body,
      })
      expect({ attempt, status: response.status }).toEqual({ attempt, status: 200 })
    }
  })

  it('rejects a signature made with another secret with 401 and deletes nothing', async () => {
    const { t, userId } = await setup()
    const body = deletedEvent('clerk_athlete')

    const response = await t.fetch('/clerk-webhook', {
      method: 'POST',
      headers: await signedHeaders(body, OTHER_SECRET),
      body,
    })

    expect(response.status).toBe(401)
    expect(await t.run((ctx) => ctx.db.get(userId))).not.toBeNull()
  })

  it('rejects a body changed after signing with 401', async () => {
    const { t, userId } = await setup()
    const headers = await signedHeaders(deletedEvent('clerk_someone_else'))

    const response = await t.fetch('/clerk-webhook', {
      method: 'POST',
      headers,
      body: deletedEvent('clerk_athlete'),
    })

    expect(response.status).toBe(401)
    expect(await t.run((ctx) => ctx.db.get(userId))).not.toBeNull()
  })

  it('rejects missing Svix headers with 401', async () => {
    const { t, userId } = await setup()
    const response = await t.fetch('/clerk-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: deletedEvent('clerk_athlete'),
    })
    expect(response.status).toBe(401)
    expect(await t.run((ctx) => ctx.db.get(userId))).not.toBeNull()
  })

  it('rejects a replayed message older than five minutes with 401', async () => {
    const { t } = await setup()
    const body = deletedEvent('clerk_athlete')
    const response = await t.fetch('/clerk-webhook', {
      method: 'POST',
      headers: await signedHeaders(body, SECRET, String(nowSeconds() - 6 * 60)),
      body,
    })
    expect(response.status).toBe(401)
  })

  it('acknowledges other event types with 200 and changes nothing', async () => {
    const { t, userId } = await setup()
    const body = JSON.stringify({ type: 'user.updated', data: { id: 'clerk_athlete' } })

    const response = await t.fetch('/clerk-webhook', {
      method: 'POST',
      headers: await signedHeaders(body),
      body,
    })

    expect(response.status).toBe(200)
    expect(await t.run((ctx) => ctx.db.get(userId))).not.toBeNull()
  })

  it('returns 500, not a pass, when CLERK_WEBHOOK_SECRET is unset', async () => {
    const { t, userId } = await setup()
    delete process.env.CLERK_WEBHOOK_SECRET
    const body = deletedEvent('clerk_athlete')

    const response = await t.fetch('/clerk-webhook', {
      method: 'POST',
      headers: await signedHeaders(body),
      body,
    })

    expect(response.status).toBe(500)
    expect(await t.run((ctx) => ctx.db.get(userId))).not.toBeNull()
  })
})

describe('verifySvixSignature', () => {
  it("matches Svix's published test vector", async () => {
    // From the Svix libraries' own tests, so this checks the algorithm, not just round-trips.
    const result = await verifySvixSignature(
      'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw',
      {
        id: 'msg_p5jXN8AQM9LWM0D4loKWxJek',
        timestamp: '1614265330',
        signature: 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=',
      },
      '{"test": 2432232314}',
      1614265330
    )
    expect(result).toEqual({ ok: true })
  })

  it('accepts any v1 signature in a space-separated list (secret rotation)', async () => {
    const body = '{"type":"user.deleted"}'
    const timestamp = String(nowSeconds())
    const good = await signSvixPayload(SECRET, 'msg_1', timestamp, body)
    const stale = await signSvixPayload(OTHER_SECRET, 'msg_1', timestamp, body)

    const result = await verifySvixSignature(
      SECRET,
      { id: 'msg_1', timestamp, signature: `v1,${stale} v1,${good}` },
      body
    )
    expect(result).toEqual({ ok: true })
  })

  it('ignores signatures under another scheme version', async () => {
    const body = '{}'
    const timestamp = String(nowSeconds())
    const good = await signSvixPayload(SECRET, 'msg_1', timestamp, body)
    const result = await verifySvixSignature(
      SECRET,
      { id: 'msg_1', timestamp, signature: `v1a,${good}` },
      body
    )
    expect(result).toEqual({ ok: false, reason: 'bad_signature' })
  })

  it('rejects a non-numeric timestamp', async () => {
    const result = await verifySvixSignature(
      SECRET,
      { id: 'msg_1', timestamp: 'soon', signature: 'v1,abc' },
      '{}'
    )
    expect(result).toEqual({ ok: false, reason: 'bad_timestamp' })
  })
})
