#!/usr/bin/env node
// Performance baseline: run a Maestro perf journey on an iOS simulator while
// Instruments records, then summarize hangs and thread busy time into JSON.
//
// The simulator records with Time Profiler: potential hangs, and how long the
// main and JavaScript threads were busy. Apple's Animation Hitches instrument
// (dropped frames) only runs on a physical iPhone, so --template "Animation
// Hitches" with a device UDID adds hitch counts there.
//
//   node scripts/perf/baseline.mjs run <journey> [--runs 5] [--device <udid>] [--label <name>] [--template <name>]
//   node scripts/perf/baseline.mjs summarize <trace> [--pids <pid,...>] [--exclude-pids <pid,...>]
//   node scripts/perf/baseline.mjs resummarize <label> <journey> [--exclude-pids <pid,...>]
//
// Journeys are .maestro/perf/<journey>.yaml. Each run writes
// perf/runs/<label>/<journey>-<n>.trace (gitignored) and the summary is
// perf/results/<label>-<journey>.json. Measure a Release build: a dev build's
// numbers say more about Metro and the dev runtime than about the app.
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const APP_ID = 'com.offseason.asrafit'
const APP_PROCESS = 'asrafit'
const DEFAULT_TEMPLATE = 'Time Profiler'

function fail(message) {
  console.error(`perf: ${message}`)
  process.exit(1)
}

function pidList(flag, value) {
  const pids = (value ?? '').split(',').map((p) => Number.parseInt(p, 10))
  if (!value || pids.some((p) => !Number.isInteger(p) || p <= 0))
    throw new Error(`${flag} needs a comma-separated list of pids`)
  return pids
}

export function parseArgs(argv) {
  const [command, ...rest] = argv
  const options = {
    runs: 5,
    device: null,
    label: null,
    template: DEFAULT_TEMPLATE,
    excludePids: [],
    pids: null,
    positional: [],
  }
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]
    if (arg === '--runs') options.runs = Number.parseInt(rest[++i], 10)
    else if (arg === '--device') options.device = rest[++i]
    else if (arg === '--label') options.label = rest[++i]
    else if (arg === '--template') options.template = rest[++i]
    else if (arg === '--exclude-pids') options.excludePids = pidList(arg, rest[++i])
    else if (arg === '--pids') options.pids = pidList(arg, rest[++i])
    else options.positional.push(arg)
  }
  if (!Number.isInteger(options.runs) || options.runs < 1)
    throw new Error('--runs must be a positive integer')
  return { command, ...options }
}

function bootedDevice() {
  const out = spawnSync('xcrun', ['simctl', 'list', 'devices', 'booted', '-j'], {
    encoding: 'utf8',
  })
  const devices = Object.values(JSON.parse(out.stdout).devices).flat()
  const iphone17 = devices.find((d) => d.name === 'iPhone 17')
  if (!iphone17) fail('no booted iPhone 17; pass --device <udid>')
  return iphone17.udid
}

// xctrace export takes most of a summary's time (about 30 s for a minute-long
// Time Profiler trace), so exports run as child processes that can overlap.
function xml(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('xcrun', ['xctrace', 'export', ...args])
    const out = []
    let err = ''
    child.stdout.on('data', (d) => out.push(d))
    child.stderr.on('data', (d) => (err += d))
    child.on('error', reject)
    child.on('close', (code) =>
      code === 0
        ? resolve(Buffer.concat(out).toString('utf8'))
        : reject(new Error(`xctrace export failed: ${err}`))
    )
  })
}

// How long the capture ran and why it ended, from a trace's table of contents.
export function captureInfo(toc) {
  const duration = Number(toc.match(/<duration>([\d.]+)</)?.[1] ?? NaN)
  const endReason = toc.match(/<end-reason>([^<]*)</)?.[1] ?? null
  return { durationS: Number.isFinite(duration) ? duration : null, endReason }
}

// A capture is whole when the harness stopped it (not a time limit or an
// instrument failure) and it lasted about as long as the journey. Maestro's
// own start-up overlaps the capture, so allow a small shortfall.
export function captureCovers({ durationS, endReason }, flowMs, slackMs = 3000) {
  return (
    endReason === 'User pressed Stop' && durationS !== null && durationS * 1000 >= flowMs - slackMs
  )
}

// The table schemas in a trace's table of contents, e.g. "hitches", "potential-hangs".
export function tableSchemas(toc) {
  return [...new Set([...toc.matchAll(/<table [^>]*schema="([^"]+)"/g)].map((m) => m[1]))]
}

// Rows of an exported table as { tag: { value, fmt } } for the given tags.
// xctrace writes each value once with id="n" and later rows say ref="n", so
// refs are resolved against earlier ids.
export function tableRows(tableXml, tags) {
  const seen = new Map()
  const rows = []
  for (const chunk of tableXml.split('<row>').slice(1)) {
    const row = {}
    for (const tag of tags) {
      const ref = chunk.match(new RegExp(`<${tag} ref="(\\d+)"/>`))
      const def = chunk.match(new RegExp(`<${tag} id="(\\d+)"(?: fmt="([^"]*)")?>([^<]*)`))
      if (def && (!ref || def.index < ref.index)) {
        const value = { value: def[3], fmt: def[2] ?? def[3] }
        seen.set(def[1], value)
        row[tag] = value
      } else if (ref) {
        row[tag] = seen.get(ref[1]) ?? null
      }
    }
    rows.push(row)
  }
  return rows
}

// Thread name without the "(0x…) (app, pid: n)" suffix.
export function threadName(fmt) {
  return (fmt ?? '').replace(/ \(0x[0-9a-f]+\).*$/, '')
}

// The pid in a thread's "(asrafit, pid: 123)" suffix, or null for another process.
export function appPid(fmt) {
  const m = (fmt ?? '').match(new RegExp(`\\(${APP_PROCESS}, pid: (\\d+)\\)`))
  return m ? Number(m[1]) : null
}

// A thread of the app under test. --all-processes records every simulator on
// the Mac, and another simulator can run a build with the same process name, so
// rows are kept only for the pids that ran on the target device.
export function isAppThread(fmt, pids) {
  const pid = appPid(fmt)
  return pid !== null && (!pids || pids.has(pid))
}

// The app instance that was running when the journey ended: of the candidate
// pids, the one with the latest sample. A cold start kills one instance and
// launches another; only the new one belongs to the journey.
export function lastAppPid(tableXml, candidates) {
  const threads = new Map()
  let best = null
  let bestTime = -1
  for (const chunk of tableXml.split('<row>').slice(1)) {
    const time = Number(chunk.match(/<sample-time[^>]*>(\d+)</)?.[1] ?? -1)
    const t = chunk.match(/<thread (?:id="(\d+)" fmt="([^"]*)"|ref="(\d+)")/)
    if (!t) continue
    if (t[1]) threads.set(t[1], t[2])
    const pid = appPid(t[1] ? t[2] : threads.get(t[3]))
    if (pid !== null && candidates.has(pid) && time > bestTime) {
      best = pid
      bestTime = time
    }
  }
  return best
}

// Every app pid that appears in an exported table.
export function appPidsIn(tableXml) {
  return new Set(
    [...tableXml.matchAll(/fmt="[^"]*"/g)].map((m) => appPid(m[0])).filter((p) => p !== null)
  )
}

// Busy ms per thread role from a time-profile table, app threads only.
export function threadBusy(rows, pids) {
  const busy = { mainMs: 0, jsMs: 0, appMs: 0 }
  for (const row of rows) {
    if (!row.thread || !isAppThread(row.thread.fmt, pids)) continue
    const ms = Number(row.weight?.value ?? 0) / 1e6
    busy.appMs += ms
    const name = threadName(row.thread.fmt)
    if (name === 'Main Thread') busy.mainMs += ms
    else if (/javascript|hermes|js thread/i.test(name)) busy.jsMs += ms
  }
  for (const key of Object.keys(busy)) busy[key] = Math.round(busy[key])
  return busy
}

// Main-thread ms spent in Reanimated's per-frame flush (worklet animations
// and frame callbacks), read from each sample's backtrace. A diagnostic: it
// shows how much of the main thread's work is animation frames.
export const FLUSH_FRAME = /AnimationFrameBatchinator/

export function mainFlushMs(tableXml, pids) {
  const frames = new Map()
  // Attributes vary (inlined="true" can sit between id and name), so match name anywhere in the tag.
  for (const m of tableXml.matchAll(/<frame id="(\d+)"[^>]*?\sname="([^"]*)"/g))
    frames.set(m[1], m[2])
  const threads = new Map()
  const backtraces = new Map()
  const weights = new Map()
  let ms = 0
  for (const chunk of tableXml.split('<row>').slice(1)) {
    const t = chunk.match(/<thread (?:id="(\d+)" fmt="([^"]*)"|ref="(\d+)")/)
    if (!t) continue
    if (t[1]) threads.set(t[1], t[2])
    const thread = t[1] ? t[2] : (threads.get(t[3]) ?? '')
    const w = chunk.match(/<weight (?:id="(\d+)"[^>]*>(\d+)<\/weight>|ref="(\d+)"\/>)/)
    if (w?.[1]) weights.set(w[1], Number(w[2]))
    const weight = w ? (w[1] ? Number(w[2]) : (weights.get(w[3]) ?? 0)) : 0
    const bt = chunk.match(
      /<tagged-backtrace (?:id="(\d+)">([\s\S]*?)<\/tagged-backtrace>|ref="(\d+)"\/>)/
    )
    let ids = []
    if (bt?.[1]) {
      ids = [...bt[2].matchAll(/<frame (?:id|ref)="(\d+)"/g)].map((m) => m[1])
      backtraces.set(bt[1], ids)
    } else if (bt) {
      ids = backtraces.get(bt[3]) ?? []
    }
    if (threadName(thread) !== 'Main Thread' || !isAppThread(thread, pids)) continue
    if (ids.some((id) => FLUSH_FRAME.test(frames.get(id) ?? ''))) ms += weight / 1e6
  }
  return Math.round(ms)
}

// Durations in ns of an app's rows in a table with a duration column.
export function appDurations(rows, pids) {
  return rows
    .filter((r) => isAppThread(r.thread?.fmt, pids) && r.duration)
    .map((r) => Number(r.duration.value))
}

export function stats(values) {
  if (values.length === 0) return { count: 0, totalMs: 0, maxMs: 0 }
  const ms = values.map((ns) => ns / 1e6)
  return {
    count: ms.length,
    totalMs: Math.round(ms.reduce((a, b) => a + b, 0) * 10) / 10,
    maxMs: Math.round(Math.max(...ms) * 10) / 10,
  }
}

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// The app pid to measure in a trace with none recorded: what's left after
// excludePids must be a single pid, unless pickLast takes the last-running one.
// Returns an Error rather than guessing.
export function choosePids(profileXml, { excludePids = [], pickLast = false } = {}) {
  const candidates = new Set([...appPidsIn(profileXml)].filter((p) => !excludePids.includes(p)))
  if (candidates.size > 1 && !pickLast)
    return new Error(
      `several app processes (${[...candidates].join(', ')}); pass --pids or --exclude-pids`
    )
  const last = lastAppPid(profileXml, candidates)
  return new Set(last === null ? [] : [last])
}

async function table(tracePath, schema) {
  return xml([
    '--input',
    tracePath,
    '--xpath',
    `/trace-toc/run[@number="1"]/data/table[@schema="${schema}"]`,
  ])
}

// pids: the app process that ran the journey on the target device. Without
// pids, the app pids in the trace minus excludePids must leave exactly one,
// unless pickLast (resummarize of older traces that predate saved pids, where
// the caller has excluded other simulators' builds) picks the last-running one.
async function summarize(
  tracePath,
  { pids, excludePids = [], pickLast = false, requireProfile = false } = {}
) {
  const toc = await xml(['--input', tracePath, '--toc'])
  const schemas = tableSchemas(toc)
  const summary = { capture: captureInfo(toc) }
  const profile = schemas.includes('time-profile') ? await table(tracePath, 'time-profile') : null
  if (requireProfile && !profile) throw new Error(`${tracePath} has no time-profile table`)
  if (!pids) {
    pids = choosePids(profile ?? '', { excludePids, pickLast })
    if (pids instanceof Error) throw new Error(`${tracePath}: ${pids.message}`)
  }
  summary.pids = [...pids]
  if (schemas.includes('potential-hangs')) {
    summary.hangs = stats(
      appDurations(
        tableRows(await table(tracePath, 'potential-hangs'), ['duration', 'thread']),
        pids
      )
    )
  }
  if (profile) {
    summary.busy = threadBusy(tableRows(profile, ['thread', 'weight']), pids)
    if (summary.busy.appMs === 0)
      throw new Error(`${tracePath} has no samples for app pid ${[...pids].join(', ') || '(none)'}`)
    summary.busy.mainFlushMs = mainFlushMs(profile, pids)
    summary.busy.mainOtherMs = summary.busy.mainMs - summary.busy.mainFlushMs
    // jsMs depends on React Native's JS thread name; another runtime (Exact)
    // would read 0, so say whether the thread was found at all.
    summary.busy.jsThreadFound = tableRows(profile, ['thread']).some(
      (r) =>
        isAppThread(r.thread?.fmt, pids) &&
        /javascript|hermes|js thread/i.test(threadName(r.thread.fmt))
    )
  }
  const hitchSchema = schemas.find((s) => /^hitches$/.test(s))
  if (hitchSchema) {
    summary.hitches = stats(
      appDurations(tableRows(await table(tracePath, hitchSchema), ['duration', 'thread']), pids)
    )
  }
  return summary
}

// The app's pid on one simulator, or null when it isn't running there.
export function pidFromLaunchctl(listing, bundleId = APP_ID) {
  const line = listing.split('\n').find((l) => l.includes(`UIKitApplication:${bundleId}[`))
  const pid = line ? Number(line.trim().split(/\s+/)[0]) : NaN
  return Number.isInteger(pid) && pid > 0 ? pid : null
}

function otherDevicesRunningApp(device) {
  const out = spawnSync('xcrun', ['simctl', 'list', 'devices', 'booted', '-j'], {
    encoding: 'utf8',
  })
  return Object.values(JSON.parse(out.stdout).devices)
    .flat()
    .filter((d) => d.udid !== device && devicePid(d.udid) !== null)
    .map((d) => `${d.name} (${d.udid})`)
}

// The app's pid on a simulator, null when it isn't running there. Throws when
// the simulator can't be asked, so a failed lookup never passes as "not running".
function devicePid(device) {
  const out = spawnSync('xcrun', ['simctl', 'spawn', device, 'launchctl', 'list'], {
    encoding: 'utf8',
  })
  if (out.status !== 0) throw new Error(`can't list processes on ${device}: ${out.stderr.trim()}`)
  return pidFromLaunchctl(out.stdout)
}

// Whether a recorded run counts, from what happened during it. Pure, so the
// failure cases are tested without a simulator.
export function classifyRun({
  exitedEarly,
  maestroStatus,
  maestroOutput = '',
  pidBefore,
  pidAfter,
  relaunches,
  code,
  traceExists,
  log = '',
}) {
  if (exitedEarly)
    return { ok: false, error: `xctrace stopped before the journey ended: ${log.slice(-400)}` }
  if (maestroStatus !== 0) return { ok: false, error: maestroOutput.slice(-600) }
  if (pidAfter === null) return { ok: false, error: `${APP_ID} was not running after the journey` }
  if (relaunches && pidAfter === pidBefore)
    return { ok: false, error: 'the journey relaunches the app, but its pid did not change' }
  if (code !== 0 && !traceExists)
    return { ok: false, error: `xctrace exited ${code} without a trace: ${log.slice(-400)}` }
  return { ok: true, pids: [pidAfter] }
}

function runMaestro(device, flow) {
  return new Promise((resolve) => {
    const child = spawn('maestro', ['--device', device, 'test', flow], { cwd: root })
    let output = ''
    child.stdout.on('data', (d) => (output += d))
    child.stderr.on('data', (d) => (output += d))
    child.on('error', (e) => resolve({ status: 1, output: String(e) }))
    child.on('close', (status) => resolve({ status, output }))
  })
}

function record(device, tracePath, flow, template) {
  const pidBefore = devicePid(device)
  // A journey that launches the app (cold start) must end on a new instance.
  const relaunches = /launchApp/.test(fs.readFileSync(flow, 'utf8'))
  const recorder = spawn(
    'xcrun',
    [
      'xctrace',
      'record',
      '--template',
      template,
      '--device',
      device,
      '--all-processes',
      '--time-limit',
      '10m',
      '--output',
      tracePath,
      '--no-prompt',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  )
  let log = ''
  let exited = false
  const exit = new Promise((resolve) => recorder.on('exit', resolve))
  exit.then(() => (exited = true))
  recorder.stdout.on('data', (d) => (log += d))
  recorder.stderr.on('data', (d) => (log += d))
  return new Promise((resolve, reject) => {
    recorder.on('error', reject)
    const started = Date.now()
    const waitForStart = setInterval(async () => {
      const recording = /Ctrl-C to stop|Starting recording/i.test(log)
      if (!recording && !exited && Date.now() - started < 30000) return
      clearInterval(waitForStart)
      if (!recording || exited) {
        if (!exited) recorder.kill('SIGINT')
        await exit
        resolve({ ok: false, error: `xctrace did not start recording: ${log.slice(-400)}` })
        return
      }
      const t0 = Date.now()
      // Async, so the recorder's exit event is delivered while Maestro runs.
      const maestro = await runMaestro(device, flow)
      const flowMs = Date.now() - t0
      const pidAfter = devicePid(device)
      const exitedEarly = exited
      if (!exitedEarly) recorder.kill('SIGINT')
      const code = await exit
      resolve({
        flowMs,
        ...classifyRun({
          exitedEarly,
          maestroStatus: maestro.status,
          maestroOutput: maestro.output,
          pidBefore,
          pidAfter,
          relaunches,
          code,
          traceExists: fs.existsSync(tracePath),
          log,
        }),
      })
    }, 250)
  })
}

async function run({ positional, runs, device, label, template }) {
  const journey = positional[0]
  if (!journey) fail('name a journey from .maestro/perf/')
  const flow = path.join(root, '.maestro/perf', `${journey}.yaml`)
  if (!fs.existsSync(flow)) fail(`${flow} does not exist`)
  const udid = device ?? bootedDevice()
  const name = label ?? new Date().toISOString().slice(0, 10)
  const runDir = path.join(root, 'perf/runs', name)
  fs.mkdirSync(runDir, { recursive: true })
  fs.mkdirSync(path.join(root, 'perf/results'), { recursive: true })

  const results = []
  for (let n = 1; n <= runs; n++) {
    const tracePath = path.join(runDir, `${journey}-${n}.trace`)
    fs.rmSync(tracePath, { recursive: true, force: true })
    // Checked before every run: another simulator can start the app mid-batch.
    const others = otherDevicesRunningApp(udid)
    if (others.length)
      fail(
        `${APP_ID} is also running on ${others.join(', ')}. Another simulator's app competes for the CPU and can be mistaken for this one; stop it (or ask the thread using it) first.`
      )
    const { flowMs, ok, error, pids } = await record(udid, tracePath, flow, template)
    if (!ok) {
      results.push({ run: n, ok, flowMs, error })
      console.log(`run ${n}: failed: ${error.split('\n')[0]}`)
      continue
    }
    // Summarize only after the recording stops, so the export's CPU load never
    // overlaps the next run's recording.
    let summary
    try {
      summary = await summarize(tracePath, {
        pids: new Set(pids),
        requireProfile: template === DEFAULT_TEMPLATE,
      })
      if (!captureCovers(summary.capture, flowMs))
        throw new Error(
          `the capture doesn't cover the journey (${summary.capture.durationS ?? '?'} s, ended: ${summary.capture.endReason ?? 'unknown'})`
        )
    } catch (e) {
      results.push({ run: n, ok: false, flowMs, error: e.message })
      console.log(`run ${n}: failed: ${e.message}`)
      continue
    }
    results.push({ run: n, ok, flowMs, ...summary })
    console.log(
      `run ${n}: ${flowMs} ms, hangs ${summary.hangs?.count ?? 'n/a'} (${summary.hangs?.totalMs ?? 'n/a'} ms), main ${summary.busy?.mainOtherMs ?? 'n/a'} ms + flush ${summary.busy?.mainFlushMs ?? 'n/a'} ms, JS ${summary.busy?.jsMs ?? 'n/a'} ms${summary.hitches ? `, hitches ${summary.hitches.count}` : ''}`
    )
  }

  writeReport({ journey, label: name, template, device: udid, results })
}

export function aggregate(values) {
  return values.length
    ? { median: median(values), min: Math.min(...values), max: Math.max(...values) }
    : null
}

export function buildReport({
  journey,
  label,
  template,
  device,
  commit,
  recordedAt,
  notes,
  results,
}) {
  const good = results.filter((r) => r.ok)
  const pick = (f) => good.map(f).filter((v) => typeof v === 'number')
  return {
    journey,
    label,
    template,
    device,
    build: 'Release simulator (scripts/verify/explore.mjs build)',
    commit,
    recordedAt,
    ...(notes ? { notes } : {}),
    runs: results.length,
    failedRuns: results.length - good.length,
    flowMs: aggregate(pick((r) => r.flowMs)),
    flowMsNote:
      "Wall time of the whole Maestro run, including Maestro's own start-up (20-30 s). Not a launch time.",
    hangCount: aggregate(pick((r) => r.hangs?.count)),
    hangTotalMs: aggregate(pick((r) => r.hangs?.totalMs)),
    hangMaxMs: aggregate(pick((r) => r.hangs?.maxMs)),
    mainThreadBusyMs: aggregate(pick((r) => r.busy?.mainMs)),
    mainThreadFlushMs: aggregate(pick((r) => r.busy?.mainFlushMs)),
    mainThreadOtherMs: aggregate(pick((r) => r.busy?.mainOtherMs)),
    jsThreadBusyMs: aggregate(pick((r) => r.busy?.jsMs)),
    jsThreadFound: good.every((r) => r.busy?.jsThreadFound !== false),
    appBusyMs: aggregate(pick((r) => r.busy?.appMs)),
    hitchCount: aggregate(pick((r) => r.hitches?.count)),
    hitchTotalMs: aggregate(pick((r) => r.hitches?.totalMs)),
    results,
  }
}

function writeReport({ journey, label, template, device, results, commit, recordedAt, notes }) {
  commit ??= spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).stdout.trim()
  recordedAt ??= new Date().toISOString()
  const out = path.join(root, 'perf/results', `${label}-${journey}.json`)
  fs.writeFileSync(
    out,
    `${JSON.stringify(buildReport({ journey, label, template, device, commit, recordedAt, notes, results }), null, 2)}\n`
  )
  // Match the repo's formatter so a committed report passes the format check.
  spawnSync('bunx', ['--no-install', 'oxfmt', '--write', out], { cwd: root })
  console.log(`wrote ${path.relative(root, out)}`)
}

// Re-read the saved traces of a finished run (after a change to summarize) and
// rewrite its report. It keeps each run's journey time and pids, and the
// original commit and capture time. Runs recorded before pids were saved use
// every app pid in the trace except --exclude-pids (another simulator's build).
async function resummarize({ positional, excludePids }) {
  const [label, journey] = positional
  const out = path.join(root, 'perf/results', `${label}-${journey}.json`)
  if (!fs.existsSync(out)) fail(`${out} does not exist`)
  const old = JSON.parse(fs.readFileSync(out, 'utf8'))
  const results = await Promise.all(
    old.results.map(async (r) =>
      r.ok
        ? {
            run: r.run,
            ok: r.ok,
            flowMs: r.flowMs,
            ...(await summarize(path.join(root, 'perf/runs', label, `${journey}-${r.run}.trace`), {
              pids: r.pids ? new Set(r.pids) : undefined,
              excludePids,
              pickLast: true,
            })),
          }
        : r
    )
  )
  writeReport({
    journey,
    label,
    template: old.template,
    device: old.device,
    results,
    commit: old.commit,
    recordedAt: old.recordedAt,
    notes: old.notes,
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (error) {
    fail(error.message)
  }
  if (args.command === 'run') run(args).catch((error) => fail(error.message))
  else if (args.command === 'summarize')
    summarize(args.positional[0], {
      pids: args.pids ? new Set(args.pids) : undefined,
      excludePids: args.excludePids,
    }).then(
      (s) => console.log(JSON.stringify(s, null, 2)),
      (error) => fail(error.message)
    )
  else if (args.command === 'resummarize') resummarize(args).catch((error) => fail(error.message))
  else
    fail(
      'usage: baseline.mjs run <journey> [--runs 5] [--device <udid>] [--label <name>] [--template "Time Profiler"] | summarize <trace> [--pids <pid,...>] [--exclude-pids <pid,...>] | resummarize <label> <journey> [--exclude-pids <pid,...>]'
    )
}
