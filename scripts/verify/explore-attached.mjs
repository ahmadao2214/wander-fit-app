import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { spawnSync } from "node:child_process"
import { fileURLToPath, pathToFileURL } from "node:url"
import { EXPLORE_VERSION, reviewProblems } from "./explore.mjs"

const mutationLabel = /\b(sign[ -]?out|log[ -]?out|delete|remove|reset|start|resume|finish|complete|submit|save|add|edit|change|update|commit|reassess|purchase|pay|send|enable|disable|pause|cancel|skip)\b|^(yes|ok|confirm|done|continue|accept|next|set|mark)\b/i

export function attachedActionArgs(action, nodes) {
  if (action.action === "scroll" && ["up", "down", "left", "right", "top", "bottom"].includes(action.direction)) {
    return ["scroll", action.direction, "--settle"]
  }
  if (action.action !== "tap" || !action.label && !action.identifier) {
    throw new Error("Attached review permits semantic navigation and scrolling only; use observed tab/back labels, not native back gestures, coordinates, text input or deep links.")
  }
  const matches = nodes.filter(node => node.hittable && node.enabled !== false && (
    action.identifier ? node.identifier === action.identifier : node.label === action.label
  ))
  const node = matches.find(candidate => candidate.kind === "button") || matches[0]
  if (!node || !/^e\d+$/.test(node.ref)) throw new Error("Navigation target is not present in the fresh snapshot.")
  if (mutationLabel.test(`${node.label || ""} ${node.identifier || ""}`)) {
    throw new Error("This read-only review refuses account/workout mutations and resume/start controls.")
  }
  return ["press", `@${node.ref}`, "--settle"]
}

export function attachedEnvironment(base, temp) {
  const env = { TMPDIR: temp, TEMP: temp, TMP: temp, NO_COLOR: "1" }
  for (const key of ["HOME", "USER", "LOGNAME", "PATH", "LANG", "LC_ALL", "CODEX_HOME"]) {
    if (base[key]) env[key] = base[key]
  }
  return env
}

export function attachedFrame(nodes, capturedAt, png) {
  return { nodes, capturedAt, ...(png ? { frameId: randomUUID(), png, width: png.readUInt32BE(16), height: png.readUInt32BE(20) } : {}) }
}

export async function runAttachedReview({ packageDir, command, output, replay, environment = process.env }) {
  const metadata = JSON.parse(fs.readFileSync(path.join(packageDir, "package.json"), "utf8"))
  if (metadata.name !== "@expo/explore" || metadata.version !== EXPLORE_VERSION) throw new Error("Unexpected Explore package/version.")
  if (!path.isAbsolute(command) || !fs.existsSync(command)) throw new Error("Pass the absolute agent-device command returned by device_open.")
  if (fs.existsSync(output)) throw new Error("Output must be a new directory.")
  fs.mkdirSync(output, { recursive: true })
  const temp = path.join(output, "tmp")
  fs.mkdirSync(temp)
  const env = attachedEnvironment(environment, temp)
  const load = relative => import(pathToFileURL(path.join(packageDir, "dist", relative)).href)
  const [{ runBlackBoxExploration }, { ExploreStore, getCoverage }, { CONTRACT }, { preflightModelSession }, replayTools] = await Promise.all([
    load("binary/explorer.js"), load("map/store.js"), load("types.js"), load("binary/run.js"), load("binary/replay.js"),
  ])
  const limits = { maxScreens: 25, maxActions: 65, maxDurationMinutes: 15 }
  const maxTurns = 100
  const plan = replay ? replayTools.parseReplayPlan(JSON.parse(fs.readFileSync(replay, "utf8"))) : null
  if (plan) replayTools.assertReplayFits(plan, "ios", { ...limits, maxTurns })
  const say = message => console.log(message)
  const model = plan
    ? { session: replayTools.createReplaySession(plan, "ios"), provider: "replay", model: "observed-action replay", auth: "none" }
    : await preflightModelSession({ provider: "openai", model: "gpt-6.1-sol" }, env, say)
  let deviceFailure
  const invoke = args => {
    if (deviceFailure) throw deviceFailure
    const result = spawnSync(command, [...args, "--json"], { env, encoding: "utf8", timeout: 120000, maxBuffer: 8 * 1024 * 1024 })
    if (result.status !== 0 || result.error) {
      deviceFailure = new Error(`Bound device command ${args[0]} failed: ${result.stderr || result.error?.message || result.stdout}`)
      throw deviceFailure
    }
    const parsed = JSON.parse(result.stdout)
    if (parsed.success === false) {
      deviceFailure = new Error(`Bound device command ${args[0]} failed: ${JSON.stringify(parsed.error)}`)
      throw deviceFailure
    }
    return parsed.data ?? parsed
  }
  const bundleId = "com.offseason.asrafit"
  invoke(["open", bundleId, "--relaunch"])
  const controllerVersion = spawnSync(command, ["--version"], { env, encoding: "utf8" })
  if (controllerVersion.status !== 0) throw new Error("Cannot read bound controller version.")
  const map = {
    contract: CONTRACT, revision: 0,
    run: { id: randomUUID(), name: "Wander Fit — attached onboarded review", platform: "ios", controller: "agent-device", exploration: "black-box", bundleId,
      status: "exploring", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), build: { source: "unknown" },
      environment: { deviceModel: "iPhone 18 Pro", osVersion: "27.2" }, limits },
    artifacts: [], screens: [], variants: [], observations: [], elements: [], actionAttempts: [], transitions: [], journeys: [], frontier: [], gaps: [],
  }
  const store = new ExploreStore(output)
  await store.initialize(map, false)
  let frame = 0
  const observation = async includeImage => {
    const snapshot = invoke(["snapshot", "--force-full"])
    if (snapshot.appBundleId !== bundleId || !Array.isArray(snapshot.nodes)) throw new Error("App identity/snapshot changed; stopping attached review.")
    const capturedAt = new Date().toISOString()
    if (!includeImage) return attachedFrame(snapshot.nodes, capturedAt)
    const screenshot = path.join(temp, `frame-${++frame}.png`)
    invoke(["screenshot", screenshot])
    const png = fs.readFileSync(screenshot)
    return attachedFrame(snapshot.nodes, capturedAt, png)
  }
  const exploration = await runBlackBoxExploration({
    session: model.session, store, map, app: { name: "Wander Fit", bundleId, platform: "ios" },
    hints: "Already signed in as the durable E2E athlete. Capture Today, Program, History, Profile, Training Science and read-only subpages. Use exact observed labels/identifiers only. Navigate via observed tabs or labeled back buttons; do not use the back tool or coordinates. Name captures by their visible page headings. Do not sign in/out, fill inputs, tap Resume/Start, complete/delete workouts, edit settings, reassess, or alter data. An existing workout must remain in progress. When read-only navigation is covered, finish and list anything unreachable.",
    deadlineMs: Date.now() + limits.maxDurationMinutes * 60000,
    maxScreens: limits.maxScreens, maxActions: limits.maxActions, maxTurns,
    observe: observation,
    act: async action => {
      if (action.action === "wait") {
        if (!Number.isFinite(action.milliseconds) || action.milliseconds < 0 || action.milliseconds > 15000) throw new Error("Invalid wait budget.")
        await new Promise(resolve => setTimeout(resolve, action.milliseconds))
        return
      }
      const snapshot = invoke(["snapshot", "--force-full"])
      if (snapshot.appBundleId !== bundleId) throw new Error("App changed; stopping attached review.")
      invoke(attachedActionArgs(action, snapshot.nodes))
    },
    progress: say,
  })
  map.run.status = exploration.stopReason === "model-error" ? "failed"
    : exploration.stopReason === "finished" && getCoverage(map).completion.eligible ? "complete" : "partial"
  if (map.run.status !== "complete") map.run.stopReason = exploration.stopReason
  map.run.completedAt = new Date().toISOString()
  await store.write(map)
  fs.writeFileSync(path.join(output, "attached-run.json"), JSON.stringify({ exploreVersion: metadata.version, controllerVersion: controllerVersion.stdout.trim(), model: { provider: model.provider, model: model.model, auth: model.auth }, exploration: { ...exploration, ...(exploration.error instanceof Error ? { error: exploration.error.message } : {}) } }, null, 2))
  const saved = JSON.parse(fs.readFileSync(store.mapPath, "utf8"))
  const problems = reviewProblems(saved)
  if (deviceFailure) throw deviceFailure
  if (exploration.stopReason !== "finished") problems.push(`Exploration stopped: ${exploration.stopReason}`)
  if (problems.length) throw new Error(problems.join("\n"))
  console.log(JSON.stringify({ output, exploration }))
  return exploration
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argument = name => {
    const index = process.argv.indexOf(name)
    if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}`)
    return path.resolve(process.argv[index + 1])
  }
  runAttachedReview({ packageDir: argument("--explore-package"), command: argument("--agent-device"), output: argument("--output"),
    ...(process.argv.includes("--replay") ? { replay: argument("--replay") } : {}) }).catch(error => { console.error(error.message); process.exitCode = 1 })
}
