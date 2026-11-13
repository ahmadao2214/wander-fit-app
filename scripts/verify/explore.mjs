#!/usr/bin/env node
// Every-screen review with Expo Explore, on a local iOS simulator. Free: no
// Expo Simulators minutes, no EAS builds. The app is built against
// wander-fit-e2e only.
//
//   node scripts/verify/explore.mjs build
//   node scripts/verify/explore.mjs review --state onboarded [--replay]
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { assertConvexUrlAllowed, BLOCKED_CONVEX_HOSTS, convexHost } from "./targets.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const exploreDir = path.join(root, "e2e-artifacts/explore")
const derivedData = path.join(exploreDir, "build")
const cacheDir = path.join(exploreDir, "cache")

// The build and its downloads stay beside the checkout (keep it on a disk with
// room); only the simulator Explore creates lives in the home folder.
const GB = 1024 ** 3
export const MIN_FREE = { checkout: 15 * GB, home: 3 * GB }

export function cacheEnv(dir = cacheDir) {
  return {
    CP_CACHE_DIR: path.join(dir, "cocoapods"),
    npm_config_cache: path.join(dir, "npm"),
    EXPLORE_CACHE_DIR: path.join(dir, "expo-explore"),
    XDG_CACHE_HOME: path.join(dir, "xdg"),
  }
}

export function spaceProblems({ checkout, home }, min = MIN_FREE) {
  const problems = []
  const gb = (bytes) => `${(bytes / GB).toFixed(1)} GB`
  if (checkout < min.checkout) {
    problems.push(`The checkout's disk has ${gb(checkout)} free; the build needs ${gb(min.checkout)}. Run from a checkout on a disk with room.`)
  }
  if (home < min.home) {
    problems.push(`The home disk has ${gb(home)} free; Explore's simulator needs ${gb(min.home)}.`)
  }
  return problems
}

function freeBytes(dir) {
  const stats = fs.statfsSync(dir)
  return stats.bavail * stats.bsize
}

function checkSpace({ needCheckout }) {
  const problems = spaceProblems({
    checkout: needCheckout ? freeBytes(root) : Infinity,
    home: freeBytes(process.env.HOME || root),
  })
  if (problems.length) fail(problems.join("\n"))
}

// Pinned: Explore is pre-1.0 and changes weekly. Node 24.12+ is its minimum,
// run through npx so the machine's own Node stays as it is.
export const EXPLORE_VERSION = "0.23.0"
export const EXPLORE_NODE = "24.12.0"
export const IOS_DEPLOYMENT_TARGET = "15.1"
export const STATES =["signed-out", "needs-intake", "onboarded", "phase-end"]

const SECRET_ENV = [
  "CLERK_SECRET_KEY",
  "CONVEX_DEPLOY_KEY",
  "CONVEX_DEPLOY_KEY_E2E",
  "TEST_USER_PASSWORD",
  "APP_TEST_PASSWORD",
]

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
  return (process.env.EXPO_PUBLIC_CONVEX_URL_E2E || readDotenv(path.join(root, ".env.e2e")).EXPO_PUBLIC_CONVEX_URL_E2E || "").trim()
}

function clerkKey() {
  if (process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY) return process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
  for (const name of [".env.local", ".env"]) {
    const value = readDotenv(path.join(root, name)).EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
    if (value) return value
  }
  return ""
}

// The build sees the E2E backend and nothing else: .env files are off, and
// every secret is removed, so none can be inlined into the bundle.
export function buildEnv(base, { url, key }) {
  assertConvexUrlAllowed(url)
  if (!key) throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY.")
  const env = { ...base, EXPO_NO_DOTENV: "1", EXPO_PUBLIC_CONVEX_URL: url, EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: key }
  for (const name of SECRET_ENV) delete env[name]
  return env
}

// Problems with a built bundle. Hermes bytecode keeps string literals as
// plain bytes, so a latin1 read finds hosts and keys.
export function scanBundle(text, e2eHost) {
  const hits = []
  if (!text.includes(e2eHost)) hits.push(`bundle is missing the E2E Convex host (${e2eHost})`)
  for (const host of BLOCKED_CONVEX_HOSTS) {
    if (text.includes(host)) hits.push(`bundle contains blocked Convex host ${host}`)
  }
  if (/sk_(?:test|live)_[A-Za-z0-9]{10,}/.test(text)) hits.push("bundle contains a Clerk secret key")
  return hits
}

export function hintsFor(state, email) {
  const avoid =
    "Never tap Continue with Google, never create an account, and never finish or delete a workout or change program settings."
  if (state === "signed-out") {
    return `Stay signed out. Capture the sign-in screen and the sign-up screen, including their error states if a tap shows one without submitting real data. ${avoid}`
  }
  const signIn = `On the sign-in screen, type ${email} into the email field and {{secret:APP_TEST_PASSWORD}} into the password field, then tap Sign In. If iOS offers to save the password, tap Not Now.`
  const focus = {
    "needs-intake": "After sign-in the app starts intake. Capture each intake screen in order; pick the first option on each so you can move on.",
    onboarded: "After sign-in you land on Today. Capture every tab (Today, Program, History, Profile) and the screens each one opens, such as a workout's detail and the training science pages. Open a workout but do not start it.",
    "phase-end": "After sign-in the program is at the end of a phase. Capture Today and the reassessment screens it leads to, then the other tabs.",
  }[state]
  return `${signIn} ${focus} ${avoid}`
}

export function replayPath(state) {
  return path.join(root, ".expo-explore/replays", `${state}.json`)
}

export function outputDirName(state, date = new Date()) {
  const stamp = date.toISOString().slice(0, 16).replace(/[-:]/g, "").replace("T", "-")
  return `${stamp}-${state}`
}

export function exploreArgs({ app, output, state, email, replay }) {
  const args = [
    "-y",
    "-p", `node@${EXPLORE_NODE}`,
    "-p", `@expo/explore@${EXPLORE_VERSION}`,
    "expo-explore", "explore:binary", app,
    "--simulator", "local",
    "--output", output,
    "--no-open",
    "--json",
  ]
  if (replay) args.push("--replay", replay)
  else args.push("--hints", hintsFor(state, email), "--max-screens", "60", "--max-duration-minutes", "25")
  return args
}

// The template's bundle phase ends with `"$NODE_BINARY" --print "…xcode.sh"`
// in unquoted backticks, so a checkout path with a space ("OWC Express 1M2")
// splits and the build fails. Quote it. Returns the text unchanged when the
// template already does.
export function quoteBundlePhase(pbxproj) {
  return pbxproj.replace(
    /`(\\"\$NODE_BINARY\\" --print \\"require\('path'\)\.dirname\(require\.resolve\('react-native\/package\.json'\)\) \+ '\/scripts\/react-native-xcode\.sh'\\")`/,
    (_, command) => `\\"$(${command})\\"`
  )
}

function findApp() {
  const products = path.join(derivedData, "Build/Products/Release-iphonesimulator")
  if (!fs.existsSync(products)) return ""
  const app = fs.readdirSync(products).find((name) => name.endsWith(".app"))
  return app ? path.join(products, app) : ""
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", ...options })
  if (result.status !== 0) process.exit(result.status ?? 1)
  return result
}

function build() {
  const url = e2eUrl()
  if (!url) fail("Set EXPO_PUBLIC_CONVEX_URL_E2E or write it to .env.e2e. The review app only talks to wander-fit-e2e.")
  checkSpace({ needCheckout: true })
  let env
  try {
    env = { ...buildEnv(process.env, { url, key: clerkKey() }), ...cacheEnv() }
  } catch (error) {
    fail(error.message)
  }
  console.log(`building the Release simulator app with Convex host ${convexHost(url)}`)
  run("npx", ["expo", "prebuild", "--platform", "ios"], { env })
  const workspace = fs.readdirSync(path.join(root, "ios")).find((name) => name.endsWith(".xcworkspace"))
  if (!workspace) fail("expo prebuild made no ios/*.xcworkspace.")
  const scheme = workspace.replace(/\.xcworkspace$/, "")
  const pbxproj = path.join(root, "ios", `${scheme}.xcodeproj`, "project.pbxproj")
  fs.writeFileSync(pbxproj, quoteBundlePhase(fs.readFileSync(pbxproj, "utf8")))
  run(
    "xcodebuild",
    [
      "-workspace", path.join("ios", workspace),
      "-scheme", scheme,
      "-configuration", "Release",
      "-sdk", "iphonesimulator",
      "-destination", "generic/platform=iOS Simulator",
      "-derivedDataPath", derivedData,
      // Xcode 27 rejects pods that still declare iOS 12.4-13.4 (react-native-svg,
      // lottie). Build every target at the app's own minimum, Expo SDK 54's 15.1.
      `IPHONEOS_DEPLOYMENT_TARGET=${IOS_DEPLOYMENT_TARGET}`,
      "-quiet",
      "build",
    ],
    { env }
  )
  const app = findApp()
  if (!app) fail("xcodebuild finished without a .app.")
  const bundle = path.join(app, "main.jsbundle")
  if (!fs.existsSync(bundle)) fail(`${bundle} is missing. The Release build should embed its JavaScript.`)
  const hits = scanBundle(fs.readFileSync(bundle, "latin1"), convexHost(url))
  if (hits.length) {
    console.error("The built app is not safe to review. Removing it.")
    for (const hit of hits) console.error(`- ${hit}`)
    fs.rmSync(app, { recursive: true, force: true })
    process.exit(1)
  }
  console.log(`built ${path.relative(root, app)}`)
}

function persona(args) {
  const result = spawnSync(process.execPath, ["scripts/verify/persona.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"))
}

// The review account for onboarded, so its screens compare run to run. A
// throwaway persona for the other states, deleted afterwards.
function account(state) {
  if (state === "signed-out") return null
  if (state === "onboarded") {
    persona(["review", "--json"])
    return { ...readJson("e2e-artifacts/review-account.json"), throwaway: false }
  }
  persona(["create", "--state", state, "--json"])
  return { ...readJson("e2e-artifacts/persona-latest.json"), throwaway: true }
}

function review() {
  const state = flag("--state") || "onboarded"
  if (!STATES.includes(state)) fail(`Unknown state "${state}". Use ${STATES.join(", ")}.`)
  const app = findApp()
  if (!app) fail("No review app yet. Run: node scripts/verify/explore.mjs build")
  let replay = ""
  if (process.argv.includes("--replay")) {
    replay = replayPath(state)
    if (!fs.existsSync(replay)) fail(`No replay for ${state} at ${path.relative(root, replay)}.`)
  }
  checkSpace({ needCheckout: false })
  const output = path.join(exploreDir, outputDirName(state))
  const user = account(state)
  const env = { ...process.env, ...cacheEnv() }
  for (const name of SECRET_ENV) delete env[name]
  if (user) env.APP_TEST_PASSWORD = user.password
  console.log(`exploring ${state}${replay ? " from its replay" : ""} into ${path.relative(root, output)}`)
  const result = spawnSync("npx", exploreArgs({ app, output, state, email: user?.email, replay }), {
    cwd: root,
    env,
    stdio: "inherit",
  })
  if (user?.throwaway) persona(["delete", user.email])
  if (result.status !== 0) process.exit(result.status ?? 1)
  console.log(`open it: npx -y -p node@${EXPLORE_NODE} -p @expo/explore@${EXPLORE_VERSION} expo-explore view --dir ${path.relative(root, output)}`)
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) {
  const command = process.argv[2] || "help"
  if (command === "build") build()
  else if (command === "review") review()
  else {
    console.log(`explore build                   Release simulator app on wander-fit-e2e
explore review --state <${STATES.join("|")}> [--replay]`)
    process.exit(command === "help" ? 0 : 2)
  }
}
