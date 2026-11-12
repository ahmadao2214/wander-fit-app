#!/usr/bin/env node
// Writes the web E2E pass/fail table to the GitHub job summary, with a link
// to each flow's artifact. Never fails the job: the flow step already did.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { artifactName, listWebFlows, resultsFile } from "./flows.mjs"

const icons = { passed: "✅ passed", failed: "❌ failed", "not run": "⚪ not run" }

function cell(text) {
  return String(text ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim()
}

// flows: every flow under .maestro/web. results: what the runner recorded.
// artifacts: { [artifactName]: url } for artifacts this run uploaded.
export function renderSummary({ flows, results, artifacts, runUrl }) {
  const byFlow = new Map((results || []).map((result) => [result.flow, result]))
  const names = [...new Set([...flows, ...byFlow.keys()])]
  const lines = [
    "## Web E2E (advisory)",
    "",
    "| Flow | Result | Time | Evidence | Notes |",
    "| --- | --- | --- | --- | --- |",
  ]
  for (const flow of names) {
    const result = byFlow.get(flow)
    const status = result?.status || "not run"
    const name = result?.artifact || artifactName(flow)
    const url = artifacts[name]
    const evidence = url ? `[${name}](${url})` : `${name} (not uploaded)`
    const time = result?.seconds === undefined ? "" : `${result.seconds}s`
    lines.push(`| ${cell(flow)} | ${icons[status] || cell(status)} | ${time} | ${evidence} | ${cell(result?.error)} |`)
  }
  if (!results) {
    lines.push("", "No flow ran. Check the deploy, seed, and export steps in the job log.")
  }
  if (runUrl) lines.push("", `Run: ${runUrl}`)
  lines.push(
    "",
    "Evidence is Maestro's step screenshots, `commands.json` and `logs/maestro.log`, with the persona password redacted. There is no video yet."
  )
  return `${lines.join("\n")}\n`
}

async function uploadedArtifacts() {
  const { GITHUB_API_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_SERVER_URL, GITHUB_TOKEN } = process.env
  if (!GITHUB_REPOSITORY || !GITHUB_RUN_ID || !GITHUB_TOKEN) return {}
  const api = GITHUB_API_URL || "https://api.github.com"
  const server = GITHUB_SERVER_URL || "https://github.com"
  try {
    const response = await fetch(
      `${api}/repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/artifacts?per_page=100`,
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" } }
    )
    if (!response.ok) {
      console.error(`artifact list failed (${response.status}); summary has no links`)
      return {}
    }
    const body = await response.json()
    const out = {}
    for (const artifact of body.artifacts || []) {
      out[artifact.name] = `${server}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/artifacts/${artifact.id}`
    }
    return out
  } catch (error) {
    console.error(`artifact list failed (${error?.message || error}); summary has no links`)
    return {}
  }
}

async function main() {
  const results = fs.existsSync(resultsFile)
    ? JSON.parse(fs.readFileSync(resultsFile, "utf8")).flows
    : null
  const { GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_SERVER_URL } = process.env
  const runUrl =
    GITHUB_REPOSITORY && GITHUB_RUN_ID
      ? `${GITHUB_SERVER_URL || "https://github.com"}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
      : ""
  const markdown = renderSummary({
    flows: listWebFlows(),
    results,
    artifacts: await uploadedArtifacts(),
    runUrl,
  })
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown)
  }
  process.stdout.write(markdown)
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error?.message || error)
  })
}
