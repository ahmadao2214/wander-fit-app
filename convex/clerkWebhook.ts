/**
 * Verifies Clerk webhooks, which Clerk sends through Svix.
 *
 * The signed content is `${svix-id}.${svix-timestamp}.${body}`, signed with
 * HMAC-SHA256 under the base64 key after the `whsec_` prefix of the endpoint's
 * signing secret. `svix-signature` holds one or more space-separated
 * `v1,<base64>` signatures (more than one while a secret is being rotated).
 * Web Crypto only, so no extra dependency: https://docs.svix.com/receiving/verifying-payloads/how-manual
 */

/** Svix rejects messages more than five minutes off, to stop replays. */
export const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60

export type SvixHeaders = {
  id: string | null
  timestamp: string | null
  signature: string | null
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'missing_headers' | 'bad_timestamp' | 'bad_secret' | 'bad_signature' }

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/** Compares without stopping at the first difference. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** The base64 `v1` signature for this content. Exported for tests. */
export async function signSvixPayload(
  secret: string,
  id: string,
  timestamp: string,
  body: string
): Promise<string> {
  const keyBytes = base64ToBytes(secret.startsWith('whsec_') ? secret.slice(6) : secret)
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${body}`)
  )
  return bytesToBase64(new Uint8Array(mac))
}

export async function verifySvixSignature(
  secret: string,
  headers: SvixHeaders,
  body: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Promise<VerifyResult> {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature) return { ok: false, reason: 'missing_headers' }

  const sentAt = Number(timestamp)
  if (!/^\d+$/.test(timestamp) || Math.abs(nowSeconds - sentAt) > TIMESTAMP_TOLERANCE_SECONDS) {
    return { ok: false, reason: 'bad_timestamp' }
  }

  let expected: string
  try {
    expected = await signSvixPayload(secret, id, timestamp, body)
  } catch {
    // Not base64: the deployment's secret is wrong, not the request.
    return { ok: false, reason: 'bad_secret' }
  }

  const matches = signature
    .split(' ')
    .map((entry) => entry.split(','))
    .some(([version, value]) => version === 'v1' && !!value && constantTimeEqual(value, expected))
  return matches ? { ok: true } : { ok: false, reason: 'bad_signature' }
}
