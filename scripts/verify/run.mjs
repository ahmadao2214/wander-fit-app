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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const distDir = path.join(root, "dist-verify")
const evidenceDir = path.join(root, "e2e-artifacts/sign-in/web")
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

function personaCredentials() {
  const file = path.join(root, "e2e-artifacts/persona-latest.json")
  if (!fs.existsSync(file)) fail("Missing e2e-artifacts/persona-latest.json. Run persona create first.")
  const record = JSON.parse(fs.readFileSync(file, "utf8"))
  if (!record.email || !record.password) fail("Persona file is missing email or password.")
  return record
}

function createPersona() {
  const result = spawnSync(
    process.execPath,
    ["scripts/verify/persona.mjs", "create", "--state", "onboarded", "--json"],
    { cwd: root, encoding: "utf8" }
  )
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) process.exit(result.status ?? 1)
  const line = (result.stdout || "").trim().split("\n").filter(Boolean).at(-1) || ""
  if (line) console.log(line)
}

function drive(url, submitting = submitMode()) {
  const maestro = maestroBin()
  if (!maestro) fail("Maestro is not installed.")
  fs.mkdirSync(evidenceDir, { recursive: true })
  const flow = submitting ? ".maestro/sign-in-submit.yaml" : ".maestro/sign-in.yaml"
  const args = [
    "test",
    "--headless",
    "--test-output-dir",
    evidenceDir,
    "-e",
    `VERIFY_URL=${url}`,
  ]
  const env = { ...process.env, MAESTRO_CLI_NO_ANALYTICS: "1" }
  if (submitting) {
    const persona = personaCredentials()
    args.push("-e", `PERSONA_EMAIL=${persona.email}`, "-e", `PERSONA_PASSWORD=${persona.password}`)
    delete env.PERSONA_PASSWORD
    console.log(`driving sign-in for ${persona.email}`)
  } else {
    console.log("driving signed-out screen")
  }
  args.push(flow)
  const result = spawnSync(maestro, args, { cwd: root, stdio: "inherit", env })
  if (result.status !== 0) {
    const error = new Error(`Maestro exited ${result.status ?? 1}`)
    error.exitStatus = result.status ?? 1
    throw error
  }
  console.log(`evidence: ${evidenceDir}`)
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
    drive(url)
  } else if (command === "cleanup") {
    cleanupServer()
    console.log(`left evidence in ${evidenceDir}`)
  } else if (command === "screen") {
    doctor()
    exportWeb()
    runDrive(launch(), false)
    console.log(`left evidence in ${evidenceDir}`)
  } else if (command === "all") {
    if (!e2eUrl()) {
      fail(
        "all needs EXPO_PUBLIC_CONVEX_URL_E2E. The signed-out screen is: node scripts/verify/run.mjs screen"
      )
    }
    doctor()
    createPersona()
    exportWeb()
    runDrive(launch(), true)
    console.log(`left evidence in ${evidenceDir}`)
  } else {
    fail("Use doctor, export, launch, drive, cleanup, screen, or all.")
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
