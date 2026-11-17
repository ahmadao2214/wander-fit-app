/**
 * The chat connector address for a Convex deployment: HTTP routes live on
 * `.convex.site`, while the app talks to `.convex.cloud`.
 */
export function mcpAddress(convexUrl: string | undefined): string | null {
  if (!convexUrl) return null
  let url: URL
  try {
    url = new URL(convexUrl)
  } catch {
    return null
  }
  if (!url.hostname.endsWith('.convex.cloud')) return null
  return `https://${url.hostname.replace(/\.convex\.cloud$/, '.convex.site')}/mcp`
}
