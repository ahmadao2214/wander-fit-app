import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { parse } from "yaml"
import { artifactName, evidenceDirFor, listWebFlows, root } from "./flows.mjs"
import { renderSummary } from "./summary.mjs"

const checks = parse(fs.readFileSync(path.join(root, ".github/workflows/checks.yml"), "utf8"))
const job = checks.jobs["web-e2e"]

describe("web flows", () => {
  it("lists the entry files directly under the folder", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-flows-"))
    try {
      fs.writeFileSync(path.join(dir, "sign-up.yaml"), "")
      fs.writeFileSync(path.join(dir, "sign-in.yaml"), "")
      fs.writeFileSync(path.join(dir, "notes.md"), "")
      fs.mkdirSync(path.join(dir, "shared"))
      fs.writeFileSync(path.join(dir, "shared/login.yaml"), "")
      expect(listWebFlows(dir)).toEqual(["sign-in", "sign-up"])
      expect(listWebFlows(path.join(dir, "missing"))).toEqual([])
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it("includes sign-in", () => {
    expect(listWebFlows()).toContain("sign-in")
  })

  it("has an upload step in the checks workflow for every web flow", () => {
    const uploads = job.steps
      .filter((step) => String(step.uses || "").startsWith("actions/upload-artifact@"))
      .map((step) => ({ name: step.with.name, path: step.with.path, if: step.if }))
    for (const flow of listWebFlows()) {
      const evidence = `${path.relative(root, evidenceDirFor(flow))}/`
      const expected = {
        name: artifactName(flow),
        path: evidence,
        if: `always() && hashFiles('${evidence}.scrubbed') != ''`,
      }
      expect(uploads, `add an upload step for .maestro/web/${flow}.yaml`).toContainEqual(expected)
    }
  })
})

describe("web E2E job", () => {
  it("runs after the unit job and shares the e2e-backend group", () => {
    expect(job.needs).toBe("vitest")
    expect(job.concurrency).toEqual({ group: "e2e-backend", "cancel-in-progress": false })
  })

  it("is skipped on fork pull requests", () => {
    expect(job.if).toContain("github.event.pull_request.head.repo.full_name == github.repository")
  })

  it("runs on pull requests and pushes to main", () => {
    expect(checks.on).toHaveProperty("pull_request")
    expect(checks.on.push.branches).toEqual(["main"])
  })

  it("deploys, runs the flows, then tears down before uploading", () => {
    const runs = job.steps.map((step) => step.run || step.uses || "")
    const index = (text) => runs.findIndex((run) => run.includes(text))
    expect(index("run.mjs deploy")).toBeGreaterThan(-1)
    expect(index("run.mjs deploy")).toBeLessThan(index("run.mjs all"))
    expect(index("run.mjs all")).toBeLessThan(index("run.mjs teardown"))
    expect(index("run.mjs teardown")).toBeLessThan(index("actions/upload-artifact@"))
    expect(index("actions/upload-artifact@")).toBeLessThan(index("summary.mjs"))
  })

  it("keeps secrets out of the install steps", () => {
    expect(JSON.stringify(job.env || {})).not.toContain("secrets.")
    for (const step of job.steps) {
      const usesSecrets = JSON.stringify(step.env || {}).includes("secrets.")
      if (usesSecrets) expect(step.run).toMatch(/^node scripts\/verify\/run\.mjs (deploy|all|teardown)$/)
    }
  })
})

describe("summary", () => {
  it("links each flow's artifact and marks missing flows", () => {
    const markdown = renderSummary({
      flows: ["sign-in", "sign-up"],
      results: [
        { flow: "sign-in", status: "passed", seconds: 41, artifact: "e2e-web-sign-in" },
      ],
      artifacts: { "e2e-web-sign-in": "https://github.com/o/r/actions/runs/1/artifacts/9" },
      runUrl: "https://github.com/o/r/actions/runs/1",
    })
    expect(markdown).toContain(
      "| sign-in | ✅ passed | 41s | [e2e-web-sign-in](https://github.com/o/r/actions/runs/1/artifacts/9) |  |"
    )
    expect(markdown).toContain("| sign-up | ⚪ not run |  | e2e-web-sign-up (not uploaded) |  |")
  })

  it("shows the error and escapes table pipes", () => {
    const markdown = renderSummary({
      flows: ["sign-in"],
      results: [{ flow: "sign-in", status: "failed", seconds: 3, error: "a | b\nc" }],
      artifacts: {},
      runUrl: "",
    })
    expect(markdown).toContain("| sign-in | ❌ failed | 3s | e2e-web-sign-in (not uploaded) | a \\| b c |")
  })

  it("says when no flow ran", () => {
    const markdown = renderSummary({ flows: ["sign-in"], results: null, artifacts: {}, runUrl: "" })
    expect(markdown).toContain("No flow ran.")
    expect(markdown).toContain("| sign-in | ⚪ not run |")
  })
})
