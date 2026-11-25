import {
  acceptanceParts,
  acceptanceText,
  HEALTH_DISCLAIMER,
  legalUrl,
  TERMS_VERSION,
} from '../legal'

describe('legalUrl', () => {
  it('uses the landing site when no site URL is set', () => {
    expect(legalUrl('terms', undefined)).toBe('https://wanderfit-beta.vercel.app/terms')
    expect(legalUrl('privacy', '')).toBe('https://wanderfit-beta.vercel.app/privacy')
  })

  it('uses EXPO_PUBLIC_SITE_URL when it is set, without a doubled slash', () => {
    expect(legalUrl('terms', 'https://staging.wanderfit.app/')).toBe(
      'https://staging.wanderfit.app/terms'
    )
    expect(legalUrl('privacy', ' https://example.test ')).toBe('https://example.test/privacy')
  })
})

describe('acceptanceText', () => {
  it('gives 14-17 the parent or legal guardian sentence', () => {
    expect(acceptanceText('14-17')).toBe(
      "I have my parent or legal guardian's permission to use WanderFit, and together we agree to the Terms of Service, Privacy Policy, and Health & Fitness Disclaimer."
    )
  })

  it('gives 18 and over the agree-and-acknowledge sentence', () => {
    const adult =
      'I agree to the Terms of Service and Privacy Policy, and I acknowledge the Health & Fitness Disclaimer (general strength and conditioning guidance only, not medical advice).'
    expect(acceptanceText('18-35')).toBe(adult)
    expect(acceptanceText('36+')).toBe(adult)
  })

  it('links all three documents in either sentence', () => {
    for (const group of ['14-17', '18-35'] as const) {
      const links = acceptanceParts(group).flatMap((p) => (typeof p === 'string' ? [] : [p.link]))
      expect({ group, links }).toEqual({ group, links: ['terms', 'privacy', 'disclaimer'] })
    }
  })
})

describe('copy', () => {
  it('uses the product words and makes no injury-prevention claim', () => {
    const all = [
      acceptanceText('14-17'),
      acceptanceText('18-35'),
      HEALTH_DISCLAIMER.notice,
      ...HEALTH_DISCLAIMER.sections.flatMap((section) => [section.heading, section.body]),
    ].join(' ')
    expect(all).not.toMatch(/\b(user|client|onboarding|waitlist|block|stage)\b/i)
    expect(all).not.toMatch(/injury prevention|prevents? injur/i)
  })

  it('versions the terms by date', () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
