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

export interface SignUpFormErrors {
  email?: string
  password?: string
  /** Shown above the form; empty when only field errors apply. */
  general: string
  /** The email already has an account, so offer sign-in instead. */
  accountExists: boolean
}

/** Maps Clerk errors from creating a sign-up to field and form messages. */
export function getSignUpFormErrors(err: unknown): SignUpFormErrors {
  const clerkErrors: ClerkErrorLike[] | undefined = (err as { errors?: ClerkErrorLike[] })?.errors
  const result: SignUpFormErrors = { general: '', accountExists: false }
  if (!clerkErrors?.length) return { ...result, general: 'Sign up failed. Please try again.' }

  const general: string[] = []
  for (const e of clerkErrors) {
    switch (e.code) {
      case 'form_identifier_exists':
        result.email = 'This email already has an account.'
        result.accountExists = true
        break
      case 'form_password_pwned':
        result.password = 'This password was found in a data breach. Use a different one.'
        break
      case 'form_password_length_too_short':
        result.password = 'Use at least 8 characters.'
        break
      case 'form_param_format_invalid':
        result.email = 'Enter a valid email address, like name@example.com.'
        break
      default:
        general.push(e.longMessage || e.message || 'Sign up failed.')
    }
  }
  result.general = [...new Set(general)].join(' ')
  return result
}
