// Where web flows live, where their evidence goes, and what CI calls each artifact.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
export const artifactsDir = path.join(root, "e2e-artifacts")
export const webFlowsDir = path.join(root, ".maestro/web")
export const resultsFile = path.join(artifactsDir, "web-results.json")
export const personaFile = path.join(artifactsDir, "persona-latest.json")
// Personas whose account delete or password scrub still has to be retried.
// Separate from persona-latest.json, which the next create overwrites.
export const pendingFile = path.join(artifactsDir, "persona-pending.json")

// Every *.yaml directly under .maestro/web is one web flow. Journey steps
// live in .maestro/journeys, and shared subflows live in .maestro/subflows.
export function listWebFlows(dir = webFlowsDir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
    .map((entry) => entry.name.replace(/\.yaml$/, ""))
    .sort()
}

export function webFlowFile(flow) {
  return path.join(".maestro/web", `${flow}.yaml`)
}

export function evidenceDirFor(flow, platform = "web") {
  return path.join(artifactsDir, flow, platform)
}

export function artifactName(flow, platform = "web") {
  return `e2e-${platform}-${flow}`
}

// Sign-up makes its own account through the UI. Activation signs in as a
// persona with a user row only and goes through intake. Every other flow
// signs in as an onboarded persona created before Maestro runs.
const flowPersonaModes = {
  "sign-up": "signup",
  activation: "needs-intake",
}

export function personaMode(flow) {
  return flowPersonaModes[flow] || "onboarded"
}
