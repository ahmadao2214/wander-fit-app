import { spawn, spawnSync } from "node:child_process"
import fs from "node:fs"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { isGeneratedEmail } from "./persona.mjs"
import {
  assertActivated,
  assertSignedUp,
  cleanupPending,
  createSignupPersona,
  ownServerReady,
  readPending,
  redactEvidence,
  restoreFiles,
  runSuite,
  settlePersona,
  snapshotFiles,
  needsInspect,
  webSuiteSteps,
  writePending,
} from "./run.mjs"

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

describe("web suite", () => {
  function recorder({
    failDrive = [],
    failCreate = [],
    failAfterClerk = [],
    failDelete = [],
    failRedact = [],
  } = {}) {
    const calls = []
    let pending = []
    return {
      calls,
      pending: () => pending,
      steps: {
        createPersona: (flow) => {
          calls.push(`create ${flow}`)
          if (failCreate.includes(flow)) throw new Error("clerk down")
          const persona = { email: `e2e.${flow}+clerk_test@example.com`, password: `pw-${flow}` }
          if (failAfterClerk.includes(flow)) {
            const error = new Error("convex down")
            error.persona = persona
            throw error
          }
          return persona
        },
        drive: (flow) => {
          calls.push(`drive ${flow}`)
          if (failDrive.includes(flow)) throw new Error("Maestro exited 1")
        },
        redact: (flow) => {
          calls.push(`redact ${flow}`)
          if (failRedact.includes(flow)) throw new Error("log busy")
        },
        deletePersona: (persona) => {
          calls.push(`delete ${persona.email}`)
          if (failDelete.some((flow) => persona.email.startsWith(`e2e.${flow}+`))) {
            throw new Error("clerk 500")
          }
        },
        readPending: () => pending,
        writePending: (records) => {
          pending = records
        },
      },
    }
  }

  it("gives each flow its own persona and deletes it", () => {
    const { calls, steps } = recorder()
    const results = runSuite(["a", "b"], steps, () => 0)
    expect(calls).toEqual([
      "create a",
      "drive a",
      "redact a",
      "delete e2e.a+clerk_test@example.com",
      "create b",
      "drive b",
      "redact b",
      "delete e2e.b+clerk_test@example.com",
    ])
    expect(results.map((result) => [result.flow, result.status, result.artifact])).toEqual([
      ["a", "passed", "e2e-web-a"],
      ["b", "passed", "e2e-web-b"],
    ])
  })

  it("deletes the persona and keeps going after a flow fails", () => {
    const { calls, steps } = recorder({ failDrive: ["a"] })
    const results = runSuite(["a", "b"], steps, () => 0)
    expect(calls).toContain("delete e2e.a+clerk_test@example.com")
    expect(calls).toContain("drive b")
    expect(results[0]).toMatchObject({ status: "failed", error: "Maestro exited 1" })
    expect(results[1].status).toBe("passed")
  })

  it("fails a flow whose persona could not be deleted", () => {
    const { steps } = recorder({ failDelete: ["a"] })
    const [result] = runSuite(["a"], steps, () => 0)
    expect(result.status).toBe("failed")
    expect(result.error).toContain("persona delete failed")
  })

  it("deletes the Clerk user when create fails after the account exists", () => {
    const { calls, pending, steps } = recorder({ failAfterClerk: ["a"] })
    const [result] = runSuite(["a"], steps, () => 0)
    expect(calls).toEqual(["create a", "redact a", "delete e2e.a+clerk_test@example.com"])
    expect(result).toMatchObject({ status: "failed", error: "convex down" })
    expect(pending()).toEqual([])
  })

  it("does not drive or delete when persona create fails", () => {
    const { calls, steps } = recorder({ failCreate: ["a"] })
    const [result] = runSuite(["a"], steps, () => 0)
    expect(calls).toEqual(["create a"])
    expect(result).toMatchObject({ status: "failed", error: "clerk down" })
  })

  it("keeps a persona whose delete failed after the next flow finishes", () => {
    const { pending, steps } = recorder({ failDelete: ["a"] })
    runSuite(["a", "b"], steps, () => 0)
    expect(pending()).toEqual([
      {
        email: "e2e.a+clerk_test@example.com",
        flows: ["a"],
        scrubbed: true,
        deleted: false,
      },
    ])
  })

  it("keeps the password when the scrub fails and the account delete succeeds", () => {
    const { pending, steps } = recorder({ failRedact: ["a"] })
    const [result] = runSuite(["a"], steps, () => 0)
    expect(result.status).toBe("failed")
    expect(pending()).toEqual([
      {
        email: "e2e.a+clerk_test@example.com",
        password: "pw-a",
        flows: ["a"],
        scrubbed: false,
        deleted: true,
      },
    ])
  })
})

describe("persona modes", () => {
  function webIo({ failMaestro = [], inspectFound = true } = {}) {
    const calls = []
    let pending = []
    const io = {
      createSeededPersona: (state) => {
        calls.push(`create ${state}`)
        return { email: `e2e.${state === "onboarded" ? 1 : 3}+clerk_test@example.com`, password: "pw-in" }
      },
      createSignupPersona: () => {
        calls.push("create signup")
        return { email: "e2e-2-signup+clerk_test@example.com", password: "pw-up" }
      },
      inspectPersona: (persona, mode) => {
        calls.push(`inspect ${mode} ${persona.email}`)
        if (!inspectFound) throw new Error(`inspect failed for ${persona.email}`)
        return { found: true }
      },
      runMaestro: (flow) => {
        calls.push(`maestro ${flow}`)
        if (failMaestro.includes(flow)) throw new Error("Maestro exited 1")
      },
      redact: (flow) => calls.push(`redact ${flow}`),
      deletePersona: (persona) => calls.push(`delete ${persona.email}`),
      readPending: () => pending,
      writePending: (records) => {
        pending = records
      },
      releasePersona: () => {},
    }
    return { calls, io, pending: () => pending }
  }

  it("signs in as an onboarded persona and signs up without provisioning one", () => {
    const { calls, io } = webIo()
    const results = runSuite(["sign-in", "sign-up"], webSuiteSteps("http://127.0.0.1:1", io), () => 0)
    expect(calls).toEqual([
      "create onboarded",
      "maestro sign-in",
      "redact sign-in",
      "delete e2e.1+clerk_test@example.com",
      "create signup",
      "maestro sign-up",
      "inspect signup e2e-2-signup+clerk_test@example.com",
      "redact sign-up",
      "delete e2e-2-signup+clerk_test@example.com",
    ])
    expect(results.map((result) => result.status)).toEqual(["passed", "passed"])
  })

  it("fails sign-up and still deletes when inspect finds no Convex user", () => {
    const { calls, io, pending } = webIo({ inspectFound: false })
    const [result] = runSuite(["sign-up"], webSuiteSteps("http://127.0.0.1:1", io), () => 0)
    expect(result.status).toBe("failed")
    expect(result.error).toContain("inspect failed")
    expect(calls.slice(-2)).toEqual(["redact sign-up", "delete e2e-2-signup+clerk_test@example.com"])
    expect(pending()).toEqual([])
  })

  it("deletes the signup email when Maestro fails, without inspecting", () => {
    const { calls, io } = webIo({ failMaestro: ["sign-up"] })
    const [result] = runSuite(["sign-up"], webSuiteSteps("http://127.0.0.1:1", io), () => 0)
    expect(result).toMatchObject({ status: "failed", error: "Maestro exited 1" })
    expect(calls).toEqual([
      "create signup",
      "maestro sign-up",
      "redact sign-up",
      "delete e2e-2-signup+clerk_test@example.com",
    ])
  })

  it("writes the signup record before Maestro with no Clerk or Convex call", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-signup-"))
    const file = path.join(dir, "persona-latest.json")
    const masked = []
    try {
      const persona = createSignupPersona({ file, now: () => 1731400000000, mask: (pw) => masked.push(pw) })
      expect(persona.email).toBe("e2e-1731400000000-signup+clerk_test@example.com")
      expect(isGeneratedEmail(persona.email)).toBe(true)
      expect(persona.password.length).toBeGreaterThanOrEqual(16)
      expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual(persona)
      expect(fs.statSync(file).mode & 0o777).toBe(0o600)
      expect(masked).toEqual([persona.password])
      expect(persona).not.toHaveProperty("clerkId")
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it("activates a needs-intake persona and inspects it before delete", () => {
    const { calls, io } = webIo()
    const [result] = runSuite(["activation"], webSuiteSteps("http://127.0.0.1:1", io), () => 0)
    expect(result.status).toBe("passed")
    expect(calls).toEqual([
      "create needs-intake",
      "maestro activation",
      "inspect needs-intake e2e.3+clerk_test@example.com",
      "redact activation",
      "delete e2e.3+clerk_test@example.com",
    ])
  })

  it("fails activation and still deletes when inspect does not match", () => {
    const { calls, io, pending } = webIo({ inspectFound: false })
    const [result] = runSuite(["activation"], webSuiteSteps("http://127.0.0.1:1", io), () => 0)
    expect(result.status).toBe("failed")
    expect(calls.slice(-2)).toEqual(["redact activation", "delete e2e.3+clerk_test@example.com"])
    expect(pending()).toEqual([])
  })

  it("does not inspect an onboarded persona", () => {
    expect(needsInspect("onboarded")).toBe(false)
    expect(needsInspect("signup")).toBe(true)
    expect(needsInspect("needs-intake")).toBe(true)
  })

  it("requires GPP week 1 day 1 with intake and onboarding done after activation", () => {
    const email = "e2e.3+clerk_test@example.com"
    const done = {
      found: true,
      email,
      intakeCompleted: true,
      onboardingCompleted: true,
      hasProgram: true,
      phase: "GPP",
      week: 1,
      day: 1,
    }
    const pretty = JSON.stringify(done, null, 2)
    expect(assertActivated(`noise\n${pretty}\n`, email)).toMatchObject({ phase: "GPP", week: 1, day: 1 })
    expect(() => assertActivated(JSON.stringify({ ...done, week: 2 }), email)).toThrow(/\(week\)/)
    expect(() => assertActivated(JSON.stringify({ ...done, onboardingCompleted: false }), email)).toThrow(
      /onboardingCompleted/
    )
    expect(() =>
      assertActivated(JSON.stringify({ ...done, hasProgram: false, phase: null, week: null, day: null }), email)
    ).toThrow(/hasProgram, phase, week, day/)
    expect(() => assertActivated(JSON.stringify({ found: false, email }), email)).toThrow(/found/)
    expect(() => assertActivated("", email)).toThrow(/no inspect output/)
  })

  it("requires found true from persona inspect", () => {
    const email = "e2e-2-signup+clerk_test@example.com"
    expect(assertSignedUp(`noise\n{"found":true,"email":"${email}"}\n`, email)).toMatchObject({ found: true })
    const pretty = `{\n  "email": "${email}",\n  "found": true\n}\n`
    expect(assertSignedUp(pretty, email)).toMatchObject({ found: true })
    expect(() => assertSignedUp(`{"found":false,"email":"${email}"}`, email)).toThrow(/no Convex user/)
    expect(() => assertSignedUp("", email)).toThrow(/no inspect output/)
    expect(() => assertSignedUp("not json", email)).toThrow(/no Convex user/)
  })
})

describe("pending personas", () => {
  it("drops a finished persona and keeps the password only while the scrub is open", () => {
    const persona = { email: "e2e.1+clerk_test@example.com", password: "pw" }
    const scrubbed = settlePersona([], persona, { flow: "sign-in", scrubbed: true, deleted: false })
    expect(scrubbed).toEqual([
      { email: persona.email, flows: ["sign-in"], scrubbed: true, deleted: false },
    ])
    expect(settlePersona(scrubbed, persona, { flow: "sign-in", scrubbed: true, deleted: true })).toEqual([])
    const leaked = settlePersona([], persona, { flow: "sign-in", scrubbed: false, deleted: true })
    expect(leaked[0].password).toBe("pw")
  })

  it("deletes later personas when an earlier delete fails", () => {
    const records = [
      { email: "e2e.1+clerk_test@example.com", flows: ["sign-in"], scrubbed: true, deleted: false },
      { email: "e2e.2+clerk_test@example.com", flows: ["sign-in"], scrubbed: true, deleted: false },
    ]
    const deleted = []
    let marked = 0
    let cleared = 0
    const hooks = {
      clearMarkers() {
        cleared += 1
      },
      markScrubbed() {
        marked += 1
      },
      redact() {},
      deleteAccount(record) {
        if (record.email.startsWith("e2e.1+")) throw new Error("clerk 500")
        deleted.push(record.email)
      },
      persist() {},
      release() {},
    }
    expect(() => cleanupPending(records, hooks)).toThrow(/teardown left 1 persona: e2e\.1\+/)
    expect(deleted).toEqual(["e2e.2+clerk_test@example.com"])
    expect(records.map((record) => record.deleted)).toEqual([false, true])
    expect(marked).toBe(1)
    expect(cleared).toBe(0)
  })

  it("withholds every upload marker when an earlier password scrub fails", () => {
    const records = [
      {
        email: "e2e.1+clerk_test@example.com",
        password: "pw-1",
        flows: ["sign-in"],
        scrubbed: false,
        deleted: true,
      },
      {
        email: "e2e.2+clerk_test@example.com",
        password: "pw-2",
        flows: ["sign-up"],
        scrubbed: false,
        deleted: true,
      },
    ]
    let marked = 0
    let cleared = 0
    const redacted = []
    expect(() =>
      cleanupPending(records, {
        clearMarkers() {
          cleared += 1
        },
        markScrubbed() {
          marked += 1
        },
        redact(record) {
          redacted.push(record.email)
          if (record.email.startsWith("e2e.1+")) throw new Error("log busy")
        },
        deleteAccount() {},
        persist() {},
        release() {},
      })
    ).toThrow(/e2e\.1\+clerk_test@example.com/)
    expect(redacted).toEqual([
      "e2e.1+clerk_test@example.com",
      "e2e.2+clerk_test@example.com",
    ])
    expect(records.map((record) => record.scrubbed)).toEqual([false, true])
    expect(marked).toBe(0)
    expect(cleared).toBe(1)
  })

  it("round-trips the pending file and removes it when nothing is left", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-pending-"))
    const file = path.join(dir, "persona-pending.json")
    try {
      const open = [{ email: "e2e.1+clerk_test@example.com", flows: ["sign-in"], scrubbed: false, deleted: false, password: "pw" }]
      writePending(open, file)
      expect(fs.statSync(file).mode & 0o777).toBe(0o600)
      expect(readPending(file)).toEqual(open)
      writePending([], file)
      expect(fs.existsSync(file)).toBe(false)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe("evidence redaction", () => {
  it("removes the password from text evidence and leaves images alone", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-redact-"))
    try {
      fs.mkdirSync(path.join(dir, "run/logs"), { recursive: true })
      fs.writeFileSync(path.join(dir, "run/logs/maestro.log"), "Input text s3cretPW COMPLETED\ntext: s3cretPW\n")
      fs.writeFileSync(path.join(dir, "run/commands.json"), '{"text":"s3cretPW"}')
      fs.writeFileSync(path.join(dir, "run/shot.png"), "s3cretPW")
      const keep = path.join(dir, "persona.json")
      fs.writeFileSync(keep, "s3cretPW")
      expect(redactEvidence(dir, "s3cretPW", [keep])).toBe(2)
      expect(fs.readFileSync(path.join(dir, "run/logs/maestro.log"), "utf8")).toBe(
        "Input text [redacted] COMPLETED\ntext: [redacted]\n"
      )
      expect(fs.readFileSync(path.join(dir, "run/commands.json"), "utf8")).not.toContain("s3cretPW")
      expect(fs.readFileSync(path.join(dir, "run/shot.png"), "utf8")).toBe("s3cretPW")
      expect(fs.readFileSync(keep, "utf8")).toBe("s3cretPW")
      expect(redactEvidence(dir, "")).toBe(0)
      expect(redactEvidence(path.join(dir, "missing"), "s3cretPW")).toBe(0)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe("convex file guard", () => {
  it("restores rewritten files and removes created ones", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-guard-"))
    try {
      fs.writeFileSync(path.join(dir, ".env.local"), "KEEP=1\n")
      const snapshot = snapshotFiles([".env.local", ".env"], dir)
      fs.writeFileSync(path.join(dir, ".env.local"), "CONVEX_DEPLOYMENT=dev:other\n")
      fs.writeFileSync(path.join(dir, ".env"), "NEW=1\n")
      restoreFiles(snapshot)
      expect(fs.readFileSync(path.join(dir, ".env.local"), "utf8")).toBe("KEEP=1\n")
      expect(fs.existsSync(path.join(dir, ".env"))).toBe(false)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
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
