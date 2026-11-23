import {
  getSignUpFormErrors,
  getVerificationErrorMessage,
  VERIFICATION_FALLBACK_MESSAGE,
} from '../signUpErrors'

const clerkError = (code: string, extra: Record<string, string> = {}) => ({
  clerkError: true,
  errors: [{ code, ...extra }],
})

describe('getVerificationErrorMessage', () => {
  it('explains an incorrect code', () => {
    expect(getVerificationErrorMessage(clerkError('form_code_incorrect'))).toBe(
      'That code is incorrect. Please try again.'
    )
  })

  it('tells the user to resend an expired code', () => {
    expect(getVerificationErrorMessage(clerkError('verification_expired'))).toContain('Resend')
  })

  it('handles too many attempts', () => {
    expect(getVerificationErrorMessage(clerkError('verification_failed'))).toContain(
      'Too many attempts'
    )
    expect(getVerificationErrorMessage(clerkError('too_many_requests'))).toContain(
      'Too many attempts'
    )
  })

  it("hides Clerk's developer-facing message when the user quota is exceeded", () => {
    const message = getVerificationErrorMessage(
      clerkError('user_quota_exceeded', {
        longMessage:
          'You have reached your limit of 100 users. If you need more users, please use a Production instance.',
      })
    )
    expect(message).toBe("We can't create new accounts right now. Please try again later.")
    expect(message).not.toContain('Production instance')
  })

  it("falls back to Clerk's long message for unknown codes", () => {
    expect(
      getVerificationErrorMessage(
        clerkError('something_new', { message: 'Short', longMessage: 'Long message' })
      )
    ).toBe('Long message')
  })

  it("falls back to Clerk's short message when there is no long message", () => {
    expect(getVerificationErrorMessage(clerkError('something_new', { message: 'Short' }))).toBe(
      'Short'
    )
  })

  it('uses the generic message for non-Clerk errors', () => {
    expect(getVerificationErrorMessage(new Error('network down'))).toBe(
      VERIFICATION_FALLBACK_MESSAGE
    )
    expect(getVerificationErrorMessage(undefined)).toBe(VERIFICATION_FALLBACK_MESSAGE)
    expect(getVerificationErrorMessage({ errors: [] })).toBe(VERIFICATION_FALLBACK_MESSAGE)
  })
})

describe('getSignUpFormErrors', () => {
  const clerk = (...codes: string[]) => ({
    errors: codes.map((code) => ({ code, message: `msg ${code}` })),
  })

  it('puts field problems next to the field', () => {
    expect(getSignUpFormErrors(clerk('form_password_length_too_short'))).toEqual({
      password: 'Use at least 8 characters.',
      general: '',
      accountExists: false,
    })
  })

  it('flags an existing account so the sheet can offer sign-in', () => {
    const r = getSignUpFormErrors(clerk('form_identifier_exists'))
    expect(r.accountExists).toBe(true)
    expect(r.email).toBe('This email already has an account.')
  })

  it('keeps unknown messages, once each', () => {
    expect(getSignUpFormErrors(clerk('x', 'x')).general).toBe('msg x')
    expect(getSignUpFormErrors(new Error('boom')).general).toBe('Sign up failed. Please try again.')
  })
})
