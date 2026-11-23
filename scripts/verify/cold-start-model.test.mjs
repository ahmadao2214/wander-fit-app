import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { runWithColdStartRetry } from './run.mjs'

const diagnostics = '2026-11-22_215741/repeated-week/screenshots/step-004-runFlow.png'
const flowShot = 'run/repeated-week/takeScreenshot/01-today.png'
const evidenceStates = [
  { files: [], progressed: false },
  { files: [diagnostics], progressed: false },
  { files: ['run/screenshots/unlabelled.png'], progressed: false },
  { files: ['run/step-011-assertCondition.png'], progressed: false },
  { files: ['attempt-9/old/takeScreenshot/01-today.png'], progressed: false },
  { files: [flowShot], progressed: true },
  { files: ['01-sign-in.PNG'], progressed: true },
  { files: [diagnostics, flowShot], progressed: true },
]

describe.each(evidenceStates)('Maestro retry, evidence $files', ({ files, progressed }) => {
  it('matches the bounded launch and evidence trace', () => {
    for (const elapsedMs of [11_000, 13_000, 19_999, 20_000, 25_000]) {
      for (const firstStatus of [0, 1, 7]) {
        for (const secondStatus of [0, 1, 7]) {
          const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'retry-model-'))
          try {
            const trace = []
            const status = runWithColdStartRetry(
              dir,
              () => {
                trace.push('launch')
                if (trace.length === 1) {
                  for (const name of [...files, 'commands.json']) {
                    const file = path.join(dir, name)
                    fs.mkdirSync(path.dirname(file), { recursive: true })
                    fs.writeFileSync(file, 'first')
                  }
                  return { status: firstStatus, elapsedMs }
                }
                trace.push(fs.readFileSync(path.join(dir, 'attempt-1/commands.json'), 'utf8'))
                return { status: secondStatus, elapsedMs: 1 }
              },
              () => trace.push('retry')
            )
            const retry = firstStatus !== 0 && elapsedMs < 20_000 && !progressed
            expect({ elapsedMs, firstStatus, secondStatus, status, trace }).toEqual({
              elapsedMs,
              firstStatus,
              secondStatus,
              status: retry ? secondStatus : firstStatus,
              trace: retry ? ['launch', 'retry', 'launch', 'first'] : ['launch'],
            })
          } finally {
            fs.rmSync(dir, { recursive: true, force: true })
          }
        }
      }
    }
  })
})
