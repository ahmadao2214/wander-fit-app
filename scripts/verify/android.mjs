#!/usr/bin/env node
// Android E2E (#83): builds a release APK against the E2E backend and runs the
// native Maestro flows on an Android emulator. Advisory only; never blocks a PR.
//
//   node scripts/verify/android.mjs build          # dist-android/app-release.apk
//   node scripts/verify/android.mjs run [flow...]  # default: every Android flow
//
// The build reads EXPO_PUBLIC_CONVEX_URL_E2E and EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY.
// It never deploys: it uses the backend main last deployed (see run.mjs).
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createPersona,
  deletePersona,
  readPending,
  redactEvidence,
  releasePersonaFile,
  runSuite,
  writePending,
} from './run.mjs'
import { assertConvexUrlAllowed } from './targets.mjs'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const appId = 'com.offseason.asrafit'
export const apkPath = path.join(root, 'dist-android/app-release.apk')
export const evidenceDir = path.join(root, 'e2e-artifacts/android')
const nativeFlowDir = path.join(root, '.maestro/native')

// Each Android flow and the persona it needs. null means no account: the flow
// starts signed out. Seeded modes go through persona create, like the web
// runner. The other native flows join once their setup is automated.
export const ANDROID_FLOWS = {
  'native-launch': null,
  'sign-in': 'onboarded',
}

function fail(message) {
  console.error(`[android] ${message}`)
  process.exit(1)
}

// Pure: the environment the APK is built with. Only the public app config goes
// in; deploy keys and test passwords are stripped so they can't end up in the
// bundle or in Gradle's environment.
export function buildEnv(source = process.env) {
  const convexUrl = (source.EXPO_PUBLIC_CONVEX_URL_E2E || '').trim()
  const clerkKey = (source.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '').trim()
  if (!/^https:\/\/[a-z0-9-]+\.convex\.cloud$/.test(convexUrl)) {
    throw new Error('EXPO_PUBLIC_CONVEX_URL_E2E must be the https://<name>.convex.cloud E2E URL.')
  }
  // Same guard as the web runner: never build against an app deployment.
  assertConvexUrlAllowed(convexUrl)
  if (!/^pk_(test|live)_/.test(clerkKey)) {
    throw new Error('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must be a Clerk publishable key.')
  }
  const env = { ...source, CI: '1', EXPO_NO_DOTENV: '1' }
  for (const name of [
    'CLERK_SECRET_KEY',
    'CONVEX_DEPLOY_KEY',
    'CONVEX_DEPLOY_KEY_E2E',
    'CONVEX_PREVIEW_DEPLOY_KEY_E2E',
    'TEST_USER_PASSWORD',
  ]) {
    delete env[name]
  }
  env.EXPO_PUBLIC_CONVEX_URL = convexUrl
  env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = clerkKey
  return env
}

// Pure: flows to run. Unknown names fail loudly instead of silently passing.
export function selectAndroidFlows(requested = []) {
  const known = Object.keys(ANDROID_FLOWS)
  if (requested.length === 0) return known
  const unknown = requested.filter((flow) => !known.includes(flow))
  if (unknown.length > 0) {
    throw new Error(`Not an Android flow: ${unknown.join(', ')}. Use ${known.join(', ')}.`)
  }
  return [...new Set(requested)]
}

// Pure: the maestro test command for one flow, with its own evidence folder.
// VERIFY_URL=native resolves the `url:` header the shared subflows carry; the
// entry's appId still picks the device driver.
export function maestroArgs(flow, outDir, persona = null) {
  const args = [
    'test',
    '--platform',
    'android',
    '--format',
    'junit',
    '--output',
    path.join(outDir, 'junit.xml'),
    '--test-output-dir',
    outDir,
    '--debug-output',
    path.join(outDir, 'debug'),
    '--flatten-debug-output',
    '-e',
    'VERIFY_URL=native',
  ]
  if (persona) {
    args.push('-e', `PERSONA_EMAIL=${persona.email}`, '-e', `PERSONA_PASSWORD=${persona.password}`)
  }
  args.push(path.join(nativeFlowDir, `${flow}.yaml`))
  return args
}

// Pure: true unless some flow's password scrub failed.
export function evidenceScrubbed(results) {
  return !results.some((result) => /redact failed/.test(result.error || ''))
}

// Same lifecycle as the web runner (runSuite): create the flow's persona,
// drive it, scrub its password from the evidence, delete the account, and
// keep a pending record if any cleanup step fails.
export function androidSuiteSteps(io) {
  return {
    createPersona: (flow) => {
      console.log(`\n== ${flow} (android) ==`)
      const mode = ANDROID_FLOWS[flow]
      return mode ? io.createPersona(mode) : null
    },
    drive: (flow, persona) => io.runMaestro(flow, persona),
    redact: (flow, persona) => io.redact(flow, persona),
    deletePersona: io.deletePersona,
    readPending: io.readPending,
    writePending: io.writePending,
    releasePersona: io.releasePersona,
  }
}

function run(cmd, args, options = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`)
  return spawnSync(cmd, args, { cwd: root, stdio: 'inherit', ...options })
}

function build() {
  let env
  try {
    env = buildEnv()
  } catch (error) {
    fail(error.message)
  }
  console.log(`building Android APK against ${new URL(env.EXPO_PUBLIC_CONVEX_URL).host}`)
  const prebuild = run(
    'npx',
    ['expo', 'prebuild', '--platform', 'android', '--no-install', '--clean'],
    { env }
  )
  if (prebuild.status !== 0) fail(`expo prebuild exited ${prebuild.status ?? 1}`)
  // One ABI keeps the build fast; the CI emulator is x86_64.
  const abi = process.env.ANDROID_ABI || 'x86_64'
  const gradle = run(
    './gradlew',
    ['assembleRelease', `-PreactNativeArchitectures=${abi}`, '--no-daemon'],
    { cwd: path.join(root, 'android'), env }
  )
  if (gradle.status !== 0) fail(`gradle assembleRelease exited ${gradle.status ?? 1}`)
  const built = path.join(root, 'android/app/build/outputs/apk/release/app-release.apk')
  if (!fs.existsSync(built)) fail(`no APK at ${built}`)
  fs.mkdirSync(path.dirname(apkPath), { recursive: true })
  fs.copyFileSync(built, apkPath)
  console.log(`APK: ${path.relative(root, apkPath)}`)
}

function maestroBin() {
  const home = process.env.HOME || ''
  const candidates = [process.env.MAESTRO_BIN, path.join(home, '.maestro/bin/maestro')]
  return candidates.find((file) => file && fs.existsSync(file)) || 'maestro'
}

function runFlows(requested) {
  let flows
  try {
    flows = selectAndroidFlows(requested)
  } catch (error) {
    fail(error.message)
  }
  if (!fs.existsSync(apkPath)) fail(`no APK at ${path.relative(root, apkPath)}; run build first`)
  // A system "isn't responding" dialog would cover the app and fail the flow
  // for a reason that has nothing to do with it. CI only: the emulator is
  // thrown away after the run, while a local device would keep the setting.
  // Android also flashes each typed password character, which the sign-in
  // video would capture; the screenshots and logs are scrubbed, the video can't be.
  if (process.env.CI) {
    run('adb', ['shell', 'settings', 'put', 'global', 'hide_error_dialogs', '1'])
    run('adb', ['shell', 'settings', 'put', 'system', 'show_password', '0'])
  }
  // Start clean, so a stale scrub marker never vouches for this run.
  fs.rmSync(evidenceDir, { recursive: true, force: true })
  const installed = run('adb', ['install', '-r', apkPath])
  if (installed.status !== 0) fail(`adb install exited ${installed.status ?? 1}`)
  const maestro = maestroBin()
  const env = { ...process.env, MAESTRO_CLI_NO_ANALYTICS: '1' }
  delete env.PERSONA_PASSWORD
  const io = {
    createPersona,
    runMaestro: (flow, persona) => {
      const outDir = path.join(evidenceDir, flow)
      fs.rmSync(outDir, { recursive: true, force: true })
      fs.mkdirSync(outDir, { recursive: true })
      if (persona) console.log(`driving ${flow} for ${persona.email}`)
      const result = spawnSync(maestro, maestroArgs(flow, outDir, persona), {
        cwd: root,
        stdio: 'inherit',
        env,
      })
      if (result.status !== 0) throw new Error(`Maestro exited ${result.status ?? 1}`)
    },
    redact: (flow, persona) => redactEvidence(path.join(evidenceDir, flow), persona.password),
    deletePersona,
    readPending,
    writePending,
    releasePersona: (persona) => releasePersonaFile(persona.email),
  }
  const results = runSuite(flows, androidSuiteSteps(io)).map((result) => ({
    ...result,
    platform: 'android',
    artifact: 'e2e-android',
  }))
  fs.mkdirSync(evidenceDir, { recursive: true })
  fs.writeFileSync(path.join(evidenceDir, 'results.json'), `${JSON.stringify(results, null, 2)}\n`)
  // CI uploads the evidence only when this marker exists, like the web runner:
  // a failed password scrub must never be uploaded.
  if (evidenceScrubbed(results)) fs.writeFileSync(path.join(evidenceDir, '.scrubbed'), '')
  for (const result of results) {
    console.log(
      `${result.status === 'passed' ? 'PASS' : 'FAIL'} ${result.flow} (${result.seconds}s)`
    )
  }
  if (results.some((result) => result.status !== 'passed')) process.exit(1)
}

function main() {
  const [command, ...rest] = process.argv.slice(2)
  if (command === 'build') build()
  else if (command === 'run') runFlows(rest)
  else fail('Use build or run [flow...].')
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) main()
