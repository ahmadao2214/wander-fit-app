/**
 * Maps Clerk errors from email-code verification during sign-up to
 * messages that are safe to show users.
 */

type ClerkErrorLike = {
  code?: string
  message?: string
  longMessage?: string
}

export const VERIFICATION_FALLBACK_MESSAGE = 'Verification failed. Please try again.'

export function getVerificationErrorMessage(err: unknown): string {
  const clerkErrors: ClerkErrorLike[] | undefined = (err as { errors?: ClerkErrorLike[] })?.errors
  const first = clerkErrors?.[0]
  if (!first) return VERIFICATION_FALLBACK_MESSAGE

  switch (first.code) {
    case 'form_code_incorrect':
      return 'That code is incorrect. Please try again.'
    case 'verification_expired':
      return 'This code has expired. Tap Resend to get a new one.'
    case 'verification_failed':
    case 'too_many_requests':
      return 'Too many attempts. Please wait a moment, then tap Resend.'
    case 'user_quota_exceeded':
      // Clerk's own message is aimed at developers, so don't show it
      return "We can't create new accounts right now. Please try again later."
    default:
      return first.longMessage || first.message || VERIFICATION_FALLBACK_MESSAGE
  }
}
