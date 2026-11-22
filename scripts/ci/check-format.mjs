#!/usr/bin/env node
// Checks formatting with oxfmt on changed files in CI (PRs and main pushes),
// or across the entire repo when passed `--all`. Ratchets formatting cleanly on
// every touched file without requiring a noisy 300-file reformat commit (#137).
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const FORMATTABLE_EXT = /\.(?:[cm]?[jt]sx?|json)$/i

const IGNORED_FORMAT_PATTERNS = [
  /^convex\/_generated\//,
  /^docs\//,
  /^\.claude\//,
  /^patches\//,
  /^dist-verify\//,
  /^e2e-artifacts\//,
  /^assets\/lottie\//,
  /^tsconfig\.base\.json$/,
  /^bun\.lock$/,
]

const ZERO_SHA = '0'.repeat(40)

// Disable rename detection so moves/renames report both paths without fetching
// blobs on `filter: blob:none` clones, and use `-z` (NUL-separated output) so
// Git never quotes or escapes filenames with non-ASCII characters or spaces.
export function formatDiffArgs(baseRef = 'HEAD^1', headRef = 'HEAD') {
  return ['diff', '--no-renames', '--name-only', '-z', baseRef, headRef]
}

export function resolveDiffBase({ eventName = '', pushBefore = '' } = {}) {
  if (eventName === 'push' && /^[0-9a-f]{40}$/i.test(pushBefore) && pushBefore !== ZERO_SHA) {
    return pushBefore
  }
  return 'HEAD^1'
}

export function parseNullSeparatedPaths(stdout) {
  return (stdout || '').split('\0').filter(Boolean)
}

export function isFormattableFile(file) {
  if (!file || !FORMATTABLE_EXT.test(file)) return false
  return !IGNORED_FORMAT_PATTERNS.some((pattern) => pattern.test(file))
}

export function selectFormatTargets({
  changedFiles,
  exists = (file) => fs.existsSync(path.join(root, file)),
} = {}) {
  if (!Array.isArray(changedFiles)) {
    return { mode: 'error', files: [], reason: 'git diff unavailable (need fetch-depth >= 2)' }
  }
  const files = [...new Set(changedFiles)]
    .filter((file) => isFormattableFile(file) && exists(file))
    .sort()
  if (files.length === 0) {
    return { mode: 'skip', files: [], reason: 'no changed formattable files' }
  }
  return { mode: 'check', files, reason: `checking ${files.length} changed file(s)` }
}

function changedFilesFromGit(eventName, pushBefore) {
  const baseRef = resolveDiffBase({ eventName, pushBefore })
  if (eventName === 'pull_request') {
    const isMerge = spawnSync('git', ['rev-parse', '--verify', '--quiet', 'HEAD^2'], {
      cwd: root,
      encoding: 'utf8',
    })
    if (isMerge.status !== 0) return null
  }
  const hasBase = spawnSync('git', ['rev-parse', '--verify', '--quiet', baseRef], {
    cwd: root,
    encoding: 'utf8',
  })
  if (hasBase.status !== 0) return null
  const diff = spawnSync('git', formatDiffArgs(baseRef, 'HEAD'), { cwd: root, encoding: 'utf8' })
  if (diff.status !== 0) return null
  return parseNullSeparatedPaths(diff.stdout)
}

function main() {
  const args = process.argv.slice(2)
  const oxfmtBin = path.join(root, 'node_modules/.bin/oxfmt')
  if (args.includes('--all')) {
    const result = spawnSync(oxfmtBin, ['--check', '.'], { cwd: root, stdio: 'inherit' })
    process.exit(result.status ?? 1)
  }
  const eventName = process.env.GITHUB_EVENT_NAME || ''
  const pushBefore = process.env.GITHUB_PUSH_BEFORE || ''
  const changedFiles = changedFilesFromGit(eventName, pushBefore)
  const plan = selectFormatTargets({ changedFiles })
  console.log(`[format] ${plan.mode}: ${plan.reason}`)
  if (plan.mode === 'error') {
    console.error(`[format] FAILED: ${plan.reason}`)
    process.exit(1)
  }
  if (plan.mode === 'skip') process.exit(0)
  const result = spawnSync(oxfmtBin, ['--check', ...plan.files], {
    cwd: root,
    stdio: 'inherit',
  })
  process.exit(result.status ?? 1)
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) main()
