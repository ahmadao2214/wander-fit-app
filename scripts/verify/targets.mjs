// App deployments the verification runner must never export or seed.
export const BLOCKED_CONVEX_HOSTS = [
  "fleet-mallard-22.convex.cloud",
  "accomplished-tapir-54.convex.cloud",
]

export const PLACEHOLDER_CONVEX_URL = "https://wander-fit-e2e.invalid"

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
