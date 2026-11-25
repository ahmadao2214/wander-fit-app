import { v } from 'convex/values'
import { internalMutation } from './_generated/server'

/**
 * Support, privacy and account-deletion requests from the public support
 * form in `landing/support/`.
 *
 * The form posts to `POST /contact` in `http.ts`, which validates with
 * `cleanContact`, rate limits with `internal.waitlist.checkRateLimit`, and
 * saves through `record`. Nothing here is a public Convex function.
 */

export const TOPICS = ['support', 'privacy', 'delete_account'] as const
export type ContactTopic = (typeof TOPICS)[number]

export const MAX_MESSAGE_LENGTH = 2000
export const MAX_EMAIL_LENGTH = 254

/** A closed request is deleted by the daily cleanup once it is this old. The policy pages state it. */
export const CLOSED_REQUEST_RETENTION_MS = 90 * 24 * 60 * 60 * 1000

export type ContactRequest = {
  topic: ContactTopic
  email: string
  message: string
}

export type CleanContactResult =
  | { ok: true; value: ContactRequest }
  | { ok: false; error: string }
  | { ok: false; spam: true }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// oxlint-disable-next-line no-control-regex -- Strip control characters, but keep tabs and line breaks in the message.
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g

/** Any Unicode control character, tabs and line breaks included. */
const ANY_CONTROL_CHAR = /\p{Cc}/u

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(CONTROL_CHARS, '').trim().slice(0, max) : ''
}

/** Validate and normalize a raw support-form body. */
export function cleanContact(raw: unknown): CleanContactResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Send the request as JSON.' }
  }
  const body = raw as Record<string, unknown>

  // Honeypot: a hidden field people never see. Bots fill it; drop quietly.
  if (text(body.website, 200)) return { ok: false, spam: true }

  const topic = TOPICS.find((t) => t === body.topic)
  if (!topic) {
    return { ok: false, error: 'Choose what you need help with.' }
  }

  // The reply goes to this address, so it is never cut or cleaned into a
  // different one: anything too long or holding a control character is refused.
  // Control characters are checked before anything is trimmed, and only
  // plain spaces around the address are trimmed.
  const submitted = typeof body.email === 'string' ? body.email : ''
  const rawEmail = submitted.replace(/^ +| +$/g, '')
  if (
    ANY_CONTROL_CHAR.test(submitted) ||
    rawEmail.length > MAX_EMAIL_LENGTH ||
    !EMAIL.test(rawEmail)
  ) {
    return { ok: false, error: 'Enter a valid email address.' }
  }
  const email = rawEmail.toLowerCase()

  const message = text(body.message, MAX_MESSAGE_LENGTH)
  if (!message) {
    return { ok: false, error: 'Tell us what you need.' }
  }

  return { ok: true, value: { topic, email, message } }
}

/** Save a cleaned support-form request as `open`. */
export const record = internalMutation({
  args: {
    topic: v.union(v.literal('support'), v.literal('privacy'), v.literal('delete_account')),
    email: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('contact_requests', {
      ...args,
      status: 'open',
      createdAt: Date.now(),
    })
    return { id }
  },
})

/**
 * Delete handled requests once they are 90 days old, so a deletion request
 * does not outlive the account it asked to delete for long. Open requests stay
 * until someone closes them.
 */
export const pruneClosed = internalMutation({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cutoff = (args.now ?? Date.now()) - CLOSED_REQUEST_RETENTION_MS
    const expired = await ctx.db
      .query('contact_requests')
      .withIndex('by_status', (q) => q.eq('status', 'done').lte('createdAt', cutoff))
      .take(200)
    for (const row of expired) await ctx.db.delete(row._id)
    return { deleted: expired.length }
  },
})
