#!/usr/bin/env node
// Files one GitHub issue per failed Android E2E flow (#83), or comments on the
// open one with the same title. It only files on schedule, workflow_dispatch
// and push runs; anything else (a PR, a local run) is a dry run that prints
// what it would do. It never fixes, closes or edits anything.
//
//   node scripts/verify/report-failures.mjs [--dry-run] [--results <file>]
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

export function issueTitle(flow, platform = 'android') {
  return `E2E failure: ${flow} (${platform})`
}

export function shouldFile(eventName) {
  return FILING_EVENTS.includes(eventName)
}

// results: the parsed results.json, or null when it is missing or unreadable.
// Returns one { flow, error } per failed flow.
export function failuresFrom(results) {
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
    failures.push({ flow: String(result.flow), error: result.error })
  }
  return failures
}

// The error goes in a code block, so an @name or markdown in it does nothing.
export function errorBlock(error) {
  let text = String(error ?? '').trim() || '(no error text)'
  if (text.length > MAX_ERROR_CHARS) text = `${text.slice(0, MAX_ERROR_CHARS)}…`
  return ['```', text.replace(/`/g, "'"), '```'].join('\n')
}

export function reportBody({ failure, runUrl, artifact, evidenceUploaded }) {
  const evidence = evidenceUploaded
    ? `Evidence: artifact \`${artifact}\` on the run (${runUrl}#artifacts).`
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

// Pure: what to do for each failure, given the open e2e-failure issues
// ([{ number, title }]). Matches by exact title.
export function planReports({
  failures,
  openIssues,
  runUrl,
  artifact = 'e2e-android',
  platform = 'android',
  evidenceUploaded = false,
}) {
  const byTitle = new Map(openIssues.map((issue) => [issue.title, issue.number]))
  return failures.map((failure) => {
    const title = issueTitle(failure.flow, platform)
    const body = reportBody({ failure, runUrl, artifact, evidenceUploaded })
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

export function listOpenIssues(gh) {
  const out = gh([
    'issue',
    'list',
    '--label',
    LABEL,
    '--state',
    'open',
    '--limit',
    '200',
    '--json',
    'number,title',
  ])
  return JSON.parse(out)
}

// gh(args) returns stdout and throws on failure. Tests inject a fake.
export function report({ failures, gh, dryRun, runUrl, evidenceUploaded, log = console.log }) {
  if (failures.length === 0) {
    log('[report] No failed flows; nothing to report.')
    return []
  }
  let openIssues = []
  try {
    openIssues = listOpenIssues(gh)
  } catch (error) {
    if (!dryRun) throw error
    log(`[report] Could not list open ${LABEL} issues (${error.message}); assuming none.`)
  }
  const plan = planReports({ failures, openIssues, runUrl, evidenceUploaded })
  for (const item of plan) {
    const target = item.action === 'create' ? `"${item.title}"` : `#${item.number}`
    if (dryRun) {
      log(`[report] dry run: would ${item.action} ${target}\n${item.body}\n`)
    } else {
      gh(ghArgs(item))
      log(`[report] ${item.action === 'create' ? 'Opened' : 'Commented on'} ${target}`)
    }
  }
  return plan
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
  const resultsIndex = args.indexOf('--results')
  const file =
    resultsIndex === -1
      ? path.join(root, 'e2e-artifacts/android/results.json')
      : path.resolve(args[resultsIndex + 1])
  const event = process.env.GITHUB_EVENT_NAME || ''
  const dryRun = args.includes('--dry-run') || !shouldFile(event)
  if (dryRun) console.log(`[report] Dry run (event: ${event || 'none'}); filing nothing.`)
  const server = process.env.GITHUB_SERVER_URL || 'https://github.com'
  const repo = process.env.GITHUB_REPOSITORY || 'ahmadao2214/wander-fit-app'
  const runUrl = `${server}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID || 'local'}`
  try {
    report({
      failures: failuresFrom(readResults(file)),
      gh: runGh,
      dryRun,
      runUrl,
      evidenceUploaded: fs.existsSync(path.join(path.dirname(file), '.scrubbed')),
    })
  } catch (error) {
    console.error(`[report] ${error.message}`)
    process.exitCode = 1
  }
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) main()
