import { webcrypto } from 'node:crypto'
import {
  bearerToken,
  clearJwksCache,
  introspectOpaqueToken,
  issuerJwks,
  verifyAccessToken,
  type Jwks,
} from '../clerkOAuth'
import { ISSUER, RESOURCE, jwksFetch, makeKey, sign, type SigningKey } from '../../jest/clerkTokens'

const subtle = webcrypto.subtle as unknown as SubtleCrypto

let key: SigningKey
let otherKey: SigningKey
beforeAll(async () => {
  key = await makeKey('ins_key_one')
  otherKey = await makeKey('ins_key_two')
})
beforeEach(() => clearJwksCache())

const options = (keys: SigningKey[] = [key]) => ({
  issuer: ISSUER,
  audience: RESOURCE,
  getJwks: async (): Promise<Jwks> => ({ keys: keys.map((k) => k.publicJwk) }),
  subtle,
})

describe('verifyAccessToken', () => {
  it('accepts a Clerk OAuth access token for this resource', async () => {
    const result = await verifyAccessToken(await sign(key), options())
    expect(result).toMatchObject({
      ok: true,
      subject: 'clerk_athlete',
      clientId: 'https://claude.ai/oauth/mcp-oauth-client-metadata',
      scopes: ['openid', 'profile', 'email'],
    })
  })

  it('accepts the long media type and an audience list that names this resource', async () => {
    const token = await sign(key, {
      typ: 'application/at+jwt',
      claims: { aud: ['https://other.example.com', RESOURCE] },
    })
    expect((await verifyAccessToken(token, options())).ok).toBe(true)
  })

  it.each([
    ['no token', null, 'missing'],
    ['an opaque token', 'oat_abc123', 'opaque_unsupported'],
    ['garbage', 'not-a-token', 'malformed'],
  ])('rejects %s', async (_label, token, reason) => {
    expect(await verifyAccessToken(token, options())).toEqual({ ok: false, reason })
  })

  it('rejects a Clerk session token used in place of an access token', async () => {
    // Session tokens carry typ JWT; the app's convex template also has aud "convex".
    const session = await sign(key, { typ: 'JWT', claims: { aud: 'convex', sid: 'sess_123' } })
    expect(await verifyAccessToken(session, options())).toEqual({
      ok: false,
      reason: 'not_access_token',
    })
    const sessionForResource = await sign(key, { typ: 'JWT' })
    expect(await verifyAccessToken(sessionForResource, options())).toEqual({
      ok: false,
      reason: 'not_access_token',
    })
  })

  it('rejects an expired token', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = await sign(key, { claims: { iat: now - 1200, nbf: now - 1200, exp: now - 60 } })
    expect(await verifyAccessToken(token, options())).toEqual({ ok: false, reason: 'expired' })
    const noExpiry = await sign(key, { omit: ['exp'] })
    expect(await verifyAccessToken(noExpiry, options())).toEqual({ ok: false, reason: 'expired' })
  })

  it('rejects a token that is not valid yet', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = await sign(key, { claims: { nbf: now + 600 } })
    expect(await verifyAccessToken(token, options())).toEqual({
      ok: false,
      reason: 'not_yet_valid',
    })
  })

  it('rejects the wrong audience, a missing one, and a near miss', async () => {
    for (const aud of ['https://other.example.com/mcp', `${RESOURCE}/`, 'convex', []]) {
      const token = await sign(key, { claims: { aud } })
      expect({ aud, result: await verifyAccessToken(token, options()) }).toEqual({
        aud,
        result: { ok: false, reason: 'wrong_audience' },
      })
    }
    const noAud = await sign(key, { omit: ['aud'] })
    expect(await verifyAccessToken(noAud, options())).toEqual({
      ok: false,
      reason: 'wrong_audience',
    })
  })

  it('rejects another issuer', async () => {
    const token = await sign(key, { claims: { iss: 'https://evil.clerk.accounts.dev' } })
    expect(await verifyAccessToken(token, options())).toEqual({ ok: false, reason: 'wrong_issuer' })
  })

  it('rejects a token signed by a key the issuer does not publish', async () => {
    // Signed by otherKey but claiming key one's kid.
    const forged = await sign(otherKey, { kid: key.kid })
    expect(await verifyAccessToken(forged, options())).toEqual({
      ok: false,
      reason: 'bad_signature',
    })
    const unknown = await sign(otherKey)
    expect(await verifyAccessToken(unknown, options())).toEqual({
      ok: false,
      reason: 'unknown_key',
    })
  })

  it('rejects a token whose claims were changed after signing', async () => {
    const token = await sign(key)
    const [header, , signature] = token.split('.')
    const payload = Buffer.from(
      JSON.stringify({ iss: ISSUER, sub: 'clerk_someone_else', aud: RESOURCE, exp: 9999999999 })
    ).toString('base64url')
    expect(await verifyAccessToken(`${header}.${payload}.${signature}`, options())).toEqual({
      ok: false,
      reason: 'bad_signature',
    })
  })

  it('rejects alg none and HS256', async () => {
    for (const alg of ['none', 'HS256']) {
      const token = await sign(key, { alg })
      expect({ alg, result: await verifyAccessToken(token, options()) }).toEqual({
        alg,
        result: { ok: false, reason: 'bad_algorithm' },
      })
    }
  })

  it('rejects a token with no subject', async () => {
    const token = await sign(key, { omit: ['sub'] })
    expect(await verifyAccessToken(token, options())).toEqual({ ok: false, reason: 'no_subject' })
  })

  it('refetches the JWKS once when the key is new', async () => {
    const seen: boolean[] = []
    let keys = [otherKey]
    const result = await verifyAccessToken(await sign(key), {
      ...options(),
      getJwks: async (fresh) => {
        seen.push(fresh)
        const jwks = { keys: keys.map((k) => k.publicJwk) }
        keys = [otherKey, key] // Clerk rotated in a new key
        return jwks
      },
    })
    expect(result.ok).toBe(true)
    expect(seen).toEqual([false, true])
  })
})

describe('issuerJwks', () => {
  it('caches the JWKS between calls and bypasses the cache when asked', async () => {
    const { fetcher, calls } = jwksFetch([key])
    const get = issuerJwks(ISSUER, fetcher)
    await get(false)
    await get(false)
    expect(calls).toHaveLength(1)
    await get(true)
    expect(calls).toHaveLength(2)
    expect(calls[0]).toBe(`${ISSUER}/.well-known/jwks.json`)
  })
})

describe('bearerToken', () => {
  it('reads only a Bearer authorization header', () => {
    expect(bearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi')
    expect(bearerToken('bearer abc')).toBe('abc')
    expect(bearerToken('Basic dXNlcjpwYXNz')).toBeNull()
    expect(bearerToken(null)).toBeNull()
    expect(bearerToken('Bearer a b')).toBeNull()
  })
})

describe('introspectOpaqueToken', () => {
  const now = 1_800_000_000
  const active = {
    object: 'clerk_idp_oauth_access_token',
    client_id: 'https://claude.ai/oauth/mcp-oauth-client-metadata',
    subject: 'clerk_athlete',
    scopes: ['openid', 'profile', 'email'],
    revoked: false,
    expired: false,
    expiration: now + 600,
    aud: [RESOURCE],
  }
  const respond = (status: number, body: unknown) => {
    const requests: { url: string; init?: RequestInit }[] = []
    const fetcher = (async (url: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(url), init })
      return new Response(JSON.stringify(body), { status })
    }) as typeof fetch
    return { fetcher, requests }
  }
  const check = (fetcher: typeof fetch, token = 'oat_ABC123') =>
    introspectOpaqueToken(token, {
      secretKey: 'sk_test_x',
      audience: RESOURCE,
      fetcher,
      now: () => now,
    })

  it('accepts an active token for this resource and sends the secret only to Clerk', async () => {
    const { fetcher, requests } = respond(200, active)
    expect(await check(fetcher)).toEqual({
      ok: true,
      subject: 'clerk_athlete',
      clientId: active.client_id,
      scopes: active.scopes,
      expiresAt: now + 600,
    })
    expect(requests).toHaveLength(1)
    expect(requests[0].url).toBe('https://api.clerk.com/v1/oauth_applications/access_tokens/verify')
    expect(requests[0].init?.headers).toMatchObject({ Authorization: 'Bearer sk_test_x' })
    expect(JSON.parse(String(requests[0].init?.body))).toEqual({ access_token: 'oat_ABC123' })
  })

  it.each([
    [
      'a token Clerk does not know',
      404,
      { errors: [{ code: 'oauth_access_token_not_found' }] },
      'unknown_token',
    ],
    ['a revoked token', 200, { ...active, revoked: true }, 'revoked'],
    ['an expired token', 200, { ...active, expired: true }, 'expired'],
    ['a token past its expiration', 200, { ...active, expiration: now - 1 }, 'expired'],
    [
      'a token for another resource',
      200,
      { ...active, aud: ['https://other.example.com/mcp'] },
      'wrong_audience',
    ],
    ['a token with no audience', 200, { ...active, aud: undefined }, 'wrong_audience'],
    ['a token with no subject', 200, { ...active, subject: '' }, 'no_subject'],
  ])('rejects %s', async (_label, status, body, reason) => {
    expect(await check(respond(status, body).fetcher)).toEqual({ ok: false, reason })
  })

  it('does not call Clerk for something that is not an opaque token', async () => {
    const { fetcher, requests } = respond(200, active)
    expect(await check(fetcher, 'eyJ.a.b')).toEqual({ ok: false, reason: 'malformed' })
    expect(requests).toHaveLength(0)
  })

  it('throws when Clerk is down, so the endpoint answers 503', async () => {
    await expect(check(respond(500, {}).fetcher)).rejects.toThrow(/500/)
  })
})
