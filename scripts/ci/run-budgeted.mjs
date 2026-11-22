#!/usr/bin/env node
// Wraps a CI command with an explicit wall-clock time budget so speed
// regressions fail loudly instead of creeping in silently (#137).
//
// Usage:
//   node scripts/ci/run-budgeted.mjs --name "Typecheck" --max-seconds 60 -- bun run typecheck
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

export function parseBudgetArgs(argv) {
  const sep = argv.indexOf("--")
  if (sep === -1) throw new Error("Missing '--' separator before command.")
  const flags = argv.slice(0, sep)
  const command = argv.slice(sep + 1)
  if (!command.length) throw new Error("Missing command after '--'.")
  let name = command.join(" ")
  let maxSeconds = null
  for (let i = 0; i < flags.length; i++) {
    if (flags[i] === "--name" && flags[i + 1]) {
      name = flags[++i]
    } else if (flags[i] === "--max-seconds" && flags[i + 1]) {
      maxSeconds = Number(flags[++i])
    } else {
      throw new Error(`Unknown flag: ${flags[i]}`)
    }
  }
  if (!Number.isFinite(maxSeconds) || maxSeconds <= 0) {
    throw new Error(`--max-seconds must be a positive number (got ${maxSeconds}).`)
  }
  return { name, maxSeconds, command }
}

export function evaluateBudget({ name, elapsedSeconds, maxSeconds, exitStatus, signal, error }) {
  const rounded = Math.round(elapsedSeconds * 10) / 10
  if (error || signal || exitStatus !== 0) {
    const detail = error
      ? `spawn error (${error.message || error})`
      : signal
        ? `killed by ${signal}`
        : `exited ${exitStatus ?? 1}`
    return {
      ok: false,
      exitCode: exitStatus && exitStatus !== 0 ? exitStatus : 1,
      message: `[budget] ${name}: ${detail} after ${rounded}s (budget ${maxSeconds}s)`,
    }
  }
  if (elapsedSeconds > maxSeconds) {
    return {
      ok: false,
      exitCode: 1,
      message: `[budget] FAILED: ${name} took ${rounded}s, exceeding ${maxSeconds}s budget`,
    }
  }
  return {
    ok: true,
    exitCode: 0,
    message: `[budget] ${name}: ${rounded}s / ${maxSeconds}s`,
  }
}

function main() {
  const { name, maxSeconds, command } = parseBudgetArgs(process.argv.slice(2))
  const started = Date.now()
  const result = spawnSync(command[0], command.slice(1), {
    stdio: "inherit",
    env: process.env,
  })
  const elapsedSeconds = (Date.now() - started) / 1000
  const outcome = evaluateBudget({
    name,
    elapsedSeconds,
    maxSeconds,
    exitStatus: result.status,
    signal: result.signal,
    error: result.error,
  })
  if (outcome.ok) console.log(outcome.message)
  else console.error(outcome.message)
  process.exit(outcome.exitCode)
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) main()
