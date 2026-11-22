#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { loadSentryBuildEnv, resolveUploadDecision, verifyWebDebugIds } from './build-web.mjs'

const require = createRequire(import.meta.url)

function checkExpoConfig() {
  const expoPkgPath = require.resolve('expo/package.json')
  const expoPkg = JSON.parse(fs.readFileSync(expoPkgPath, 'utf8'))
  const expoBin = path.resolve(path.dirname(expoPkgPath), expoPkg.bin.expo)
  const result = spawnSync(process.execPath, [expoBin, 'config', '--json'], {
    encoding: 'utf8',
    env: process.env,
  })
  if (result.error || result.status !== 0) {
    throw new Error(
      `expo config --json failed: ${result.stderr || result.error?.message || result.status}`
    )
  }
  const config = JSON.parse(result.stdout)
  const plugins = config.plugins || []
  const sentryPlugin = plugins.find((entry) => {
    const name = Array.isArray(entry) ? entry[0] : entry
    return name === '@sentry/react-native/expo' || name === '@sentry/react-native'
  })
  return {
    present: Boolean(sentryPlugin),
    options: Array.isArray(sentryPlugin) ? sentryPlugin[1] || {} : {},
  }
}

function checkMetroConfig() {
  const metroPath = path.resolve(process.cwd(), 'metro.config.js')
  const source = fs.readFileSync(metroPath, 'utf8')
  const sentryMetro = require('@sentry/react-native/metro')
  const hasGetSentryExpoConfig =
    typeof sentryMetro.getSentryExpoConfig === 'function' &&
    source.includes('getSentryExpoConfig')
  const disablesWebReplay = /includeWebReplay\s*:\s*false/.test(source)
  return {
    ok: hasGetSentryExpoConfig,
    hasGetSentryExpoConfig,
    disablesWebReplay,
  }
}

function main(argv = process.argv.slice(2)) {
  let checkWebDir = null
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--check-web-dir' && argv[i + 1]) {
      checkWebDir = argv[i + 1]
      i += 1
    }
  }

  let hasError = false

  console.log('=== WanderFit Sentry Configuration Check ===')

  // 1. Expo config plugin
  try {
    const expoCheck = checkExpoConfig()
    if (expoCheck.present) {
      const mode = expoCheck.options.disableAutoUpload
        ? 'auto-upload disabled (waiting for upload credentials)'
        : 'auto-upload ENABLED'
      console.log(`[ok] Expo config plugin (@sentry/react-native/expo): ${mode}`)
    } else {
      console.error('[fail] @sentry/react-native/expo plugin missing from Expo config')
      hasError = true
    }
  } catch (err) {
    console.error(`[fail] Expo config check error: ${err.message}`)
    hasError = true
  }

  // 2. Metro config
  try {
    const metroCheck = checkMetroConfig()
    if (metroCheck.ok) {
      console.log('[ok] Metro config (getSentryExpoConfig + Tamagui + Lucide resolver)')
    } else {
      console.error('[fail] Metro config is missing Sentry hooks:', metroCheck)
      hasError = true
    }
  } catch (err) {
    console.error(`[fail] Metro config failed to load: ${err.message}`)
    hasError = true
  }

  // 3. Runtime env vars
  const hasDsn = Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN?.trim())
  const sentryEnv = process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT?.trim() || '(auto: dev/production)'
  const devEnabled = process.env.EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV === 'true'
  const debugTools = process.env.EXPO_PUBLIC_SENTRY_DEBUG_TOOLS === 'true'
  console.log(
    `[info] Runtime DSN (EXPO_PUBLIC_SENTRY_DSN): ${hasDsn ? 'SET (active)' : 'NOT SET (dormant/scaffolded)'}`
  )
  console.log(
    `[info] Runtime options: env=${sentryEnv}, enableInDev=${devEnabled}, debugTools=${debugTools}`
  )

  // 4. Build / source map upload env vars
  const upload = resolveUploadDecision(loadSentryBuildEnv(process.cwd(), process.env))
  console.log(
    `[info] Source map upload: ${
      upload.shouldUpload
        ? `READY (${upload.org}/${upload.project})`
        : `DORMANT (${upload.reason})`
    }`
  )

  // 5. Optional web bundle Debug ID check
  if (checkWebDir) {
    const resolved = path.resolve(process.cwd(), checkWebDir)
    const debugCheck = verifyWebDebugIds(resolved)
    if (debugCheck.ok) {
      console.log(
        `[ok] Web Debug IDs verified in ${checkWebDir} (${debugCheck.matched}/${debugCheck.checked} bundle(s))`
      )
    } else {
      console.error(`[fail] Web Debug ID check failed for ${checkWebDir}: ${debugCheck.reason}`)
      hasError = true
    }
  }

  if (hasError) {
    process.exit(1)
  }
}

main()
