import {
  aggregate,
  appDurations,
  appPid,
  appPidsIn,
  lastAppPid,
  buildReport,
  captureCovers,
  captureInfo,
  choosePids,
  classifyRun,
  mainFlushMs,
  median,
  parseArgs,
  pidFromLaunchctl,
  stats,
  tableRows,
  tableSchemas,
  threadBusy,
  threadName,
} from './baseline.mjs'

describe('parseArgs', () => {
  it('reads the journey and options', () => {
    expect(parseArgs(['run', 'tabs', '--runs', '3', '--label', 'base', '--device', 'X'])).toEqual({
      command: 'run',
      runs: 3,
      device: 'X',
      label: 'base',
      template: 'Time Profiler',
      excludePids: [],
      pids: null,
      positional: ['tabs'],
    })
  })

  it('rejects a pid flag with no value', () => {
    expect(() => parseArgs(['summarize', 'x.trace', '--pids'])).toThrow('--pids')
  })

  it('defaults to five runs', () => {
    expect(parseArgs(['run', 'tabs']).runs).toBe(5)
  })

  it('rejects a run count that is not a positive integer', () => {
    expect(() => parseArgs(['run', 'tabs', '--runs', '0'])).toThrow('--runs')
  })
})

describe('tableSchemas', () => {
  it('lists each schema once', () => {
    const toc =
      '<table schema="hitches" a="1"/><table schema="potential-hangs"/><table schema="hitches" b="2"/>'
    expect(tableSchemas(toc)).toEqual(['hitches', 'potential-hangs'])
  })
})

const MAIN = 'Main Thread (0x11) (asrafit, pid: 9)'
const JS = 'com.facebook.react.runtime.JavaScript (0x12) (asrafit, pid: 9)'
const OTHER_APP = 'SpringBoard (0x13) (SpringBoard, pid: 1)'

const profile = [
  '<node>',
  `<row><thread id="1" fmt="${MAIN}"><tid id="2">17</tid></thread><weight id="3" fmt="1.00 ms">1000000</weight></row>`,
  '<row><thread ref="1"/><weight ref="3"/></row>',
  `<row><thread id="4" fmt="${JS}"><tid id="5">18</tid></thread><weight ref="3"/></row>`,
  `<row><thread id="6" fmt="${OTHER_APP}"><tid id="7">19</tid></thread><weight ref="3"/></row>`,
  '</node>',
].join('')

describe('tableRows', () => {
  it('resolves refs to values defined in earlier rows', () => {
    const rows = tableRows(profile, ['thread', 'weight'])
    expect(rows.map((r) => [threadName(r.thread.fmt), r.weight.value])).toEqual([
      ['Main Thread', '1000000'],
      ['Main Thread', '1000000'],
      ['com.facebook.react.runtime.JavaScript', '1000000'],
      ['SpringBoard', '1000000'],
    ])
  })
})

describe('threadBusy', () => {
  it("sums the app's main and JavaScript thread samples and skips other processes", () => {
    expect(threadBusy(tableRows(profile, ['thread', 'weight']))).toEqual({
      mainMs: 2,
      jsMs: 1,
      appMs: 3,
    })
  })
})

describe('appDurations', () => {
  it("keeps only the app's rows", () => {
    const hangs = [
      '<node>',
      `<row><duration id="1" fmt="300 ms">300000000</duration><thread id="2" fmt="${MAIN}">x</thread></row>`,
      `<row><duration id="3" fmt="500 ms">500000000</duration><thread id="4" fmt="${OTHER_APP}">y</thread></row>`,
      '<row><duration ref="1"/><thread ref="2"/></row>',
      '</node>',
    ].join('')
    expect(appDurations(tableRows(hangs, ['duration', 'thread']))).toEqual([300000000, 300000000])
  })
})

describe('mainFlushMs', () => {
  it("counts main-thread samples whose backtrace has Reanimated's frame flush, resolving refs", () => {
    const xml = [
      '<node>',
      `<row><thread id="1" fmt="${MAIN}">t</thread><weight id="2" fmt="1.00 ms">1000000</weight><tagged-backtrace id="3"><frame id="4" name="worklets::AnimationFrameBatchinator::flush()"/><frame id="5" name="main"/></tagged-backtrace></row>`,
      '<row><thread ref="1"/><weight ref="2"/><tagged-backtrace ref="3"/></row>',
      '<row><thread ref="1"/><weight ref="2"/><tagged-backtrace id="6"><frame ref="5"/></tagged-backtrace></row>',
      `<row><thread id="7" fmt="${JS}">t</thread><weight ref="2"/><tagged-backtrace ref="3"/></row>`,
      '</node>',
    ].join('')
    expect(mainFlushMs(xml)).toBe(2)
  })
})

describe('buildReport', () => {
  it('aggregates successful runs only', () => {
    const report = buildReport({
      journey: 'tabs',
      label: 'x',
      template: 'Time Profiler',
      device: 'D',
      commit: 'abc',
      results: [
        {
          run: 1,
          ok: true,
          flowMs: 10,
          hangs: { count: 0 },
          busy: { mainMs: 5, mainFlushMs: 3, mainOtherMs: 2, jsMs: 1, appMs: 6 },
        },
        { run: 2, ok: false, flowMs: 99 },
        {
          run: 3,
          ok: true,
          flowMs: 30,
          hangs: { count: 2 },
          busy: { mainMs: 9, mainFlushMs: 4, mainOtherMs: 5, jsMs: 2, appMs: 12 },
        },
      ],
    })
    expect(report.failedRuns).toBe(1)
    expect(report.flowMs).toEqual({ median: 20, min: 10, max: 30 })
    expect(report.mainThreadOtherMs).toEqual({ median: 3.5, min: 2, max: 5 })
    expect(report.hitchCount).toBeNull()
  })
})

describe('aggregate', () => {
  it('is null with no values', () => {
    expect(aggregate([])).toBeNull()
  })
})

const OTHER_SIM = 'Main Thread (0x21) (asrafit, pid: 5693)'

describe('pid scoping', () => {
  const twoSims = [
    '<node>',
    `<row><thread id="1" fmt="${MAIN}">t</thread><weight id="2" fmt="1.00 ms">1000000</weight><tagged-backtrace id="3"><frame id="4" inlined="true" name="worklets::AnimationFrameBatchinator::flush()"/></tagged-backtrace></row>`,
    `<row><thread id="5" fmt="${OTHER_SIM}">t</thread><weight ref="2"/><tagged-backtrace ref="3"/></row>`,
    '<row><thread ref="5"/><weight ref="2"/><tagged-backtrace ref="3"/></row>',
    '</node>',
  ].join('')

  it('reads the pid of the app under test only', () => {
    expect([
      appPid(MAIN),
      appPid(OTHER_APP),
      appPid('Main Thread (0x1) (asrafit-dev, pid: 7)'),
    ]).toEqual([9, null, null])
  })

  it('finds every app pid in a table', () => {
    expect([...appPidsIn(twoSims)].sort()).toEqual([5693, 9])
  })

  it("leaves out another simulator's process with the same name", () => {
    const pids = new Set([9])
    expect(threadBusy(tableRows(twoSims, ['thread', 'weight']), pids)).toEqual({
      mainMs: 1,
      jsMs: 0,
      appMs: 1,
    })
    expect(mainFlushMs(twoSims, pids)).toBe(1)
    expect(mainFlushMs(twoSims)).toBe(3)
  })
})

describe('lastAppPid', () => {
  it('picks the instance with the latest sample, so a cold start counts only the relaunched app', () => {
    const OLD = 'Main Thread (0x31) (asrafit, pid: 100)'
    const NEW = 'Main Thread (0x32) (asrafit, pid: 200)'
    const xml = [
      `<row><sample-time id="1">5</sample-time><thread id="2" fmt="${OLD}">t</thread></row>`,
      `<row><sample-time id="3">9</sample-time><thread id="4" fmt="${NEW}">t</thread></row>`,
      `<row><sample-time id="5">12</sample-time><thread id="6" fmt="${OTHER_SIM}">t</thread></row>`,
    ].join('')
    expect(lastAppPid(xml, new Set([100, 200]))).toBe(200)
  })
})

describe('classifyRun', () => {
  const good = {
    exitedEarly: false,
    maestroStatus: 0,
    pidBefore: 10,
    pidAfter: 10,
    relaunches: false,
    code: 0,
    traceExists: true,
  }

  it('accepts a complete run on the instance that ended the journey', () => {
    expect(classifyRun(good)).toEqual({ ok: true, pids: [10] })
  })

  it('rejects a recording that stopped before the journey ended, even when a partial trace exists', () => {
    expect(classifyRun({ ...good, exitedEarly: true }).ok).toBe(false)
  })

  it('rejects a cold start whose pid did not change', () => {
    expect(classifyRun({ ...good, relaunches: true }).ok).toBe(false)
    expect(classifyRun({ ...good, relaunches: true, pidAfter: 11 })).toEqual({
      ok: true,
      pids: [11],
    })
  })

  it('rejects a run whose recorder failed without leaving a trace', () => {
    expect(classifyRun({ ...good, code: 1, traceExists: false }).ok).toBe(false)
  })

  it('rejects a run with no app process afterwards or a failed journey', () => {
    expect(classifyRun({ ...good, pidAfter: null }).ok).toBe(false)
    expect(classifyRun({ ...good, maestroStatus: 1 }).ok).toBe(false)
  })
})

describe('captureCovers', () => {
  const toc =
    '<summary><duration>47.6</duration><end-reason>User pressed Stop</end-reason></summary>'

  it('accepts a capture the harness stopped after the whole journey', () => {
    expect(captureCovers(captureInfo(toc), 47751)).toBe(true)
  })

  it('rejects a capture that stopped collecting early, even if xctrace exited later', () => {
    expect(captureCovers(captureInfo(toc.replace('47.6', '20.1')), 47751)).toBe(false)
  })

  it('rejects a capture that ended for any other reason', () => {
    expect(
      captureCovers(captureInfo(toc.replace('User pressed Stop', 'Time limit reached')), 47751)
    ).toBe(false)
    expect(captureCovers(captureInfo('<summary/>'), 1000)).toBe(false)
  })
})

describe('choosePids', () => {
  const OLD = 'Main Thread (0x31) (asrafit, pid: 100)'
  const NEW = 'Main Thread (0x32) (asrafit, pid: 200)'
  const xml = [
    `<row><sample-time id="1">5</sample-time><thread id="2" fmt="${OLD}">t</thread></row>`,
    `<row><sample-time id="3">9</sample-time><thread id="4" fmt="${NEW}">t</thread></row>`,
    `<row><sample-time id="5">12</sample-time><thread id="6" fmt="${OTHER_SIM}">t</thread></row>`,
  ].join('')

  it('refuses to guess when several app pids remain, even when the wrong one ran last', () => {
    expect(choosePids(xml)).toBeInstanceOf(Error)
    expect(choosePids(xml, { excludePids: [5693] })).toBeInstanceOf(Error)
  })

  it('takes the single pid left after exclusions', () => {
    expect([...choosePids(xml, { excludePids: [5693, 100] })]).toEqual([200])
  })

  it('takes the last-running pid only when asked to', () => {
    expect([...choosePids(xml, { excludePids: [5693], pickLast: true })]).toEqual([200])
  })
})

describe('pidFromLaunchctl', () => {
  it("reads the app's pid from a simulator's launchctl listing", () => {
    const listing = [
      '87654\t0\tUIKitApplication:com.apple.mobilecal[725d][rb-legacy]',
      '58788\t0\tUIKitApplication:com.offseason.asrafit[b911][rb-legacy]',
    ].join('\n')
    expect(pidFromLaunchctl(listing)).toBe(58788)
  })

  it('is null when the app is not running', () => {
    expect(
      pidFromLaunchctl('-\t0\tUIKitApplication:com.offseason.asrafit[b911][rb-legacy]')
    ).toBeNull()
  })
})

describe('stats', () => {
  it('sums and maxes in milliseconds', () => {
    expect(stats([33000000, 50000000])).toEqual({ count: 2, totalMs: 83, maxMs: 50 })
  })

  it('reports zero for an empty table', () => {
    expect(stats([])).toEqual({ count: 0, totalMs: 0, maxMs: 0 })
  })
})

describe('median', () => {
  it('takes the middle value or the mean of the two middle values', () => {
    expect(median([5, 1, 3])).toBe(3)
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })
})
