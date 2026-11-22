#!/usr/bin/env node
// The nightly evidence gallery: one static page with each feature's newest
// video and step screenshots on web, Android and iOS.
//
//   node scripts/verify/gallery.mjs collect <evidence-dir>
//     Downloads the newest e2e-<platform>-<flow> artifact from main for every
//     flow and platform (gh CLI, GH_TOKEN in CI). Writes meta.json beside each.
//   node scripts/verify/gallery.mjs build <evidence-dir> <site-dir>
//     Builds <site-dir>/index.html and copies only the videos and screenshots.
//     Logs and commands.json never go on the public page.
//
// Collected layout: <evidence>/<platform>/<flow>/<runId>/{meta.json, result.json, ...}
// and <evidence>/run.json for the run that is building the gallery.
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { artifactName, listWebFlows, root } from "./flows.mjs"

export const platforms = [
  { id: "web", label: "Web" },
  { id: "android", label: "Android", notRun: "Not run yet (#83)" },
  { id: "ios", label: "iOS", notRun: "Not run yet (#84)" },
]

const featuresDir = path.join(root, ".cursor/skills/verify-wander-fit/features")
const repoUrl = "https://github.com/ahmadao2214/wander-fit-app"

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// A relative URL for a site path, every segment percent-encoded, then made
// safe for an attribute.
export function mediaUrl(...segments) {
  return escapeHtml(segments.flatMap((s) => String(s).split("/")).map(encodeURIComponent).join("/"))
}

// e2e-web-sign-in -> { platform: "web", flow: "sign-in" }
export function parseArtifactName(name) {
  for (const platform of platforms) {
    const prefix = `e2e-${platform.id}-`
    if (name.startsWith(prefix) && name.length > prefix.length) {
      return { platform: platform.id, flow: name.slice(prefix.length) }
    }
  }
  return null
}

// From the repo's artifact listing for one name, the newest one that a run on
// main in this repo uploaded and that has not expired. PR evidence is skipped.
export function newestMainArtifact(artifacts) {
  const usable = (artifacts || []).filter((artifact) => {
    const run = artifact.workflow_run || {}
    const sameRepo = run.head_repository_id === undefined || run.head_repository_id === run.repository_id
    return !artifact.expired && run.head_branch === "main" && sameRepo
  })
  usable.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  return usable[0] || null
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkFiles(full))
    else if (entry.isFile()) out.push(full)
  }
  return out
}

// One collected artifact folder -> one gallery entry. Paths are relative to
// the folder, so the builder can copy them.
export function readEvidence(dir) {
  const readJson = (file) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))
    } catch {
      return null
    }
  }
  const meta = readJson("meta.json") || {}
  const result = readJson("result.json") || {}
  const files = walkFiles(dir)
    .map((full) => path.relative(dir, full).split(path.sep).join("/"))
    // Ignore archived cold-start retry folders (`attempt-1/...`) when picking
    // gallery media so only the final attempt's video and screenshots appear.
    .filter((file) => !/^attempt-\d+\//.test(file))
  const video = files.find((file) => /(^|\/)startRecording\/recording\.mp4$/.test(file)) || null
  const screenshots = files
    .filter((file) => /(^|\/)takeScreenshot\/[^/]+\.png$/i.test(file))
    .sort((a, b) => path.posix.basename(a).localeCompare(path.posix.basename(b)))
  const flow = meta.flow || result.flow
  const platform = meta.platform || "web"
  // No result.json means the runner never recorded an outcome: not a pass.
  const status = result.status === "passed" ? "passed" : "failed"
  return {
    flow,
    platform,
    status,
    error: result.error || (result.status ? "" : "No result.json in the evidence."),
    seconds: result.seconds,
    createdAt: meta.createdAt || "",
    sha: meta.sha || "",
    runId: meta.runId || "",
    runUrl: meta.runUrl || "",
    dir,
    video,
    screenshots,
  }
}

export function readCollected(evidenceDir) {
  const entries = []
  for (const platform of platforms) {
    const platformDir = path.join(evidenceDir, platform.id)
    if (!fs.existsSync(platformDir)) continue
    for (const flow of fs.readdirSync(platformDir)) {
      const flowDir = path.join(platformDir, flow)
      if (!fs.statSync(flowDir).isDirectory()) continue
      for (const run of fs.readdirSync(flowDir)) {
        const dir = path.join(flowDir, run)
        if (!fs.statSync(dir).isDirectory()) continue
        const entry = readEvidence(dir)
        entries.push({ ...entry, flow: entry.flow || flow, platform: platform.id })
      }
    }
  }
  let run = null
  try {
    run = JSON.parse(fs.readFileSync(path.join(evidenceDir, "run.json"), "utf8"))
  } catch {}
  return { entries, run }
}

export function featureTitle(flow, dir = featuresDir) {
  try {
    const text = fs.readFileSync(path.join(dir, `${flow}.md`), "utf8")
    const heading = text.match(/^# (.+)$/m)
    if (heading) return heading[1].trim()
  } catch {}
  return flow
}

// The page model. Every flow gets a row and every platform a cell, even with
// no evidence, so a missing platform reads as not run instead of vanishing.
// The newest entry per flow and platform wins, passing or not. When `run`
// names the run building the gallery and lists what it uploaded, a cell for a
// platform that run covers is flagged when the run uploaded nothing for that
// flow. Its evidence may be older, or newer from a main check that ran while
// the nightly waited; either way the nightly produced none.
export function buildGallery({ flows, entries, run = null, titles = {} }) {
  const names = [...new Set([...flows, ...entries.map((entry) => entry.flow)])].sort()
  const newest = new Map()
  for (const entry of entries) {
    const key = `${entry.platform}\u0000${entry.flow}`
    const current = newest.get(key)
    if (!current || String(entry.createdAt).localeCompare(String(current.createdAt)) > 0) {
      newest.set(key, entry)
    }
  }
  const ranPlatforms = run?.platforms || []
  const features = names.map((flow) => ({
    flow,
    title: titles[flow] || flow,
    cells: platforms.map((platform) => {
      const entry = newest.get(`${platform.id}\u0000${flow}`) || null
      const stale = Boolean(
        entry &&
          Array.isArray(run?.uploaded) &&
          ranPlatforms.includes(platform.id) &&
          !run.uploaded.includes(artifactName(flow, platform.id))
      )
      return { platform: platform.id, label: platform.label, notRun: platform.notRun || "No evidence yet", entry, stale }
    }),
  }))
  const cells = features.flatMap((feature) => feature.cells.map((cell) => cell.entry).filter(Boolean))
  return {
    features,
    run,
    counts: {
      passed: cells.filter((entry) => entry.status === "passed").length,
      failed: cells.filter((entry) => entry.status === "failed").length,
    },
  }
}

// Where a cell's files land on the site.
export function sitePath(entry, file) {
  return `media/${entry.platform}/${entry.flow}/${file}`
}

function formatDate(iso) {
  if (!iso) return "date unknown"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`
}

function renderCell(cell) {
  const { entry } = cell
  if (!entry) {
    return `<article class="cell empty" aria-label="${escapeHtml(cell.label)}: not run">
  <h3>${escapeHtml(cell.label)}</h3>
  <p class="none">${escapeHtml(cell.notRun)}</p>
</article>`
  }
  const failing = entry.status !== "passed"
  const sha = entry.sha
    ? `<a href="${escapeHtml(`${repoUrl}/commit/${entry.sha}`)}"><code>${escapeHtml(entry.sha.slice(0, 7))}</code></a>`
    : "commit unknown"
  const runLink = entry.runUrl ? ` · <a href="${escapeHtml(entry.runUrl)}">run</a>` : ""
  const time = entry.seconds === undefined ? "" : ` · ${escapeHtml(entry.seconds)}s`
  const badge = failing
    ? `<span class="badge fail">Failing</span>`
    : `<span class="badge pass">Passed</span>`
  const error = failing && entry.error ? `<p class="error">${escapeHtml(entry.error)}</p>` : ""
  const stale = cell.stale
    ? `<p class="stale">The latest nightly run uploaded no evidence for this flow. This evidence is from another run.</p>`
    : ""
  const poster = entry.screenshots[0] ? ` poster="${mediaUrl(sitePath(entry, entry.screenshots[0]))}"` : ""
  const video = entry.video
    ? `<video controls muted playsinline preload="metadata"${poster} src="${mediaUrl(sitePath(entry, entry.video))}"></video>`
    : `<p class="none">No video recorded.</p>`
  const shots = entry.screenshots.length
    ? `<ol class="shots">${entry.screenshots
        .map((file) => {
          const name = path.posix.basename(file).replace(/\.png$/i, "")
          const url = mediaUrl(sitePath(entry, file))
          return `<li><a href="${url}"><img loading="lazy" src="${url}" alt="${escapeHtml(name)}"></a><span>${escapeHtml(name)}</span></li>`
        })
        .join("")}</ol>`
    : `<p class="none">No step screenshots.</p>`
  return `<article class="cell${failing ? " failing" : ""}" aria-label="${escapeHtml(cell.label)}: ${failing ? "failing" : "passed"}">
  <h3>${escapeHtml(cell.label)} ${badge}</h3>
  <p class="meta">${escapeHtml(formatDate(entry.createdAt))} · ${sha}${time}${runLink}</p>
  ${stale}${error}${video}
  ${shots}
</article>`
}

export function renderGallery(model, { generatedAt = new Date().toISOString() } = {}) {
  const sections = model.features
    .map((feature) => {
      const failing = feature.cells.some((cell) => cell.entry && cell.entry.status !== "passed")
      return `<section id="${escapeHtml(feature.flow)}"${failing ? ' class="has-failure"' : ""}>
  <header>
    <h2>${escapeHtml(feature.title)}</h2>
    <a class="doc" href="${escapeHtml(`${repoUrl}/blob/main/.cursor/skills/verify-wander-fit/features/${encodeURIComponent(feature.flow)}.md`)}"><code>${escapeHtml(feature.flow)}</code></a>
  </header>
  <div class="cells">
${feature.cells.map(renderCell).join("\n")}
  </div>
</section>`
    })
    .join("\n")
  const runLine = model.run?.runUrl
    ? ` · built by <a href="${escapeHtml(model.run.runUrl)}">this nightly run</a>`
    : ""
  const { passed, failed } = model.counts
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wander-Fit evidence</title>
<style>
:root{--bg:#fafaf9;--surface:#fff;--text:#1c1917;--muted:#57534e;--line:#e7e5e4;--pass:#166534;--pass-bg:#dcfce7;--fail:#b91c1c;--fail-bg:#fee2e2;--warn:#92400e;--warn-bg:#fef3c7;--link:#1d4ed8;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#0c0a09;--surface:#1c1917;--text:#f5f5f4;--muted:#a8a29e;--line:#292524;--pass:#86efac;--pass-bg:#14532d;--fail:#fca5a5;--fail-bg:#450a0a;--warn:#fcd34d;--warn-bg:#451a03;--link:#93c5fd}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:1280px;margin:0 auto;padding:24px 16px 64px}
a{color:var(--link)}
code{font:13px ui-monospace,SFMono-Regular,Menlo,monospace}
.top h1{font-size:22px;margin:0 0 4px}
.top p{margin:0;color:var(--muted)}
.totals{display:flex;gap:8px;margin:12px 0 0;padding:0;list-style:none;flex-wrap:wrap}
section{margin-top:32px;padding-top:16px;border-top:1px solid var(--line)}
section>header{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:12px}
h2{font-size:18px;margin:0}
.doc{color:var(--muted)}
.cells{display:grid;gap:12px;grid-template-columns:1fr;align-items:start}
@media (min-width:900px){.cells{grid-template-columns:repeat(3,minmax(0,1fr))}}
.cell{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:12px;min-width:0}
.cell.failing{border:2px solid var(--fail)}
.cell.empty{border-style:dashed;background:transparent}
h3{font-size:15px;margin:0 0 4px;display:flex;align-items:center;gap:8px}
.badge{font-size:12px;font-weight:600;padding:1px 8px;border-radius:999px}
.badge.pass{color:var(--pass);background:var(--pass-bg)}
.badge.fail{color:var(--fail);background:var(--fail-bg)}
.meta{margin:0 0 8px;color:var(--muted);font-size:13px;font-variant-numeric:tabular-nums}
.none{margin:0;color:var(--muted)}
.error{margin:0 0 8px;padding:8px;border-radius:6px;background:var(--fail-bg);color:var(--fail);font:13px/1.4 ui-monospace,Menlo,monospace;overflow-wrap:anywhere}
.stale{margin:0 0 8px;padding:8px;border-radius:6px;background:var(--warn-bg);color:var(--warn);font-size:13px}
video{display:block;width:100%;border-radius:6px;background:#000;margin-bottom:8px}
.shots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0;padding:0;list-style:none}
.shots li{min-width:0}
.shots img{display:block;width:100%;height:auto;border-radius:4px;border:1px solid var(--line)}
.shots span{display:block;font-size:12px;color:var(--muted);overflow-wrap:anywhere}
</style>
</head>
<body>
<main>
<header class="top">
  <h1>Wander-Fit evidence</h1>
  <p>Newest end-to-end evidence from main for each feature. Generated ${escapeHtml(formatDate(generatedAt))}${runLine}.</p>
  <ul class="totals"><li class="badge pass">${passed} passed</li><li class="badge fail">${failed} failing</li></ul>
</header>
${sections}
</main>
</body>
</html>
`
}

export function writeSite(model, siteDir, options) {
  fs.mkdirSync(siteDir, { recursive: true })
  for (const feature of model.features) {
    for (const cell of feature.cells) {
      const { entry } = cell
      if (!entry) continue
      for (const file of [entry.video, ...entry.screenshots].filter(Boolean)) {
        const target = path.join(siteDir, ...sitePath(entry, file).split("/"))
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.copyFileSync(path.join(entry.dir, ...file.split("/")), target)
      }
    }
  }
  fs.writeFileSync(path.join(siteDir, "index.html"), renderGallery(model, options))
}

export function build(evidenceDir, siteDir, flows = listWebFlows()) {
  const { entries, run } = readCollected(evidenceDir)
  const names = [...new Set([...flows, ...entries.map((entry) => entry.flow)])]
  const titles = Object.fromEntries(names.map((flow) => [flow, featureTitle(flow)]))
  const model = buildGallery({ flows, entries, run, titles })
  writeSite(model, siteDir)
  return model
}

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] })
}

export function collect(evidenceDir, flows = listWebFlows()) {
  const repo = process.env.GITHUB_REPOSITORY || gh(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]).trim()
  const server = process.env.GITHUB_SERVER_URL || "https://github.com"
  fs.mkdirSync(evidenceDir, { recursive: true })
  const runId = process.env.GITHUB_RUN_ID
  if (runId) {
    const run = JSON.parse(gh(["api", `repos/${repo}/actions/runs/${runId}`]))
    const record = {
      runId: Number(runId),
      runUrl: `${server}/${repo}/actions/runs/${runId}`,
      startedAt: run.run_started_at || run.created_at,
      platforms: (process.env.GALLERY_RAN_PLATFORMS || "web").split(",").filter(Boolean),
      // The evidence artifacts this run uploaded, so the page can tell a flow
      // the nightly skipped from one a newer run superseded.
      uploaded: JSON.parse(
        gh(["api", `repos/${repo}/actions/runs/${runId}/artifacts?per_page=100`])
      ).artifacts.map((artifact) => artifact.name),
    }
    fs.writeFileSync(path.join(evidenceDir, "run.json"), JSON.stringify(record, null, 2))
  }
  for (const flow of flows) {
    for (const platform of platforms) {
      const name = artifactName(flow, platform.id)
      const listing = JSON.parse(gh(["api", `repos/${repo}/actions/artifacts?name=${encodeURIComponent(name)}&per_page=100`]))
      const artifact = newestMainArtifact(listing.artifacts)
      if (!artifact) {
        console.log(`${name}: none on main`)
        continue
      }
      const run = artifact.workflow_run
      const dir = path.join(evidenceDir, platform.id, flow, String(run.id))
      gh(["run", "download", String(run.id), "--repo", repo, "--name", name, "--dir", dir])
      const meta = {
        flow,
        platform: platform.id,
        artifact: name,
        runId: run.id,
        runUrl: `${server}/${repo}/actions/runs/${run.id}`,
        sha: run.head_sha,
        createdAt: artifact.created_at,
      }
      fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2))
      console.log(`${name}: run ${run.id} ${artifact.created_at}`)
    }
  }
}

function main() {
  const [command, evidenceDir, siteDir] = process.argv.slice(2)
  if (command === "collect" && evidenceDir) {
    collect(path.resolve(evidenceDir))
  } else if (command === "build" && evidenceDir && siteDir) {
    const model = build(path.resolve(evidenceDir), path.resolve(siteDir))
    console.log(`gallery: ${model.features.length} features, ${model.counts.passed} passed, ${model.counts.failed} failing`)
  } else {
    console.error("Use: gallery.mjs collect <evidence-dir> | gallery.mjs build <evidence-dir> <site-dir>")
    process.exit(1)
  }
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) main()
