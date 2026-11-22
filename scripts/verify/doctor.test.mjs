import {
  buildE2EPlan,
  clerkFrontendApi,
  convexRuntimeFiles,
  evaluateDoctor,
  exportIsStale,
  exportStamp,
  needsConvexPreview,
  prChangedFilesArgs,
  runEnsureSeeded,
  seedInputFiles,
  seedInputsHash,
  selectBackendMode,
  shouldRetryColdStart,
  shouldSeed,
  sourceStamp,
  stampDiffArgs,
} from "./run.mjs"

const encode = (text) => Buffer.from(text, "utf8").toString("base64")

function healthy(overrides = {}) {
  return {
    clerkKeyPresent: true,
    clerkFrontendApi: "example-clerk.accounts.dev",
    clerkStatus: 200,
    maestro: "/usr/local/bin/maestro",
    java: true,
    convexHost: "modest-kudu-493.convex.cloud",
    convexError: "",
    screenOnly: false,
    backendStatus: 200,
    templates: true,
    sports: 27,
    seedError: "",
    expectedCommit: "a".repeat(40),
    expectedStamp: "stamp-1",
    server: null,
    port: 4273,
    ...overrides,
  }
}

function liveServer(overrides = {}) {
  return {
    pid: 42,
    port: 4273,
    alive: true,
    owned: true,
    pageStatus: 200,
    build: { convexHost: "modest-kudu-493.convex.cloud", commit: "a".repeat(40), stamp: "stamp-1" },
    ...overrides,
  }
}

describe("clerkFrontendApi", () => {
  it("decodes the Frontend API host from a publishable key", () => {
    expect(clerkFrontendApi(`pk_test_${encode("example-clerk.accounts.dev$")}`)).toBe("example-clerk.accounts.dev")
    expect(clerkFrontendApi(`pk_live_${encode("clerk.example.com$")}`)).toBe("clerk.example.com")
  })

  it("rejects keys that would leave the app on Loading", () => {
    expect(clerkFrontendApi("")).toBe("")
    expect(clerkFrontendApi("sk_test_abc")).toBe("")
    expect(clerkFrontendApi(`pk_test_${encode("example-clerk.accounts.dev")}`)).toBe("")
    expect(clerkFrontendApi(`pk_test_${encode("not a host$")}`)).toBe("")
  })
})

describe("evaluateDoctor", () => {
  it("passes a healthy pre-launch run and says the server is not running", () => {
    const { lines, problems } = evaluateDoctor(healthy())
    expect(problems).toEqual([])
    expect(lines).toContain("seed: program templates present, 27 sports")
    expect(lines).toContain("server: not running (launch starts it)")
  })

  it("never prints the publishable key itself", () => {
    const key = `pk_test_${encode("example-clerk.accounts.dev$")}`
    const { lines } = evaluateDoctor(healthy())
    expect(lines.join("\n")).not.toContain(key)
  })

  it("fails a key Clerk rejects, an unreachable backend and an unseeded deployment", () => {
    const { problems } = evaluateDoctor(healthy({ clerkStatus: 400, backendStatus: 0, templates: false }))
    expect(problems).toHaveLength(3)
    expect(problems.join("\n")).toMatch(/Clerk rejected/)
    expect(problems.join("\n")).toMatch(/did not answer \/version/)
    expect(problems.join("\n")).toMatch(/not seeded/)
  })

  it("skips backend and seed checks in screen-only mode", () => {
    const { lines, problems } = evaluateDoctor(
      healthy({ screenOnly: true, convexHost: "wander-fit-e2e.invalid", backendStatus: null, templates: null, sports: null })
    )
    expect(problems).toEqual([])
    expect(lines.some((line) => line.startsWith("seed:"))).toBe(false)
  })

  it("reports a refused Convex deployment as a problem", () => {
    const { problems } = evaluateDoctor(healthy({ convexError: "Refusing app deployment fleet-mallard-22.convex.cloud" }))
    expect(problems).toEqual(["Refusing app deployment fleet-mallard-22.convex.cloud"])
  })

  it("passes a live server serving this checkout's build", () => {
    const { lines, problems } = evaluateDoctor(healthy({ server: liveServer() }))
    expect(problems).toEqual([])
    expect(lines).toContain("build: commit aaaaaaaaaaaa, convex modest-kudu-493.convex.cloud")
  })

  it("fails a server that is not ours, an old build, or a build for another backend", () => {
    expect(evaluateDoctor(healthy({ server: liveServer({ owned: false }) })).problems.join()).toMatch(/not the one answering/)
    expect(
      evaluateDoctor(healthy({ server: liveServer({ build: { ...liveServer().build, commit: "b".repeat(40) } }) })).problems.join()
    ).toMatch(/not HEAD/)
    expect(
      evaluateDoctor(healthy({ server: liveServer({ build: { ...liveServer().build, stamp: "stamp-0" } }) })).problems.join()
    ).toMatch(/checkout changed/)
    expect(
      evaluateDoctor(healthy({ server: liveServer({ build: { ...liveServer().build, convexHost: "other.convex.cloud" } }) })).problems.join()
    ).toMatch(/talks to other.convex.cloud/)
    expect(evaluateDoctor(healthy({ server: liveServer({ build: null }) })).problems.join()).toMatch(/no verify-build.json/)
    // Launched on another port than the one doctor probes
    expect(evaluateDoctor(healthy({ server: liveServer({ port: 4173 }) })).problems.join()).toMatch(/listens on port 4173/)
  })
})

describe("sourceStamp", () => {
  const files = { "a.ts": "one", "b.ts": "two" }
  const read = (file) => files[file]

  it("is stable for the same source and ignores untracked list order", () => {
    const first = sourceStamp({ commit: "c1", diff: "", untracked: "a.ts\nb.ts\n", read })
    const second = sourceStamp({ commit: "c1", diff: "", untracked: "b.ts\na.ts", read })
    expect(first).toBe(second)
  })

  it("changes with the commit, an uncommitted diff, or an untracked file's content", () => {
    const base = sourceStamp({ commit: "c1", diff: "", untracked: "a.ts", read })
    expect(sourceStamp({ commit: "c2", diff: "", untracked: "a.ts", read })).not.toBe(base)
    expect(sourceStamp({ commit: "c1", diff: "+x", untracked: "a.ts", read })).not.toBe(base)
    expect(sourceStamp({ commit: "c1", diff: "", untracked: "a.ts", read: () => "edited" })).not.toBe(base)
  })
})

describe("exportIsStale", () => {
  const expected = { stamp: "s1", convexHost: "modest-kudu-493.convex.cloud" }

  it("reuses an export built from the same source for the same backend", () => {
    expect(exportIsStale({ stamp: "s1", convexHost: "modest-kudu-493.convex.cloud" }, expected)).toBe(false)
  })

  it("re-exports when there is no export, the source changed, or the backend changed", () => {
    expect(exportIsStale(null, expected)).toBe(true)
    expect(exportIsStale({ stamp: "s0", convexHost: expected.convexHost }, expected)).toBe(true)
    expect(exportIsStale({ stamp: "s1", convexHost: "wander-fit-e2e.invalid" }, expected)).toBe(true)
  })
})

describe("exportStamp", () => {
  it("keeps the stamp taken before the export when nothing changed", () => {
    expect(exportStamp("stamp-1", "stamp-1")).toBe("stamp-1")
  })

  it("refuses an export when the source changed while it ran", () => {
    expect(() => exportStamp("stamp-1", "stamp-2")).toThrow(/changed while the web export ran/)
  })
})

describe("stampDiffArgs", () => {
  it("leaves the stylesheet the export rewrites out of the source stamp", () => {
    expect(stampDiffArgs()).toContain(":(exclude)tamagui-web.css")
    expect(stampDiffArgs().slice(0, 3)).toEqual(["diff", "HEAD", "--binary"])
  })
})

describe("seed inputs and backend mode", () => {
  const files = {
    "convex/seed.ts": 'import { data } from "./seedData"\nimport { api } from "./_generated/api"',
    "convex/seedData.ts": 'import type { Phase } from "../types"\nexport const data = 1',
    "types.ts": "export type Phase = string",
    "convex/generateTemplates.ts": 'import { warm } from "./warmupSequences"',
    "convex/warmupSequences.ts": "export const warm = 1",
  }
  const read = (file) => files[file]
  const exists = (file) => Object.hasOwn(files, file)

  it("follows relative imports from the seed and the generator, skipping generated code", () => {
    expect(seedInputFiles({ read, exists })).toEqual([
      "convex/generateTemplates.ts",
      "convex/seed.ts",
      "convex/seedData.ts",
      "convex/warmupSequences.ts",
      "types.ts",
    ])
  })

  it("changes the hash when any input file changes", () => {
    const list = seedInputFiles({ read, exists })
    const before = seedInputsHash({ files: list, read })
    const after = seedInputsHash({ files: list, read: (file) => (file === "types.ts" ? "changed" : files[file]) })
    expect(after).not.toBe(before)
    expect(seedInputsHash({ files: list, read })).toBe(before)
  })

  it("covers the real generator's warm-up sequences and the seed's data", () => {
    const real = seedInputFiles()
    expect(real).toContain("convex/generateTemplates.ts")
    expect(real).toContain("convex/warmupSequences.ts")
    expect(real).toContain("convex/seed.ts")
    expect(real).toContain("convex/seedData.ts")
  })

  it("skips seeding only when templates exist and the marker matches", () => {
    expect(shouldSeed({ marker: "h1", hash: "h1", hasTemplates: true })).toBe(false)
    expect(shouldSeed({ marker: "h0", hash: "h1", hasTemplates: true })).toBe(true)
    expect(shouldSeed({ marker: "", hash: "h1", hasTemplates: true })).toBe(true)
    expect(shouldSeed({ marker: "h1", hash: "h1", hasTemplates: false })).toBe(true)
  })

  it("clears the seed marker before writing and only sets it after every seed step succeeds", () => {
    const calls = []
    const skipped = runEnsureSeeded({
      hash: "h1",
      host: "modest-kudu-493.convex.cloud",
      readMarker: () => "h1",
      hasTemplates: () => true,
      clearMarker: () => calls.push("clear"),
      seedAll: () => calls.push("seedAll"),
      seedTemplates: () => calls.push("seedTemplates"),
      setMarker: (h) => calls.push(`set:${h}`),
      log: () => {},
    })
    expect(skipped).toEqual({ seeded: false })
    expect(calls).toEqual([])

    const seeded = runEnsureSeeded({
      hash: "h2",
      host: "modest-kudu-493.convex.cloud",
      readMarker: () => "h1",
      hasTemplates: () => true,
      clearMarker: () => calls.push("clear"),
      seedAll: () => calls.push("seedAll"),
      seedTemplates: () => calls.push("seedTemplates"),
      setMarker: (h) => calls.push(`set:${h}`),
      log: () => {},
    })
    expect(seeded).toEqual({ seeded: true })
    expect(calls).toEqual(["clear", "seedAll", "seedTemplates", "set:h2"])

    // Interrupted seed clears the old marker first and never writes the new one
    const failCalls = []
    expect(() =>
      runEnsureSeeded({
        hash: "h2",
        host: "modest-kudu-493.convex.cloud",
        readMarker: () => "h1",
        hasTemplates: () => true,
        clearMarker: () => failCalls.push("clear"),
        seedAll: () => failCalls.push("seedAll"),
        seedTemplates: () => {
          failCalls.push("seedTemplates")
          throw new Error("category 2 failed")
        },
        setMarker: (h) => failCalls.push(`set:${h}`),
        log: () => {},
      })
    ).toThrow(/category 2 failed/)
    expect(failCalls).toEqual(["clear", "seedAll", "seedTemplates"])
  })

  it("collects real convex runtime files plus shared lib/ files imported by convex/", () => {
    const real = convexRuntimeFiles()
    expect(real).toContain("convex/schema.ts")
    expect(real).toContain("convex/workoutCalendar.ts")
    expect(real).toContain("lib/today.ts")
    expect(real).toContain("lib/executionOrder.ts")
    expect(real.some((file) => file.includes("__tests__"))).toBe(false)
  })

  it("selects preview only for PRs touching convex runtime or imported files, and fails safe", () => {
    const runtime = ["convex/schema.ts", "lib/today.ts"]
    expect(needsConvexPreview(["app/(athlete)/index.tsx", "components/Button.tsx"], { runtimeFiles: runtime })).toBe(false)
    expect(needsConvexPreview(["convex/__tests__/e2e.test.ts", "convex/README.md"], { runtimeFiles: runtime })).toBe(false)
    expect(needsConvexPreview(["convex/newModule.ts"], { runtimeFiles: runtime })).toBe(true)
    expect(needsConvexPreview(["lib/today.ts"], { runtimeFiles: runtime })).toBe(true)
    expect(needsConvexPreview(["package.json"], { runtimeFiles: runtime })).toBe(true)
    expect(needsConvexPreview(null, { runtimeFiles: runtime })).toBe(true)

    expect(selectBackendMode({ eventName: "push", changedFiles: ["README.md"], runtimeFiles: runtime })).toBe("dev")
    expect(selectBackendMode({ eventName: "workflow_dispatch", changedFiles: [], runtimeFiles: runtime })).toBe("dev")
    expect(selectBackendMode({ eventName: "pull_request", changedFiles: ["README.md"], runtimeFiles: runtime })).toBe("shared")
    expect(selectBackendMode({ eventName: "pull_request", changedFiles: ["convex/schema.ts"], runtimeFiles: runtime })).toBe("preview")
    expect(selectBackendMode({ eventName: "pull_request", changedFiles: null, runtimeFiles: runtime })).toBe("preview")
  })

  it("builds balanced E2E plans and retries only cold-start Maestro crashes with no screenshots", () => {
    const planDocs = buildE2EPlan({
      eventName: "pull_request",
      changedFiles: ["docs/BUILDS.md"],
      runtimeFiles: ["convex/schema.ts"],
    })
    expect(planDocs.runE2E).toBe(false)
    expect(planDocs.shards).toEqual([])

    const planUi = buildE2EPlan({
      eventName: "pull_request",
      changedFiles: ["app/(first-run)/sport.tsx"],
      runtimeFiles: ["convex/schema.ts"],
    })
    expect(planUi.mode).toBe("shared")
    expect(planUi.runE2E).toBe(true)
    expect(planUi.flows).toEqual(["first-run"])
    expect(planUi.shards).toHaveLength(1)

    const planShared = buildE2EPlan({
      eventName: "pull_request",
      changedFiles: ["lib/executionOrder.ts"],
    })
    expect(planShared.mode).toBe("preview")
    expect(planShared.runE2E).toBe(true)
    expect(planShared.flows.length).toBeGreaterThan(1)

    const planFirstRunRoutes = buildE2EPlan({
      eventName: "pull_request",
      changedFiles: ["lib/firstRunRoutes.ts"],
      runtimeFiles: ["convex/schema.ts"],
    })
    expect(planFirstRunRoutes.flows.length).toBeGreaterThan(1)

    expect(prChangedFilesArgs()).toEqual(["diff", "--no-renames", "--name-only", "HEAD^1", "HEAD"])

    expect(shouldRetryColdStart({ elapsedMs: 3400, hasScreenshots: false, attempt: 0 })).toBe(true)
    expect(shouldRetryColdStart({ elapsedMs: 3400, hasScreenshots: false, attempt: 1 })).toBe(false)
    expect(shouldRetryColdStart({ elapsedMs: 25000, hasScreenshots: false, attempt: 0 })).toBe(false)
    expect(shouldRetryColdStart({ elapsedMs: 5000, hasScreenshots: true, attempt: 0 })).toBe(false)
  })
})
