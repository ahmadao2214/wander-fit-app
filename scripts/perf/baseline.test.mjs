import {
  aggregate,
  appDurations,
  buildReport,
  mainFlushMs,
  median,
  parseArgs,
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
      positional: ['tabs'],
    })
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
