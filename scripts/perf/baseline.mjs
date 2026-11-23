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
//   node scripts/perf/baseline.mjs summarize <trace>
//   node scripts/perf/baseline.mjs resummarize <label> <journey>
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

export function parseArgs(argv) {
  const [command, ...rest] = argv
  const options = { runs: 5, device: null, label: null, template: DEFAULT_TEMPLATE, positional: [] }
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]
    if (arg === '--runs') options.runs = Number.parseInt(rest[++i], 10)
    else if (arg === '--device') options.device = rest[++i]
    else if (arg === '--label') options.label = rest[++i]
    else if (arg === '--template') options.template = rest[++i]
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

export function isAppThread(fmt) {
  return (fmt ?? '').includes(`(${APP_PROCESS}, pid:`)
}

// Busy ms per thread role from a time-profile table, app threads only.
export function threadBusy(rows) {
  const busy = { mainMs: 0, jsMs: 0, appMs: 0 }
  for (const row of rows) {
    if (!row.thread || !isAppThread(row.thread.fmt)) continue
    const ms = Number(row.weight?.value ?? 0) / 1e6
    busy.appMs += ms
    const name = threadName(row.thread.fmt)
    if (name === 'Main Thread') busy.mainMs += ms
    else if (/javascript|hermes|js thread/i.test(name)) busy.jsMs += ms
  }
  for (const key of Object.keys(busy)) busy[key] = Math.round(busy[key])
  return busy
}

// Main-thread ms spent in Reanimated's per-frame flush, read from each sample's
// backtrace. While an XCTest driver (Maestro) is attached, this flush runs on
// every frame even when the app is idle (about 3 ms in 12 s idle without a
// driver, 130-250 ms a second with one), so it is reported apart from the rest
// of the main thread's work.
export const FLUSH_FRAME = /AnimationFrameBatchinator/

export function mainFlushMs(tableXml) {
  const frames = new Map()
  for (const m of tableXml.matchAll(/<frame id="(\d+)" name="([^"]*)"/g)) frames.set(m[1], m[2])
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
    if (threadName(thread) !== 'Main Thread' || !isAppThread(thread)) continue
    if (ids.some((id) => FLUSH_FRAME.test(frames.get(id) ?? ''))) ms += weight / 1e6
  }
  return Math.round(ms)
}

// Durations in ns of an app's rows in a table with a duration column.
export function appDurations(rows) {
  return rows
    .filter((r) => isAppThread(r.thread?.fmt) && r.duration)
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

async function table(tracePath, schema) {
  return xml([
    '--input',
    tracePath,
    '--xpath',
    `/trace-toc/run[@number="1"]/data/table[@schema="${schema}"]`,
  ])
}

async function summarize(tracePath) {
  const schemas = tableSchemas(await xml(['--input', tracePath, '--toc']))
  const summary = {}
  if (schemas.includes('potential-hangs')) {
    summary.hangs = stats(
      appDurations(tableRows(await table(tracePath, 'potential-hangs'), ['duration', 'thread']))
    )
  }
  if (schemas.includes('time-profile')) {
    const profile = await table(tracePath, 'time-profile')
    summary.busy = threadBusy(tableRows(profile, ['thread', 'weight']))
    summary.busy.mainFlushMs = mainFlushMs(profile)
    summary.busy.mainOtherMs = summary.busy.mainMs - summary.busy.mainFlushMs
  }
  const hitchSchema = schemas.find((s) => /^hitches$/.test(s))
  if (hitchSchema) {
    summary.hitches = stats(
      appDurations(tableRows(await table(tracePath, hitchSchema), ['duration', 'thread']))
    )
  }
  return summary
}

function record(device, tracePath, flow, template) {
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
  recorder.stdout.on('data', (d) => (log += d))
  recorder.stderr.on('data', (d) => (log += d))
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const waitForStart = setInterval(() => {
      if (/Ctrl-C to stop|Starting recording/i.test(log) || Date.now() - started > 30000) {
        clearInterval(waitForStart)
        const t0 = Date.now()
        const maestro = spawnSync('maestro', ['--device', device, 'test', flow], {
          cwd: root,
          encoding: 'utf8',
        })
        const flowMs = Date.now() - t0
        recorder.kill('SIGINT')
        recorder.on('exit', () =>
          resolve({
            flowMs,
            ok: maestro.status === 0,
            maestroTail: (maestro.stdout + maestro.stderr).slice(-600),
          })
        )
      }
    }, 250)
    recorder.on('error', reject)
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
    const { flowMs, ok, maestroTail } = await record(udid, tracePath, flow, template)
    if (!ok) {
      results.push({ run: n, ok, flowMs, error: maestroTail })
      console.log(`run ${n}: flow failed`)
      continue
    }
    // Summarize only after the recording stops, so the export's CPU load never
    // overlaps the next run's recording.
    const summary = await summarize(tracePath)
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

export function buildReport({ journey, label, template, device, commit, results }) {
  const good = results.filter((r) => r.ok)
  const pick = (f) => good.map(f).filter((v) => typeof v === 'number')
  return {
    journey,
    label,
    template,
    device,
    build: 'Release simulator (scripts/verify/explore.mjs build)',
    commit,
    recordedAt: new Date().toISOString(),
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
    appBusyMs: aggregate(pick((r) => r.busy?.appMs)),
    hitchCount: aggregate(pick((r) => r.hitches?.count)),
    hitchTotalMs: aggregate(pick((r) => r.hitches?.totalMs)),
    results,
  }
}

function writeReport({ journey, label, template, device, results }) {
  const commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).stdout.trim()
  const out = path.join(root, 'perf/results', `${label}-${journey}.json`)
  fs.writeFileSync(
    out,
    `${JSON.stringify(buildReport({ journey, label, template, device, commit, results }), null, 2)}\n`
  )
  console.log(`wrote ${path.relative(root, out)}`)
}

// Re-read the saved traces of a finished run (after a change to summarize) and
// rewrite its report, keeping each run's measured journey time.
async function resummarize({ positional }) {
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
            ...(await summarize(path.join(root, 'perf/runs', label, `${journey}-${r.run}.trace`))),
          }
        : r
    )
  )
  writeReport({ journey, label, template: old.template, device: old.device, results })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2))
  if (args.command === 'run') run(args).catch((error) => fail(error.message))
  else if (args.command === 'summarize')
    summarize(args.positional[0]).then(
      (s) => console.log(JSON.stringify(s, null, 2)),
      (error) => fail(error.message)
    )
  else if (args.command === 'resummarize') resummarize(args).catch((error) => fail(error.message))
  else
    fail(
      'usage: baseline.mjs run <journey> [--runs 5] [--device <udid>] [--label <name>] [--template "Time Profiler"] | summarize <trace> | resummarize <label> <journey>'
    )
}
