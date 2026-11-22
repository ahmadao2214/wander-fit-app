import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  build,
  buildGallery,
  escapeHtml,
  newestMainArtifact,
  parseArtifactName,
  readEvidence,
  renderGallery,
} from "./gallery.mjs"

function entry(overrides) {
  return {
    flow: "sign-in",
    platform: "web",
    status: "passed",
    error: "",
    seconds: 40,
    createdAt: "2026-11-16T07:30:00Z",
    sha: "a31f9212b0c0cd37a14f9bbdd91e2fed99e91fa3",
    runId: 1,
    runUrl: "https://github.com/o/r/actions/runs/1",
    dir: "/nowhere",
    video: "t/sign-in/startRecording/recording.mp4",
    screenshots: ["t/sign-in/takeScreenshot/01-today.png"],
    ...overrides,
  }
}

const cellOf = (model, flow, platform) =>
  model.features.find((feature) => feature.flow === flow).cells.find((cell) => cell.platform === platform)

describe("artifact names", () => {
  it("splits e2e-<platform>-<flow> for the three platforms only", () => {
    expect(parseArtifactName("e2e-web-sign-in")).toEqual({ platform: "web", flow: "sign-in" })
    expect(parseArtifactName("e2e-ios-workout-exit-resume")).toEqual({ platform: "ios", flow: "workout-exit-resume" })
    expect(parseArtifactName("e2e-android-history")).toEqual({ platform: "android", flow: "history" })
    expect(parseArtifactName("e2e-desktop-sign-in")).toBeNull()
    expect(parseArtifactName("e2e-web-")).toBeNull()
  })

  it("picks the newest unexpired artifact from main in this repo", () => {
    const main = (id, created, extra = {}) => ({
      id,
      created_at: created,
      expired: false,
      workflow_run: { id, head_branch: "main", head_sha: "s", repository_id: 7, head_repository_id: 7 },
      ...extra,
    })
    const picked = newestMainArtifact([
      main(1, "2026-11-14T00:00:00Z"),
      main(2, "2026-11-16T00:00:00Z"),
      main(3, "2026-11-17T00:00:00Z", { expired: true }),
      { ...main(4, "2026-11-18T00:00:00Z"), workflow_run: { id: 4, head_branch: "t3/feature", repository_id: 7, head_repository_id: 7 } },
      { ...main(5, "2026-11-19T00:00:00Z"), workflow_run: { id: 5, head_branch: "main", repository_id: 7, head_repository_id: 9 } },
    ])
    expect(picked.id).toBe(2)
    expect(newestMainArtifact([])).toBeNull()
  })
})

describe("buildGallery", () => {
  it("groups by flow and platform, with a cell for every platform", () => {
    const model = buildGallery({
      flows: ["sign-in", "history"],
      entries: [entry({}), entry({ flow: "history", platform: "android" })],
    })
    expect(model.features.map((feature) => feature.flow)).toEqual(["history", "sign-in"])
    for (const feature of model.features) {
      expect(feature.cells.map((cell) => cell.platform)).toEqual(["web", "android", "ios"])
    }
    expect(cellOf(model, "sign-in", "web").entry.flow).toBe("sign-in")
    expect(cellOf(model, "history", "android").entry.platform).toBe("android")
    expect(cellOf(model, "history", "web").entry).toBeNull()
  })

  it("keeps the newest run per flow and platform", () => {
    const model = buildGallery({
      flows: ["sign-in"],
      entries: [
        entry({ runId: 1, createdAt: "2026-11-14T07:30:00Z" }),
        entry({ runId: 3, createdAt: "2026-11-16T07:30:00Z", status: "failed" }),
        entry({ runId: 2, createdAt: "2026-11-15T07:30:00Z" }),
      ],
    })
    expect(cellOf(model, "sign-in", "web").entry.runId).toBe(3)
  })

  it("keeps a failed flow and counts it as failing", () => {
    const model = buildGallery({
      flows: ["sign-in", "history"],
      entries: [entry({ status: "failed", error: "Maestro exited 1" }), entry({ flow: "history" })],
    })
    expect(cellOf(model, "sign-in", "web").entry.status).toBe("failed")
    expect(model.counts).toEqual({ passed: 1, failed: 1 })
    const html = renderGallery(model)
    expect(html).toContain('<span class="badge fail">Failing</span>')
    expect(html).toContain("Maestro exited 1")
    expect(html).toContain('class="cell failing"')
    expect(html).toContain("recording.mp4")
  })

  it("shows missing platforms as not run, with the issue that adds them", () => {
    const model = buildGallery({ flows: ["sign-in"], entries: [] })
    const html = renderGallery(model)
    expect(html).toContain("Not run yet (#83)")
    expect(html).toContain("Not run yet (#84)")
    expect(html).toContain("No evidence yet")
  })

  it("flags a flow the nightly uploaded nothing for, whichever run the shown evidence came from", () => {
    const model = buildGallery({
      flows: ["sign-in", "history", "first-run", "workout-loop"],
      entries: [
        // Older evidence; the nightly uploaded nothing for sign-in
        entry({ runId: 8, createdAt: "2026-11-15T07:30:00Z" }),
        // The nightly's own upload
        entry({ flow: "history", runId: 9, createdAt: "2026-11-16T07:40:00Z" }),
        // Uploaded by a main check after the nightly started; the nightly
        // itself uploaded nothing for first-run
        entry({ flow: "first-run", runId: 7, createdAt: "2026-11-16T07:25:00Z" }),
        // The nightly uploaded workout-loop, then a newer main check
        // superseded it: newer evidence, not missing evidence
        entry({ flow: "workout-loop", runId: 10, createdAt: "2026-11-16T08:10:00Z" }),
      ],
      run: {
        runId: 9,
        startedAt: "2026-11-16T07:17:00Z",
        platforms: ["web"],
        uploaded: ["e2e-web-history", "e2e-web-workout-loop"],
      },
    })
    expect(cellOf(model, "sign-in", "web").stale).toBe(true)
    expect(cellOf(model, "history", "web").stale).toBe(false)
    expect(cellOf(model, "first-run", "web").stale).toBe(true)
    expect(cellOf(model, "workout-loop", "web").stale).toBe(false)
    expect(renderGallery(model)).toContain("uploaded no evidence for this flow")
    expect(renderGallery(model)).not.toContain("older evidence")
  })

  it("flags nothing when the run did not record what it uploaded", () => {
    const model = buildGallery({
      flows: ["sign-in"],
      entries: [entry({ runId: 8 })],
      run: { runId: 9, startedAt: "2026-11-16T07:17:00Z", platforms: ["web"] },
    })
    expect(cellOf(model, "sign-in", "web").stale).toBe(false)
  })

  it("escapes flow names, file names and errors", () => {
    const model = buildGallery({
      flows: [],
      entries: [
        entry({
          flow: '<script>x</script>',
          status: "failed",
          error: '<img src=x onerror="alert(1)">',
          screenshots: ['t/takeScreenshot/"><i>shot.png'],
        }),
      ],
      titles: {},
    })
    const html = renderGallery(model)
    expect(html).not.toContain("<script>x</script>")
    expect(html).not.toContain("<img src=x")
    expect(html).not.toContain("<i>shot")
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;")
    expect(html).toContain("&quot;&gt;&lt;i&gt;shot")
    expect(html).toContain("%22%3E%3Ci%3Eshot.png")
    expect(escapeHtml(`a&'"`)).toBe("a&amp;&#39;&quot;")
  })
})

describe("evidence on disk", () => {
  let dir
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "gallery-"))
  })
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  function writeArtifact(base, { result, meta }) {
    const flowDir = path.join(base, "2026-11-16_210520", "sign-in")
    fs.mkdirSync(path.join(flowDir, "takeScreenshot"), { recursive: true })
    fs.mkdirSync(path.join(flowDir, "startRecording"), { recursive: true })
    fs.mkdirSync(path.join(flowDir, "logs"), { recursive: true })
    fs.writeFileSync(path.join(flowDir, "takeScreenshot", "03-today.png"), "png")
    fs.writeFileSync(path.join(flowDir, "takeScreenshot", "02-filled.png"), "png")
    fs.writeFileSync(path.join(flowDir, "startRecording", "recording.mp4"), "mp4")
    fs.writeFileSync(path.join(flowDir, "logs", "maestro.log"), "log")
    if (result) fs.writeFileSync(path.join(base, "result.json"), JSON.stringify(result))
    if (meta) fs.writeFileSync(path.join(base, "meta.json"), JSON.stringify(meta))
  }

  it("reads the video, ordered screenshots, result and run metadata", () => {
    writeArtifact(dir, {
      result: { flow: "sign-in", status: "passed", seconds: 48 },
      meta: { flow: "sign-in", platform: "web", runId: 5, sha: "abc", createdAt: "2026-11-16T21:07:15Z" },
    })
    const read = readEvidence(dir)
    expect(read.status).toBe("passed")
    expect(read.video).toBe("2026-11-16_210520/sign-in/startRecording/recording.mp4")
    expect(read.screenshots.map((file) => path.basename(file))).toEqual(["02-filled.png", "03-today.png"])
    expect([read.sha, read.runId, read.createdAt]).toEqual(["abc", 5, "2026-11-16T21:07:15Z"])
  })

  it("ignores archived cold-start attempt folders when selecting gallery video and screenshots", () => {
    const attempt1 = path.join(dir, "attempt-1", "2026-11-16_210500", "sign-in")
    fs.mkdirSync(path.join(attempt1, "startRecording"), { recursive: true })
    fs.writeFileSync(path.join(attempt1, "startRecording", "recording.mp4"), "partial-mp4")
    writeArtifact(dir, {
      result: { flow: "sign-in", status: "passed", seconds: 48 },
      meta: { flow: "sign-in", platform: "web", runId: 5, sha: "abc", createdAt: "2026-11-16T21:07:15Z" },
    })
    const read = readEvidence(dir)
    expect(read.video).toBe("2026-11-16_210520/sign-in/startRecording/recording.mp4")
    expect(read.screenshots.map((file) => path.basename(file))).toEqual(["02-filled.png", "03-today.png"])
  })

  it("treats evidence with no result.json as failing", () => {
    writeArtifact(dir, { meta: { flow: "sign-in", platform: "web" } })
    const read = readEvidence(dir)
    expect(read.status).toBe("failed")
    expect(read.error).toContain("No result.json")
  })

  it("builds a site with the media but not the logs", () => {
    const evidence = path.join(dir, "evidence")
    writeArtifact(path.join(evidence, "web", "sign-in", "5"), {
      result: { flow: "sign-in", status: "failed", error: "Maestro exited 1" },
      meta: { flow: "sign-in", platform: "web", runId: 5, sha: "abc", createdAt: "2026-11-16T21:07:15Z" },
    })
    const site = path.join(dir, "site")
    const model = build(evidence, site, ["sign-in"])
    expect(model.counts).toEqual({ passed: 0, failed: 1 })
    const media = path.join(site, "media/web/sign-in/2026-11-16_210520/sign-in")
    expect(fs.existsSync(path.join(media, "startRecording/recording.mp4"))).toBe(true)
    expect(fs.existsSync(path.join(media, "takeScreenshot/03-today.png"))).toBe(true)
    expect(fs.existsSync(path.join(media, "logs"))).toBe(false)
    const html = fs.readFileSync(path.join(site, "index.html"), "utf8")
    expect(html).toContain("<h2>Sign in</h2>")
    expect(html).toContain('name="viewport" content="width=device-width, initial-scale=1"')
  })
})
