/**
 * Plays Clerk in tests: an RSA signing key, its JWKS, and tokens shaped like
 * Clerk OAuth access tokens (typ at+jwt) or session tokens (typ JWT).
 */
import { webcrypto } from 'node:crypto'

const subtle = webcrypto.subtle as unknown as SubtleCrypto

export const ISSUER = 'https://example-instance.clerk.accounts.dev'
export const RESOURCE = 'https://example-deployment.convex.site/mcp'
export const SITE = 'https://example-deployment.convex.site'

const b64url = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const b64json = (value: unknown) => b64url(new TextEncoder().encode(JSON.stringify(value)))

export type SigningKey = {
  kid: string
  privateKey: CryptoKey
  publicJwk: JsonWebKey & { kid: string }
}

export async function makeKey(kid = 'ins_test_key'): Promise<SigningKey> {
  const pair = (await subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair
  const jwk = await subtle.exportKey('jwk', pair.publicKey)
  return {
    kid,
    privateKey: pair.privateKey,
    publicJwk: { kty: jwk.kty, n: jwk.n, e: jwk.e, kid, alg: 'RS256', use: 'sig' },
  }
}

export type TokenOptions = {
  typ?: string
  alg?: string
  kid?: string
  claims?: Record<string, unknown>
  omit?: string[]
}

export async function sign(key: SigningKey, options: TokenOptions = {}) {
  const now = Math.floor(Date.now() / 1000)
  const header = {
    alg: options.alg ?? 'RS256',
    typ: options.typ ?? 'at+jwt',
    kid: options.kid ?? key.kid,
  }
  const claims: Record<string, unknown> = {
    iss: ISSUER,
    sub: 'clerk_athlete',
    aud: RESOURCE,
    client_id: 'https://claude.ai/oauth/mcp-oauth-client-metadata',
    scope: 'openid profile email',
    jti: 'oat_test123',
    iat: now,
    nbf: now,
    exp: now + 600,
    ...options.claims,
  }
  for (const name of options.omit ?? []) delete claims[name]
  const input = `${b64json(header)}.${b64json(claims)}`
  const signature = new Uint8Array(
    await subtle.sign('RSASSA-PKCS1-v1_5', key.privateKey, new TextEncoder().encode(input))
  )
  return `${input}.${b64url(signature)}`
}

/** A fetch that serves this key's JWKS at the issuer and counts the requests. */
export function jwksFetch(keys: SigningKey[]) {
  const calls: string[] = []
  const fetcher = (async (input: RequestInfo | URL) => {
    const url = String(input)
    calls.push(url)
    if (url === `${ISSUER}/.well-known/jwks.json`) {
      return new Response(JSON.stringify({ keys: keys.map((key) => key.publicJwk) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response('not found', { status: 404 })
  }) as typeof fetch
  return { fetcher, calls }
}
