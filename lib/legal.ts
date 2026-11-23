/**
 * Terms, Privacy and the Health & Fitness Disclaimer, as the First Run's
 * acceptance checkbox shows them. Pure, so the copy and URLs are testable.
 */
import type { AgeGroup } from '../types'

/**
 * The Terms of Service and Privacy Policy version an athlete accepts. Bump it
 * when either document changes in a way athletes must accept again.
 */
export const TERMS_VERSION = '2026-11-22'

const DEFAULT_SITE_URL = 'https://wanderfit.app'

export type LegalPage = 'terms' | 'privacy'

/** The hosted page, on EXPO_PUBLIC_SITE_URL when it's set. */
export function legalUrl(page: LegalPage, siteUrl = process.env.EXPO_PUBLIC_SITE_URL): string {
  const base = siteUrl?.trim().replace(/\/+$/, '') || DEFAULT_SITE_URL
  return `${base}/${page}`
}

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

/** The Health & Fitness Disclaimer, shown in the app. Needs attorney review. */
export const HEALTH_DISCLAIMER: readonly string[] = [
  'WanderFit provides general athletic strength and conditioning guidance. It is not medical advice, diagnosis, treatment, or physical therapy.',
  'Talk with a doctor before you start a new training program, especially if you have an injury or a health condition, or have been told to limit exercise.',
  'Stop training and get medical help if you feel pain, dizziness, chest pain, or shortness of breath beyond normal effort.',
  'Strength and conditioning training carries a risk of injury. Choose loads you can control with good form.',
  "Athletes aged 14–17 train with a parent or legal guardian's permission, and with an adult nearby when lifting heavy.",
]
