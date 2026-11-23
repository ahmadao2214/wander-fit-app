// Where web flows live, where their evidence goes, and what CI calls each artifact.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const artifactsDir = path.join(root, 'e2e-artifacts')
export const webFlowsDir = path.join(root, '.maestro/web')
export const resultsFile = path.join(artifactsDir, 'web-results.json')
export const personaFile = path.join(artifactsDir, 'persona-latest.json')
// Personas whose account delete or password scrub still has to be retried.
// Separate from persona-latest.json, which the next create overwrites.
export const pendingFile = path.join(artifactsDir, 'persona-pending.json')

// Every *.yaml directly under .maestro/web is one web flow. Journey steps
// live in .maestro/journeys, and shared subflows live in .maestro/subflows.
export function listWebFlows(dir = webFlowsDir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'))
    .map((entry) => entry.name.replace(/\.yaml$/, ''))
    .sort()
}

// Flows too slow for the per-PR web job (AGENTS.md: when the per-PR suite
// goes over 10 minutes, the slowest flows move to nightly). Pull request runs
// leave them out. Main pushes, the nightly run and local runs keep them.
export const nightlyOnlyFlows = ['workout-loop']

// The flows a run with no named flows covers. `set` is "pr" on pull request
// runs (VERIFY_FLOW_SET in checks.yml) and anything else for every flow.
export function defaultFlows(available, set) {
  return set === 'pr' ? available.filter((flow) => !nightlyOnlyFlows.includes(flow)) : available
}

export function webFlowFile(flow) {
  return path.join('.maestro/web', `${flow}.yaml`)
}

export function evidenceDirFor(flow, platform = 'web') {
  return path.join(artifactsDir, flow, platform)
}

export function artifactName(flow, platform = 'web') {
  return `e2e-${platform}-${flow}`
}

// The First Run makes its own account through the UI, at the end of the
// intake. History signs in as a persona with completed GPP sessions.
// Reassessment signs in at the end of a GPP block with the check-in pending.
// Repeated week signs in at week 3 of a 5-week GPP block with weeks 1-2 done.
// Every other flow signs in as an onboarded persona created before Maestro
// runs.
const flowPersonaModes = {
  'first-run': 'first-run',
  history: 'with-history',
  reassessment: 'phase-end',
  'repeated-week': 'repeated-week',
}

// Recorded median run times (seconds) on GitHub Ubuntu runners, used to
// balance parallel E2E shards via greedy LPT bin packing.
export const FLOW_DURATION_SECONDS = {
  'workout-loop': 175,
  feedback: 126,
  'first-run': 125,
  'workout-exit-resume': 70,
  reassessment: 60,
  'app-settings': 58,
  'settings-telemetry': 55,
  'sign-in': 46,
  history: 39,
  'repeated-week': 35,
}

export const DEFAULT_FLOW_SECONDS = 60

// Pure: distribute flows across up to `maxShards` shards so the longest shard
// finishes as quickly as possible (longest-processing-time-first).
export function balanceShards(flows, maxShards = 4, durations = FLOW_DURATION_SECONDS) {
  const unique = [...new Set(flows || [])]
  if (!unique.length) return []
  const count = Math.max(1, Math.min(maxShards, unique.length))
  const shards = Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    flows: [],
    estimatedSeconds: 0,
  }))
  const sorted = [...unique].sort((a, b) => {
    const diff = (durations[b] ?? DEFAULT_FLOW_SECONDS) - (durations[a] ?? DEFAULT_FLOW_SECONDS)
    return diff !== 0 ? diff : a.localeCompare(b)
  })
  for (const flow of sorted) {
    shards.sort((a, b) => a.estimatedSeconds - b.estimatedSeconds || a.id - b.id)
    shards[0].flows.push(flow)
    shards[0].estimatedSeconds += durations[flow] ?? DEFAULT_FLOW_SECONDS
  }
  for (const shard of shards) shard.flows.sort()
  return shards.sort((a, b) => a.id - b.id)
}

// Files that cannot affect the rendered web app or E2E flows.
const IGNORED_E2E_PATTERNS = [
  /\.md$/i,
  /^docs\//,
  /^tasks\//,
  /^research\//,
  /^\.claude\//,
  /^\.cursor\//,
  /^\.agents\//,
  /^\.eas\//,
  /^scripts\/sim\//,
  /^scripts\/codemods\//,
  /^scripts\/lottie\//,
  /^jest\//,
  /^jest\.config\.js$/,
  /^biome\.json$/,
  /^\.gitignore$/,
  /(^|\/)__tests__\//,
  /\.(test|spec)\.[cm]?[jt]sx?$/,
]

// Files strictly scoped to specific journeys (never shared across other routes
// or Convex backend modules). Any non-ignored file that is in `runtimeFiles` or
// does NOT match one of these narrow rules forces the full PR flow set.
const ROUTE_FLOW_RULES = [
  {
    match:
      /^(app\/\(first-run\)\/|components\/first-run\/|lib\/sportFields\.ts$|assets\/lottie\/sports\/|\.maestro\/(web|journeys)\/first-run\.yaml$)/,
    flows: ['first-run'],
  },
  {
    match:
      /^(app\/\(reassessment\)\/|components\/reassessment\/|\.maestro\/(web|journeys)\/reassessment\.yaml$)/,
    flows: ['reassessment'],
  },
  {
    match: /^(app\/\(athlete\)\/history(\.tsx|\/)|\.maestro\/(web|journeys)\/history\.yaml$)/,
    flows: ['history'],
  },
  {
    match:
      /^(app\/\(athlete\)\/(settings|profile)(\.tsx|\/)|components\/settings\/|\.maestro\/(web|journeys)\/(app-settings|settings-telemetry|settings-legal)\.yaml$)/,
    flows: ['app-settings', 'settings-telemetry', 'settings-legal', 'sign-in'],
  },
  {
    // Profile hosts the Feedback & support rows the feedback journey drives.
    match: /^(app\/\(athlete\)\/profile(\.tsx|\/)|\.maestro\/(web|journeys)\/feedback\.yaml$)/,
    flows: ['feedback'],
  },
  {
    // ConfettiEffect is also imported by app/(reassessment)/celebration.tsx, so
    // exclude it from the workout-only rule (falls back to full PR suite).
    match:
      /^(app\/\(athlete\)\/workout\/|components\/workout\/(?!ConfettiEffect\b)|\.maestro\/(web|journeys)\/workout-exit-resume\.yaml$)/,
    flows: ['workout-exit-resume'],
  },
  {
    match: /^\.maestro\/(web|journeys)\/workout-loop\.yaml$/,
    flows: ['workout-loop'],
  },
  {
    match: /^(app\/\(auth\)\/|\.maestro\/(web|journeys)\/sign-in\.yaml$)/,
    flows: ['sign-in'],
  },
]

// Pure: choose which web flows a run must execute.
// - main / manual runs always execute every available flow.
// - pull requests skip E2E for docs/test-only diffs, run only the affected
//   flows for strictly journey-isolated screen/journey diffs, and fall back to
//   the full PR flow set whenever any backend runtime, shared, config, or
//   unknown file changed or the diff is unavailable.
export function selectAffectedFlows(
  changedFiles,
  { available = listWebFlows(), eventName = 'pull_request', runtimeFiles = [] } = {}
) {
  if (eventName !== 'pull_request') {
    return { flows: [...available], reason: `full suite (${eventName || 'local'})` }
  }
  const prFlows = defaultFlows(available, 'pr')
  if (!Array.isArray(changedFiles)) {
    return { flows: prFlows, reason: 'full PR suite (diff unavailable)' }
  }
  const runtimeSet = new Set(runtimeFiles)
  const relevant = changedFiles.filter(
    (file) => !IGNORED_E2E_PATTERNS.some((pattern) => pattern.test(file))
  )
  if (relevant.length === 0) {
    return { flows: [], reason: 'skipped (docs/tests/tooling only)' }
  }
  const selected = new Set()
  for (const file of relevant) {
    if (runtimeSet.has(file)) {
      return { flows: prFlows, reason: `full PR suite (backend runtime change: ${file})` }
    }
    const matched = ROUTE_FLOW_RULES.filter((rule) => rule.match.test(file))
    if (matched.length === 0) {
      return { flows: prFlows, reason: `full PR suite (shared change: ${file})` }
    }
    for (const rule of matched) {
      for (const flow of rule.flows) {
        if (available.includes(flow)) selected.add(flow)
      }
    }
  }
  const flows = [...selected].sort()
  return {
    flows,
    reason: flows.length
      ? `affected flows (${flows.join(', ')})`
      : 'skipped (no matching web flow)',
  }
}

export function personaMode(flow) {
  return flowPersonaModes[flow] || 'onboarded'
}
