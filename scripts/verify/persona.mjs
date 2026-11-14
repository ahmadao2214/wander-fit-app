#!/usr/bin/env node
// Fresh Clerk users seeded on wander-fit-e2e (this PR's preview deployment, or
// the dev deployment on main). Never targets an app deployment.
import { spawnSync } from "node:child_process"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { resolveConvexTarget } from "./targets.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const credentialsFile = path.join(root, "e2e-artifacts/persona-latest.json")
const reviewCredentialsFile = path.join(root, "e2e-artifacts/review-account.json")
const envFile = path.join(root, ".env.e2e")
const command = process.argv[2] || "help"
const known = new Set(["create", "review", "inspect", "delete", "sweep", "help"])

// The one long-lived account, for screen reviews that compare run to run.
// It never matches emailPatterns, so delete and sweep refuse it.
export const REVIEW_EMAIL = "review+clerk_test@example.com"
const states = new Set(["new", "needs-intake", "onboarded", "phase-end"])
// Generated addresses only. e2e.<run> is the onboarded persona from create.
// e2e-<run>-signup is the account the sign-up flow makes through the UI.
const emailPatterns = [
  /^e2e\.\d+\+clerk_test@example\.com$/,
  /^e2e-\d+-signup\+clerk_test@example\.com$/,
]

// Delete and sweep refuse every address this does not accept.
export function isGeneratedEmail(email) {
  return typeof email === "string" && emailPatterns.some((pattern) => pattern.test(email))
}

export function signupEmail(run = Date.now()) {
  return `e2e-${run}-signup+clerk_test@example.com`
}

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

function flag(name) {
  const index = process.argv.indexOf(name)
  if (index === -1) return ""
  return process.argv[index + 1] || ""
}

function fail(message) {
  console.error(message)
  process.exit(2)
}

function e2eUrl() {
  return process.env.EXPO_PUBLIC_CONVEX_URL_E2E || readDotenv(envFile).EXPO_PUBLIC_CONVEX_URL_E2E || ""
}

function clerkSecret() {
  return process.env.CLERK_SECRET_KEY || readDotenv(path.join(root, ".env.local")).CLERK_SECRET_KEY || ""
}

// Pass the deployment on the process env. `--env-file` skips the logged-in
// Convex token unless that file also contains a deploy key. `args` selects the
// branch's preview deployment on pull request runs.
export function convexInvocation() {
  let target = null
  try {
    target = resolveConvexTarget({
      url: e2eUrl(),
      devKey: process.env.CONVEX_DEPLOY_KEY_E2E || "",
      previewKey: process.env.CONVEX_PREVIEW_DEPLOY_KEY_E2E || "",
      previewLabel: process.env.CONVEX_PREVIEW_NAME_E2E || "",
      envFileDeployment: readDotenv(envFile).CONVEX_DEPLOYMENT || "",
    })
  } catch (error) {
    fail(error.message)
  }
  const env = { ...process.env }
  delete env.CONVEX_DEPLOY_KEY
  delete env.CONVEX_DEPLOYMENT
  delete env.CONVEX_DEPLOY_KEY_E2E
  delete env.CONVEX_PREVIEW_DEPLOY_KEY_E2E
  delete env.CLERK_SECRET_KEY
  delete env.TEST_USER_PASSWORD
  Object.assign(env, target.env)
  return { env, host: target.host, mode: target.mode, args: target.args }
}

function convexRun(fn, args) {
  const { env, args: target } = convexInvocation()
  const result = spawnSync(
    "npx",
    ["convex", "run", ...target, fn, JSON.stringify(args)],
    { cwd: root, env, encoding: "utf8" }
  )
  const output = `${result.stdout || ""}\n${result.stderr || ""}`
  if (result.status !== 0) {
    const redacted = output.replace(/sk_(?:test|live)_[A-Za-z0-9]+/g, "[redacted]")
    fail(redacted.trim() || `convex run ${fn} failed`)
  }
  return result.stdout || ""
}

async function clerk(pathname, options = {}) {
  const secret = clerkSecret()
  if (!secret) fail("Missing CLERK_SECRET_KEY. Persona create needs the Clerk Backend API.")
  const response = await fetch(`https://api.clerk.com/v1${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })
  const text = await response.text()
  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { message: text.slice(0, 300) }
    }
  }
  if (!response.ok) {
    const message = body?.errors?.[0]?.long_message || body?.errors?.[0]?.message || body?.message || response.statusText
    fail(`Clerk ${options.method || "GET"} ${pathname} failed (${response.status}): ${message}`)
  }
  return body
}

export function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  const bytes = crypto.randomBytes(24)
  let out = ""
  for (const byte of bytes) out += alphabet[byte % alphabet.length]
  return out
}

export function writeCredentials(record, file = credentialsFile) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temporary = `${file}.${crypto.randomUUID()}.tmp`
  fs.writeFileSync(temporary, JSON.stringify(record, null, 2), { mode: 0o600, flag: "wx" })
  fs.renameSync(temporary, file)
}

// The Clerk user already exists. Write the cleanup record before Convex
// provisioning so a failed seed or provision can still be deleted.
export function provisionPersona(record, steps, file = credentialsFile) {
  writeCredentials(record, file)
  steps.seed()
  steps.provision()
}

function printJson(value) {
  if (process.argv.includes("--json")) console.log(JSON.stringify(value))
}

async function create() {
  const state = flag("--state") || "onboarded"
  if (!states.has(state)) fail(`Unknown persona state "${state}".`)
  convexInvocation()
  const email = `e2e.${Date.now()}+clerk_test@example.com`
  const secretPassword = generatePassword()
  const created = await clerk("/users", {
    method: "POST",
    body: JSON.stringify({
      email_address: [email],
      password: secretPassword,
      skip_password_checks: true,
      first_name: "Verify",
      last_name: "Athlete",
    }),
  })
  const clerkId = created?.id
  if (!clerkId) fail("Clerk did not return a user id.")
  const record = {
    email,
    password: secretPassword,
    clerkId,
    state,
    createdAt: new Date().toISOString(),
  }
  provisionPersona(record, {
    seed: () => convexRun("seed:seedAll", {}),
    provision: () =>
      convexRun("e2e:provision", {
        clerkId,
        email,
        name: "Verify Athlete",
        state,
      }),
  })
  console.error(`persona: created ${email} (${state})`)
  printJson({ email, clerkId, state, credentialsFile: "e2e-artifacts/persona-latest.json" })
}

export function reviewPlan({ clerkId, saved, inspected }) {
  if (clerkId && !(saved?.clerkId === clerkId && saved?.password)) {
    throw new Error("Restore the saved review-account credentials. Refusing to reset an existing account password.")
  }
  if (clerkId && !(inspected?.found && inspected.onboardingCompleted && inspected.hasProgram)) {
    throw new Error("Existing review account is not fully onboarded. Refusing to reset or reprovision it.")
  }
  if (!clerkId && inspected?.found) {
    throw new Error("Review account data already exists without its Clerk identity. Refusing to reprovision it.")
  }
  return {
    createUser: !clerkId,
    provision: !clerkId,
  }
}

function readSaved(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch {
    return null
  }
}

async function review() {
  convexInvocation()
  const matches = await clerk(`/users?email_address=${encodeURIComponent(REVIEW_EMAIL)}`)
  const existingId = Array.isArray(matches) ? matches[0]?.id || "" : ""
  const saved = readSaved(reviewCredentialsFile)
  const inspected = parseRunResult(convexRun("e2e:inspect", { email: REVIEW_EMAIL }))
  const plan = reviewPlan({ clerkId: existingId, saved, inspected })

  let clerkId = existingId
  let password = saved?.password || ""
  if (plan.createUser) {
    password = generatePassword()
    const created = await clerk("/users", {
      method: "POST",
      body: JSON.stringify({
        email_address: [REVIEW_EMAIL],
        password,
        skip_password_checks: true,
        first_name: "Review",
        last_name: "Athlete",
      }),
    })
    clerkId = created?.id || ""
    if (!clerkId) fail("Clerk did not return a user id.")
  }

  const record = {
    email: REVIEW_EMAIL,
    password,
    clerkId,
    state: "onboarded",
    createdAt: saved?.clerkId === clerkId ? saved.createdAt : new Date().toISOString(),
  }
  writeCredentials(record, reviewCredentialsFile)
  if (plan.provision) {
    convexRun("seed:seedAll", {})
    convexRun("e2e:provision", { clerkId, email: REVIEW_EMAIL, name: "Review Athlete", state: "onboarded" })
  }
  const actions = Object.entries(plan).filter(([, run]) => run).map(([name]) => name)
  console.error(`persona: review account ${REVIEW_EMAIL} ${actions.length ? `(${actions.join(", ")})` : "unchanged"}`)
  printJson({ email: REVIEW_EMAIL, clerkId, ...plan, credentialsFile: "e2e-artifacts/review-account.json" })
}

async function inspect() {
  const email = process.argv[3]
  if (!email || email.startsWith("--")) fail("Usage: persona inspect <email>")
  const stdout = convexRun("e2e:inspect", { email })
  console.log(JSON.stringify(parseRunResult(stdout)))
}

// convex run pretty-prints the returned object over several lines.
export function parseRunResult(stdout) {
  const text = String(stdout || "").trim()
  const start = text.indexOf("{")
  if (start === -1) throw new Error(`convex run printed no object: ${text.slice(0, 200)}`)
  return JSON.parse(text.slice(start))
}

async function deleteOne(email) {
  if (!isGeneratedEmail(email)) {
    fail(
      `Refusing to delete ${email}. Only generated e2e.<run>+clerk_test and e2e-<run>-signup+clerk_test addresses can be deleted.`
    )
  }
  const matches = await clerk(`/users?email_address=${encodeURIComponent(email)}`)
  const users = Array.isArray(matches) ? matches : []
  for (const user of users) {
    if (user?.id) await clerk(`/users/${user.id}`, { method: "DELETE" })
  }
  convexRun("e2e:remove", { email })
  return { email, clerkDeleted: users.length }
}

async function remove() {
  const email = process.argv[3]
  if (!email || email.startsWith("--")) fail("Usage: persona delete <email>")
  const result = await deleteOne(email)
  console.error(`persona: deleted ${result.email}`)
  printJson(result)
}

// Clerk's Backend API sends created_at as milliseconds. Date.parse on that
// number is NaN, which would make sweep skip every user.
export function createdAtMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    if (/^\d+$/.test(value)) {
      const asNumber = Number(value)
      if (Number.isFinite(asNumber)) return asNumber
    }
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function olderThanMs() {
  const raw = flag("--older-than") || "2h"
  const match = raw.match(/^(\d+)([mhd])$/)
  if (!match) fail(`Unsupported --older-than "${raw}". Use 30m, 2h, or 1d.`)
  const amount = Number(match[1])
  const unit = match[2] === "m" ? 60_000 : match[2] === "h" ? 3_600_000 : 86_400_000
  return amount * unit
}

async function sweep() {
  const cutoff = Date.now() - olderThanMs()
  const removed = []
  let offset = 0
  for (let page = 0; page < 5; page++) {
    const users = await clerk(`/users?limit=100&offset=${offset}&order_by=-created_at`)
    if (!Array.isArray(users) || users.length === 0) break
    for (const user of users) {
      const created = createdAtMs(user.created_at)
      if (!created || created > cutoff) continue
      const email = user.email_addresses?.[0]?.email_address || ""
      if (!isGeneratedEmail(email)) continue
      removed.push(await deleteOne(email))
    }
    if (users.length < 100) break
    offset += users.length
  }
  console.error(`persona: swept ${removed.length}`)
  printJson({ removed })
  if (!process.argv.includes("--json")) console.log(JSON.stringify({ removed: removed.length }))
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) {
  if (!known.has(command)) {
    fail(`Unknown persona command "${command}". Use create, review, inspect, delete, or sweep.`)
  }

  if (command === "help") {
    console.log(`persona create --state <new|needs-intake|onboarded|phase-end> --json
persona review --json   (the long-lived ${REVIEW_EMAIL}; created once, never reset)
persona inspect <email> --json
persona delete <email>
persona sweep --older-than 2h`)
    process.exit(0)
  }

  const action = { create, review, inspect, delete: remove, sweep }[command]
  action().catch((error) => fail(error?.message || String(error)))
}
