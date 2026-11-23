import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')
const readJson = (relPath: string) => JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'))

describe('store release config (app.json)', () => {
  const { expo } = readJson('app.json')

  it('shows WanderFit and keeps the store identities', () => {
    expect(expo.name).toBe('WanderFit')
    expect(expo.slug).toBe('asra-fit')
    expect(expo.scheme).toBe('wanderfit')
    expect(expo.ios.bundleIdentifier).toBe('com.offseason.asrafit')
    expect(expo.android.package).toBe('com.offseason.asrafit')
    expect(expo.extra.eas.projectId).toBe('3f1a7f59-77a5-4ed1-a412-1b3b6099b9d5')
  })

  it('turns on Sign in with Apple', () => {
    expect(expo.ios.usesAppleSignIn).toBe(true)
  })

  it('declares no tracking in the privacy manifest', () => {
    const manifest = expo.ios.privacyManifests
    expect(manifest.NSPrivacyTracking).toBe(false)
    expect(manifest.NSPrivacyTrackingDomains).toEqual([])
    const tracked = manifest.NSPrivacyCollectedDataTypes.filter(
      (type: { NSPrivacyCollectedDataTypeTracking: boolean }) =>
        type.NSPrivacyCollectedDataTypeTracking
    )
    expect(tracked).toEqual([])
  })

  it('lists the collected data types and required-reason APIs', () => {
    const manifest = expo.ios.privacyManifests
    expect(
      manifest.NSPrivacyCollectedDataTypes.map(
        (type: { NSPrivacyCollectedDataType: string }) => type.NSPrivacyCollectedDataType
      )
    ).toEqual([
      'NSPrivacyCollectedDataTypeName',
      'NSPrivacyCollectedDataTypeEmailAddress',
      'NSPrivacyCollectedDataTypeUserID',
      'NSPrivacyCollectedDataTypeFitness',
    ])
    expect(
      Object.fromEntries(
        manifest.NSPrivacyAccessedAPITypes.map(
          (api: {
            NSPrivacyAccessedAPIType: string
            NSPrivacyAccessedAPITypeReasons: string[]
          }) => [api.NSPrivacyAccessedAPIType, api.NSPrivacyAccessedAPITypeReasons]
        )
      )
    ).toEqual({
      NSPrivacyAccessedAPICategoryUserDefaults: ['CA92.1'],
      NSPrivacyAccessedAPICategoryFileTimestamp: ['C617.1'],
      NSPrivacyAccessedAPICategorySystemBootTime: ['35F9.1'],
      NSPrivacyAccessedAPICategoryDiskSpace: ['E174.1'],
    })
  })

  it('blocks the Android permissions the app never uses', () => {
    expect(expo.android.blockedPermissions).toEqual([
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ])
  })
})

describe('EAS build env (eas.json)', () => {
  const { build } = readJson('eas.json')

  it('points preview and production at the production Convex deployment', () => {
    expect(build.preview.env.EXPO_PUBLIC_CONVEX_URL).toBe('https://fleet-mallard-22.convex.cloud')
    expect(build.production.env.EXPO_PUBLIC_CONVEX_URL).toBe(
      'https://fleet-mallard-22.convex.cloud'
    )
  })

  it('uses only Clerk publishable keys, never a secret key', () => {
    for (const profile of ['preview', 'production']) {
      const env = build[profile].env as Record<string, string>
      expect(env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY).toMatch(/^pk_(test|live)_/)
      const secrets = Object.values(env).filter((value) => /^sk_|^whsec_/.test(value))
      expect(secrets).toEqual([])
    }
  })
})
