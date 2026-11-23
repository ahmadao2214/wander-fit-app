/**
 * Public legal and support pages, the versions of the documents an athlete
 * agrees to, and the First Run's acceptance sentence. Changing the domain is
 * one env var (or the default here). Pure, so the copy and URLs are testable.
 */
import type { AgeGroup } from '../types'

/** Placeholder until the final domain is attached. */
export const DEFAULT_SITE_URL = 'https://wanderfit.app'

/** The site origin from `EXPO_PUBLIC_SITE_URL`, without a trailing slash. */
export function siteUrl(raw: string | undefined): string {
  const trimmed = raw?.trim().replace(/\/+$/, '')
  return trimmed ? trimmed : DEFAULT_SITE_URL
}

export function legalUrls(base: string) {
  return {
    privacy: `${base}/privacy`,
    terms: `${base}/terms`,
    refunds: `${base}/refunds`,
    support: `${base}/support`,
    deleteAccount: `${base}/delete-account`,
  } as const
}

// Read as a literal so babel-preset-expo inlines it into the app bundle.
export const LEGAL_URLS = legalUrls(siteUrl(process.env.EXPO_PUBLIC_SITE_URL))

/**
 * Bump a version whenever the text it names changes, so a later acceptance
 * record can tell which text the athlete agreed to.
 */
export const LEGAL_VERSIONS = {
  termsVersion: '2026-11-22',
  disclaimerVersion: '2026-11-22',
} as const

/**
 * The Terms of Service and Privacy Policy version an athlete accepts, stored
 * on the users row (`termsVersion`).
 */
export const TERMS_VERSION = LEGAL_VERSIONS.termsVersion

export type LegalPage = 'terms' | 'privacy'

/** The hosted page, on EXPO_PUBLIC_SITE_URL when it's set. */
export function legalUrl(page: LegalPage, raw = process.env.EXPO_PUBLIC_SITE_URL): string {
  return `${siteUrl(raw)}/${page}`
}

/**
 * The full Health & Fitness Disclaimer, shown in App Settings and in the
 * First Run's Save your plan sheet. Working draft
 * (plans/legal-compliance/drafts/HEALTH_AND_FITNESS_DISCLAIMER.md, section 2):
 * it still needs attorney review before launch. Bump `disclaimerVersion` when
 * it changes.
 */
export const HEALTH_DISCLAIMER = {
  title: 'Health & Fitness Disclaimer',
  notice: 'Important Safety Notice: General Strength & Conditioning Guidance Only',
  sections: [
    {
      heading: 'Not Medical Advice or Physical Therapy',
      body: 'All training programs, exercise prescriptions, warm-ups, intensity targets, and educational explanations in Wander Fit are provided strictly for general athletic strength and conditioning education. Wander Fit does not provide medical advice, diagnosis, treatment, or physical therapy, and does not create a doctor-patient or coach-athlete relationship.',
    },
    {
      heading: 'Medical Clearance Required',
      body: 'Always consult a qualified physician or healthcare provider before starting this or any strength, speed, or conditioning program, particularly if you are under 18, are returning from an injury, or have any medical condition, joint pain, heart condition, or health concern.',
    },
    {
      heading: 'Youth Athletes (Ages 14–17)',
      body: "Athletes aged 14–17 must use Wander Fit only with a parent or legal guardian's consent. Because Wander Fit cannot observe your form in person, youth Athletes and anyone new to lifting weights should learn exercise technique under qualified in-person supervision (such as a parent, athletic trainer, or certified strength coach) and start with light, controlled loads.",
    },
    {
      heading: 'Stop Immediately If You Feel Pain or Discomfort',
      body: 'Normal muscle fatigue is different from pain. Stop training immediately and seek medical evaluation if you feel sharp, sudden, or joint pain, dizziness, nausea, chest pain, or unusual shortness of breath.',
    },
    {
      heading: 'Your Responsibility & Assumption of Risk',
      body: 'You are responsible for choosing appropriate weights, verifying equipment safety, maintaining proper technique, and adjusting or skipping any exercise that does not feel safe for your body. Physical training involves inherent risks of injury. By using Wander Fit, you (and your parent or legal guardian if you are 14–17) voluntarily assume those risks as detailed in our Terms of Service.',
    },
  ],
} as const

/** A piece of the acceptance sentence: plain text, or a tappable document. */
export type AcceptancePart = string | { link: LegalPage | 'disclaimer'; text: string }

const TERMS = { link: 'terms', text: 'Terms of Service' } as const
const PRIVACY = { link: 'privacy', text: 'Privacy Policy' } as const
const DISCLAIMER = { link: 'disclaimer', text: 'Health & Fitness Disclaimer' } as const

/**
 * The acceptance sentence. Athletes 14–17 confirm a parent or legal
 * guardian's permission; the wording needs attorney review before public launch.
 */
export function acceptanceParts(ageGroup: AgeGroup | undefined): AcceptancePart[] {
  if (ageGroup === '14-17') {
    return [
      "I have my parent or legal guardian's permission to use WanderFit, and together we agree to the ",
      TERMS,
      ', ',
      PRIVACY,
      ', and ',
      DISCLAIMER,
      '.',
    ]
  }
  return [
    'I agree to the ',
    TERMS,
    ' and ',
    PRIVACY,
    ', and I acknowledge the ',
    DISCLAIMER,
    ' (general strength and conditioning guidance only, not medical advice).',
  ]
}

/** The sentence as one string, for the checkbox's accessibility label. */
export function acceptanceText(ageGroup: AgeGroup | undefined): string {
  return acceptanceParts(ageGroup)
    .map((part) => (typeof part === 'string' ? part : part.text))
    .join('')
}
