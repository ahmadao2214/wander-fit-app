#!/usr/bin/env node
// Fail-safe PR unit test selector (#137):
// - On non-PR events (push to main, manual runs, local): runs the full Jest
//   suite with randomized test order (`jest --ci --randomize`).
// - On pull requests: runs `jest --ci --randomize --passWithNoTests
//   --findRelatedTests` for changed files PLUS any filesystem-scanning tests
//   (Convex convexModules() dynamic requires, workflow/Maestro/skill/Lottie
//   guards). Shared config changes, deleted non-doc files, or missing diffs
//   always fail safe to the full suite.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { convexRuntimeFiles } from '../verify/run.mjs'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

// Disable rename detection so moves/renames emit BOTH source and destination
// paths and never require blob fetches on `filter: blob:none` clones.
export function prChangedFilesArgs() {
  return ['diff', '--no-renames', '--name-only', 'HEAD^1', 'HEAD']
}

export function listConvexTestFiles(
  dir = path.join(root, 'convex/__tests__'),
  prefix = 'convex/__tests__'
) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = `${prefix}/${entry.name}`
    if (entry.isDirectory()) out.push(...listConvexTestFiles(path.join(dir, entry.name), rel))
    else if (entry.name.endsWith('.test.ts')) out.push(rel)
  }
  return out.sort()
}

// Changes to any of these files can affect every test suite; always run full.
const FULL_SUITE_PATTERNS = [
  /^package\.json$/,
  /^bun\.lock$/,
  /^jest\.config\.js$/,
  /^jest\//,
  /^babel\.config\.js$/,
  /^babel\//,
  /^tsconfig\.json$/,
  /^tamagui\.config\.ts$/,
  /^metro\.config\.js$/,
  /^app\.json$/,
  /^eas\.json$/,
  /^patches\//,
  /^convex\/schema\.ts$/,
  /^types\.ts$/,
  /^types\//,
  /^scripts\/ci\//,
]

// Pure documentation/notes that no unit test reads. Paths that ARE read by
// tests (.maestro/flow-layout.md, .claude/skills/verify-wander-fit/**,
// .cursor/skills/verify-wander-fit/**, .agents/skills/verify-wander-fit/**)
// are matched by EXTRA_TEST_RULES first.
const DOC_ONLY_PATTERNS = [
  /^docs\//,
  /^tasks\//,
  /^research\//,
  /^README\.md$/i,
  /^AGENTS\.md$/i,
  /^CLAUDE\.md$/i,
  /\.md$/i,
]

// Non-import filesystem dependencies: tests that read files via fs.readFileSync
// / fs.readdirSync rather than static JS/TS imports.
const EXTRA_TEST_RULES = [
  {
    match: /^(\.oxlintrc\.json|\.oxfmtrc\.json|hk\.pkl)$/,
    tests: ['scripts/ci/ci.test.mjs'],
  },
  {
    match: /^\.github\/workflows\/(checks|web-e2e-run)\.yml$/,
    tests: [
      'scripts/ci/ci.test.mjs',
      'scripts/verify/flows.test.mjs',
      'scripts/verify/nightly.test.mjs',
    ],
  },
  {
    match: /^\.github\/workflows\/nightly-e2e\.yml$/,
    tests: ['scripts/verify/nightly.test.mjs'],
  },
  {
    match: /^\.maestro\//,
    tests: ['scripts/verify/flows.test.mjs', 'scripts/verify/feature-map.test.mjs'],
  },
  {
    match: /^\.(claude|cursor|agents)\/skills\/verify-wander-fit\//,
    tests: ['scripts/verify/feature-map.test.mjs'],
  },
  {
    match: /^assets\/lottie\//,
    tests: [
      'lib/__tests__/sportAnimations.test.ts',
      'scripts/lottie/build.test.mjs',
      'scripts/lottie/frameChecks.test.mjs',
    ],
  },
  {
    match: /^(app|components)\//,
    tests: [
      'lib/__tests__/actionColor.test.ts',
      'lib/__tests__/typography.test.ts',
      'lib/__tests__/webDistributionConfig.test.ts',
      'scripts/verify/flows.test.mjs',
    ],
  },
  {
    match: /^public\//,
    tests: ['lib/__tests__/webDistributionConfig.test.ts'],
  },
  {
    match: /^convex\//,
    tests: ['scripts/verify/doctor.test.mjs'],
  },
]

const CODE_FILE_PATTERN = /\.[cm]?[jt]sx?$|\.json$/i

export function planUnitTests({
  eventName = 'pull_request',
  changedFiles,
  runtimeFiles = convexRuntimeFiles(),
  convexTests = listConvexTestFiles(),
  exists = (file) => fs.existsSync(path.join(root, file)),
} = {}) {
  if (eventName !== 'pull_request') {
    return {
      mode: 'full',
      jestArgs: ['--ci', '--randomize'],
      reason: `full suite (${eventName || 'local'})`,
    }
  }
  if (!Array.isArray(changedFiles)) {
    return {
      mode: 'full',
      jestArgs: ['--ci', '--randomize'],
      reason: 'full suite (diff unavailable)',
    }
  }
  if (changedFiles.length === 0) {
    return {
      mode: 'skip',
      jestArgs: [],
      reason: 'no changed files',
    }
  }

  for (const file of changedFiles) {
    if (FULL_SUITE_PATTERNS.some((pattern) => pattern.test(file))) {
      return {
        mode: 'full',
        jestArgs: ['--ci', '--randomize'],
        reason: `full suite (shared/config change: ${file})`,
      }
    }
  }

  const runtimeSet = new Set(runtimeFiles)
  const relatedTargets = new Set()
  let hasRelevantNonDoc = false

  for (const file of changedFiles) {
    let matchedExtra = false
    for (const rule of EXTRA_TEST_RULES) {
      if (rule.match.test(file)) {
        matchedExtra = true
        for (const testFile of rule.tests) relatedTargets.add(testFile)
      }
    }

    // convex-test loads convex/**/*.ts dynamically via jest/convexModules.ts,
    // which Jest's static --findRelatedTests graph cannot see. Any change to a
    // Convex runtime file (including shared lib/ helpers imported by convex/)
    // must run all convex/__tests__/*.test.ts + scripts/verify/doctor.test.mjs.
    const isConvexRuntime =
      runtimeSet.has(file) ||
      (file.startsWith('convex/') &&
        !file.startsWith('convex/__tests__/') &&
        file !== 'convex/README.md')
    if (isConvexRuntime) {
      hasRelevantNonDoc = true
      for (const testFile of convexTests) relatedTargets.add(testFile)
      relatedTargets.add('scripts/verify/doctor.test.mjs')
    }

    const isDocOnly =
      !matchedExtra && !isConvexRuntime && DOC_ONLY_PATTERNS.some((pattern) => pattern.test(file))
    if (isDocOnly) continue

    hasRelevantNonDoc = true

    // Deleted code/config files cannot be resolved by --findRelatedTests and
    // might break callers; fail safe to the full suite.
    if (!exists(file)) {
      if (CODE_FILE_PATTERN.test(file)) {
        return {
          mode: 'full',
          jestArgs: ['--ci', '--randomize'],
          reason: `full suite (deleted file: ${file})`,
        }
      }
      continue
    }

    if (CODE_FILE_PATTERN.test(file)) {
      relatedTargets.add(file)
    }
  }

  if (!hasRelevantNonDoc || relatedTargets.size === 0) {
    return {
      mode: 'skip',
      jestArgs: [],
      reason: 'no affected unit tests (docs/assets only)',
    }
  }

  const targets = [...relatedTargets].sort()
  return {
    mode: 'related',
    targets,
    jestArgs: ['--ci', '--randomize', '--passWithNoTests', '--findRelatedTests', ...targets],
    reason: `related tests for ${targets.length} target(s)`,
  }
}

function prChangedFiles() {
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

function main() {
  const eventName = process.env.GITHUB_EVENT_NAME || ''
  const changedFiles = eventName === 'pull_request' ? prChangedFiles() : []
  const plan = planUnitTests({ eventName, changedFiles })
  console.log(`[unit] ${plan.mode}: ${plan.reason}`)
  if (plan.mode === 'skip') process.exit(0)
  const jestBin = path.join(root, 'node_modules/.bin/jest')
  const result = spawnSync(jestBin, plan.jestArgs, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })
  process.exit(result.status ?? 1)
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) main()
