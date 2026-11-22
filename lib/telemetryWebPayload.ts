import type { CaptureResult } from 'posthog-js'
import { normalizeWebPathSegments } from './analyticsRoutes'

/**
 * PostHog web auto-attached properties that can contain raw route IDs, query
 * strings, referrers, or person traits and must NEVER leave the browser.
 */
export const WEB_POSTHOG_PROPERTY_DENYLIST: string[] = [
  '$current_url',
  '$pathname',
  '$host',
  '$referrer',
  '$referring_domain',
  '$initial_current_url',
  '$initial_pathname',
  '$initial_referrer',
  '$initial_referring_domain',
  '$raw_user_agent',
  '$search_engine',
  '$utm_source',
  '$utm_medium',
  '$utm_campaign',
  '$utm_content',
  '$utm_term',
  '$gclid',
  '$fbclid',
  '$set',
  '$set_once',
]

const STRIPPED_PROPERTY_SET = new Set<string>(WEB_POSTHOG_PROPERTY_DENYLIST)

export interface WebPayloadFilterState {
  optedOut: boolean
  recordingAllowed: boolean
}

/**
 * Normalizes any URL (including rrweb snapshot `data.href` and `get_current_url`)
 * to `origin + allowlisted route pattern`: unknown segments become `[id]`, and
 * query strings and URL hashes are dropped.
 */
export function normalizeWebUrlToRoutePattern(rawUrl: string): string {
  const trimmed = rawUrl.trim()
  if (!trimmed) return '/'

  try {
    const parsed = new URL(trimmed, 'https://wanderfit.invalid')
    const segments = parsed.pathname.split('/').filter((s) => s.length > 0)
    const normalizedPath = normalizeWebPathSegments(segments)
    if (parsed.origin === 'https://wanderfit.invalid') {
      return normalizedPath
    }
    return `${parsed.origin}${normalizedPath}`
  } catch {
    const pathOnly = trimmed.split(/[?#]/, 1)[0]
    const segments = pathOnly.split('/').filter((s) => s.length > 0)
    return normalizeWebPathSegments(segments)
  }
}

function sanitizeRrwebEvent(entry: unknown): unknown {
  if (!entry || typeof entry !== 'object') return entry
  const record = entry as Record<string, unknown>
  let changed = false
  const next: Record<string, unknown> = { ...record }

  if (typeof next.href === 'string') {
    next.href = normalizeWebUrlToRoutePattern(next.href)
    changed = true
  }

  if (next.data && typeof next.data === 'object' && !Array.isArray(next.data)) {
    const data = next.data as Record<string, unknown>
    let dataChanged = false
    const nextData: Record<string, unknown> = { ...data }

    if (typeof nextData.href === 'string') {
      nextData.href = normalizeWebUrlToRoutePattern(nextData.href)
      dataChanged = true
    }

    if (
      nextData.payload &&
      typeof nextData.payload === 'object' &&
      !Array.isArray(nextData.payload)
    ) {
      const payload = nextData.payload as Record<string, unknown>
      if (typeof payload.href === 'string') {
        nextData.payload = {
          ...payload,
          href: normalizeWebUrlToRoutePattern(payload.href),
        }
        dataChanged = true
      }
    }

    if (dataChanged) {
      next.data = nextData
      changed = true
    }
  }

  return changed ? next : entry
}

/**
 * Final outgoing payload gate for `posthog-js` (`before_send`).
 *
 * - Drops all events when opted out in memory (zero localStorage consent writes).
 * - Drops `$opt_in` / `$opt_out` synthetic consent events.
 * - Drops `$snapshot` replay frames immediately whenever `recordingAllowed` is false.
 * - Normalizes rrweb `data.href` inside `$snapshot_data` to route patterns (zero raw IDs/queries).
 * - Strips URL, pathname, query string, referrer, and `$set`/`$set_once` person
 *   traits from every outgoing event including `$identify`.
 */
export function scrubWebPostHogPayload(
  event: CaptureResult | null,
  state: WebPayloadFilterState
): CaptureResult | null {
  if (!event) return null
  if (state.optedOut) return null
  if (event.event === '$opt_in' || event.event === '$opt_out') return null
  if (event.event === '$snapshot' && !state.recordingAllowed) return null

  const cleanEvent: CaptureResult & {
    $set?: unknown
    $set_once?: unknown
  } = { ...event }

  if ('$set' in cleanEvent) {
    delete cleanEvent.$set
  }
  if ('$set_once' in cleanEvent) {
    delete cleanEvent.$set_once
  }

  if (cleanEvent.properties && typeof cleanEvent.properties === 'object') {
    const cleanProps: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(cleanEvent.properties)) {
      if (STRIPPED_PROPERTY_SET.has(key)) continue
      if (key.startsWith('$initial_') || key.startsWith('$utm_')) continue
      if (key === '$snapshot_data' && Array.isArray(value)) {
        cleanProps[key] = value.map(sanitizeRrwebEvent)
        continue
      }
      cleanProps[key] = value
    }
    cleanEvent.properties = cleanProps
  }

  return cleanEvent
}
