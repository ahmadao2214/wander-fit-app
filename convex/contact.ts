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

  const email = text(body.email, 254).toLowerCase()
  if (!EMAIL.test(email)) {
    return { ok: false, error: 'Enter a valid email address.' }
  }

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
