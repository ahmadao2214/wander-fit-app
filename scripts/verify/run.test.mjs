import { spawn, spawnSync } from "node:child_process"
import fs from "node:fs"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { ownServerReady } from "./run.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const runScript = path.join(root, "scripts/verify/run.mjs")

function runCli(args, env) {
  return spawnSync(process.execPath, [runScript, ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 8000,
    env: { ...process.env, EXPO_PUBLIC_CONVEX_URL_E2E: "", ...env },
  })
}

describe("verify run", () => {
  it("rejects all when the e2e URL is missing", () => {
    const result = runCli(["all"])
    const output = `${result.stdout || ""}\n${result.stderr || ""}`
    expect(result.status).toBe(1)
    expect(output).toContain("EXPO_PUBLIC_CONVEX_URL_E2E")
    expect(output).not.toContain("driving signed-out screen")
    expect(output).not.toContain("exporting web")
  })

  it("stops the server after Maestro fails", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-run-"))
    const stub = path.join(dir, "maestro-stub.mjs")
    const stateFile = path.join(dir, "server.json")
    const probe = path.join(dir, "probe.mjs")
    fs.writeFileSync(stub, "#!/bin/sh\nexit 2\n")
    fs.chmodSync(stub, 0o755)
    fs.writeFileSync(
      probe,
      `import { runDrive } from ${JSON.stringify(runScript)}\ntry {\n  runDrive("http://127.0.0.1:1", false)\n} catch (error) {\n  process.exit(error.exitStatus ?? 1)\n}\n`
    )
    const sleeper = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
      detached: true,
      stdio: "ignore",
    })
    sleeper.unref()
    fs.writeFileSync(stateFile, JSON.stringify({ pid: sleeper.pid, port: 1 }))

    try {
      const cli = runCli(["drive", "http://127.0.0.1:1"], { MAESTRO_BIN: stub })
      expect(cli.status).toBe(2)

      const cleaned = spawnSync(process.execPath, [probe], {
        cwd: root,
        encoding: "utf8",
        timeout: 8000,
        env: {
          ...process.env,
          EXPO_PUBLIC_CONVEX_URL_E2E: "",
          MAESTRO_BIN: stub,
          VERIFY_STATE_FILE: stateFile,
        },
      })
      expect(cleaned.status).toBe(2)
      expect(fs.existsSync(stateFile)).toBe(false)
      // A reaped process is gone. An unreaped one is a zombie, which still
      // means cleanup's signal landed. A live server stays in S or R.
      let stat = ""
      const deadline = Date.now() + 1000
      while (Date.now() < deadline) {
        stat = spawnSync("ps", ["-p", String(sleeper.pid), "-o", "stat="], {
          encoding: "utf8",
        }).stdout.trim()
        if (stat === "" || stat.startsWith("Z")) break
        spawnSync("sleep", ["0.05"])
      }
      expect(stat === "" || stat.startsWith("Z")).toBe(true)
    } finally {
      try {
        process.kill(sleeper.pid)
      } catch {
        // already stopped
      }
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it("accepts only the child that bound the port", () => {
    expect(ownServerReady("42", 42)).toBe(true)
    expect(ownServerReady("99", 42)).toBe(false)
    expect(ownServerReady("", 42)).toBe(false)
  })

  it("does not mark a foreign server as ready", async () => {
    const port = await listenPort()
    const readyFile = path.join(os.tmpdir(), `verify-ready-${process.pid}-${port}`)
    const blocker = net.createServer((request, response) => {
      response.writeHead(200)
      response.end("other")
    })
    await new Promise((resolve) => blocker.listen(port, "127.0.0.1", resolve))
    const child = spawn(process.execPath, [runScript, "serve"], {
      cwd: root,
      stdio: "ignore",
      env: {
        ...process.env,
        EXPO_PUBLIC_CONVEX_URL_E2E: "",
        VERIFY_PORT: String(port),
        VERIFY_READY_FILE: readyFile,
      },
    })
    try {
      const code = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve("timeout"), 3000)
        child.once("exit", (status) => {
          clearTimeout(timer)
          resolve(status)
        })
      })
      expect(code).not.toBe("timeout")
      expect(fs.existsSync(readyFile)).toBe(false)
    } finally {
      child.kill()
      blocker.close()
      fs.rmSync(readyFile, { force: true })
    }
  })
})

function listenPort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.once("error", reject)
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })
}
