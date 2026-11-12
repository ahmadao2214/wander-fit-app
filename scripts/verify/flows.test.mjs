import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { parse } from "yaml"
import { artifactName, evidenceDirFor, listWebFlows, root } from "./flows.mjs"
import { renderSummary } from "./summary.mjs"

const checks = parse(fs.readFileSync(path.join(root, ".github/workflows/checks.yml"), "utf8"))
const job = checks.jobs["web-e2e"]

function expandFlow(file, seen = new Set()) {
  const full = path.resolve(file)
  if (seen.has(full)) throw new Error(`runFlow cycle at ${full}`)
  seen.add(full)
  const text = fs.readFileSync(full, "utf8")
  return text.replace(/runFlow:\s*(\S+\.yaml)/g, (_, relative) => {
    return expandFlow(path.resolve(path.dirname(full), relative), seen)
  })
}

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

  it("keeps launch on the web entry and a parseable header on the shared files", () => {
    const entry = fs.readFileSync(path.join(root, ".maestro/web/sign-in.yaml"), "utf8")
    expect(entry.startsWith("url: ${VERIFY_URL}\n")).toBe(true)
    expect(entry).toContain("launchApp:")
    expect(entry.indexOf("launchApp:")).toBeLessThan(entry.indexOf("runFlow: ../journeys/sign-in.yaml"))
    expect(entry).not.toContain("appId:")
    expect(entry).not.toContain("inputText:")
    const shared = [
      ".maestro/journeys/sign-in.yaml",
      ".maestro/subflows/_sign-in.yaml",
      ".maestro/subflows/_evidence-start.yaml",
      ".maestro/subflows/_evidence-stop.yaml",
    ]
    for (const file of shared) {
      const text = fs.readFileSync(path.join(root, file), "utf8")
      expect(text, file).toMatch(/^url: \$\{VERIFY_URL\}\n---\n/)
      expect(text, file).not.toMatch(/^appId:/m)
      expect(text, file).not.toContain("launchApp")
      expect(text, file).not.toMatch(/^env:/m)
    }
    const notes = fs.readFileSync(path.join(root, ".maestro/flow-layout.md"), "utf8")
    expect(notes).toContain("matches a React Native Web `testID` with `id:`")
    expect(notes).toContain("copies the header of the file that contains `launchApp`")
    expect(notes).toContain("left Chromium at `data:,`")
  })

  it("records sign-in through Profile sign-out", () => {
    const flow = expandFlow(path.join(root, ".maestro/web/sign-in.yaml"))
    const screen = fs.readFileSync(path.join(root, "app/(athlete)/index.tsx"), "utf8")
    const signOutButton = fs.readFileSync(path.join(root, "components/SignOutButton.tsx"), "utf8")
    const signOutScroll = fs.readFileSync(path.join(root, "lib/signOutScroll.ts"), "utf8")
    expect(screen).toContain('testID="today-workout-card"')
    expect(signOutButton).toContain('nativeID="sign-out"')
    expect(signOutButton).toContain("hashchange")
    expect(signOutButton).toContain("noteUserScroll")
    expect(signOutScroll).toContain("scrollTop")
    const start = flow.indexOf("startRecording: recording")
    const welcome = flow.indexOf('visible: "Welcome back,.*"')
    const today = flow.indexOf('assertVisible: "Today"')
    const card = flow.indexOf("id: today-workout-card")
    const workout = flow.indexOf('assertVisible: "Start Workout"')
    const shot = flow.indexOf("takeScreenshot: 03-today")
    const signOut = flow.indexOf("profile#sign-out")
    const signOutLabel = flow.indexOf('visible: "Sign Out"')
    const profileShot = flow.indexOf("takeScreenshot: 04-profile")
    const signedOut = flow.lastIndexOf('visible: "WELCOME BACK"')
    const stop = flow.lastIndexOf("stopRecording")
    expect(start).toBeGreaterThan(flow.indexOf("launchApp"))
    expect(today).toBeGreaterThan(welcome)
    expect(card).toBeGreaterThan(today)
    expect(workout).toBeGreaterThan(card)
    expect(shot).toBeGreaterThan(workout)
    expect(signOut).toBeGreaterThan(shot)
    expect(signOutLabel).toBeGreaterThan(signOut)
    expect(profileShot).toBeGreaterThan(signOutLabel)
    expect(signedOut).toBeGreaterThan(profileShot)
    expect(stop).toBeGreaterThan(flow.indexOf("takeScreenshot: 05-signed-out"))
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
    expect(markdown).toContain("startRecording/recording.mp4")
  })
})
