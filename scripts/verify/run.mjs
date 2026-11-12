#!/usr/bin/env node
// Local web tracer. Same command runs in CI: export, serve, Maestro, keep evidence.
import { spawn, spawnSync } from "node:child_process"
import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  BLOCKED_CONVEX_HOSTS,
  PLACEHOLDER_CONVEX_URL,
  assertConvexUrlAllowed,
  convexHost,
} from "./targets.mjs"
import {
  artifactName,
  artifactsDir,
  evidenceDirFor,
  listWebFlows,
  pendingFile,
  personaFile,
  resultsFile,
  root,
  webFlowFile,
} from "./flows.mjs"
import { convexInvocation } from "./persona.mjs"

const distDir = path.join(root, "dist-verify")
// The signed-out screen check. It is not a journey, so it is not under .maestro/web.
const screenFlow = ".maestro/sign-in-screen.yaml"
const screenEvidenceDir = evidenceDirFor("sign-in-screen")
// Files the Convex CLI may rewrite. Deploy restores them afterwards.
const guardedFiles = [".env", ".env.local", ".gitignore"]
// Tests set these so cleanup does not kill a live server.
const stateFile = process.env.VERIFY_STATE_FILE || "/tmp/wander-fit-verify.json"
const readyFile = process.env.VERIFY_READY_FILE || "/tmp/wander-fit-verify.ready"
const port = Number(process.env.VERIFY_PORT || 4173)

function readDotenv(file) {
  if (!fs.existsSync(file)) return {}
  const out = {}
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
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
  for (const name of [".env.local", ".env"]) {
    const value = readDotenv(path.join(root, name)).EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
    if (value) return value
  }
  return ""
}

function e2eUrl() {
  // An explicit empty variable means "not configured", including in CI.
  // Fall back to .env.e2e only when the variable is unset.
  if (process.env.EXPO_PUBLIC_CONVEX_URL_E2E !== undefined) {
    return process.env.EXPO_PUBLIC_CONVEX_URL_E2E.trim()
  }
  return readDotenv(path.join(root, ".env.e2e")).EXPO_PUBLIC_CONVEX_URL_E2E || ""
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
  const home = process.env.HOME || ""
  const candidates = [
    process.env.MAESTRO_BIN,
    path.join(home, ".maestro/bin/maestro"),
  ].filter(Boolean)
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  const which = spawnSync("bash", ["-lc", "command -v maestro"], { encoding: "utf8" })
  if (which.status === 0 && which.stdout.trim()) return which.stdout.trim()
  return ""
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

function doctor() {
  const problems = []
  if (!clerkKey()) {
    problems.push(
      "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. The sign-in screen stays on Loading without it."
    )
  }
  if (!maestroBin()) {
    problems.push(
      "Maestro is not installed. Install it with: curl -Ls \"https://get.maestro.mobile.dev\" | bash"
    )
  }
  const java = spawnSync("java", ["-version"], { encoding: "utf8" })
  if (java.status !== 0) problems.push("Java is not installed. Maestro needs Java 17.")
  try {
    const host = convexHost(convexUrl())
    console.log(`convex host: ${host}`)
    if (host === convexHost(PLACEHOLDER_CONVEX_URL)) {
      console.log("convex mode: screen only (no wander-fit-e2e project configured)")
    }
  } catch (error) {
    problems.push(error.message)
  }
  console.log(`clerk publishable key: ${clerkKey() ? "present" : "missing"}`)
  console.log(`maestro: ${maestroBin() || "missing"}`)
  console.log(`port: ${port}`)
  if (problems.length) {
    for (const problem of problems) console.error(`- ${problem}`)
    process.exit(1)
  }
  console.log("doctor: ok")
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
      const text = fs.readFileSync(full, "utf8")
      for (const host of BLOCKED_CONVEX_HOSTS) {
        if (text.includes(host)) hits.push(`${host} in ${path.relative(root, full)}`)
      }
      if (secret.test(text)) hits.push(`clerk secret in ${path.relative(root, full)}`)
    }
  }
  walk(distDir)
  const baked = fs.readdirSync(path.join(distDir, "_expo/static/js/web"))
    .filter((name) => name.endsWith(".js"))
    .map((name) => fs.readFileSync(path.join(distDir, "_expo/static/js/web", name), "utf8"))
    .join("\n")
  if (!baked.includes(convexUrl())) {
    hits.push(`bundle is missing the intended Convex URL (${convexHost(convexUrl())})`)
  }
  return hits
}

function exportWeb() {
  const url = convexUrl()
  const key = clerkKey()
  if (!key) fail("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY.")
  fs.rmSync(distDir, { recursive: true, force: true })
  const env = { ...process.env, CI: "1", EXPO_NO_DOTENV: "1" }
  delete env.CLERK_SECRET_KEY
  delete env.CONVEX_DEPLOY_KEY
  delete env.CONVEX_DEPLOY_KEY_E2E
  env.EXPO_PUBLIC_CONVEX_URL = url
  env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = key
  console.log(`exporting web with convex host ${convexHost(url)}`)
  const result = spawnSync(
    "npx",
    ["expo", "export", "--clear", "--platform", "web", "--output-dir", "dist-verify"],
    { cwd: root, env, stdio: "inherit" }
  )
  if (result.status !== 0) process.exit(result.status ?? 1)
  const hits = scanExport()
  if (hits.length) {
    console.error("Export contains a blocked deployment or a secret. Not serving it.")
    for (const hit of hits) console.error(`- ${hit}`)
    process.exit(1)
  }
  fs.writeFileSync(
    path.join(distDir, "verify-build.json"),
    JSON.stringify({ convexHost: convexHost(url), builtAt: new Date().toISOString() }, null, 2)
  )
}

function contentType(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8"
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8"
  if (file.endsWith(".css")) return "text/css; charset=utf-8"
  if (file.endsWith(".json")) return "application/json"
  if (file.endsWith(".png")) return "image/png"
  if (file.endsWith(".svg")) return "image/svg+xml"
  if (file.endsWith(".woff2")) return "font/woff2"
  return "application/octet-stream"
}

function startServer() {
  const rootWithSep = distDir.endsWith(path.sep) ? distDir : distDir + path.sep
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname)
    const relative = path
      .normalize(pathname)
      .replace(/^[/\\]+/, "")
      .replace(/^(\.\.(\/|\\|$))+/, "")
    const candidates = relative
      ? [
          path.join(distDir, relative),
          path.join(distDir, `${relative}.html`),
          path.join(distDir, relative, "index.html"),
          path.join(distDir, "index.html"),
        ]
      : [path.join(distDir, "index.html")]
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
      response.end("not found")
      return
    }
    response.writeHead(200, { "content-type": contentType(file) })
    fs.createReadStream(file).pipe(response)
  })
  server.listen(port, "127.0.0.1")
  return server
}

// Curl can succeed against a different process already bound to this port.
// The child writes its pid only after listen succeeds.
export function ownServerReady(readyText, pid) {
  return Number(pid) > 0 && String(readyText).trim() === String(pid)
}

function verifyUrl() {
  const signIn = path.join(distDir, "sign-in.html")
  return fs.existsSync(signIn)
    ? `http://127.0.0.1:${port}/sign-in`
    : `http://127.0.0.1:${port}/`
}

function launch() {
  if (!fs.existsSync(path.join(distDir, "index.html"))) exportWeb()
  const hits = scanExport()
  if (hits.length) fail(`Refusing to serve a tainted export:\n${hits.join("\n")}`)
  cleanupServer()
  const log = fs.openSync("/tmp/wander-fit-verify.log", "a")
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "serve"], {
    cwd: root,
    detached: true,
    stdio: ["ignore", log, log],
  })
  child.unref()
  fs.mkdirSync(path.dirname(stateFile), { recursive: true })
  fs.writeFileSync(stateFile, JSON.stringify({ pid: child.pid, port }))
  const url = verifyUrl()
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    const marked = fs.existsSync(readyFile) ? fs.readFileSync(readyFile, "utf8") : ""
    if (ownServerReady(marked, child.pid)) {
      const ready = spawnSync("bash", ["-lc", `curl -sf -o /dev/null "${url}"`], { encoding: "utf8" })
      if (ready.status === 0) {
        console.log(`serving ${url}`)
        return url
      }
    }
    spawnSync("bash", ["-lc", "sleep 0.2"])
  }
  cleanupServer()
  fail(`Server did not answer at ${url}`)
}

function readPersonaFile() {
  if (!fs.existsSync(personaFile)) return null
  const record = JSON.parse(fs.readFileSync(personaFile, "utf8"))
  if (!record.email || !record.password) throw new Error("Persona file is missing email or password.")
  return record
}

function personaCredentials() {
  const record = readPersonaFile()
  if (!record) fail("Missing e2e-artifacts/persona-latest.json. Run persona create first.")
  return record
}

function createPersona() {
  const result = spawnSync(
    process.execPath,
    ["scripts/verify/persona.mjs", "create", "--state", "onboarded", "--json"],
    { cwd: root, encoding: "utf8" }
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
  const line = (result.stdout || "").trim().split("\n").filter(Boolean).at(-1) || ""
  if (line) console.log(line)
  const persona = readPersonaFile()
  if (!persona) throw new Error("persona create did not write e2e-artifacts/persona-latest.json")
  // Hide the generated password from the job log if anything echoes it.
  if (process.env.GITHUB_ACTIONS === "true") console.log(`::add-mask::${persona.password}`)
  return persona
}

function deletePersona(persona) {
  const result = spawnSync(process.execPath, ["scripts/verify/persona.mjs", "delete", persona.email], {
    cwd: root,
    encoding: "utf8",
  })
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) throw new Error(`persona delete exited ${result.status ?? 1}`)
}

// Drop persona-latest.json only after both the scrub and the account delete
// have succeeded. The next create overwrites that file, so a half-finished
// persona has to live in persona-pending.json instead.
function releasePersonaFile(email) {
  if (!email || !fs.existsSync(personaFile)) return
  const current = JSON.parse(fs.readFileSync(personaFile, "utf8"))
  if (current.email === email) fs.rmSync(personaFile, { force: true })
}

export function readPending(file = pendingFile) {
  if (!fs.existsSync(file)) return []
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"))
  if (!Array.isArray(parsed)) throw new Error("persona-pending.json is not a list.")
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
  return path.join(dir, ".scrubbed")
}

function evidenceDirs() {
  if (!fs.existsSync(artifactsDir)) return []
  return fs
    .readdirSync(artifactsDir)
    .map((name) => path.join(artifactsDir, name, "web"))
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
      const text = fs.readFileSync(full, "utf8")
      if (!text.includes(secret)) continue
      fs.writeFileSync(full, text.split(secret).join("[redacted]"))
      changed++
    }
  }
  walk(dir)
  return changed
}

function runMaestro(flowFile, outDir, url, persona) {
  const maestro = maestroBin()
  if (!maestro) fail("Maestro is not installed.")
  fs.mkdirSync(outDir, { recursive: true })
  const args = ["test", "--headless", "--test-output-dir", outDir, "-e", `VERIFY_URL=${url}`]
  const env = { ...process.env, MAESTRO_CLI_NO_ANALYTICS: "1" }
  delete env.PERSONA_PASSWORD
  if (persona) {
    args.push("-e", `PERSONA_EMAIL=${persona.email}`, "-e", `PERSONA_PASSWORD=${persona.password}`)
  }
  args.push(flowFile)
  const result = spawnSync(maestro, args, { cwd: root, stdio: "inherit", env })
  if (result.status !== 0) {
    const error = new Error(`Maestro exited ${result.status ?? 1}`)
    error.exitStatus = result.status ?? 1
    throw error
  }
  console.log(`evidence: ${outDir}`)
}

function drive(url, submitting = submitMode(), flow = "sign-in") {
  if (submitting) {
    const persona = personaCredentials()
    console.log(`driving ${flow} for ${persona.email}`)
    runMaestro(webFlowFile(flow), evidenceDirFor(flow), url, persona)
  } else {
    console.log("driving signed-out screen")
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
    const result = { flow, status: "passed", artifact: artifactName(flow) }
    const errors = []
    let persona = null
    try {
      persona = steps.createPersona(flow)
      steps.drive(flow, persona)
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
      result.status = "failed"
      result.error = errors.join("; ")
    }
    result.seconds = Math.round((now() - started) / 1000)
    results.push(result)
  }
  return results
}

function selectFlows(requested) {
  const available = listWebFlows()
  if (!available.length) fail("No flows under .maestro/web.")
  if (!requested.length) return available
  const unknown = requested.filter((flow) => !available.includes(flow))
  if (unknown.length) fail(`Unknown web flow: ${unknown.join(", ")}. Flows: ${available.join(", ")}`)
  return requested
}

function runWebFlows(url, flows) {
  return runSuite(flows, {
    createPersona: (flow) => {
      console.log(`\n== ${flow} (web) ==`)
      return createPersona()
    },
    drive: (flow, persona) => {
      console.log(`driving ${flow} for ${persona.email}`)
      runMaestro(webFlowFile(flow), evidenceDirFor(flow), url, persona)
    },
    redact: (flow, persona) => {
      const dir = evidenceDirFor(flow)
      fs.rmSync(scrubMarker(dir), { force: true })
      redactEvidence(dir, persona.password)
      if (fs.existsSync(dir)) fs.writeFileSync(scrubMarker(dir), "")
    },
    deletePersona,
    readPending,
    writePending,
    releasePersona: (persona) => releasePersonaFile(persona.email),
  })
}

function writeResults(results) {
  fs.mkdirSync(artifactsDir, { recursive: true })
  fs.writeFileSync(resultsFile, JSON.stringify({ platform: "web", flows: results }, null, 2))
  for (const result of results) {
    const dir = evidenceDirFor(result.flow)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, "result.json"), JSON.stringify(result, null, 2))
  }
  console.log("\nweb flows:")
  for (const result of results) {
    console.log(`- ${result.flow}: ${result.status} (${result.seconds}s)${result.error ? ` ${result.error}` : ""}`)
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
    return spawnSync("npx", ["convex", ...args], { cwd: root, env, stdio: "inherit" })
  } finally {
    restoreFiles(snapshot)
  }
}

// Push this checkout's convex/ functions to wander-fit-e2e, then seed it.
// convexInvocation refuses the app deployments and a mismatched deploy key.
function deployBackend() {
  const { env, host } = convexInvocation()
  console.log(`deploying convex functions to ${host}`)
  const pushed = convexCli(["dev", "--once", "--codegen", "disable", "--typecheck", "disable"], env)
  if (pushed.status !== 0) fail(`convex dev --once exited ${pushed.status ?? 1}`)
  console.log(`seeding ${host}`)
  const seeded = convexCli(["run", "seed:seedAll", "{}"], env)
  if (seeded.status !== 0) fail(`seed:seedAll exited ${seeded.status ?? 1}`)
}

function loosePersona() {
  if (!fs.existsSync(personaFile)) return null
  try {
    const record = JSON.parse(fs.readFileSync(personaFile, "utf8"))
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
    throw new Error(`teardown left ${failures.length} persona${failures.length === 1 ? "" : "s"}: ${failures.join("; ")}`)
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
    console.log("teardown: no persona left to delete")
    return
  }
  const skip = [personaFile, pendingFile]
  cleanupPending(pending, {
    clearMarkers() {
      for (const dir of evidenceDirs()) fs.rmSync(scrubMarker(dir), { force: true })
    },
    markScrubbed() {
      for (const dir of evidenceDirs()) fs.writeFileSync(scrubMarker(dir), "")
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
      const state = JSON.parse(fs.readFileSync(stateFile, "utf8"))
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

function main() {
  const command = process.argv[2] || "all"

  if (command === "serve") {
    const server = startServer()
    server.on("error", (error) => fail(error.message))
    server.on("listening", () => {
      fs.writeFileSync(readyFile, String(process.pid))
      console.log(`verify server on 127.0.0.1:${port}`)
    })
  } else if (command === "doctor") {
    doctor()
  } else if (command === "export") {
    exportWeb()
  } else if (command === "launch") {
    launch()
  } else if (command === "drive") {
    const url = process.argv[3] || verifyUrl()
    drive(url, submitMode(), process.argv[4] || "sign-in")
  } else if (command === "cleanup") {
    cleanupServer()
    console.log(`left evidence in ${artifactsDir}`)
  } else if (command === "screen") {
    doctor()
    exportWeb()
    runDrive(launch(), false)
    console.log(`left evidence in ${screenEvidenceDir}`)
  } else if (command === "deploy") {
    deployBackend()
  } else if (command === "teardown") {
    teardown()
  } else if (command === "all") {
    if (!e2eUrl()) {
      fail(
        "all needs EXPO_PUBLIC_CONVEX_URL_E2E. The signed-out screen is: node scripts/verify/run.mjs screen"
      )
    }
    const flows = selectFlows(process.argv.slice(3))
    doctor()
    exportWeb()
    const url = launch()
    let results
    try {
      results = runWebFlows(url, flows)
    } finally {
      cleanupServer()
    }
    writeResults(results)
    console.log(`left evidence in ${artifactsDir}`)
    if (results.some((result) => result.status !== "passed")) process.exit(1)
  } else {
    fail("Use doctor, export, launch, drive, cleanup, screen, deploy, teardown, or all.")
  }
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) {
  try {
    main()
  } catch (error) {
    console.error(error.message || error)
    process.exit(error.exitStatus ?? 1)
  }
}
