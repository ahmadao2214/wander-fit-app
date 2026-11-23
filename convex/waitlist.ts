import { v } from 'convex/values'
import { internalMutation } from './_generated/server'

/**
 * Landing-page Beta On-Ramp backend.
 *
 * The static site in `landing/` posts to the public HTTP route in `http.ts`,
 * which validates with `cleanSignup`, checks rate limits with `checkRateLimit`,
 * and persists through `record`. Nothing here is a public Convex function, so
 * the only way in is the validated, rate-limited HTTP route.
 */

export const ROLES = ['athlete_14_17', 'athlete_18_plus', 'parent'] as const
export type BetaRole = (typeof ROLES)[number]

export const INTENTS = ['season_pass', 'monthly', 'free_beta_only'] as const
export type BetaIntent = (typeof INTENTS)[number]

/** Season dates up to 52 weeks out match `MAX_SEASON_WEEKS` in `lib/firstRun.ts`. */
export const MAX_SEASON_DAYS = 52 * 7

/** Default fixed-window rate limit: 10 requests per 15 minutes per key. */
export const RATE_LIMIT_MAX_REQUESTS = 10
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000

export type Signup = {
  role: BetaRole
  email: string
  parentEmail?: string
  intent: BetaIntent
  seasonDate?: string
  source?: string
}

export type CleanResult =
  | { ok: true; value: Signup }
  | { ok: false; error: string }
  | { ok: false; spam: true }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
// oxlint-disable-next-line no-control-regex -- Strip control characters from submitted text.
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g
const MS_PER_DAY = 86400000

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(CONTROL_CHARS, '').trim().slice(0, max) : ''
}

function parseUtcDate(value: string): number | null {
  if (!DATE.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const utc = Date.UTC(y, m - 1, d)
  const check = new Date(utc)
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    return null
  }
  return utc
}

/** Validate and normalize a raw Beta On-Ramp sign-up body. The server clock anchors the visitor’s local calendar day. */
export function cleanSignup(raw: unknown, serverTime: string): CleanResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Send the sign-up as JSON.' }
  }
  const body = raw as Record<string, unknown>

  // Honeypot: a hidden field people never see. Bots fill it; drop quietly.
  if (text(body.website, 200)) return { ok: false, spam: true }

  const role = ROLES.find((r) => r === body.role)
  if (!role) {
    return {
      ok: false,
      error: 'Choose whether you are an athlete (14–17), adult athlete (18+), or parent.',
    }
  }

  const email = text(body.email, 254).toLowerCase()
  if (!EMAIL.test(email)) {
    return { ok: false, error: 'Enter a valid email address.' }
  }

  let parentEmail: string | undefined
  if (role === 'athlete_14_17') {
    const rawParent = text(body.parentEmail, 254).toLowerCase()
    if (rawParent) {
      if (!EMAIL.test(rawParent)) {
        return { ok: false, error: 'Enter a valid parent email, or leave it blank.' }
      }
      parentEmail = rawParent
    }
  }

  const rawIntent = body.intent
  let intent: BetaIntent
  if (rawIntent === undefined || rawIntent === null || rawIntent === '') {
    intent = 'free_beta_only'
  } else {
    const matched = INTENTS.find((i) => i === rawIntent)
    if (!matched) {
      return { ok: false, error: 'Pick a beta plan preference.' }
    }
    intent = matched
  }

  let seasonDate: string | undefined
  const rawDate = text(body.seasonDate, 10)
  if (rawDate) {
    const offset = body.timezoneOffsetMinutes ?? 0
    if (typeof offset !== 'number' || !Number.isInteger(offset) || Math.abs(offset) > 14 * 60) {
      return { ok: false, error: 'Pick a valid season date.' }
    }
    const todayMs = Math.floor((Date.parse(serverTime) - offset * 60_000) / MS_PER_DAY) * MS_PER_DAY
    const dateMs = parseUtcDate(rawDate)
    if (dateMs === null || !Number.isFinite(todayMs)) {
      return { ok: false, error: 'Pick a valid season date.' }
    }
    const diffDays = Math.round((dateMs - todayMs) / MS_PER_DAY)
    if (diffDays <= 0) {
      return { ok: false, error: 'Pick a season date after today.' }
    }
    if (diffDays > MAX_SEASON_DAYS) {
      return { ok: false, error: 'Pick a season date within the next 12 months.' }
    }
    seasonDate = rawDate
  }

  const source = text(body.source, 80) || undefined

  return {
    ok: true,
    value: {
      role,
      email,
      ...(parentEmail ? { parentEmail } : {}),
      intent,
      ...(seasonDate ? { seasonDate } : {}),
      ...(source ? { source } : {}),
    },
  }
}

const signupArgs = {
  role: v.union(v.literal('athlete_14_17'), v.literal('athlete_18_plus'), v.literal('parent')),
  email: v.string(),
  parentEmail: v.optional(v.string()),
  intent: v.union(v.literal('season_pass'), v.literal('monthly'), v.literal('free_beta_only')),
  seasonDate: v.optional(v.string()),
  source: v.optional(v.string()),
}

/**
 * Save a cleaned Beta On-Ramp sign-up. Repeat submissions for the same
 * normalized email update the existing row instead of duplicating, preserving
 * `createdAt` and initial `source` attribution if a repeat omits `?ref=`.
 */
export const record = internalMutation({
  args: signupArgs,
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query('waitlist_signups')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        parentEmail: args.role === 'athlete_14_17' ? args.parentEmail : undefined,
        intent: args.intent,
        seasonDate: args.seasonDate ?? existing.seasonDate,
        source: args.source ?? existing.source,
        updatedAt: now,
      })
      return { id: existing._id, updated: true }
    }

    const id = await ctx.db.insert('waitlist_signups', {
      ...args,
      createdAt: now,
      updatedAt: now,
    })
    return { id, updated: false }
  },
})

/**
 * Fixed-window rate limit check backed by `waitlist_rate_limits`.
 * Returns `{ allowed, remaining, retryAfterSeconds }`.
 */
export const checkRateLimit = internalMutation({
  args: {
    key: v.string(),
    now: v.optional(v.number()),
    limit: v.optional(v.number()),
    windowMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now()
    const limit = args.limit ?? RATE_LIMIT_MAX_REQUESTS
    const windowMs = args.windowMs ?? RATE_LIMIT_WINDOW_MS

    const existing = await ctx.db
      .query('waitlist_rate_limits')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()

    if (!existing) {
      await ctx.db.insert('waitlist_rate_limits', {
        key: args.key,
        windowStart: now,
        count: 1,
      })
      return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterSeconds: 0 }
    }

    if (now - existing.windowStart >= windowMs) {
      await ctx.db.patch(existing._id, {
        windowStart: now,
        count: 1,
      })
      return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterSeconds: 0 }
    }

    if (existing.count >= limit) {
      const retryAfterMs = existing.windowStart + windowMs - now
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      }
    }

    const nextCount = existing.count + 1
    await ctx.db.patch(existing._id, { count: nextCount })
    return {
      allowed: true,
      remaining: Math.max(0, limit - nextCount),
      retryAfterSeconds: 0,
    }
  },
})
