import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
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

  it("includes sign-in, sign-up, and activation", () => {
    expect(listWebFlows()).toContain("sign-in")
    expect(listWebFlows()).toContain("sign-up")
    expect(listWebFlows()).toContain("activation")
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

  it("keeps the sign-up entry thin and its journey launch-free", () => {
    const entry = fs.readFileSync(path.join(root, ".maestro/web/sign-up.yaml"), "utf8")
    expect(entry.startsWith("url: ${VERIFY_URL}\n")).toBe(true)
    expect(entry).toContain("clearState: true")
    expect(entry.indexOf("launchApp:")).toBeGreaterThan(-1)
    expect(entry.indexOf("launchApp:")).toBeLessThan(entry.indexOf("runFlow: ../journeys/sign-up.yaml"))
    expect(entry).not.toContain("appId:")
    expect(entry).not.toContain("inputText:")
    const journey = fs.readFileSync(path.join(root, ".maestro/journeys/sign-up.yaml"), "utf8")
    expect(journey).toMatch(/^url: \$\{VERIFY_URL\}\n---\n/)
    expect(journey).not.toMatch(/^appId:/m)
    expect(journey).not.toContain("launchApp")
    expect(journey).not.toMatch(/^env:/m)
  })

  it("records sign-up through the code screen to the intake sport screen", () => {
    const flow = expandFlow(path.join(root, ".maestro/web/sign-up.yaml"))
    const screen = fs.readFileSync(path.join(root, "app/(auth)/sign-up.tsx"), "utf8")
    for (const id of ["sign-up-name", "sign-up-email", "sign-up-password"]) {
      expect(screen).toContain(`testID="${id}"`)
      expect(screen).toContain(`nativeID="${id}"`)
    }
    expect(screen).toContain('testID="sign-up-submit"')
    expect(screen).toContain('firstInputId="sign-up-code"')
    const launch = flow.indexOf("launchApp")
    const start = flow.indexOf("startRecording: recording")
    const welcome = flow.indexOf('visible: "WELCOME BACK"')
    const signUpLink = flow.indexOf('tapOn: "Sign up"')
    const swipe = flow.indexOf("- swipe:")
    const name = flow.indexOf("id: sign-up-name\n- inputText")
    const fullName = flow.indexOf('inputText: "Verify Athlete"')
    const email = flow.indexOf("inputText: ${PERSONA_EMAIL}")
    const password = flow.indexOf("inputText: ${PERSONA_PASSWORD}")
    const submit = flow.indexOf("id: sign-up-submit\n- extendedWaitUntil")
    const verify = flow.indexOf('visible: "VERIFY EMAIL"')
    const codeBox = flow.indexOf("id: sign-up-code")
    const code = flow.indexOf('inputText: "424242"')
    const sport = flow.indexOf('visible: "Search sports..."')
    const noSetup = flow.indexOf('assertNotVisible: "COMPLETE SETUP"')
    const shot = flow.indexOf("takeScreenshot: 04-sport")
    const stop = flow.lastIndexOf("stopRecording")
    expect(flow).not.toContain("Trainer")
    expect(start).toBeGreaterThan(launch)
    expect(welcome).toBeGreaterThan(start)
    expect(signUpLink).toBeGreaterThan(welcome)
    expect(swipe).toBeGreaterThan(signUpLink)
    expect(name).toBeGreaterThan(swipe)
    expect(fullName).toBeGreaterThan(name)
    expect(email).toBeGreaterThan(fullName)
    expect(password).toBeGreaterThan(email)
    expect(submit).toBeGreaterThan(password)
    expect(verify).toBeGreaterThan(submit)
    expect(codeBox).toBeGreaterThan(verify)
    expect(code).toBeGreaterThan(codeBox)
    expect(sport).toBeGreaterThan(code)
    expect(noSetup).toBeGreaterThan(sport)
    expect(shot).toBeGreaterThan(noSetup)
    expect(stop).toBeGreaterThan(shot)
  })

  it("keeps the activation entry thin and its journey launch-free", () => {
    const entry = fs.readFileSync(path.join(root, ".maestro/web/activation.yaml"), "utf8")
    expect(entry.startsWith("url: ${VERIFY_URL}\n")).toBe(true)
    expect(entry).toContain("clearState: true")
    expect(entry.indexOf("launchApp:")).toBeGreaterThan(-1)
    expect(entry.indexOf("launchApp:")).toBeLessThan(entry.indexOf("runFlow: ../journeys/activation.yaml"))
    expect(entry).not.toContain("appId:")
    const journey = fs.readFileSync(path.join(root, ".maestro/journeys/activation.yaml"), "utf8")
    expect(journey).toMatch(/^url: \$\{VERIFY_URL\}\n---\n/)
    expect(journey).not.toMatch(/^appId:/m)
    expect(journey).not.toContain("launchApp")
    expect(journey).not.toMatch(/^env:/m)
  })

  it("records activation from sign-in through intake and commitment to Today", () => {
    const flow = expandFlow(path.join(root, ".maestro/web/activation.yaml"))
    const sport = fs.readFileSync(path.join(root, "app/(intake)/sport.tsx"), "utf8")
    const days = fs.readFileSync(path.join(root, "app/(intake)/training-days.tsx"), "utf8")
    const season = fs.readFileSync(path.join(root, "app/(intake)/season-timeline.tsx"), "utf8")
    const commitment = fs.readFileSync(path.join(root, "app/(onboarding)/commitment.tsx"), "utf8")
    expect(sport).toContain("testID={`sport-tile-${getSportSlug(sport.name)}`}")
    expect(days).toContain("testID={`training-day-${day.index}`}")
    expect(season).toContain("`season-day-${formatDateISO(date)}`")
    expect(season).toContain('testID="season-next-month"')
    expect(commitment).toContain('testID="commitment-button"')
    expect(commitment).not.toContain("CommitmentButton")
    expect(flow).not.toContain("longPressOn")
    const order = [
      "startRecording: recording",
      'visible: "WELCOME BACK"',
      "inputText: ${PERSONA_PASSWORD}",
      "id: sport-tile-basketball",
      'assertNotVisible: "COMPLETE SETUP"',
      'visible: "Training in 3 Phases"',
      'tapOn: "Performance"',
      'visible: "YOUR EXPERIENCE"',
      "runScript: ../scripts/activation-dates.js",
      "id: training-day-${output.today}",
      "notVisible:\n        id: ${output.seasonDay}",
      "          id: season-next-month\n- tapOn:\n    id: ${output.seasonDay}",
      "tapOn: \"I'll set these later\"",
      'visible: "Your Program is Ready!"',
      "id: commitment-button",
      'visible: "Welcome back,.*"',
      "id: today-workout-card",
      'assertVisible: "Start Workout"',
      "takeScreenshot: 12-today",
      "stopRecording",
    ]
    const positions = order.map((needle) => {
      const at = flow.indexOf(needle)
      expect(at, needle).toBeGreaterThan(-1)
      return at
    })
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i], `${order[i]} after ${order[i - 1]}`).toBeGreaterThan(positions[i - 1])
    }
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

describe("persona modes per flow", () => {
  it("signs up through the UI, activates from needs-intake, and signs in onboarded otherwise", () => {
    expect(personaMode("sign-up")).toBe("signup")
    expect(personaMode("activation")).toBe("needs-intake")
    expect(personaMode("sign-in")).toBe("onboarded")
  })
})

describe("activation dates script", () => {
  async function runDates(isoNow) {
    const vm = await import("node:vm")
    const source = fs.readFileSync(path.join(root, ".maestro/scripts/activation-dates.js"), "utf8")
    const RealDate = Date
    class FixedDate extends RealDate {
      constructor(...args) {
        super(...(args.length ? args : [isoNow]))
      }
    }
    const output = {}
    vm.runInNewContext(source, { Date: FixedDate, output })
    return output
  }

  it("picks today and two more days, and a season 84 days out", async () => {
    // Thursday 12 Nov 2026, local time.
    const output = await runDates("2026-11-12T10:00:00")
    expect(output).toEqual({ today: 4, day2: 6, day4: 1, seasonDay: "season-day-2027-02-04" })
  })

  it("wraps the week and pads the date", async () => {
    // Saturday 1 Mar 2025 + 84 days = Saturday 24 May 2025.
    const output = await runDates("2025-03-01T23:30:00")
    expect(output).toEqual({ today: 6, day2: 1, day4: 3, seasonDay: "season-day-2025-05-24" })
  })
})
