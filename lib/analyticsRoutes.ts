/**
 * Route-pattern normalization and replay route exclusion rules.
 *
 * Screen views and replay guards operate strictly on Expo Router segment
 * patterns (never raw Convex document IDs, user IDs, or query strings).
 */

const NUMERIC_SEGMENT_RE = /^\d+$/
const UUID_SEGMENT_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Convex document IDs are ~32-char lowercase/mixed base32/alphanumeric strings with digits.
const OPAQUE_ID_SEGMENT_RE = /^(?=.*\d)[a-z0-9_-]{16,}$/i

function sanitizeSegment(raw: string): string {
  const withoutQuery = raw.split(/[?#]/, 1)[0].trim()
  if (!withoutQuery) return ''
  // Preserve Expo Router route groups "(athlete)" and dynamic placeholders "[id]"
  if (
    (withoutQuery.startsWith('(') && withoutQuery.endsWith(')')) ||
    (withoutQuery.startsWith('[') && withoutQuery.endsWith(']'))
  ) {
    return withoutQuery
  }
  if (
    NUMERIC_SEGMENT_RE.test(withoutQuery) ||
    UUID_SEGMENT_RE.test(withoutQuery) ||
    OPAQUE_ID_SEGMENT_RE.test(withoutQuery)
  ) {
    return '[id]'
  }
  return withoutQuery
}

/**
 * Converts Expo Router `useSegments()` output into a clean route pattern,
 * e.g. `['(athlete)', 'workout', 'execute', '[id]']` -> `'/(athlete)/workout/execute/[id]'`.
 */
export function normalizeRouteSegments(segments: readonly string[]): string {
  const cleaned = segments
    .map(sanitizeSegment)
    .filter((segment) => segment.length > 0)

  if (cleaned.length === 0) return '/'
  return `/${cleaned.join('/')}`
}

/**
 * Every web URL route pattern in `app/` (route groups and trailing `index`
 * removed). A web URL is reported only as the pattern it matches; dynamic
 * positions are always `[id]`, whatever their value, and a URL that matches no
 * pattern becomes UNMATCHED_WEB_ROUTE (fails closed for new routes).
 * `lib/__tests__/analyticsRoutes.test.ts` keeps this list in sync with `app/`.
 */
export const WEB_ROUTE_PATTERNS: readonly string[] = [
  '/',
  '/about',
  '/celebration',
  '/days',
  '/history',
  '/maxes',
  '/profile',
  '/program',
  '/results',
  '/reveal',
  '/season',
  '/self-assessment',
  '/settings',
  '/sign-in',
  '/sport',
  '/training-science',
  '/workout/[id]',
  '/workout/execute/[id]',
]

/** Patterns backed by an `index.tsx`, so `<pattern>/index` is an alias for them. */
export const WEB_INDEX_ROUTE_PATTERNS: readonly string[] = ['/', '/training-science']

export const UNMATCHED_WEB_ROUTE = '/[unmatched]'

function toSegments(pattern: string): string[] {
  return pattern.split('/').filter((segment) => segment.length > 0)
}

const WEB_ROUTE_PATTERN_SEGMENTS = WEB_ROUTE_PATTERNS.map(toSegments)
const WEB_INDEX_ROUTE_SEGMENTS = WEB_INDEX_ROUTE_PATTERNS.map(toSegments)

function matchPattern(
  cleaned: readonly string[],
  patterns: readonly string[],
  patternSegments: readonly string[][]
): string | undefined {
  for (let i = 0; i < patternSegments.length; i++) {
    const pattern = patternSegments[i]
    if (pattern.length !== cleaned.length) continue
    if (pattern.every((part, j) => part.startsWith('[') || part === cleaned[j])) {
      return patterns[i]
    }
  }
  return undefined
}

/**
 * Maps web URL path segments (no route groups) to the route pattern they match.
 * The full path is matched first, so a dynamic value of `index` stays `[id]`;
 * a trailing `/index` is an alias only for index-backed routes.
 */
export function normalizeWebPathSegments(segments: readonly string[]): string {
  const cleaned = segments
    .map((raw) => raw.split(/[?#]/, 1)[0].trim())
    .filter((segment) => segment.length > 0)

  const direct = matchPattern(cleaned, WEB_ROUTE_PATTERNS, WEB_ROUTE_PATTERN_SEGMENTS)
  if (direct) return direct

  if (cleaned.length > 0 && cleaned[cleaned.length - 1] === 'index') {
    const alias = matchPattern(
      cleaned.slice(0, -1),
      WEB_INDEX_ROUTE_PATTERNS,
      WEB_INDEX_ROUTE_SEGMENTS
    )
    if (alias) return alias
  }
  return UNMATCHED_WEB_ROUTE
}

const EXCLUDED_REPLAY_PREFIXES = [
  '/(auth)',
  '/(first-run)',
  '/(reassessment)',
] as const

const EXCLUDED_REPLAY_EXACT = new Set<string>([
  '/',
  '/index',
  '/(athlete)/profile',
  '/(athlete)/settings',
  '/(athlete)/workout/[id]',
])

/**
 * Returns true if the normalized route must NEVER record a session replay:
 * auth, First Run, reassessment, Profile, Settings, and Workout Detail.
 */
export function isReplayExcludedRoute(normalizedRoute: string): boolean {
  if (!normalizedRoute || normalizedRoute === '/') return true
  if (EXCLUDED_REPLAY_EXACT.has(normalizedRoute)) return true
  for (const prefix of EXCLUDED_REPLAY_PREFIXES) {
    if (normalizedRoute === prefix || normalizedRoute.startsWith(`${prefix}/`)) {
      return true
    }
  }
  return false
}
