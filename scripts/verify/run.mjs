#!/usr/bin/env node
// Local web tracer. Same command runs in CI: export, serve, Maestro, keep evidence.
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BLOCKED_CONVEX_HOSTS,
  PLACEHOLDER_CONVEX_URL,
  assertConvexUrlAllowed,
  assertPreviewKey,
  convexHost,
  previewName,
} from './targets.mjs'
import {
  balanceShards,
  defaultFlows,
  artifactName,
  artifactsDir,
  evidenceDirFor,
  listWebFlows,
  pendingFile,
  personaFile,
  personaMode,
  resultsFile,
  root,
  selectAffectedFlows,
  webFlowFile,
} from './flows.mjs'
import {
  convexInvocation,
  generatePassword,
  parseRunResult,
  signupEmail,
  writeCredentials,
} from './persona.mjs'

const distDir = path.join(root, 'dist-verify')
// The signed-out screen check. It is not a journey, so it is not under .maestro/web.
const screenFlow = '.maestro/sign-in-screen.yaml'
const screenEvidenceDir = evidenceDirFor('sign-in-screen')
// Files the Convex CLI may rewrite. Deploy restores them afterwards.
const guardedFiles = ['.env', '.env.local', '.gitignore']
// Tests set these so cleanup does not kill a live server.
const stateFile = process.env.VERIFY_STATE_FILE || '/tmp/wander-fit-verify.json'
const readyFile = process.env.VERIFY_READY_FILE || '/tmp/wander-fit-verify.ready'
const logFile = process.env.VERIFY_LOG_FILE || '/tmp/wander-fit-verify.log'
const port = Number(process.env.VERIFY_PORT || 4173)

function readDotenv(file) {
  if (!fs.existsSync(file)) return {}
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[match[1]] = value
  }
  return out
}

function clerkKey() {
  if (process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
  }
  for (const name of ['.env.local', '.env']) {
    const value = readDotenv(path.join(root, name)).EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
    if (value) return value
  }
  return ''
}

function e2eUrl() {
  // An explicit empty variable means "not configured", including in CI.
  // Fall back to .env.e2e only when the variable is unset.
  if (process.env.EXPO_PUBLIC_CONVEX_URL_E2E !== undefined) {
    return process.env.EXPO_PUBLIC_CONVEX_URL_E2E.trim()
  }
  return readDotenv(path.join(root, '.env.e2e')).EXPO_PUBLIC_CONVEX_URL_E2E || ''
}

function convexUrl() {
  const configured = e2eUrl()
  if (!configured) return PLACEHOLDER_CONVEX_URL
  assertConvexUrlAllowed(configured)
  return configured
}

function submitMode() {
  return convexHost(convexUrl()) !== convexHost(PLACEHOLDER_CONVEX_URL)
}

function maestroBin() {
  const home = process.env.HOME || ''
  const candidates = [process.env.MAESTRO_BIN, path.join(home, '.maestro/bin/maestro')].filter(
    Boolean
  )
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  const which = spawnSync('bash', ['-lc', 'command -v maestro'], { encoding: 'utf8' })
  if (which.status === 0 && which.stdout.trim()) return which.stdout.trim()
  return ''
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

// A Clerk publishable key is pk_test_ or pk_live_ plus base64 of the
// Frontend API host and a trailing "$". Anything else never loads Clerk.
export function clerkFrontendApi(key) {
  const match = /^pk_(test|live)_([A-Za-z0-9+/=_-]+)$/.exec(String(key || '').trim())
  if (!match) return ''
  let decoded = ''
  try {
    decoded = Buffer.from(match[2], 'base64').toString('utf8')
  } catch {
    return ''
  }
  if (!decoded.endsWith('$')) return ''
  const host = decoded.slice(0, -1)
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host) ? host : ''
}

function git(args) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  return result.status === 0 ? result.stdout : ''
}

function gitCommit() {
  return git(['rev-parse', 'HEAD']).trim()
}

// What the export was built from: HEAD plus any uncommitted or untracked
// change, so an agent verifying an edit it has not committed never drives an
// older bundle. Gitignored output (dist-verify/, e2e-artifacts/) is left out.
export function sourceStamp({
  commit,
  diff,
  untracked,
  read = (file) => fs.readFileSync(path.join(root, file)),
}) {
  const hash = createHash('sha256').update(`${commit}\n`).update(diff)
  for (const file of untracked.split('\n').filter(Boolean).sort()) {
    hash.update(`\0${file}\0`)
    try {
      hash.update(read(file))
    } catch {
      hash.update('missing')
    }
  }
  return hash.digest('hex').slice(0, 16)
}

// Tracked files the web export itself rewrites (Metro regenerates the Tamagui
// stylesheet). They are output, not source: stamping them would make every
// export look changed while it ran, and a restored copy look like an edit.
export const EXPORT_WRITES = ['tamagui-web.css']

export function stampDiffArgs() {
  return [
    'diff',
    'HEAD',
    '--binary',
    '--',
    '.',
    ...EXPORT_WRITES.map((file) => `:(exclude)${file}`),
  ]
}

function currentStamp() {
  return sourceStamp({
    commit: gitCommit(),
    diff: git(stampDiffArgs()),
    untracked: git(['ls-files', '--others', '--exclude-standard']),
  })
}

// Doctor's network probes. Each returns facts, never throws, and never sends
// a credential: the Convex queries are public and the Clerk call is the
// browser's own unauthenticated environment fetch.
async function probe(url, init = {}) {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) })
    const text = await response.text()
    return { status: response.status, text }
  } catch (error) {
    return { status: 0, text: '', error: error?.cause?.code || error?.message || String(error) }
  }
}

async function convexQuery(url, name) {
  const result = await probe(`${url.replace(/\/$/, '')}/api/query`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: name, args: {}, format: 'json' }),
  })
  try {
    const parsed = JSON.parse(result.text)
    return parsed.status === 'success'
      ? { ok: true, value: parsed.value }
      : { ok: false, error: parsed.errorMessage || 'query failed' }
  } catch {
    return { ok: false, error: result.error || `HTTP ${result.status}` }
  }
}

function readServerState() {
  if (!fs.existsSync(stateFile)) return null
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'))
  } catch {
    return { pid: 0 }
  }
}

function pidAlive(pid) {
  if (!(Number(pid) > 0)) return false
  try {
    process.kill(Number(pid), 0)
    return true
  } catch {
    return false
  }
}

async function gatherDoctorFacts({ server }) {
  const key = clerkKey()
  const facts = {
    clerkKeyPresent: Boolean(key),
    clerkFrontendApi: clerkFrontendApi(key),
    clerkStatus: null,
    maestro: maestroBin(),
    java: spawnSync('java', ['-version'], { encoding: 'utf8' }).status === 0,
    convexHost: '',
    convexError: '',
    screenOnly: false,
    backendStatus: null,
    templates: null,
    sports: null,
    seedError: '',
    expectedCommit: gitCommit(),
    expectedStamp: currentStamp(),
    server: null,
    port,
  }
  let url = ''
  try {
    url = convexUrl()
    facts.convexHost = convexHost(url)
    facts.screenOnly = facts.convexHost === convexHost(PLACEHOLDER_CONVEX_URL)
  } catch (error) {
    facts.convexError = error.message
  }
  if (facts.clerkFrontendApi) {
    facts.clerkStatus = (await probe(`https://${facts.clerkFrontendApi}/v1/environment`)).status
  }
  if (url && !facts.screenOnly) {
    facts.backendStatus = (await probe(`${url.replace(/\/$/, '')}/version`)).status
    const templates = await convexQuery(url, 'programTemplates:seedStatus')
    const sports = await convexQuery(url, 'sports:list')
    if (templates.ok) facts.templates = templates.value?.hasTemplates === true
    if (sports.ok) facts.sports = Array.isArray(sports.value) ? sports.value.length : 0
    facts.seedError = [templates, sports]
      .filter((r) => !r.ok)
      .map((r) => r.error)
      .join('; ')
  }
  if (server) {
    const state = readServerState()
    if (state) {
      const ready = fs.existsSync(readyFile) ? fs.readFileSync(readyFile, 'utf8') : ''
      const page = await probe(verifyUrl())
      const build = await probe(`${verifyUrl()}verify-build.json`)
      let buildInfo = null
      try {
        buildInfo = JSON.parse(build.text)
      } catch {
        buildInfo = null
      }
      facts.server = {
        pid: state.pid,
        port: state.port,
        alive: pidAlive(state.pid),
        owned: ownServerReady(ready, state.pid),
        pageStatus: page.status,
        build: buildInfo,
      }
    }
  }
  return facts
}

// Pure: turns the gathered facts into report lines and problems. A screen-only
// run (no e2e URL) skips the backend and seed checks. A server is checked only
// when this checkout's launch recorded one.
export function evaluateDoctor(facts) {
  const lines = []
  const problems = []
  lines.push(`clerk publishable key: ${facts.clerkKeyPresent ? 'present' : 'missing'}`)
  if (!facts.clerkKeyPresent) {
    problems.push(
      'Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. The sign-in screen stays on Loading without it.'
    )
  } else if (!facts.clerkFrontendApi) {
    problems.push(
      'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not a valid Clerk publishable key (pk_test_/pk_live_ + encoded Frontend API host).'
    )
  } else {
    lines.push(
      `clerk frontend api: ${facts.clerkStatus === 200 ? 'reachable' : `HTTP ${facts.clerkStatus}`}`
    )
    if (facts.clerkStatus !== 200) {
      problems.push(
        `Clerk rejected the publishable key or is unreachable (environment returned ${facts.clerkStatus || 'no response'}).`
      )
    }
  }
  lines.push(`maestro: ${facts.maestro || 'missing'}`)
  if (!facts.maestro) {
    problems.push('Maestro is not installed. Install it with: bash scripts/ci/install-maestro.sh')
  }
  if (!facts.java) problems.push('Java is not installed. Maestro needs Java 17.')
  if (facts.convexError) {
    problems.push(facts.convexError)
  } else {
    lines.push(`convex host: ${facts.convexHost}`)
    if (facts.screenOnly) {
      lines.push('convex mode: screen only (no wander-fit-e2e project configured)')
    } else {
      lines.push(
        `backend: ${facts.backendStatus === 200 ? 'reachable' : `HTTP ${facts.backendStatus}`}`
      )
      if (facts.backendStatus !== 200) {
        problems.push(
          `The e2e Convex deployment did not answer /version (${facts.backendStatus || 'no response'}).`
        )
      }
      lines.push(
        `seed: program templates ${facts.templates === true ? 'present' : facts.templates === false ? 'missing' : '?'}, ${facts.sports ?? '?'} sports`
      )
      if (facts.seedError) {
        problems.push(`Seed status query failed: ${facts.seedError}`)
      } else if (facts.templates !== true || !(facts.sports > 0)) {
        problems.push(
          'The e2e deployment is not seeded (no program templates or sports). Seeding is run.mjs deploy, which the founder or CI runs.'
        )
      }
    }
  }
  lines.push(`port: ${facts.port}`)
  if (facts.server) {
    const s = facts.server
    lines.push(
      `server: pid ${s.pid} ${s.alive ? 'alive' : 'gone'}, ${s.owned ? 'owns' : 'does not own'} port ${facts.port}, page HTTP ${s.pageStatus}`
    )
    if (!s.alive || !s.owned || s.pageStatus !== 200) {
      problems.push(
        'The recorded verify server is not the one answering. Run cleanup, then launch again.'
      )
    }
    if (s.port !== undefined && s.port !== facts.port) {
      problems.push(
        `The recorded verify server listens on port ${s.port}, but VERIFY_PORT is ${facts.port}; doctor may be checking another server. Use the same VERIFY_PORT as launch, or run cleanup and launch again.`
      )
    }
    if (!s.build) {
      problems.push(
        'The served export has no verify-build.json. Export again with run.mjs launch after cleanup.'
      )
    } else {
      const commit = s.build.commit || 'unknown'
      lines.push(`build: commit ${commit.slice(0, 12)}, convex ${s.build.convexHost}`)
      if (!facts.convexError && s.build.convexHost !== facts.convexHost) {
        problems.push(`The served build talks to ${s.build.convexHost}, not ${facts.convexHost}.`)
      }
      if (facts.expectedCommit && s.build.commit !== facts.expectedCommit) {
        problems.push(
          `The served build is from ${commit.slice(0, 12)}, not HEAD ${facts.expectedCommit.slice(0, 12)}. Run cleanup, then launch again (launch re-exports).`
        )
      } else if (facts.expectedStamp && s.build.stamp !== facts.expectedStamp) {
        problems.push(
          'The checkout changed since the served build was exported. Run cleanup, then launch again (launch re-exports).'
        )
      }
    }
  } else {
    lines.push('server: not running (launch starts it)')
  }
  return { lines, problems }
}

// server: false before this run's own launch, so a stale record from an
// earlier run does not fail the pre-flight check; launch replaces it.
async function doctor({ server = true } = {}) {
  const { lines, problems } = evaluateDoctor(await gatherDoctorFacts({ server }))
  for (const line of lines) console.log(line)
  if (problems.length) {
    for (const problem of problems) console.error(`- ${problem}`)
    process.exit(1)
  }
  console.log('doctor: ok')
}

function scanExport() {
  // Clerk's browser SDK mentions the sk_ prefixes in startsWith checks.
  // A real secret is the prefix plus a token.
  const secret = /sk_(?:test|live)_[A-Za-z0-9]{8,}/
  const hits = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (!/\.(js|html|json|txt|map)$/.test(entry.name)) continue
      const text = fs.readFileSync(full, 'utf8')
      for (const host of BLOCKED_CONVEX_HOSTS) {
        if (text.includes(host)) hits.push(`${host} in ${path.relative(root, full)}`)
      }
      if (secret.test(text)) hits.push(`clerk secret in ${path.relative(root, full)}`)
    }
  }
  walk(distDir)
  const baked = fs
    .readdirSync(path.join(distDir, '_expo/static/js/web'))
    .filter((name) => name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(distDir, '_expo/static/js/web', name), 'utf8'))
    .join('\n')
  if (!baked.includes(convexUrl())) {
    hits.push(`bundle is missing the intended Convex URL (${convexHost(convexUrl())})`)
  }
  return hits
}

// Pure: the stamp an export may record. The source must not have changed
// between the start and the end of the export.
export function exportStamp(before, after) {
  if (before !== after) {
    throw new Error('The checkout changed while the web export ran. Run launch again.')
  }
  return before
}

function exportWeb() {
  const url = convexUrl()
  const key = clerkKey()
  if (!key) fail('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY.')
  // Stamp the source before Expo reads it. A file saved during the export
  // would otherwise give the old bundle the new stamp.
  const stampBefore = currentStamp()
  fs.rmSync(distDir, { recursive: true, force: true })
  const env = { ...process.env, CI: '1', EXPO_NO_DOTENV: '1' }
  delete env.CLERK_SECRET_KEY
  delete env.CONVEX_DEPLOY_KEY
  delete env.CONVEX_DEPLOY_KEY_E2E
  env.EXPO_PUBLIC_CONVEX_URL = url
  env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = key
  console.log(`exporting web with convex host ${convexHost(url)}`)
  const result = spawnSync(
    'npx',
    ['expo', 'export', '--clear', '--platform', 'web', '--output-dir', 'dist-verify'],
    { cwd: root, env, stdio: 'inherit' }
  )
  if (result.status !== 0) process.exit(result.status ?? 1)
  const hits = scanExport()
  if (hits.length) {
    console.error('Export contains a blocked deployment or a secret. Not serving it.')
    for (const hit of hits) console.error(`- ${hit}`)
    process.exit(1)
  }
  let stamp = ''
  try {
    stamp = exportStamp(stampBefore, currentStamp())
  } catch (error) {
    fs.rmSync(distDir, { recursive: true, force: true })
    fail(error.message)
  }
  fs.writeFileSync(
    path.join(distDir, 'verify-build.json'),
    JSON.stringify(
      {
        convexHost: convexHost(url),
        commit: gitCommit(),
        stamp,
        builtAt: new Date().toISOString(),
      },
      null,
      2
    )
  )
}

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8'
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8'
  if (file.endsWith('.css')) return 'text/css; charset=utf-8'
  if (file.endsWith('.json')) return 'application/json'
  if (file.endsWith('.png')) return 'image/png'
  if (file.endsWith('.svg')) return 'image/svg+xml'
  if (file.endsWith('.woff2')) return 'font/woff2'
  return 'application/octet-stream'
}

function startServer() {
  const rootWithSep = distDir.endsWith(path.sep) ? distDir : distDir + path.sep
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname)
    const relative = path
      .normalize(pathname)
      .replace(/^[/\\]+/, '')
      .replace(/^(\.\.(\/|\\|$))+/, '')
    const candidates = relative
      ? [
          path.join(distDir, relative),
          path.join(distDir, `${relative}.html`),
          path.join(distDir, relative, 'index.html'),
          path.join(distDir, 'index.html'),
        ]
      : [path.join(distDir, 'index.html')]
    const file = candidates.find((candidate) => {
      const resolved = path.resolve(candidate)
      return (
        (resolved === distDir || resolved.startsWith(rootWithSep)) &&
        fs.existsSync(resolved) &&
        fs.statSync(resolved).isFile()
      )
    })
    if (!file) {
      response.writeHead(404)
      response.end('not found')
      return
    }
    response.writeHead(200, { 'content-type': contentType(file) })
    fs.createReadStream(file).pipe(response)
  })
  server.listen(port, '127.0.0.1')
  return server
}

function readBuildInfo() {
  const file = path.join(distDir, 'verify-build.json')
  if (!fs.existsSync(path.join(distDir, 'index.html')) || !fs.existsSync(file)) return null
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

// Launch reuses dist-verify/ only when it was built from this exact source
// and for this backend.
export function exportIsStale(built, expected) {
  return !built || built.stamp !== expected.stamp || built.convexHost !== expected.convexHost
}

// Curl can succeed against a different process already bound to this port.
// The child writes its pid only after listen succeeds.
export function ownServerReady(readyText, pid) {
  return Number(pid) > 0 && String(readyText).trim() === String(pid)
}

// Flows open the root, as an athlete does: a signed-out launch shows the First
// Run, and "I have an account" leads to sign-in.
function verifyUrl() {
  return `http://127.0.0.1:${port}/`
}

function launch() {
  if (
    exportIsStale(readBuildInfo(), { stamp: currentStamp(), convexHost: convexHost(convexUrl()) })
  )
    exportWeb()
  const hits = scanExport()
  if (hits.length) fail(`Refusing to serve a tainted export:\n${hits.join('\n')}`)
  cleanupServer()
  // The log, ready and state files may sit in a directory that does not exist
  // yet (the nightly recipe uses $TMPDIR/verify-nightly/).
  for (const file of [logFile, readyFile, stateFile])
    fs.mkdirSync(path.dirname(file), { recursive: true })
  const log = fs.openSync(logFile, 'a')
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'serve'], {
    cwd: root,
    detached: true,
    stdio: ['ignore', log, log],
  })
  child.unref()
  fs.writeFileSync(stateFile, JSON.stringify({ pid: child.pid, port }))
  const url = verifyUrl()
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    const marked = fs.existsSync(readyFile) ? fs.readFileSync(readyFile, 'utf8') : ''
    if (ownServerReady(marked, child.pid)) {
      const ready = spawnSync('bash', ['-lc', `curl -sf -o /dev/null "${url}"`], {
        encoding: 'utf8',
      })
      if (ready.status === 0) {
        console.log(`serving ${url}`)
        return url
      }
    }
    spawnSync('bash', ['-lc', 'sleep 0.2'])
  }
  cleanupServer()
  fail(`Server did not answer at ${url}`)
}

function readPersonaFile() {
  if (!fs.existsSync(personaFile)) return null
  const record = JSON.parse(fs.readFileSync(personaFile, 'utf8'))
  if (!record.email || !record.password)
    throw new Error('Persona file is missing email or password.')
  return record
}

function personaCredentials() {
  const record = readPersonaFile()
  if (!record) fail('Missing e2e-artifacts/persona-latest.json. Run persona create first.')
  return record
}

function maskPassword(password) {
  // Hide the generated password from the job log if anything echoes it.
  if (process.env.GITHUB_ACTIONS === 'true') console.log(`::add-mask::${password}`)
}

export function createPersona(state) {
  const result = spawnSync(
    process.execPath,
    ['scripts/verify/persona.mjs', 'create', '--state', state, '--json'],
    { cwd: root, encoding: 'utf8' }
  )
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) {
    let leftover = null
    try {
      leftover = readPersonaFile()
    } catch {
      leftover = null
    }
    const error = new Error(`persona create exited ${result.status ?? 1}`)
    if (leftover) error.persona = leftover
    throw error
  }
  const line = (result.stdout || '').trim().split('\n').filter(Boolean).at(-1) || ''
  if (line) console.log(line)
  const persona = readPersonaFile()
  if (!persona) throw new Error('persona create did not write e2e-artifacts/persona-latest.json')
  maskPassword(persona.password)
  return persona
}

// The First Run creates the Clerk user and the Convex row through the UI.
// Write the cleanup record first, so a run that fails partway still deletes
// whatever the app made. No Clerk or Convex call happens here.
export function createSignupPersona({
  file = personaFile,
  now = Date.now,
  mask = maskPassword,
} = {}) {
  const record = {
    email: signupEmail(now()),
    password: generatePassword(),
    state: 'signup',
    createdAt: new Date(now()).toISOString(),
  }
  writeCredentials(record, file)
  mask(record.password)
  console.log(
    JSON.stringify({
      email: record.email,
      state: record.state,
      credentialsFile: 'e2e-artifacts/persona-latest.json',
    })
  )
  return record
}

// persona inspect prints the Convex object. convex run pretty-prints it, so the
// last line is often "}" and is not the result.
function parseInspect(output) {
  try {
    return parseRunResult(output)
  } catch {
    return null
  }
}

// Compares the inspected fields a flow cares about and names the ones that differ.
function assertInspected(parsed, expected, describe) {
  const actual = parsed
    ? Object.fromEntries(Object.keys(expected).map((key) => [key, parsed[key] ?? null]))
    : null
  const mismatched = actual
    ? Object.keys(expected).filter((key) => actual[key] !== expected[key])
    : Object.keys(expected)
  if (mismatched.length) {
    const detail = actual ? JSON.stringify(actual) : 'no inspect output'
    throw new Error(`${describe} (${mismatched.join(', ')}): ${detail}`)
  }
}

// The First Run must leave the account and program it saves together: intake
// done, GPP week 1 day 1, and the first launch time sent with the intake.
export function assertFirstRun(output, email) {
  const parsed = parseInspect(output)
  assertInspected(
    parsed,
    {
      found: true,
      intakeCompleted: true,
      hasProgram: true,
      phase: 'GPP',
      week: 1,
      day: 1,
      firstLaunchRecorded: true,
    },
    `the First Run left ${email} short of a saved GPP week 1 day 1 program`
  )
  return parsed
}

// The workout loop starts an onboarded persona at GPP week 1 day 1 with no
// sessions. Finishing today's workout must save one completed session that
// logs every prescribed set of every main exercise, and move the program to
// day 2.
export function assertWorkoutLoop(output, email) {
  const parsed = parseInspect(output)
  const sessions = Array.isArray(parsed?.sessions) ? parsed.sessions : []
  const session = sessions.length === 1 ? sessions[0] : null
  assertInspected(
    parsed && {
      ...parsed,
      sessionCount: sessions.length,
      sessionStatus: session?.status ?? null,
      // Every main exercise of the template saved at its position, completed
      // and with every prescribed set logged; the skipped warmup is not one.
      allMainExercisesLogged:
        session !== null &&
        typeof session.mainExercises === 'number' &&
        session.mainExercises > 0 &&
        session.mainExercisesNotLogged === 0,
    },
    {
      found: true,
      phase: 'GPP',
      week: 1,
      day: 2,
      sessionCount: 1,
      sessionStatus: 'completed',
      allMainExercisesLogged: true,
    },
    `the workout loop left ${email} without one finished session and the program on day 2`
  )
  return { phase: parsed.phase, week: parsed.week, day: parsed.day, sessions }
}

// The reassessment flow starts the phase-end persona at the end of GPP with
// the check-in pending, answers Just right, skips the maxes, and picks Repeat
// GPP. completeReassessment must clear the pending check-in, record one GPP
// check-in with that answer, put the program back at GPP week 1 day 1, and
// unlock nothing.
export function assertReassessment(output, email) {
  const parsed = parseInspect(output)
  const reassessments = Array.isArray(parsed?.reassessments) ? parsed.reassessments : []
  const checkIn = reassessments.length === 1 ? reassessments[0] : null
  assertInspected(
    parsed && {
      ...parsed,
      reassessmentCount: reassessments.length,
      completedPhase: checkIn?.completedPhase ?? null,
      decision: checkIn?.decision ?? null,
      phaseDifficulty: checkIn?.phaseDifficulty ?? null,
      maxesUpdated: checkIn?.maxesUpdated ?? null,
    },
    {
      found: true,
      phase: 'GPP',
      week: 1,
      day: 1,
      reassessmentPendingForPhase: null,
      sppUnlocked: false,
      reassessmentCount: 1,
      completedPhase: 'GPP',
      decision: 'repeat',
      phaseDifficulty: 'just_right',
      maxesUpdated: false,
    },
    `the reassessment flow left ${email} without one repeated GPP check-in and GPP week 1 day 1`
  )
  return {
    phase: parsed.phase,
    week: parsed.week,
    day: parsed.day,
    reassessmentPendingForPhase: parsed.reassessmentPendingForPhase,
    reassessments,
  }
}

// Checks run on the account after Maestro passes, by flow.
const inspectChecks = {
  'first-run': assertFirstRun,
  'workout-loop': assertWorkoutLoop,
  reassessment: assertReassessment,
}

// Flows with no entry are not inspected after Maestro passes.
export function needsInspect(flow) {
  return Object.hasOwn(inspectChecks, flow)
}

function inspectPersona(persona, flow) {
  const check = inspectChecks[flow]
  if (!check) throw new Error(`No inspect check for flow "${flow}".`)
  const result = spawnSync(
    process.execPath,
    ['scripts/verify/persona.mjs', 'inspect', persona.email, '--json'],
    { cwd: root, encoding: 'utf8' }
  )
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) throw new Error(`persona inspect exited ${result.status ?? 1}`)
  const inspected = check(result.stdout, persona.email)
  console.log(`inspect: ${JSON.stringify(inspected)}`)
  return inspected
}

export function deletePersona(persona) {
  const result = spawnSync(
    process.execPath,
    ['scripts/verify/persona.mjs', 'delete', persona.email],
    {
      cwd: root,
      encoding: 'utf8',
    }
  )
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) throw new Error(`persona delete exited ${result.status ?? 1}`)
}

// Drop persona-latest.json only after both the scrub and the account delete
// have succeeded. The next create overwrites that file, so a half-finished
// persona has to live in persona-pending.json instead.
export function releasePersonaFile(email) {
  if (!email || !fs.existsSync(personaFile)) return
  const current = JSON.parse(fs.readFileSync(personaFile, 'utf8'))
  if (current.email === email) fs.rmSync(personaFile, { force: true })
}

export function readPending(file = pendingFile) {
  if (!fs.existsSync(file)) return []
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error('persona-pending.json is not a list.')
  return parsed
}

export function writePending(records, file = pendingFile) {
  const open = records.filter((record) => !record.scrubbed || !record.deleted)
  if (!open.length) {
    fs.rmSync(file, { force: true })
    return
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(open, null, 2))
  fs.chmodSync(file, 0o600)
}

// One row per email. A finished row is dropped. A row that still needs a scrub
// keeps its password; a row that only needs a delete does not.
export function settlePersona(records, persona, outcome) {
  const previous = records.find((record) => record.email === persona.email) || {}
  const rest = records.filter((record) => record.email !== persona.email)
  if (outcome.scrubbed && outcome.deleted) return rest
  const flows = [...new Set([...(previous.flows || []), outcome.flow].filter(Boolean))]
  const record = {
    email: persona.email,
    flows,
    scrubbed: outcome.scrubbed,
    deleted: outcome.deleted,
  }
  if (!outcome.scrubbed) {
    const password = persona.password || previous.password
    if (password) record.password = password
  }
  rest.push(record)
  return rest
}

function scrubMarker(dir) {
  return path.join(dir, '.scrubbed')
}

function evidenceDirs() {
  if (!fs.existsSync(artifactsDir)) return []
  return fs
    .readdirSync(artifactsDir)
    .map((name) => path.join(artifactsDir, name, 'web'))
    .filter((dir) => fs.existsSync(dir))
}

const binaryEvidence = /\.(png|jpe?g|gif|webp|mp4|webm|mov|zip)$/i

// Maestro's log records the evaluated inputText, so the persona password
// lands in logs/maestro.log. Strip it before anything uploads the folder.
export function redactEvidence(dir, secret, skip = []) {
  if (!secret || !fs.existsSync(dir)) return 0
  let changed = 0
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (skip.includes(full)) continue
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (!entry.isFile() || binaryEvidence.test(entry.name)) continue
      const text = fs.readFileSync(full, 'utf8')
      if (!text.includes(secret)) continue
      fs.writeFileSync(full, text.split(secret).join('[redacted]'))
      changed++
    }
  }
  walk(dir)
  return changed
}

// Maestro's beta web driver occasionally crashes in Chromium/CDP within a few
// seconds of launchApp before the flow takes any screenshot (e.g. #88 main run
// 44995849336 failing at 3.4s on a 90s extendedWaitUntil). Retry once ONLY on
// that cold-start signature; real assertion failures take >20s or happen after
// the flow has taken its own screenshots and are never retried.
export function shouldRetryColdStart({ elapsedMs, hasScreenshots, attempt }) {
  return attempt === 0 && elapsedMs < 20_000 && !hasScreenshots
}

// Maestro saves its own step screenshots on every failure, under
// `<run>/<flow>/screenshots/step-011-assertCondition-....png` (and one per
// runFlow step). Those prove nothing about how far the flow got, so only the
// flow's own `takeScreenshot` evidence (`<run>/<flow>/takeScreenshot/01-today.png`)
// counts. Archived `attempt-N/` folders belong to an earlier attempt.
const maestroStepShot = /^step-\d+-/i

export function hasFlowEvidence(dir) {
  if (!fs.existsSync(dir)) return false
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'screenshots' || /^attempt-\d+$/.test(entry.name)) continue
      if (hasFlowEvidence(full)) return true
    } else if (/\.png$/i.test(entry.name) && !maestroStepShot.test(entry.name)) {
      return true
    }
  }
  return false
}

// Moves the failed first attempt's Maestro output into a dedicated subfolder
// (e.g. `attempt-1/`) inside `outDir` before retrying, so crash logs from the
// original cold-start failure survive and are scrubbed alongside attempt 2.
export function archiveAttemptEvidence(outDir, attemptLabel = 'attempt-1') {
  if (!fs.existsSync(outDir)) return false
  const entries = fs.readdirSync(outDir).filter((name) => !/^attempt-\d+$/.test(name))
  if (!entries.length) return false
  const archiveDir = path.join(outDir, attemptLabel)
  fs.mkdirSync(archiveDir, { recursive: true })
  for (const name of entries) {
    fs.renameSync(path.join(outDir, name), path.join(archiveDir, name))
  }
  return true
}

function runMaestro(flowFile, outDir, url, persona) {
  const maestro = maestroBin()
  if (!maestro) fail('Maestro is not installed.')
  const args = ['test', '--headless', '--test-output-dir', outDir, '-e', `VERIFY_URL=${url}`]
  const env = { ...process.env, MAESTRO_CLI_NO_ANALYTICS: '1' }
  delete env.PERSONA_PASSWORD
  if (persona) {
    args.push('-e', `PERSONA_EMAIL=${persona.email}`, '-e', `PERSONA_PASSWORD=${persona.password}`)
  }
  args.push(flowFile)
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })
  for (let attempt = 0; attempt < 2; attempt++) {
    const started = Date.now()
    const result = spawnSync(maestro, args, { cwd: root, stdio: 'inherit', env })
    if (result.status === 0) {
      console.log(`evidence: ${outDir}`)
      return
    }
    const elapsedMs = Date.now() - started
    const hasScreenshots = hasFlowEvidence(outDir)
    if (shouldRetryColdStart({ elapsedMs, hasScreenshots, attempt })) {
      archiveAttemptEvidence(outDir, `attempt-${attempt + 1}`)
      console.warn(
        `retrying ${flowFile} once after cold-start Maestro exit ${result.status ?? 1} (${Math.round(elapsedMs / 1000)}s, no flow screenshots); preserved attempt-${attempt + 1}/`
      )
      continue
    }
    const error = new Error(`Maestro exited ${result.status ?? 1}`)
    error.exitStatus = result.status ?? 1
    throw error
  }
}

function drive(url, submitting = submitMode(), flow = 'sign-in') {
  if (submitting) {
    const persona = personaCredentials()
    console.log(`driving ${flow} for ${persona.email}`)
    runMaestro(webFlowFile(flow), evidenceDirFor(flow), url, persona)
  } else {
    console.log('driving signed-out screen')
    runMaestro(screenFlow, screenEvidenceDir, url)
  }
}

// Runs each flow with its own persona. A failed flow does not stop the next
// one, and the persona is deleted whether the flow passed or not.
export function runSuite(flows, steps, now = Date.now) {
  const results = []
  let pending = steps.readPending?.() ?? []
  for (const flow of flows) {
    const started = now()
    const result = { flow, status: 'passed', artifact: artifactName(flow) }
    const errors = []
    let persona = null
    try {
      persona = steps.createPersona(flow)
      steps.drive(flow, persona)
      steps.verify?.(flow, persona)
    } catch (error) {
      errors.push(error?.message || String(error))
      if (!persona && error?.persona) persona = error.persona
    } finally {
      if (persona) {
        // Record the scrub outcome before delete. Deleting the account must
        // not drop the password teardown needs when the scrub failed.
        let scrubbed = false
        try {
          steps.redact(flow, persona)
          scrubbed = true
        } catch (error) {
          errors.push(`redact failed: ${error?.message || error}`)
        }
        pending = settlePersona(pending, persona, { flow, scrubbed, deleted: false })
        steps.writePending?.(pending)
        let deleted = false
        try {
          steps.deletePersona(persona)
          deleted = true
        } catch (error) {
          errors.push(`persona delete failed: ${error?.message || error}`)
        }
        pending = settlePersona(pending, persona, { flow, scrubbed, deleted })
        steps.writePending?.(pending)
        if (scrubbed && deleted) steps.releasePersona?.(persona)
      }
    }
    if (errors.length) {
      result.status = 'failed'
      result.error = errors.join('; ')
    }
    result.seconds = Math.round((now() - started) / 1000)
    results.push(result)
  }
  return results
}

function selectFlows(requested) {
  const available = listWebFlows()
  if (!available.length) fail('No flows under .maestro/web.')
  if (!requested.length) return defaultFlows(available, process.env.VERIFY_FLOW_SET)
  const unknown = requested.filter((flow) => !available.includes(flow))
  if (unknown.length)
    fail(`Unknown web flow: ${unknown.join(', ')}. Flows: ${available.join(', ')}`)
  return requested
}

function redactFlow(flow, persona) {
  const dir = evidenceDirFor(flow)
  fs.rmSync(scrubMarker(dir), { force: true })
  redactEvidence(dir, persona.password)
  if (fs.existsSync(dir)) fs.writeFileSync(scrubMarker(dir), '')
}

const webIo = {
  createSeededPersona: createPersona,
  createSignupPersona: () => createSignupPersona(),
  inspectPersona,
  runMaestro: (flow, url, persona) =>
    runMaestro(webFlowFile(flow), evidenceDirFor(flow), url, persona),
  redact: redactFlow,
  deletePersona,
  readPending,
  writePending,
  releasePersona: (persona) => releasePersonaFile(persona.email),
}

// Each flow's persona mode picks how it is created, and the flow picks
// whether the account is inspected after Maestro passes. Cleanup is the same
// for every mode. Seeded modes (onboarded, with-history) go through persona create.
export function webSuiteSteps(url, io = webIo) {
  return {
    createPersona: (flow) => {
      console.log(`\n== ${flow} (web) ==`)
      const mode = personaMode(flow)
      return mode === 'first-run' ? io.createSignupPersona() : io.createSeededPersona(mode)
    },
    drive: (flow, persona) => {
      console.log(`driving ${flow} for ${persona.email}`)
      io.runMaestro(flow, url, persona)
    },
    verify: (flow, persona) => {
      if (needsInspect(flow)) io.inspectPersona(persona, flow)
    },
    redact: io.redact,
    deletePersona: io.deletePersona,
    readPending: io.readPending,
    writePending: io.writePending,
    releasePersona: io.releasePersona,
  }
}

function runWebFlows(url, flows) {
  return runSuite(flows, webSuiteSteps(url))
}

function writeResults(results) {
  fs.mkdirSync(artifactsDir, { recursive: true })
  fs.writeFileSync(resultsFile, JSON.stringify({ platform: 'web', flows: results }, null, 2))
  for (const result of results) {
    const dir = evidenceDirFor(result.flow)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(result, null, 2))
  }
  console.log('\nweb flows:')
  for (const result of results) {
    console.log(
      `- ${result.flow}: ${result.status} (${result.seconds}s)${result.error ? ` ${result.error}` : ''}`
    )
  }
}

export function snapshotFiles(names, base = root) {
  return names.map((name) => {
    const full = path.join(base, name)
    return { full, content: fs.existsSync(full) ? fs.readFileSync(full) : null }
  })
}

export function restoreFiles(snapshot) {
  for (const { full, content } of snapshot) {
    if (content === null) {
      fs.rmSync(full, { force: true })
    } else if (!fs.existsSync(full) || !fs.readFileSync(full).equals(content)) {
      fs.writeFileSync(full, content)
    }
  }
}

function convexCli(args, env) {
  const snapshot = snapshotFiles(guardedFiles)
  try {
    return spawnSync('npx', ['convex', ...args], { cwd: root, env, stdio: 'inherit' })
  } finally {
    restoreFiles(snapshot)
  }
}

function convexOutput(args, env) {
  const snapshot = snapshotFiles(guardedFiles)
  try {
    const result = spawnSync('npx', ['convex', ...args], { cwd: root, env, encoding: 'utf8' })
    return { status: result.status, stdout: (result.stdout || '').trim() }
  } finally {
    restoreFiles(snapshot)
  }
}

// The deploy step hands the deployment URL to the later steps as a step
// output (convex_url). Locally it is only printed.
function publishConvexUrl(url) {
  console.log(`convex url: ${url}`)
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `convex_url=${url}\n`)
}

// convex deploy runs --cmd with the new deployment's URL in this variable.
// `run.mjs record-url` writes it here for deployPreview to read back.
const previewUrlFile = path.join(artifactsDir, 'convex-preview-url.txt')
const previewUrlVar = 'EXPO_PUBLIC_CONVEX_URL_E2E'

// Seeding is handled after deploy by ensureSeeded(), which skips re-seeding
// unchanged preview deployments via E2E_SEED_HASH.
export function previewDeployArgs(name) {
  return [
    'deploy',
    '--preview-create',
    name,
    '--codegen',
    'disable',
    '--typecheck',
    'disable',
    '--cmd',
    'node scripts/verify/run.mjs record-url',
    '--cmd-url-env-var-name',
    previewUrlVar,
  ]
}

// seed:seedAll adds categories, sports and exercises. The program templates
// come from the same generator production uses, one category per run to stay
// inside Convex's mutation limits, so the First Run reveal and Today show the
// real Day 1. Regenerating replaces any older hand-written seed templates.
// The with-history persona completes one of them.
export const TEMPLATE_CATEGORIES = [1, 2, 3, 4]

export function templateSeedArgs(categoryId, previewName) {
  const target = previewName ? ['--preview-name', previewName] : []
  return [
    'run',
    ...target,
    'generateTemplates:regenerateCategoryTemplates',
    JSON.stringify({ categoryId, failOnErrors: true }),
  ]
}

// The source files the seed and the template generator are built from:
// seed.ts and generateTemplates.ts plus every repo file they import,
// followed transitively. A change to any of them must reseed.
export const SEED_ROOTS = ['convex/seed.ts', 'convex/generateTemplates.ts']

// The deployment env var that records the seed inputs it was last seeded
// from. Env vars cost no database bandwidth and need no table.
export const SEED_MARKER = 'E2E_SEED_HASH'

function resolveImport(fromFile, spec, exists) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec))
  const stripped = base.replace(/\.(js|mjs|cjs)$/, '')
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}/index.ts`,
    `${stripped}.ts`,
    `${stripped}.tsx`,
  ]) {
    if (exists(candidate)) return candidate
  }
  return null
}

function walkRelativeImports({
  roots,
  read = (file) => fs.readFileSync(path.join(root, file), 'utf8'),
  exists = (file) =>
    fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).isFile(),
}) {
  const seen = new Set()
  const queue = [...roots]
  while (queue.length) {
    const file = queue.shift()
    if (seen.has(file)) continue
    seen.add(file)
    for (const [, spec] of read(file).matchAll(
      /(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g
    )) {
      const resolved = resolveImport(file, spec, exists)
      if (resolved && !resolved.includes('/_generated/')) queue.push(resolved)
    }
  }
  return [...seen].sort()
}

export function seedInputFiles({
  roots = SEED_ROOTS,
  read = (file) => fs.readFileSync(path.join(root, file), 'utf8'),
  exists = (file) =>
    fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).isFile(),
} = {}) {
  return walkRelativeImports({ roots, read, exists })
}

export function seedInputsHash({
  files = seedInputFiles(),
  read = (file) => fs.readFileSync(path.join(root, file)),
} = {}) {
  const hash = createHash('sha256').update(JSON.stringify(TEMPLATE_CATEGORIES))
  for (const file of files) hash.update(`\0${file}\0`).update(read(file))
  return hash.digest('hex').slice(0, 16)
}

// Pure: reseed unless the deployment holds templates across all categories and
// was last seeded from exactly these inputs. Seeding reads and rewrites all
// 1,008 templates (~6 MB of database I/O), so skipping it when unchanged keeps
// CI inside Convex's free 1 GB/month DB bandwidth cap.
export function shouldSeed({ marker, hash, hasTemplates }) {
  return !(hasTemplates && marker && marker === hash)
}

function listConvexSourceFiles(dir = path.join(root, 'convex'), prefix = 'convex') {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = `${prefix}/${entry.name}`
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === '_generated') continue
      out.push(...listConvexSourceFiles(path.join(dir, entry.name), rel))
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      out.push(rel)
    }
  }
  return out.sort()
}

// Every repo file that feeds Convex deployment code: all non-test files under
// convex/ plus every relative import they reach (e.g. lib/today.ts, types/).
export function convexRuntimeFiles({
  roots = listConvexSourceFiles(),
  read = (file) => fs.readFileSync(path.join(root, file), 'utf8'),
  exists = (file) =>
    fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).isFile(),
} = {}) {
  return walkRelativeImports({ roots, read, exists })
}

const CONVEX_CONFIG_FILES = new Set(['convex.json', 'package.json', 'bun.lock'])

// Pure: a PR only needs its own Convex preview deployment when its diff touches
// Convex runtime code, a file imported by Convex, or package/convex config.
// When changedFiles is missing (e.g. shallow clone error), fail safe to preview.
export function needsConvexPreview(changedFiles, { runtimeFiles = convexRuntimeFiles() } = {}) {
  if (!Array.isArray(changedFiles)) return true
  const runtimeSet = new Set(runtimeFiles)
  return changedFiles.some((file) => {
    if (CONVEX_CONFIG_FILES.has(file)) return true
    if (
      file.startsWith('convex/') &&
      !file.startsWith('convex/__tests__/') &&
      file !== 'convex/README.md'
    ) {
      return true
    }
    return runtimeSet.has(file)
  })
}

// Pure: picks "dev" (main/manual), "preview" (PR touching Convex runtime), or
// "shared" (PR with no Convex runtime changes, reusing wander-fit-e2e).
export function selectBackendMode({ eventName, changedFiles, runtimeFiles } = {}) {
  if (eventName !== 'pull_request') return 'dev'
  return needsConvexPreview(changedFiles, { runtimeFiles }) ? 'preview' : 'shared'
}

// Disable git rename detection so moves/renames report BOTH the deleted source
// path and the added destination path (e.g. moving a route into docs/ still
// sees the deleted route instead of skipping E2E).
export function prChangedFilesArgs() {
  return ['diff', '--no-renames', '--name-only', 'HEAD^1', 'HEAD']
}

function prChangedFiles() {
  // GitHub's pull_request checkout is a synthetic merge commit (HEAD^1 = base,
  // HEAD^2 = PR head). Refuse non-merge commits so a single-commit diff never
  // misses earlier commits on a branch.
  const isMerge = spawnSync('git', ['rev-parse', '--verify', '--quiet', 'HEAD^2'], {
    cwd: root,
    encoding: 'utf8',
  })
  if (isMerge.status !== 0) return null
  const diff = spawnSync('git', prChangedFilesArgs(), { cwd: root, encoding: 'utf8' })
  if (diff.status !== 0) return null
  return (diff.stdout || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function backendMode() {
  const eventName = process.env.GITHUB_EVENT_NAME || ''
  const changedFiles = eventName === 'pull_request' ? prChangedFiles() : []
  const mode = selectBackendMode({ eventName, changedFiles })
  console.log(`backend mode: ${mode} (event=${eventName || 'local'})`)
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `mode=${mode}\n`)
}

export function buildE2EPlan({
  eventName,
  changedFiles,
  available = listWebFlows(),
  maxShards = 4,
  runtimeFiles,
} = {}) {
  const resolvedRuntimeFiles = runtimeFiles ?? convexRuntimeFiles()
  const mode = selectBackendMode({ eventName, changedFiles, runtimeFiles: resolvedRuntimeFiles })
  const { flows, reason } = selectAffectedFlows(changedFiles, {
    available,
    eventName,
    runtimeFiles: resolvedRuntimeFiles,
  })
  const shards = balanceShards(flows, maxShards)
  return {
    mode,
    runE2E: flows.length > 0,
    flows,
    shards,
    reason,
  }
}

function planE2E() {
  const eventName = process.env.GITHUB_EVENT_NAME || ''
  const changedFiles = eventName === 'pull_request' ? prChangedFiles() : []
  const maxShards = Number(process.env.VERIFY_MAX_SHARDS || 4)
  const plan = buildE2EPlan({ eventName, changedFiles, maxShards })
  console.log(
    `e2e plan: mode=${plan.mode}, run_e2e=${plan.runE2E}, flows=${plan.flows.length}, shards=${plan.shards.length} (${plan.reason})`
  )
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      [
        `mode=${plan.mode}`,
        `run_e2e=${plan.runE2E}`,
        `flows=${JSON.stringify(plan.flows)}`,
        `shards=${JSON.stringify(plan.shards)}`,
        `reason=${plan.reason}`,
        '',
      ].join('\n')
    )
  }
}

function seedTemplates(env, previewName) {
  for (const categoryId of TEMPLATE_CATEGORIES) {
    const seeded = convexCli(templateSeedArgs(categoryId, previewName), env)
    if (seeded.status !== 0) {
      fail(
        `generateTemplates:regenerateCategoryTemplates for category ${categoryId} exited ${seeded.status ?? 1}`
      )
    }
  }
}

export function runEnsureSeeded({
  hash,
  host,
  readMarker,
  hasTemplates,
  clearMarker,
  seedAll,
  seedTemplates,
  setMarker,
  log = console.log,
}) {
  const marker = readMarker()
  if (!shouldSeed({ marker, hash, hasTemplates: hasTemplates() })) {
    log(`seed inputs unchanged (${hash}); ${host} keeps its seed`)
    return { seeded: false }
  }
  log(`seeding ${host} (inputs ${hash}, last seeded from ${marker || 'nothing recorded'})`)
  // Clear the marker before the first write so an interrupted/failed seed can
  // never leave mixed templates behind an older matching hash.
  clearMarker()
  seedAll()
  seedTemplates()
  setMarker(hash)
  return { seeded: true }
}

function ensureSeeded({ env, host, previewName = '' }) {
  const target = previewName ? ['--preview-name', previewName] : []
  return runEnsureSeeded({
    hash: seedInputsHash(),
    host,
    readMarker() {
      const markerResult = convexOutput(['env', 'get', ...target, SEED_MARKER], env)
      return markerResult.status === 0 ? markerResult.stdout : ''
    },
    hasTemplates() {
      const statusResult = convexOutput(
        ['run', ...target, 'programTemplates:seedStatus', '{}'],
        env
      )
      if (statusResult.status !== 0) return false
      try {
        return parseRunResult(statusResult.stdout)?.hasTemplates === true
      } catch {
        return false
      }
    },
    clearMarker() {
      const cleared = convexCli(['env', 'remove', ...target, SEED_MARKER], env)
      if (cleared.status !== 0)
        fail(`convex env remove ${SEED_MARKER} exited ${cleared.status ?? 1}`)
    },
    seedAll() {
      const seeded = convexCli(['run', ...target, 'seed:seedAll', '{}'], env)
      if (seeded.status !== 0) fail(`seed:seedAll exited ${seeded.status ?? 1}`)
    },
    seedTemplates() {
      seedTemplates(env, previewName)
    },
    setMarker(hash) {
      const marked = convexCli(['env', 'set', ...target, SEED_MARKER, hash], env)
      if (marked.status !== 0) fail(`convex env set ${SEED_MARKER} exited ${marked.status ?? 1}`)
    },
  })
}

// Pull request runs that touch Convex: push this checkout's convex/ functions
// to the PR's own preview deployment in wander-fit-e2e and seed it if needed.
// The preview key can reach only that project's previews, never app deployments.
function deployPreview(key) {
  if (process.env.CONVEX_DEPLOY_KEY_E2E) {
    fail('Set CONVEX_DEPLOY_KEY_E2E or CONVEX_PREVIEW_DEPLOY_KEY_E2E, not both.')
  }
  let name = ''
  try {
    assertPreviewKey(key)
    name = previewName(process.env.CONVEX_PREVIEW_NAME_E2E)
  } catch (error) {
    fail(error.message)
  }
  const env = { ...process.env, CONVEX_DEPLOY_KEY: key }
  for (const variable of [
    'CONVEX_DEPLOYMENT',
    'CONVEX_DEPLOY_KEY_E2E',
    'CONVEX_PREVIEW_DEPLOY_KEY_E2E',
    'CLERK_SECRET_KEY',
    'TEST_USER_PASSWORD',
    'EXPO_PUBLIC_CONVEX_URL',
    previewUrlVar,
  ]) {
    delete env[variable]
  }
  fs.rmSync(previewUrlFile, { force: true })
  console.log(`deploying convex functions to preview "${name}" of wander-fit-e2e`)
  const pushed = convexCli(previewDeployArgs(name), env)
  if (pushed.status !== 0) fail(`convex deploy exited ${pushed.status ?? 1}`)
  const url = fs.existsSync(previewUrlFile) ? fs.readFileSync(previewUrlFile, 'utf8').trim() : ''
  if (!url) fail('convex deploy did not report the preview deployment URL.')
  let host = ''
  try {
    host = assertConvexUrlAllowed(url)
  } catch (error) {
    fail(error.message)
  }
  ensureSeeded({ env, host, previewName: name })
  console.log(`deployed ${host}`)
  publishConvexUrl(url)
}

// The dev deploy records a fingerprint of the backend code it pushed, so a
// shared-mode run can tell whether wander-fit-e2e is running its code (#137).
export const DEPLOYED_TREE_VAR = 'E2E_CONVEX_TREE'
// Recorded when a deploy came from uncommitted files, so no commit matches it
// and the next shared-mode run catches up.
export const DIRTY_TREE = 'dirty'

// Pure: what a shared-mode run does with wander-fit-e2e.
// - reuse: the backend already runs this checkout's backend code.
// - catch-up: it doesn't, but this checkout's backend code is exactly main's
//   current one, i.e. main's own deploy is still queued. Deploying it now is
//   what main is about to do anyway, so the run doesn't fail falsely.
// - reuse-stale: the PR's backend code differs from main's tip too (the PR is
//   behind main). Never push that, or the shared backend would go backwards.
export function sharedBackendAction({ deployedTree = '', headTree = '', mainTree = '' } = {}) {
  if (!headTree || deployedTree === headTree) return 'reuse'
  if (mainTree && mainTree === headTree) return 'catch-up'
  return 'reuse-stale'
}

// Pure: the paths whose content is the deployed backend: convex/ (listed per
// commit, so a file main adds is in main's hash), the files Convex imports
// from outside it (e.g. lib/sessionTiming.ts), and the config and dependency
// files. A new outside import also edits a convex/ file, so it changes the hash.
export function backendFingerprintPaths(runtimeFiles = []) {
  const outside = runtimeFiles.filter((file) => !file.startsWith('convex/'))
  return [...new Set(['convex', ...CONVEX_CONFIG_FILES, ...outside])].sort()
}

// Same exclusions as needsConvexPreview: these never reach the deployment, so
// a shared PR that edits only them still matches main.
function isBackendFingerprintFile(file) {
  return !file.startsWith('convex/__tests__/') && file !== 'convex/README.md'
}

// Pure: one hash over `git ls-tree -r` output (object id per file), so any
// change to a backend file, or a file added or removed, changes it.
export function fingerprintFromLsTree(stdout) {
  const lines = (stdout || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && isBackendFingerprintFile(line.slice(line.indexOf('\t') + 1)))
    .sort()
  if (lines.length === 0) return ''
  return createHash('sha256').update(lines.join('\n')).digest('hex')
}

function backendFingerprint(ref, paths = backendFingerprintPaths(convexRuntimeFiles())) {
  const result = spawnSync('git', ['ls-tree', '-r', ref, '--', ...paths], {
    cwd: root,
    encoding: 'utf8',
  })
  return result.status === 0 ? fingerprintFromLsTree(result.stdout) : ''
}

function mainBackendFingerprint(paths) {
  const fetched = spawnSync('git', ['fetch', '--quiet', '--depth=1', 'origin', 'main'], {
    cwd: root,
    encoding: 'utf8',
  })
  return fetched.status === 0 ? backendFingerprint('FETCH_HEAD', paths) : ''
}

function backendFilesDirty(paths) {
  const status = spawnSync('git', ['status', '--porcelain', '--', ...paths], {
    cwd: root,
    encoding: 'utf8',
  })
  return status.status !== 0 || (status.stdout || '').trim() !== ''
}

function setDeployedTree(env, tree) {
  const marked = convexCli(['env', 'set', DEPLOYED_TREE_VAR, tree], env)
  if (marked.status !== 0) fail(`convex env set ${DEPLOYED_TREE_VAR} exited ${marked.status ?? 1}`)
}

// deployDev uploads the working checkout, so a deploy with uncommitted backend
// edits records DIRTY_TREE rather than HEAD's fingerprint.
function recordDeployedTree(env) {
  const paths = backendFingerprintPaths(convexRuntimeFiles())
  const tree = backendFilesDirty(paths) ? DIRTY_TREE : backendFingerprint('HEAD', paths)
  setDeployedTree(env, tree || DIRTY_TREE)
}

function deployDev() {
  const { env, host } = convexInvocation()
  console.log(`deploying convex functions to ${host}`)
  // Until the upload and seeding both finish, no commit matches the backend,
  // so a deploy that dies halfway never leaves the old fingerprint behind.
  setDeployedTree(env, DIRTY_TREE)
  const pushed = convexCli(['dev', '--once', '--codegen', 'disable', '--typecheck', 'disable'], env)
  if (pushed.status !== 0) fail(`convex dev --once exited ${pushed.status ?? 1}`)
  ensureSeeded({ env, host })
  recordDeployedTree(env)
  publishConvexUrl(e2eUrl())
}

// Main, local, and PR runs:
// - shared mode (PR with no Convex runtime changes): reuse wander-fit-e2e dev
//   deployment directly without deploying or seeding.
// - preview mode (PR touching Convex): deploy to pr-<N> preview & ensureSeeded.
// - dev mode (main/local): push to wander-fit-e2e dev & ensureSeeded.
function deployBackend() {
  if (process.env.VERIFY_BACKEND_MODE === 'shared') {
    const url = e2eUrl()
    let host = ''
    try {
      host = assertConvexUrlAllowed(url)
    } catch (error) {
      fail(error.message)
    }
    if (process.env.CONVEX_DEPLOY_KEY_E2E) {
      const { env } = convexInvocation()
      const deployed = convexOutput(['env', 'get', DEPLOYED_TREE_VAR], env)
      const paths = backendFingerprintPaths(convexRuntimeFiles())
      const deployedTree = deployed.status === 0 ? deployed.stdout : ''
      const headTree = backendFilesDirty(paths) ? '' : backendFingerprint('HEAD', paths)
      const mainTree = headTree && headTree !== deployedTree ? mainBackendFingerprint(paths) : ''
      const action = sharedBackendAction({ deployedTree, headTree, mainTree })
      if (action === 'catch-up') {
        console.log("wander-fit-e2e is behind main's backend code; deploying main's code first")
        deployDev()
        return
      }
      if (action === 'reuse-stale') {
        console.log(
          "note: this PR's backend code differs from main's tip; reusing the backend as is"
        )
      }
    }
    console.log(`no convex/ runtime changes; reusing shared wander-fit-e2e (${host})`)
    publishConvexUrl(url)
    return
  }
  const previewKey = process.env.CONVEX_PREVIEW_DEPLOY_KEY_E2E || ''
  if (previewKey) {
    deployPreview(previewKey)
    return
  }
  deployDev()
}

function loosePersona() {
  if (!fs.existsSync(personaFile)) return null
  try {
    const record = JSON.parse(fs.readFileSync(personaFile, 'utf8'))
    if (!record?.email) return null
    return record
  } catch {
    return null
  }
}

// One failed scrub or delete must not skip the personas after it.
export function cleanupPending(records, hooks) {
  const failures = []
  for (const record of records) {
    try {
      if (!record.scrubbed) {
        if (!record.password) {
          throw new Error(`Cannot scrub ${record.email}: the password record is missing.`)
        }
        hooks.redact(record)
        record.scrubbed = true
        delete record.password
        hooks.persist(records)
      }
      if (!record.deleted) {
        hooks.deleteAccount(record)
        record.deleted = true
        hooks.persist(records)
      }
      if (record.scrubbed && record.deleted) hooks.release(record)
    } catch (error) {
      failures.push(`${record.email}: ${error?.message || error}`)
      hooks.persist(records)
    }
  }
  // One persona's scrub removes only that password. A later success must not
  // mark every folder, or an earlier password is uploaded as clean.
  if (records.every((record) => record.scrubbed)) hooks.markScrubbed()
  else hooks.clearMarkers()
  if (failures.length) {
    throw new Error(
      `teardown left ${failures.length} persona${failures.length === 1 ? '' : 's'}: ${failures.join('; ')}`
    )
  }
}

// Cancelled runs skip the suite's finally. Retry every persona still on
// record: scrub first, then delete the account, and keep whatever is left.
function teardown() {
  cleanupServer()
  const pending = readPending()
  const current = loosePersona()
  if (current && !pending.some((record) => record.email === current.email)) {
    pending.push({
      email: current.email,
      password: current.password,
      flows: [],
      scrubbed: false,
      deleted: false,
    })
  }
  if (!pending.length) {
    console.log('teardown: no persona left to delete')
    return
  }
  const skip = [personaFile, pendingFile]
  cleanupPending(pending, {
    clearMarkers() {
      for (const dir of evidenceDirs()) fs.rmSync(scrubMarker(dir), { force: true })
    },
    markScrubbed() {
      for (const dir of evidenceDirs()) fs.writeFileSync(scrubMarker(dir), '')
    },
    redact(record) {
      redactEvidence(artifactsDir, record.password, skip)
    },
    deleteAccount(record) {
      deletePersona(record)
      console.log(`teardown: deleted ${record.email}`)
    },
    persist: writePending,
    release(record) {
      releasePersonaFile(record.email)
    },
  })
}

function cleanupServer() {
  if (fs.existsSync(stateFile)) {
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'))
      if (state.pid) {
        try {
          process.kill(state.pid)
        } catch {
          // already gone
        }
      }
    } finally {
      fs.rmSync(stateFile, { force: true })
    }
  }
  fs.rmSync(readyFile, { force: true })
}

// Throw from drive so this finally still runs. process.exit would skip it.
export function runDrive(url, submitting = submitMode()) {
  try {
    drive(url, submitting)
  } finally {
    cleanupServer()
  }
}

async function main() {
  const command = process.argv[2] || 'all'

  if (command === 'serve') {
    const server = startServer()
    server.on('error', (error) => fail(error.message))
    server.on('listening', () => {
      fs.writeFileSync(readyFile, String(process.pid))
      console.log(`verify server on 127.0.0.1:${port}`)
    })
  } else if (command === 'doctor') {
    await doctor()
  } else if (command === 'export') {
    exportWeb()
  } else if (command === 'launch') {
    launch()
  } else if (command === 'drive') {
    const url = process.argv[3] || verifyUrl()
    drive(url, submitMode(), process.argv[4] || 'sign-in')
  } else if (command === 'cleanup') {
    cleanupServer()
    console.log(`left evidence in ${artifactsDir}`)
  } else if (command === 'screen') {
    await doctor({ server: false })
    exportWeb()
    runDrive(launch(), false)
    console.log(`left evidence in ${screenEvidenceDir}`)
  } else if (command === 'backend-mode') {
    backendMode()
  } else if (command === 'plan') {
    planE2E()
  } else if (command === 'deploy') {
    deployBackend()
  } else if (command === 'record-url') {
    // Called by convex deploy --cmd, not by hand.
    const url = (process.env[previewUrlVar] || '').trim()
    if (!url) fail(`record-url needs ${previewUrlVar} from convex deploy.`)
    fs.mkdirSync(path.dirname(previewUrlFile), { recursive: true })
    fs.writeFileSync(previewUrlFile, `${url}\n`)
  } else if (command === 'teardown') {
    teardown()
  } else if (command === 'all') {
    if (!e2eUrl()) {
      fail(
        'all needs EXPO_PUBLIC_CONVEX_URL_E2E. The signed-out screen is: node scripts/verify/run.mjs screen'
      )
    }
    const flows = selectFlows(process.argv.slice(3))
    await doctor({ server: false })
    // launch() reuses a fresh dist-verify/ built for this exact checkout and
    // Convex host (such as the shared artifact built by e2e-build in CI), and
    // exports automatically whenever the build is missing or stale.
    const url = launch()
    let results
    try {
      results = runWebFlows(url, flows)
    } finally {
      cleanupServer()
    }
    writeResults(results)
    console.log(`left evidence in ${artifactsDir}`)
    if (results.some((result) => result.status !== 'passed')) process.exit(1)
  } else {
    fail('Use doctor, export, launch, drive, cleanup, screen, deploy, teardown, or all.')
  }
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error.message || error)
    process.exit(error.exitStatus ?? 1)
  })
}
