import { cleanSignup } from './waitlist'
import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import type { ActionCtx } from './_generated/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { handleMessage, PARSE_ERROR, type CallTool } from './mcpProtocol'
import {
  CORS_HEADERS,
  MCP_PATH,
  RESOURCE_METADATA_PATH,
  protectedResourceMetadata,
  resourceUrl,
  unauthorizedHeader,
  type McpEnv,
} from './mcpAuth'
import {
  bearerToken,
  introspectOpaqueToken,
  isOpaqueToken,
  issuerJwks,
  verifyAccessToken,
} from './clerkOAuth'

const env = (): McpEnv => ({
  MCP_RESOURCE_URL: process.env.MCP_RESOURCE_URL,
  CONVEX_SITE_URL: process.env.CONVEX_SITE_URL,
  CLERK_JWT_ISSUER_DOMAIN: process.env.CLERK_JWT_ISSUER_DOMAIN,
})

type Slot = { phase: 'GPP' | 'SPP' | 'SSP'; week: number; day: number }

/**
 * Each tool runs an internal chat-hands function as the athlete whose Clerk
 * OAuth token was verified for this request. Convex validators reject
 * malformed arguments. Built per request; nothing is shared between calls.
 */
function toolsFor(ctx: ActionCtx, clerkId: string): CallTool {
  return async (name, args) => {
    switch (name) {
      case 'read_program': {
        const program = await ctx.runQuery(internal.chatHands.readProgram, { clerkId })
        return program
          ? { program }
          : { program: null, message: 'No program yet: intake is not finished in the app.' }
      }
      case 'read_today':
        return await ctx.runQuery(internal.chatHands.readToday, { clerkId })
      case 'read_day':
        return await ctx.runQuery(internal.chatHands.readDay, { clerkId, slot: args.slot as Slot })
      case 'preview_reorder':
        return await ctx.runQuery(internal.chatHands.previewReorder, {
          clerkId,
          sessionId: args.sessionId as Id<'gpp_workout_sessions'>,
          exerciseOrder: args.exerciseOrder as number[],
        })
      case 'commit_reorder':
        return await ctx.runMutation(internal.chatHands.commitReorder, {
          clerkId,
          sessionId: args.sessionId as Id<'gpp_workout_sessions'>,
          exerciseOrder: args.exerciseOrder as number[],
          version: args.version as string,
          accepted: args.accepted as boolean,
        })
      case 'preview_swap':
        return await ctx.runQuery(internal.chatHands.previewSwap, {
          clerkId,
          slotA: args.slotA as Slot,
          slotB: args.slotB as Slot,
        })
      case 'commit_swap':
        return await ctx.runMutation(internal.chatHands.commitSwap, {
          clerkId,
          slotA: args.slotA as Slot,
          slotB: args.slotB as Slot,
          version: args.version as string,
          accepted: args.accepted as boolean,
        })
    }
  }
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...headers },
  })

const challenge = (config: McpEnv, error?: 'invalid_token') =>
  json(
    { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Sign in to Wander Fit first' } },
    401,
    { 'WWW-Authenticate': unauthorizedHeader(config, error) }
  )

const mcp = httpAction(async (ctx, request) => {
  const config = env()
  const audience = resourceUrl(config)
  const issuer = config.CLERK_JWT_ISSUER_DOMAIN
  if (!audience || !issuer) {
    return json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: 'MCP sign-in is not configured' },
      },
      503
    )
  }

  const token = bearerToken(request.headers.get('Authorization'))
  if (!token) return challenge(config)

  let verified
  try {
    const secretKey = process.env.CLERK_SECRET_KEY
    verified =
      isOpaqueToken(token) && secretKey
        ? await introspectOpaqueToken(token, { secretKey, audience })
        : await verifyAccessToken(token, { issuer, audience, getJwks: issuerJwks(issuer) })
  } catch (error) {
    // Clerk (JWKS or verify API) could not be reached. Not the client's fault, so no re-sign-in challenge.
    console.error(
      'MCP sign-in check unavailable:',
      error instanceof Error ? error.message : String(error)
    )
    return json(
      { jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Sign-in check unavailable' } },
      503
    )
  }
  if (!verified.ok) {
    // The reason, never the token.
    console.warn('MCP token rejected:', verified.reason)
    return challenge(config, 'invalid_token')
  }

  let message: unknown
  try {
    message = await request.json()
  } catch {
    return json(
      { jsonrpc: '2.0', id: null, error: { code: PARSE_ERROR, message: 'Invalid JSON' } },
      400
    )
  }

  const response = await handleMessage(message, toolsFor(ctx, verified.subject))
  if (response === null) return new Response(null, { status: 202, headers: CORS_HEADERS })
  return json(response)
})

// Stateless server: no server-to-client stream and no session to end.
const notAllowed = httpAction(
  async () =>
    new Response(null, { status: 405, headers: { Allow: 'POST, OPTIONS', ...CORS_HEADERS } })
)

const preflight = httpAction(async () => new Response(null, { status: 204, headers: CORS_HEADERS }))

/** RFC 9728: tells a chat client that Clerk signs the athlete in for this endpoint. */
const resourceMetadata = httpAction(async () => {
  const metadata = protectedResourceMetadata(env())
  if (!metadata) return json({ error: 'MCP sign-in is not configured on this deployment' }, 404)
  return json(metadata, 200, { 'Cache-Control': 'public, max-age=300' })
})

/**
 * Clients built on the 2025-03-26 spec look for the authorization server's
 * metadata on this origin. Pass Clerk's through unchanged.
 */
const authServerMetadata = httpAction(async () => {
  const issuer = env().CLERK_JWT_ISSUER_DOMAIN
  if (!issuer) return json({ error: 'Clerk issuer is not configured' }, 404)
  const upstream = await fetch(
    `${issuer.replace(/\/$/, '')}/.well-known/oauth-authorization-server`
  )
  return json(await upstream.json(), upstream.status, { 'Cache-Control': 'public, max-age=300' })
})

const http = httpRouter()
http.route({ path: MCP_PATH, method: 'POST', handler: mcp })
http.route({ path: MCP_PATH, method: 'GET', handler: notAllowed })
http.route({ path: MCP_PATH, method: 'DELETE', handler: notAllowed })
http.route({ path: MCP_PATH, method: 'OPTIONS', handler: preflight })
for (const path of [RESOURCE_METADATA_PATH, `${RESOURCE_METADATA_PATH}${MCP_PATH}`]) {
  http.route({ path, method: 'GET', handler: resourceMetadata })
  http.route({ path, method: 'OPTIONS', handler: preflight })
}
http.route({
  path: '/.well-known/oauth-authorization-server',
  method: 'GET',
  handler: authServerMetadata,
})

const MAX_BODY_BYTES = 4096

/**
 * Resolve CORS headers for the static landing page.
 * Defaults to `*` for preview deploys; set `LANDING_ORIGIN` (comma-separated
 * allowed origins) in production Convex env vars to restrict cross-origin POSTs.
 */
function corsHeaders(request: Request): Record<string, string> {
  const configured = (process.env.LANDING_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  let allowOrigin = '*'
  const vary: Record<string, string> = {}
  if (configured.length > 0) {
    const reqOrigin = request.headers.get('Origin') ?? ''
    allowOrigin = configured.includes(reqOrigin) ? reqOrigin : configured[0]
    vary['Vary'] = 'Origin'
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    ...vary,
  }
}

function waitlistJson(
  request: Request,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {}
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  })
}

function extractClientIp(request: Request): string | null {
  const cfIp = request.headers.get('cf-connecting-ip')?.trim()
  if (cfIp) return cfIp.slice(0, 64)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first.slice(0, 64)
  }
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp.slice(0, 64)
  return null
}

http.route({
  path: '/waitlist',
  method: 'OPTIONS',
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, { status: 204, headers: corsHeaders(request) })
  }),
})

http.route({
  path: '/waitlist',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const reader = request.body?.getReader()
    const bytes = new Uint8Array(MAX_BODY_BYTES)
    let length = 0
    if (reader) {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (length + value.byteLength > MAX_BODY_BYTES) {
          await reader.cancel()
          return waitlistJson(request, 413, { error: 'That sign-up is too large.' })
        }
        bytes.set(value, length)
        length += value.byteLength
      }
    }

    let body: unknown
    try {
      body = JSON.parse(new TextDecoder().decode(bytes.subarray(0, length)))
    } catch {
      return waitlistJson(request, 400, { error: 'Send the sign-up as JSON.' })
    }

    const clientIp = extractClientIp(request)
    if (clientIp) {
      const ipLimit = await ctx.runMutation(internal.waitlist.checkRateLimit, {
        key: `ip:${clientIp}`,
      })
      if (!ipLimit.allowed) {
        return waitlistJson(
          request,
          429,
          { error: 'Too many sign-up attempts. Try again in a few minutes.' },
          { 'Retry-After': String(ipLimit.retryAfterSeconds) }
        )
      }
    }

    const result = cleanSignup(body, new Date().toISOString())
    // Spam gets the same answer as a real sign-up so bots learn nothing.
    if (!result.ok && 'spam' in result) return waitlistJson(request, 200, { ok: true })
    if (!result.ok) return waitlistJson(request, 400, { error: result.error })

    const emailLimit = await ctx.runMutation(internal.waitlist.checkRateLimit, {
      key: `email:${result.value.email}`,
    })
    if (!emailLimit.allowed) {
      return waitlistJson(
        request,
        429,
        { error: 'Too many sign-up attempts. Try again in a few minutes.' },
        { 'Retry-After': String(emailLimit.retryAfterSeconds) }
      )
    }

    await ctx.runMutation(internal.waitlist.record, result.value)
    return waitlistJson(request, 200, { ok: true })
  }),
})

export default http
