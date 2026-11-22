#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const nodeRequire = createRequire(import.meta.url)

/**
 * Recursively collect files in `dir` matching `predicate`.
 */
export function walkFiles(dir, predicate) {
  if (!fs.existsSync(dir)) return []
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, predicate))
    } else if (entry.isFile() && predicate(fullPath)) {
      results.push(fullPath)
    }
  }
  return results
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TRAILING_DEBUG_ID_LINE_RE = /^\/\/#\s*debugId=([^\s]+)$/
const TRAILING_SOURCEMAP_LINE_RE = /^\/\/[#@]\s*sourceMappingURL=.+$/

/**
 * Extracts a validated UUID from the trailing `//# debugId=` comment footer of
 * a JS bundle. Stops at the first non-directive line from the end so string or
 * template literals in the bundle body can never be mistaken for a Debug ID.
 */
export function extractBundleDebugId(bundleSource) {
  const lines = bundleSource.split(/\r?\n/)
  let found = null

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const trimmed = lines[i].trim()
    if (!trimmed) continue
    if (TRAILING_SOURCEMAP_LINE_RE.test(trimmed)) continue

    const match = trimmed.match(TRAILING_DEBUG_ID_LINE_RE)
    if (match) {
      if (!UUID_RE.test(match[1])) return null
      if (found && found !== match[1]) return null
      found = match[1]
      continue
    }
    break
  }

  return found
}

/**
 * Verifies that exported web bundles and source maps contain matching Sentry Debug IDs.
 */
export function verifyWebDebugIds(outputDir) {
  const mapFiles = walkFiles(outputDir, (f) => f.endsWith('.js.map'))
  if (mapFiles.length === 0) {
    return {
      ok: false,
      checked: 0,
      matched: 0,
      reason: `No .js.map files found in ${outputDir}. Ensure expo export ran with --source-maps.`,
    }
  }

  let matched = 0
  const missing = []

  for (const mapFile of mapFiles) {
    const bundleFile = mapFile.slice(0, -'.map'.length)
    let debugId = null
    try {
      const parsed = JSON.parse(fs.readFileSync(mapFile, 'utf8'))
      debugId = parsed.debugId || parsed.debug_id || null
    } catch {
      missing.push(path.relative(outputDir, mapFile))
      continue
    }

    if (!debugId || typeof debugId !== 'string' || !UUID_RE.test(debugId)) {
      missing.push(path.relative(outputDir, mapFile))
      continue
    }

    if (!fs.existsSync(bundleFile)) {
      missing.push(path.relative(outputDir, bundleFile))
      continue
    }

    const bundleSource = fs.readFileSync(bundleFile, 'utf8')
    const bundleDebugId = extractBundleDebugId(bundleSource)

    if (bundleDebugId === debugId) {
      matched += 1
    } else {
      missing.push(path.relative(outputDir, bundleFile))
    }
  }

  return {
    ok: matched > 0 && missing.length === 0,
    checked: mapFiles.length,
    matched,
    missing,
    reason:
      matched === 0
        ? 'No Sentry Debug IDs found in exported web bundles. Check metro.config.js uses getSentryExpoConfig.'
        : missing.length > 0
          ? `Missing Sentry Debug ID in: ${missing.join(', ')}`
          : null,
  }
}

/**
 * Loads build-time Sentry env vars from `.env`, `.env.local`, and
 * `.env.sentry-build-plugin` (matching `@sentry/expo-upload-sourcemaps`) without
 * mutating `process.env`. Explicit env vars in `baseEnv` take precedence.
 */
export function loadSentryBuildEnv(cwd = process.cwd(), baseEnv = process.env) {
  const merged = { ...baseEnv }
  const dotenv = nodeRequire('dotenv')
  const envFiles = ['.env.sentry-build-plugin', '.env.local', '.env']

  for (const filename of envFiles) {
    const filePath = path.join(cwd, filename)
    if (!fs.existsSync(filePath)) continue
    try {
      const parsed = dotenv.parse(fs.readFileSync(filePath, 'utf8'))
      for (const [key, value] of Object.entries(parsed)) {
        if (!merged[key]) {
          merged[key] = value
        }
      }
    } catch {
      // Ignore unreadable local env file; explicit env or uploader will report details
    }
  }

  return merged
}

/**
 * Determines whether source maps should be uploaded to Sentry based on build env vars.
 */
export function resolveUploadDecision(env = process.env) {
  if (env.SENTRY_DISABLE_AUTO_UPLOAD === 'true') {
    return {
      shouldUpload: false,
      missingVars: [],
      reason: 'SENTRY_DISABLE_AUTO_UPLOAD=true',
    }
  }

  const project = env.SENTRY_WEB_PROJECT?.trim() || env.SENTRY_PROJECT?.trim() || ''
  const org = env.SENTRY_ORG?.trim() || ''
  const authToken = env.SENTRY_AUTH_TOKEN?.trim() || ''

  const missingVars = []
  if (!authToken) missingVars.push('SENTRY_AUTH_TOKEN')
  if (!org) missingVars.push('SENTRY_ORG')
  if (!project) missingVars.push('SENTRY_PROJECT (or SENTRY_WEB_PROJECT)')

  if (missingVars.length > 0) {
    return {
      shouldUpload: false,
      missingVars,
      reason: `Missing build credentials: ${missingVars.join(', ')}`,
    }
  }

  return {
    shouldUpload: true,
    missingVars: [],
    org,
    project,
    url: env.SENTRY_URL?.trim() || 'https://sentry.io/',
    reason: null,
  }
}

/**
 * Deletes every `.map` file under `outputDir` so raw source maps are not hosted
 * publicly on Cloudflare Pages after uploading to Sentry.
 */
export function stripSourceMaps(outputDir) {
  const mapFiles = walkFiles(outputDir, (f) => f.endsWith('.map'))
  for (const mapFile of mapFiles) {
    fs.unlinkSync(mapFile)
  }
  return mapFiles.length
}

export function parseArgs(argv) {
  let outputDir = 'dist'
  let skipExport = false
  let keepSourceMaps = false
  let requireSentryUpload = false

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--output-dir' && argv[i + 1]) {
      outputDir = argv[i + 1]
      i += 1
    } else if (arg === '--skip-export') {
      skipExport = true
    } else if (arg === '--keep-source-maps') {
      keepSourceMaps = true
    } else if (arg === '--require-sentry-upload') {
      requireSentryUpload = true
    }
  }

  return { outputDir, skipExport, keepSourceMaps, requireSentryUpload }
}

function resolveBin(pkgJsonName, binKey, searchFromPkg) {
  const resolveOpts = searchFromPkg
    ? { paths: [path.dirname(nodeRequire.resolve(searchFromPkg))] }
    : undefined
  const pkgPath = nodeRequire.resolve(pkgJsonName, resolveOpts)
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const rel = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin[binKey]
  return path.resolve(path.dirname(pkgPath), rel)
}

/**
 * Uploads web source maps directly via `@sentry/cli` using the resolved
 * destination (`org`, `project`, `url`) so `.env.sentry-build-plugin` is not
 * reloaded and cannot overwrite `SENTRY_WEB_PROJECT`.
 */
export function uploadWebSourceMaps(outputDir, upload, buildEnv, runner = runOrExit) {
  const sentryCliBin = resolveBin(
    '@sentry/cli/package.json',
    'sentry-cli',
    '@sentry/react-native/package.json'
  )
  const args = [
    sentryCliBin,
    '--url',
    upload.url,
    'sourcemaps',
    'upload',
    '--org',
    upload.org,
    '--project',
    upload.project,
    '--strict',
    outputDir,
  ]
  const env = {
    ...buildEnv,
    SENTRY_ORG: upload.org,
    SENTRY_PROJECT: upload.project,
    SENTRY_URL: upload.url,
  }
  runner(process.execPath, args, env)
}

function runOrExit(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env,
  })
  if (result.error) {
    console.error(`Command failed: ${command}`, result.error)
    process.exit(1)
  }
  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

export function main(argv = process.argv.slice(2)) {
  const { outputDir, skipExport, keepSourceMaps, requireSentryUpload } = parseArgs(argv)
  const resolvedOut = path.resolve(process.cwd(), outputDir)

  if (!skipExport) {
    const expoBin = resolveBin('expo/package.json', 'expo')
    console.log(`[build:web] Exporting web bundle with source maps to ${outputDir}...`)
    runOrExit(process.execPath, [
      expoBin,
      'export',
      '--platform',
      'web',
      '--source-maps',
      '--output-dir',
      outputDir,
    ])
  }

  const debugCheck = verifyWebDebugIds(resolvedOut)
  if (!debugCheck.ok) {
    console.error(`[build:web] Sentry Debug ID verification failed: ${debugCheck.reason}`)
    process.exit(1)
  }
  console.log(
    `[build:web] Verified Sentry Debug IDs on ${debugCheck.matched}/${debugCheck.checked} web bundle(s).`
  )

  const buildEnv = loadSentryBuildEnv(process.cwd(), process.env)
  const upload = resolveUploadDecision(buildEnv)
  if (upload.shouldUpload) {
    console.log(
      `[build:web] Uploading web source maps to Sentry (${upload.org}/${upload.project})...`
    )
    uploadWebSourceMaps(outputDir, upload, buildEnv)
  } else if (requireSentryUpload) {
    console.error(`[build:web] Sentry upload required but skipped: ${upload.reason}`)
    process.exit(1)
  } else {
    console.log(`[build:web] Skipping Sentry source map upload (${upload.reason}).`)
  }

  if (!keepSourceMaps) {
    const removed = stripSourceMaps(resolvedOut)
    console.log(`[build:web] Removed ${removed} public .map file(s) from ${outputDir}.`)
  }
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  main()
}
