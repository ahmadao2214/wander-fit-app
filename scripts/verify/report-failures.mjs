#!/usr/bin/env node
// Files one GitHub issue per failed Android E2E flow (#83), or comments on the
// open one with the same title. It never fixes, closes or edits anything.
//
// Two steps, so the job that runs PR code never holds issues: write:
//   --summarize   in the Android job (read-only token): reads results.json,
//                 prints what would be filed, and writes the failures to the
//                 step output `failures`. It never calls GitHub.
//   (default)     in the report job (issues: write, never on a PR): reads the
//                 failures from FAILURES_JSON and files them. On any event
//                 other than schedule, workflow_dispatch and push, or with
//                 --dry-run, it prints what it would do instead.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const LABEL = 'e2e-failure'
export const FILING_EVENTS = ['schedule', 'workflow_dispatch', 'push']
// Reported when the job died before results.json existed (build, emulator).
export const RUN_FAILURE_FLOW = 'android-run'
const MAX_ERROR_CHARS = 500
// Published instead of the error when the password scrub didn't finish: the
// repo is public, and unscrubbed error text is not safe to post.
export const WITHHELD_ERROR =
  'Error text withheld: the password scrub did not finish. See the run log.'

export function issueTitle(flow, platform = 'android') {
  return `E2E failure: ${flow} (${platform})`
}

export function shouldFile(eventName) {
  return FILING_EVENTS.includes(eventName)
}

// results: the parsed results.json, or null when it is missing or unreadable.
// Returns one { flow, error } per failed flow. Error text is passed on only
// when `scrubbed` says the runner's password scrub finished.
export function failuresFrom(results, { scrubbed = false } = {}) {
  if (!Array.isArray(results)) {
    return [
      {
        flow: RUN_FAILURE_FLOW,
        error: 'No results.json: the job failed before any flow ran (APK build or emulator).',
      },
    ]
  }
  const seen = new Set()
  const failures = []
  for (const result of results) {
    if (!result || result.status === 'passed' || seen.has(result.flow)) continue
    seen.add(result.flow)
    failures.push({ flow: String(result.flow), error: scrubbed ? result.error : WITHHELD_ERROR })
  }
  return failures
}

// The error goes in a code block, so an @name or markdown in it does nothing.
export function errorBlock(error) {
  let text = String(error ?? '').trim() || '(no error text)'
  if (text.length > MAX_ERROR_CHARS) text = `${text.slice(0, MAX_ERROR_CHARS)}…`
  return ['```', text.replace(/`/g, "'"), '```'].join('\n')
}

// artifactUrl is the upload step's own output, so the link exists only when
// the evidence really was uploaded.
export function reportBody({ failure, runUrl, artifact, artifactUrl = '' }) {
  const evidence = artifactUrl
    ? `Evidence: artifact \`${artifact}\` (${artifactUrl}).`
    : `Evidence: artifact \`${artifact}\` was not uploaded (no flow ran, or the password scrub did not finish).`
  return [
    `The \`${failure.flow}\` Android E2E flow failed.`,
    '',
    `Run: ${runUrl}`,
    evidence,
    '',
    errorBlock(failure.error),
  ].join('\n')
}

// Pure: what to do for each failure, given the open issues found for their
// titles ([{ number, title }]). Matches by exact title.
export function planReports({
  failures,
  openIssues,
  runUrl,
  artifact = 'e2e-android',
  platform = 'android',
  artifactUrl = '',
}) {
  const byTitle = new Map(openIssues.map((issue) => [issue.title, issue.number]))
  return failures.map((failure) => {
    const title = issueTitle(failure.flow, platform)
    const body = reportBody({ failure, runUrl, artifact, artifactUrl })
    const number = byTitle.get(title)
    return number === undefined
      ? { action: 'create', title, body }
      : { action: 'comment', number, title, body }
  })
}

export function ghArgs(report) {
  return report.action === 'create'
    ? ['issue', 'create', '--title', report.title, '--label', LABEL, '--body', report.body]
    : ['issue', 'comment', String(report.number), '--body', report.body]
}

// Open issues whose title matches, whatever their labels: a search per title,
// so a removed label or a long backlog can't hide the issue and cause a
// duplicate. The search is fuzzy; planReports keeps the exact comparison.
export function findOpenIssues(gh, titles) {
  const found = []
  for (const title of titles) {
    const out = gh([
      'issue',
      'list',
      '--state',
      'open',
      '--search',
      `"${title}" in:title`,
      '--limit',
      '100',
      '--json',
      'number,title',
    ])
    found.push(...JSON.parse(out))
  }
  return found
}

// gh(args) returns stdout and throws on failure. Tests inject a fake.
export function report({ failures, gh, dryRun, runUrl, artifactUrl = '', log = console.log }) {
  if (failures.length === 0) {
    log('[report] No failed flows; nothing to report.')
    return []
  }
  let openIssues = []
  // gh is absent in --summarize: that step holds no token and calls nothing.
  if (gh) {
    try {
      openIssues = findOpenIssues(
        gh,
        failures.map((failure) => issueTitle(failure.flow))
      )
    } catch (error) {
      if (!dryRun) throw error
      log(`[report] Could not look up open issues (${error.message}); assuming none.`)
    }
  }
  const plan = planReports({ failures, openIssues, runUrl, artifactUrl })
  for (const item of plan) {
    const target = item.action === 'create' ? `"${item.title}"` : `#${item.number}`
    if (dryRun || !gh) {
      log(`[report] dry run: would ${item.action} ${target}\n${item.body}\n`)
    } else {
      gh(ghArgs(item))
      log(`[report] ${item.action === 'create' ? 'Opened' : 'Commented on'} ${target}`)
    }
  }
  return plan
}

// The report job gets the failures as JSON from the Android job's output.
// Empty or unreadable means that job died before it could summarize.
export function failuresFromJson(json) {
  let parsed = null
  try {
    parsed = JSON.parse(json)
  } catch {
    parsed = null
  }
  if (!Array.isArray(parsed)) return failuresFrom(null)
  const failures = parsed
    .filter((failure) => failure && typeof failure.flow === 'string')
    .map((failure) => ({ flow: failure.flow, error: String(failure.error ?? '') }))
  // The report job runs only when the Android job failed. No failed flow then
  // means it failed somewhere else, which still deserves an issue.
  if (failures.length === 0) {
    return [
      {
        flow: RUN_FAILURE_FLOW,
        error: 'The job failed, but no flow did (setup, teardown or upload). See the run log.',
      },
    ]
  }
  return failures
}

function runGh(args) {
  const result = spawnSync('gh', args, { encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(`gh ${args.slice(0, 2).join(' ')} failed: ${result.stderr || result.error}`)
  }
  return result.stdout
}

function readResults(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function main() {
  const args = process.argv.slice(2)
  const event = process.env.GITHUB_EVENT_NAME || ''
  const server = process.env.GITHUB_SERVER_URL || 'https://github.com'
  const repo = process.env.GITHUB_REPOSITORY || 'ahmadao2214/wander-fit-app'
  const runUrl = `${server}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID || 'local'}`
  const artifactUrl = process.env.ARTIFACT_URL || ''

  if (args.includes('--summarize')) {
    const resultsIndex = args.indexOf('--results')
    const file =
      resultsIndex === -1
        ? path.join(root, 'e2e-artifacts/android/results.json')
        : path.resolve(args[resultsIndex + 1])
    const scrubbed = fs.existsSync(path.join(path.dirname(file), '.scrubbed'))
    const results = readResults(file)
    // A passing run with no results file can't happen; a missing file on a
    // green job would still be reported, so the report job also checks the
    // job result before it runs.
    const failures = failuresFrom(results, { scrubbed })
    report({ failures, gh: null, dryRun: true, runUrl, artifactUrl })
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `failures=${JSON.stringify(failures)}\n`)
    }
    return
  }

  const dryRun = args.includes('--dry-run') || !shouldFile(event)
  if (dryRun) console.log(`[report] Dry run (event: ${event || 'none'}); filing nothing.`)
  try {
    report({
      failures: failuresFromJson(process.env.FAILURES_JSON || ''),
      gh: runGh,
      dryRun,
      runUrl,
      artifactUrl,
    })
  } catch (error) {
    console.error(`[report] ${error.message}`)
    process.exitCode = 1
  }
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) main()
