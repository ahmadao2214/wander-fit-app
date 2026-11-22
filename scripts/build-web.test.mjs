import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  extractBundleDebugId,
  loadSentryBuildEnv,
  parseArgs,
  resolveUploadDecision,
  stripSourceMaps,
  uploadWebSourceMaps,
  verifyWebDebugIds,
} from './build-web.mjs'

describe('scripts/build-web.mjs helpers', () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wanderfit-web-build-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('parses CLI options cleanly', () => {
    expect(parseArgs([])).toEqual({
      outputDir: 'dist',
      skipExport: false,
      keepSourceMaps: false,
      requireSentryUpload: false,
    })
    expect(
      parseArgs([
        '--output-dir',
        'dist-web',
        '--skip-export',
        '--keep-source-maps',
        '--require-sentry-upload',
      ])
    ).toEqual({
      outputDir: 'dist-web',
      skipExport: true,
      keepSourceMaps: true,
      requireSentryUpload: true,
    })
  })

  it('skips source map upload cleanly when credentials are absent or disabled', () => {
    const missing = resolveUploadDecision({})
    expect(missing.shouldUpload).toBe(false)
    expect(missing.missingVars).toEqual([
      'SENTRY_AUTH_TOKEN',
      'SENTRY_ORG',
      'SENTRY_PROJECT (or SENTRY_WEB_PROJECT)',
    ])

    const disabled = resolveUploadDecision({
      SENTRY_AUTH_TOKEN: 'sntrys_abc',
      SENTRY_ORG: 'wanderfit',
      SENTRY_PROJECT: 'wander-fit-app',
      SENTRY_DISABLE_AUTO_UPLOAD: 'true',
    })
    expect(disabled.shouldUpload).toBe(false)
    expect(disabled.reason).toBe('SENTRY_DISABLE_AUTO_UPLOAD=true')
  })

  it('enables upload when credentials are set and prefers SENTRY_WEB_PROJECT over SENTRY_PROJECT', () => {
    const ready = resolveUploadDecision({
      SENTRY_AUTH_TOKEN: 'sntrys_abc',
      SENTRY_ORG: 'wanderfit',
      SENTRY_PROJECT: 'wander-fit-mobile',
      SENTRY_WEB_PROJECT: 'wander-fit-web',
    })
    expect(ready).toEqual({
      shouldUpload: true,
      missingVars: [],
      org: 'wanderfit',
      project: 'wander-fit-web',
      url: 'https://sentry.io/',
      reason: null,
    })
  })

  it('verifies Sentry Debug IDs on exported JS bundles and maps, then strips .map files', () => {
    const jsDir = path.join(tmpDir, '_expo', 'static', 'js', 'web')
    fs.mkdirSync(jsDir, { recursive: true })
    const debugId = '11111111-2222-3333-4444-555555555555'
    const jsFile = path.join(jsDir, 'entry-abc123.js')
    const mapFile = `${jsFile}.map`

    fs.writeFileSync(
      jsFile,
      `var _sentryDebugIds={};\n//# debugId=${debugId}\n//# sourceMappingURL=entry-abc123.js.map\n`
    )
    fs.writeFileSync(mapFile, JSON.stringify({ version: 3, debugId }))

    const okResult = verifyWebDebugIds(tmpDir)
    expect(okResult.ok).toBe(true)
    expect(okResult.matched).toBe(1)

    const removed = stripSourceMaps(tmpDir)
    expect(removed).toBe(1)
    expect(fs.existsSync(mapFile)).toBe(false)
    expect(fs.existsSync(jsFile)).toBe(true)
  })

  it('fails Debug ID verification when a map lacks debugId or bundle has a mismatched ID', () => {
    const jsFile = path.join(tmpDir, 'entry.js')
    const mapFile = `${jsFile}.map`
    fs.writeFileSync(jsFile, 'console.log("hello")')
    fs.writeFileSync(mapFile, JSON.stringify({ version: 3 }))

    const missingResult = verifyWebDebugIds(tmpDir)
    expect(missingResult.ok).toBe(false)
    expect(missingResult.matched).toBe(0)

    // Bundle declares a different //# debugId= even if the map's ID appears in arbitrary string text
    fs.writeFileSync(
      jsFile,
      'const note = "11111111-2222-3333-4444-555555555555";\n//# debugId=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\n'
    )
    fs.writeFileSync(
      mapFile,
      JSON.stringify({ version: 3, debugId: '11111111-2222-3333-4444-555555555555' })
    )

    expect(extractBundleDebugId(fs.readFileSync(jsFile, 'utf8'))).toBe(
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    )
    const mismatchResult = verifyWebDebugIds(tmpDir)
    expect(mismatchResult.ok).toBe(false)
    expect(mismatchResult.matched).toBe(0)
    expect(mismatchResult.missing).toEqual(['entry.js'])

    // Rejects debugId markers inside JS string literals or template literals
    const validUuid = '11111111-2222-3333-4444-555555555555'
    expect(
      extractBundleDebugId(`const fake = "//# debugId=${validUuid}";\nconsole.log(fake);\n`)
    ).toBeNull()
    expect(
      extractBundleDebugId(`const tpl = \`\n//# debugId=${validUuid}\n\`;\n`)
    ).toBeNull()
    expect(
      extractBundleDebugId(`const fakeAssign = '_sentryDebugIds[x]="${validUuid}"';\n`)
    ).toBeNull()

    // Rejects non-UUID debugId values like "deadbeef" in both bundle and map
    fs.writeFileSync(jsFile, 'console.log(1);\n//# debugId=deadbeef\n')
    fs.writeFileSync(mapFile, JSON.stringify({ version: 3, debugId: 'deadbeef' }))
    expect(extractBundleDebugId(fs.readFileSync(jsFile, 'utf8'))).toBeNull()
    expect(verifyWebDebugIds(tmpDir).ok).toBe(false)
  })

  it('loads local Sentry credentials from .env.sentry-build-plugin and passes SENTRY_WEB_PROJECT directly to sentry-cli', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.env.sentry-build-plugin'),
      'SENTRY_AUTH_TOKEN=sntrys_local_token\nSENTRY_ORG=wanderfit\nSENTRY_PROJECT=wander-fit-native\n'
    )

    const loaded = loadSentryBuildEnv(tmpDir, { SENTRY_WEB_PROJECT: 'wander-fit-web' })
    const decision = resolveUploadDecision(loaded)
    expect(decision).toEqual({
      shouldUpload: true,
      missingVars: [],
      org: 'wanderfit',
      project: 'wander-fit-web',
      url: 'https://sentry.io/',
      reason: null,
    })

    // Hand off directly to sentry-cli (which does not reload .env.sentry-build-plugin)
    const calls = []
    uploadWebSourceMaps('dist', decision, loaded, (cmd, args, env) => {
      calls.push({ cmd, args, env })
    })
    expect(calls).toHaveLength(1)
    expect(calls[0].args[0]).toContain('sentry-cli')
    expect(calls[0].args[0]).not.toContain('expo-upload-sourcemaps')
    expect(calls[0].args.slice(1)).toEqual([
      '--url',
      'https://sentry.io/',
      'sourcemaps',
      'upload',
      '--org',
      'wanderfit',
      '--project',
      'wander-fit-web',
      '--strict',
      'dist',
    ])
    expect(calls[0].env.SENTRY_AUTH_TOKEN).toBe('sntrys_local_token')
    expect(calls[0].env.SENTRY_PROJECT).toBe('wander-fit-web')
  })
})
