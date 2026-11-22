/**
 * Verifies a Clerk OAuth access token for the MCP endpoint.
 *
 * Accepts only JWT access tokens (RFC 9068, header typ "at+jwt", which is how
 * Clerk's own SDK tells them from session tokens, whose typ is "JWT"). The
 * signature is checked against the issuer's JWKS before any claim is read.
 * Then: exact issuer, unexpired, and the exact audience of the resource being
 * called. An opaque token (oat_...) is checked through Clerk's verify API,
 * which needs the Clerk secret key on the server and reports the audience;
 * without the key, opaque tokens are refused.
 */

export type Jwk = JsonWebKey & { kid?: string; alg?: string; use?: string };
export type Jwks = { keys: Jwk[] };

export type VerifyOptions = {
  issuer: string;
  audience: string;
  /** Fetches the issuer's JWKS. `fresh` asks to bypass any cache (unknown kid). */
  getJwks: (fresh: boolean) => Promise<Jwks>;
  /** Seconds since the epoch. */
  now?: () => number;
  /** Allowed clock skew, seconds. */
  leeway?: number;
  subtle?: SubtleCrypto;
};

export type Rejection =
  | "missing"
  | "opaque_unsupported"
  | "malformed"
  | "not_access_token"
  | "bad_algorithm"
  | "unknown_key"
  | "bad_signature"
  | "wrong_issuer"
  | "expired"
  | "not_yet_valid"
  | "wrong_audience"
  | "no_subject"
  | "unknown_token"
  | "revoked";

export type Verified = {
  ok: true;
  subject: string;
  clientId: string | null;
  scopes: string[];
  expiresAt: number;
};
export type Verification = Verified | { ok: false; reason: Rejection };

const ACCESS_TOKEN_TYPES = new Set(["at+jwt", "application/at+jwt"]);
const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function parseJson(segment: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment)));
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

const fail = (reason: Rejection): Verification => ({ ok: false, reason });

export function bearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(\S+)\s*$/i);
  return match ? match[1] : null;
}

export async function verifyAccessToken(token: string | null, options: VerifyOptions): Promise<Verification> {
  if (!token) return fail("missing");
  if (!JWT_SHAPE.test(token)) return fail(token.startsWith("oat_") ? "opaque_unsupported" : "malformed");

  const [headerPart, payloadPart, signaturePart] = token.split(".");
  // The header only chooses the key; nothing in it is trusted until the signature holds.
  const header = parseJson(headerPart);
  if (!header) return fail("malformed");
  if (typeof header.typ !== "string" || !ACCESS_TOKEN_TYPES.has(header.typ.toLowerCase())) {
    return fail("not_access_token");
  }
  if (header.alg !== "RS256") return fail("bad_algorithm");
  const kid = typeof header.kid === "string" ? header.kid : null;
  if (!kid) return fail("unknown_key");

  const findKey = (jwks: Jwks) =>
    jwks.keys.find((key) => key.kid === kid && key.kty === "RSA" && (!key.use || key.use === "sig"));
  let jwk = findKey(await options.getJwks(false));
  if (!jwk) jwk = findKey(await options.getJwks(true));
  if (!jwk) return fail("unknown_key");

  const subtle = options.subtle ?? globalThis.crypto.subtle;
  let valid = false;
  try {
    const key = await subtle.importKey(
      "jwk",
      { kty: jwk.kty, n: jwk.n, e: jwk.e },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    valid = await subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64UrlToBytes(signaturePart),
      new TextEncoder().encode(`${headerPart}.${payloadPart}`),
    );
  } catch {
    valid = false;
  }
  if (!valid) return fail("bad_signature");

  const claims = parseJson(payloadPart);
  if (!claims) return fail("malformed");

  const now = options.now ? options.now() : Math.floor(Date.now() / 1000);
  const leeway = options.leeway ?? 5;

  if (claims.iss !== options.issuer) return fail("wrong_issuer");
  if (typeof claims.exp !== "number" || claims.exp + leeway <= now) return fail("expired");
  if (typeof claims.nbf === "number" && claims.nbf - leeway > now) return fail("not_yet_valid");
  if (typeof claims.iat === "number" && claims.iat - leeway > now) return fail("not_yet_valid");

  const audiences = typeof claims.aud === "string" ? [claims.aud] : Array.isArray(claims.aud) ? claims.aud : [];
  if (!audiences.includes(options.audience)) return fail("wrong_audience");

  if (typeof claims.sub !== "string" || claims.sub.length === 0) return fail("no_subject");

  const scopeClaim = typeof claims.scope === "string" ? claims.scope : "";
  const scopes = Array.isArray(claims.scp)
    ? claims.scp.filter((value): value is string => typeof value === "string")
    : scopeClaim.split(" ").filter(Boolean);

  return {
    ok: true,
    subject: claims.sub,
    clientId: typeof claims.client_id === "string" ? claims.client_id : null,
    scopes,
    expiresAt: claims.exp,
  };
}

/** JWKS for an issuer, cached per isolate for five minutes. */
const jwksCache = new Map<string, { jwks: Jwks; fetchedAt: number }>();
const JWKS_TTL_MS = 5 * 60 * 1000;

export function issuerJwks(issuer: string, fetcher: typeof fetch = fetch) {
  const url = `${issuer.replace(/\/$/, "")}/.well-known/jwks.json`;
  return async (fresh: boolean): Promise<Jwks> => {
    const cached = jwksCache.get(url);
    if (!fresh && cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) return cached.jwks;
    const response = await fetcher(url);
    if (!response.ok) throw new Error(`JWKS fetch failed: ${response.status}`);
    const jwks = (await response.json()) as Jwks;
    if (!Array.isArray(jwks?.keys)) throw new Error("JWKS has no keys");
    jwksCache.set(url, { jwks, fetchedAt: Date.now() });
    return jwks;
  };
}

export function clearJwksCache() {
  jwksCache.clear();
}

const CLERK_API = "https://api.clerk.com/v1";

/** The fields of Clerk's IdPOAuthAccessToken that the decision needs. */
type IntrospectedToken = {
  subject?: unknown;
  client_id?: unknown;
  scopes?: unknown;
  revoked?: unknown;
  expired?: unknown;
  expiration?: unknown;
  aud?: unknown;
};

export type IntrospectOptions = {
  secretKey: string;
  audience: string;
  fetcher?: typeof fetch;
  now?: () => number;
};

export const isOpaqueToken = (token: string) => /^oat_[0-9A-Za-z]+$/.test(token);

/**
 * Resource-aware introspection of an opaque Clerk OAuth access token. Throws
 * only when Clerk cannot be reached, so the caller can answer 503, not 401.
 */
export async function introspectOpaqueToken(token: string, options: IntrospectOptions): Promise<Verification> {
  if (!isOpaqueToken(token)) return fail("malformed");
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`${CLERK_API}/oauth_applications/access_tokens/verify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${options.secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: token }),
  });
  if (response.status === 404 || response.status === 400 || response.status === 422) return fail("unknown_token");
  if (!response.ok) throw new Error(`Clerk token verify failed: ${response.status}`);

  const body = (await response.json()) as IntrospectedToken;
  const now = options.now ? options.now() : Math.floor(Date.now() / 1000);

  if (body.revoked !== false) return fail("revoked");
  if (body.expired !== false) return fail("expired");
  if (typeof body.expiration !== "number" || body.expiration <= now) return fail("expired");

  const audiences = Array.isArray(body.aud) ? body.aud : typeof body.aud === "string" ? [body.aud] : [];
  if (!audiences.includes(options.audience)) return fail("wrong_audience");

  if (typeof body.subject !== "string" || body.subject.length === 0) return fail("no_subject");

  return {
    ok: true,
    subject: body.subject,
    clientId: typeof body.client_id === "string" ? body.client_id : null,
    scopes: Array.isArray(body.scopes) ? body.scopes.filter((v): v is string => typeof v === "string") : [],
    expiresAt: body.expiration,
  };
}
