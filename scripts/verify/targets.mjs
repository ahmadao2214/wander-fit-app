// App deployments the verification runner must never export or seed.
export const BLOCKED_CONVEX_HOSTS = [
  "fleet-mallard-22.convex.cloud",
  "accomplished-tapir-54.convex.cloud",
]

export const PLACEHOLDER_CONVEX_URL = "https://wander-fit-e2e.invalid"

// The Convex project every verification deployment lives in. Pull request runs
// get a preview deployment in it; main and local runs use its dev deployment.
export const E2E_PROJECT = "wander-fit-e2e"

export function convexHost(url) {
  try {
    return new URL(url).host
  } catch {
    return ""
  }
}

export function assertConvexUrlAllowed(url) {
  const host = convexHost(url)
  if (!host || BLOCKED_CONVEX_HOSTS.includes(host)) {
    throw new Error(
      `Refusing Convex host "${host || url}". Verification uses wander-fit-e2e, not an app deployment.`
    )
  }
  return host
}

// A dev deploy key names its deployment: dev:<name>|<token>.
export function devKeyHost(key) {
  const prefix = String(key || "").split("|")[0]
  const [kind, name] = prefix.split(":")
  if (kind !== "dev" || !name) {
    throw new Error("CONVEX_DEPLOY_KEY_E2E must be a dev deploy key for wander-fit-e2e.")
  }
  const host = `${name}.convex.cloud`
  if (BLOCKED_CONVEX_HOSTS.includes(host)) {
    throw new Error(`Refusing Convex host "${host}". Verification uses wander-fit-e2e, not an app deployment.`)
  }
  return host
}

// A preview deploy key names its project, not a deployment:
// preview:<team>:<project>|<token>. It can only create and reach preview
// deployments of that project, so it cannot touch the app deployments.
export function assertPreviewKey(key) {
  const prefix = String(key || "").split("|")[0]
  const [kind, , project] = prefix.split(":")
  if (kind !== "preview" || project !== E2E_PROJECT) {
    throw new Error(`CONVEX_PREVIEW_DEPLOY_KEY_E2E must be a preview deploy key for ${E2E_PROJECT}.`)
  }
  return project
}

// One preview deployment per branch. Deploying the same name again replaces
// that branch's deployment, so a new push starts from a fresh, seeded backend.
export function previewName(branch) {
  const name = String(branch || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "")
  if (!name) throw new Error("CONVEX_PREVIEW_NAME_E2E must name the pull request branch.")
  return name
}

// Picks the wander-fit-e2e deployment for persona and seed calls.
// - preview: a preview key plus the branch's preview name and URL (PR runs)
// - dev: a dev deploy key whose deployment matches the URL (main)
// - local: no key; .env.e2e selects the dev deployment with your Convex login
// Every mode refuses the app deployments.
export function resolveConvexTarget({ url, devKey, previewKey, previewBranch, envFileDeployment }) {
  if (!url) {
    throw new Error(
      "persona is locked. Set EXPO_PUBLIC_CONVEX_URL_E2E or write it to .env.e2e before create, inspect, delete, or sweep."
    )
  }
  const host = assertConvexUrlAllowed(url)
  if (devKey && previewKey) {
    throw new Error("Set CONVEX_DEPLOY_KEY_E2E or CONVEX_PREVIEW_DEPLOY_KEY_E2E, not both.")
  }
  if (previewKey) {
    assertPreviewKey(previewKey)
    return { mode: "preview", host, env: { CONVEX_DEPLOY_KEY: previewKey }, args: ["--preview-name", previewName(previewBranch)] }
  }
  if (devKey) {
    const keyHost = devKeyHost(devKey)
    if (keyHost !== host) {
      throw new Error(`Deploy key host ${keyHost} does not match EXPO_PUBLIC_CONVEX_URL_E2E host ${host}.`)
    }
    return { mode: "dev", host, env: { CONVEX_DEPLOY_KEY: devKey }, args: [] }
  }
  const deployment = envFileDeployment || ""
  const name = deployment.split(":").pop()
  if (!deployment.startsWith("dev:") || `${name}.convex.cloud` !== host) {
    throw new Error("`.env.e2e` must select the wander-fit-e2e dev deployment.")
  }
  return { mode: "local", host, env: { CONVEX_DEPLOYMENT: deployment }, args: [] }
}
