// Where web flows live, where their evidence goes, and what CI calls each artifact.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
export const artifactsDir = path.join(root, "e2e-artifacts")
export const webFlowsDir = path.join(root, ".maestro/web")
export const resultsFile = path.join(artifactsDir, "web-results.json")
export const personaFile = path.join(artifactsDir, "persona-latest.json")

// Every *.yaml directly under .maestro/web is one web flow. Subfolders hold
// shared steps, not entry files.
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
