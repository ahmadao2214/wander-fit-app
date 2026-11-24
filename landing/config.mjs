/**
 * Single configuration object for the WanderFit Beta On-Ramp access channels.
 *
 * Flip any channel live by setting its `url` to a valid HTTPS link.
 * Channels with an empty `url` automatically degrade to a clean "Coming soon"
 * state in the Beta Access Panel so launch is never blocked on one platform.
 */
export const ACCESS_CONFIG = {
  /** Public landing page origin (used for flyer QR generation; falls back to location.origin). */
  landingUrl: '',

  channels: {
    ios: {
      id: 'ios',
      platform: 'iPhone',
      label: 'iOS Beta (TestFlight)',
      cta: 'Open TestFlight Invite',
      url: 'https://testflight.apple.com/join/S2DahGvr',
      comingSoonNote:
        'TestFlight invite link is being finalized. We will email it as soon as it is live.',
      steps: [
        'Install Apple TestFlight free from the App Store.',
        'Tap the WanderFit invite link (or scan the QR code on desktop).',
        'Open WanderFit and complete your First Run to see your program.',
      ],
    },
    web: {
      id: 'web',
      platform: 'Browser',
      label: 'Mobile Web (No Install)',
      cta: 'Open Web App',
      url: 'https://wanderfit-web-beta.vercel.app',
      comingSoonNote:
        'Hosted mobile web access is coming online shortly. We will email you the link.',
      steps: [
        'Open the WanderFit web link in Safari or Chrome on your phone.',
        'Answer your First Run questions to build your 3-phase program.',
        'Optional: tap Share -> Add to Home Screen for an app-like icon.',
      ],
    },
    android: {
      id: 'android',
      platform: 'Android',
      label: 'Android Beta',
      cta: 'Download Android Beta',
      // EAS preview build 8 (main 115eb9c, 2026-11-24). Replace it after each new Android preview build.
      url: 'https://expo.dev/artifacts/eas/cqHwNxYbh3F75mEGxjFcihrRyGuuOCdYb44OX9eLNTY.apk',
      comingSoonNote:
        'Android preview is coming shortly. You are on the list and we will email your link.',
      steps: [
        'Open the Android beta link on your phone.',
        'Follow the install prompt for the preview build.',
        'Open WanderFit and complete your First Run.',
      ],
    },
  },
}

export function isChannelLive(channel) {
  return Boolean(
    channel && typeof channel.url === 'string' && /^https?:\/\//i.test(channel.url.trim())
  )
}
