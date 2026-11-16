import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { parse } from "yaml"
import { artifactName, evidenceDirFor, listWebFlows, personaMode, root } from "./flows.mjs"
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

  it("includes sign-in and the First Run, and no longer sign-up or activation", () => {
    expect(listWebFlows()).toContain("sign-in")
    expect(listWebFlows()).toContain("first-run")
    expect(listWebFlows()).not.toContain("sign-up")
    expect(listWebFlows()).not.toContain("activation")
    expect(listWebFlows()).toContain("history")
    expect(listWebFlows()).toContain("workout-exit-resume")
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
      expect(text).toMatch(/^url: \$\{VERIFY_URL\}\n---\n/)
      expect(text).not.toMatch(/^appId:/m)
      expect(text).not.toContain("launchApp")
      expect(text).not.toMatch(/^env:/m)
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
    expect(screen).toContain('testID="today-heading"')
    expect(signOutButton).toContain('nativeID="sign-out"')
    expect(signOutButton).toContain("hashchange")
    expect(signOutButton).toContain("noteUserScroll")
    expect(signOutScroll).toContain("scrollTop")
    const start = flow.indexOf("startRecording: recording")
    const welcome = flow.indexOf("id: today-heading")
    const today = flow.indexOf('assertVisible: "Today"')
    const card = flow.indexOf("id: today-workout-card")
    const workout = flow.indexOf('assertVisible: "Start Workout"')
    const shot = flow.indexOf("takeScreenshot: 03-today")
    const signOut = flow.indexOf("profile#sign-out")
    const signOutLabel = flow.indexOf('visible: "Sign Out"')
    const profileShot = flow.indexOf("takeScreenshot: 04-profile")
    const signedOut = flow.lastIndexOf(`visible: "Let's build your plan for this season."`)
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

  it("keeps the First Run entry thin and its journey launch-free", () => {
    const entry = fs.readFileSync(path.join(root, ".maestro/web/first-run.yaml"), "utf8")
    expect(entry.startsWith("url: ${VERIFY_URL}\n")).toBe(true)
    expect(entry).toContain("clearState: true")
    expect(entry.indexOf("launchApp:")).toBeGreaterThan(-1)
    expect(entry.indexOf("launchApp:")).toBeLessThan(entry.indexOf("runFlow: ../journeys/first-run.yaml"))
    expect(entry).not.toContain("appId:")
    expect(entry).not.toContain("inputText:")
    const journey = fs.readFileSync(path.join(root, ".maestro/journeys/first-run.yaml"), "utf8")
    expect(journey).toMatch(/^url: \$\{VERIFY_URL\}\n---\n/)
    expect(journey).not.toMatch(/^appId:/m)
    expect(journey).not.toContain("launchApp")
    expect(journey).not.toMatch(/^env:/m)
  })

  it("records the First Run from the promise through sign-up to the Program tab", () => {
    const flow = expandFlow(path.join(root, ".maestro/web/first-run.yaml"))
    const read = (file) => fs.readFileSync(path.join(root, file), "utf8")
    const screens = [
      read("app/(first-run)/index.tsx"),
      read("app/(first-run)/sport.tsx"),
      read("app/(first-run)/season.tsx"),
      read("app/(first-run)/days.tsx"),
      read("app/(first-run)/about.tsx"),
      read("app/(first-run)/reveal.tsx"),
      read("components/first-run/IntakeFrame.tsx"),
      read("components/first-run/PlanView.tsx"),
      read("components/first-run/SavePlanSheet.tsx"),
      read("components/program/ProgramSeasonHeader.tsx"),
    ].join("\n")
    // Every testID the journey taps exists in the screens. (Quoted ids are
    // accessibility labels, which Maestro web reports as the id.)
    const ids = [...flow.matchAll(/id: ([a-z0-9-]+)$/gim)].map((m) => m[1])
    const missing = [...new Set(ids)].filter((id) => !screens.includes(id))
    expect(missing).toEqual([])
    const order = [
      "startRecording: recording",
      `visible: "LET'S BUILD YOUR PLAN FOR THIS SEASON."`,
      'assertNotVisible: "WELCOME BACK"',
      'id: "Basketball"',
      'tapOn: "No set season"',
      'visible: "3 SESSIONS A WEEK"',
      'tapOn: "Performance"',
      'tapOn: "New to training"',
      'visible: "BASKETBALL TRAINS FOR"',
      'tapOn: "Tap to see your plan"',
      'visible: "BASKETBALL PLAN"',
      "Lower Body A",
      "id: first-run-save",
      "id: save-plan-email",
      'assertNotVisible: "Skip"',
      'inputText: "Verify Athlete"',
      "inputText: ${PERSONA_EMAIL}",
      "inputText: ${PERSONA_PASSWORD}",
      "id: save-plan-create",
      'visible: "Check your email"',
      'inputText: "424242"',
      'visible: "Up next · .*"',
      'assertNotVisible: "WARMUP"',
      "takeScreenshot: 09-program",
      "stopRecording",
    ]
    // Jest's expect takes no message, so failures name the steps in the diff.
    expect(order.filter((needle) => !flow.includes(needle))).toEqual([])
    const positions = order.map((needle) => flow.indexOf(needle))
    const outOfOrder = order.filter((needle, i) => i > 0 && positions[i] <= positions[i - 1])
    expect(outOfOrder).toEqual([])
    expect(flow.indexOf("launchApp")).toBeLessThan(positions[0])
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
      // A missing step shows up as this flow's expected entry in the diff.
      expect(uploads).toContainEqual(expected)
    }
  })
})

describe("web E2E job", () => {
  it("runs after the unit job, per PR on pull requests and in the e2e-backend group otherwise", () => {
    expect(job.needs).toBe("unit")
    expect(job.concurrency).toEqual({
      group:
        "${{ github.event_name == 'pull_request' && format('e2e-preview-pr-{0}', github.event.pull_request.number) || 'e2e-backend' }}",
      "cancel-in-progress": false,
      queue: "max",
    })
    expect(job.env.CONVEX_PREVIEW_NAME_E2E).toBe("${{ github.event_name == 'pull_request' && format('pr-{0}', github.event.pull_request.number) || '' }}")
  })

  it("gives pull requests only the preview key and main only the dev key", () => {
    const devOnly = "${{ github.event_name != 'pull_request' && secrets.CONVEX_DEPLOY_KEY_E2E || '' }}"
    const previewOnly = "${{ github.event_name == 'pull_request' && secrets.CONVEX_PREVIEW_DEPLOY_KEY_E2E || '' }}"
    const convexSteps = job.steps.filter((step) => /run\.mjs (deploy|all|teardown)$/.test(step.run || ""))
    expect(convexSteps.length).toBe(3)
    for (const step of convexSteps) {
      expect([step.run, step.env.CONVEX_DEPLOY_KEY_E2E, step.env.CONVEX_PREVIEW_DEPLOY_KEY_E2E]).toEqual([
        step.run,
        devOnly,
        previewOnly,
      ])
    }
    const [deploy, ...after] = convexSteps
    expect(deploy.id).toBe("backend")
    expect(deploy.env.EXPO_PUBLIC_CONVEX_URL_E2E).toBe("${{ vars.EXPO_PUBLIC_CONVEX_URL_E2E }}")
    for (const step of after) {
      expect(step.env.EXPO_PUBLIC_CONVEX_URL_E2E).toBe("${{ steps.backend.outputs.convex_url }}")
    }
    expect(job.env).not.toHaveProperty("EXPO_PUBLIC_CONVEX_URL_E2E")
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

describe("persona modes per flow", () => {
  it("makes the First Run account through the UI and signs in onboarded otherwise", () => {
    expect(personaMode("first-run")).toBe("first-run")
    expect(personaMode("history")).toBe("with-history")
    expect(personaMode("sign-in")).toBe("onboarded")
  })
})

describe("native reorder flow", () => {
  const flowText = fs.readFileSync(path.join(root, ".maestro/native/workout-reorder.yaml"), "utf8")

  it("only uses testIDs that exist in the screens it drives", () => {
    const sources = [
      "app/(athlete)/index.tsx",
      "app/(athlete)/workout/[id].tsx",
      "app/(athlete)/workout/execute/[id].tsx",
      "components/workout/SetTracker.tsx",
      "components/workout/WarmupSection.tsx",
    ].map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n")
    const ids = [...new Set([...flowText.matchAll(/id: (\S+)/g)].map((m) => m[1]))]
    const missing = ids.filter((id) => {
      if (/^set-\d$/.test(id)) return !sources.includes("testID={`set-${index}`}")
      return !sources.includes(`testID="${id}"`)
    })
    expect(missing).toEqual([])
  })

  it("logs a set, restarts, resumes, and checks the set stayed on the first exercise", () => {
    const steps = parse(flowText.split(/^---$/m)[1])
    const at = (predicate) => steps.findIndex(predicate)
    const logged = at((s) => s.tapOn?.id === "set-0")
    const exit = at((s) => s === "stopApp")
    const resume = at((s) => s.tapOn === "Resume Workout")
    const finalCheck = steps.length - 2
    expect([logged > 0, exit > logged, resume > exit]).toEqual([true, true, true])
    expect(steps[finalCheck].assertVisible).toBe("Set 1, .*, done")
  })
})

describe("native no-auto-advance flow", () => {
  const flowPath = path.join(root, ".maestro/native/workout-no-auto-advance.yaml")
  const flowText = fs.readFileSync(flowPath, "utf8")

  it("parses with an appId header and does not launch", () => {
    const [header] = flowText.split(/^---$/m)
    expect(parse(header).appId).toBe("com.offseason.asrafit")
    expect(flowText).not.toContain("launchApp")
  })

  it("only uses testIDs that exist in the screens it drives", () => {
    const sources = [
      "app/(athlete)/index.tsx",
      "app/(athlete)/workout/[id].tsx",
      "app/(athlete)/workout/execute/[id].tsx",
      "components/workout/SetTracker.tsx",
      "components/workout/WarmupSection.tsx",
    ].map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n")
    const ids = [...new Set([...flowText.matchAll(/id: (\S+)/g)].map((m) => m[1]))]
    const missing = ids.filter((id) => {
      if (/^set-\d$/.test(id)) return !sources.includes("testID={`set-${index}`}")
      return !sources.includes(`testID="${id}"`)
    })
    expect(missing).toEqual([])
  })

  it("waits past the old 1.5 s delay before checking the exercise stayed", () => {
    const steps = parse(flowText.split(/^---$/m)[1])
    const wait = steps.find((s) => s.extendedWaitUntil)?.extendedWaitUntil
    expect(wait.timeout).toBeGreaterThan(1500)
    expect(wait.optional).toBe(true)
    const waitIndex = steps.findIndex((s) => s.extendedWaitUntil)
    const nextIndex = steps.findIndex((s) => s.tapOn?.id === "execute-next")
    expect(steps[waitIndex + 1].assertVisible.text).toBe("${maestro.copiedText}")
    expect(nextIndex).toBeGreaterThan(waitIndex)
  })
})
