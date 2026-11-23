/**
 * Public legal and support pages, and the versions of the documents an
 * athlete agrees to. Changing the domain is one env var (or the default here).
 */

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
 * The full Health & Fitness Disclaimer shown in App Settings. Working draft
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
