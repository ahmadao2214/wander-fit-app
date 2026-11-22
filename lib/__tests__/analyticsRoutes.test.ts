import fs from 'fs'
import path from 'path'
import {
  isReplayExcludedRoute,
  UNMATCHED_WEB_ROUTE,
  WEB_INDEX_ROUTE_PATTERNS,
  WEB_ROUTE_PATTERNS,
  normalizeRouteSegments,
  normalizeWebPathSegments,
} from '../analyticsRoutes'
import { normalizeWebUrlToRoutePattern } from '../telemetryWebPayload'

function webRoutePatternsUnder(dir: string, prefix: string[] = [], indexOnly = false): string[] {
  const found: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name.startsWith('_') || entry.name.startsWith('+'))
      continue
    if (entry.isDirectory()) {
      const next = entry.name.startsWith('(') ? prefix : [...prefix, entry.name]
      found.push(...webRoutePatternsUnder(path.join(dir, entry.name), next, indexOnly))
      continue
    }
    if (!entry.name.endsWith('.tsx')) continue
    const name = entry.name.replace(/\.tsx$/, '')
    if (indexOnly && name !== 'index') continue
    const parts = name === 'index' ? prefix : [...prefix, name]
    found.push(`/${parts.map((p) => (p.startsWith('[') ? '[id]' : p)).join('/')}`)
  }
  return found
}

describe('analyticsRoutes', () => {
  describe('normalizeRouteSegments', () => {
    it('preserves Expo Router groups and dynamic placeholders', () => {
      expect(normalizeRouteSegments(['(athlete)', 'workout', 'execute', '[id]'])).toBe(
        '/(athlete)/workout/execute/[id]'
      )
      expect(normalizeRouteSegments(['(first-run)', 'sport'])).toBe('/(first-run)/sport')
      expect(normalizeRouteSegments(['(athlete)', 'settings'])).toBe('/(athlete)/settings')
      expect(normalizeRouteSegments([])).toBe('/')
    })

    it('replaces accidental raw Convex IDs, UUIDs, numeric IDs, and strips query strings', () => {
      expect(
        normalizeRouteSegments([
          '(athlete)',
          'workout',
          'execute',
          'jh7123456789abcdef0123456789abcd',
        ])
      ).toBe('/(athlete)/workout/execute/[id]')

      expect(
        normalizeRouteSegments(['(athlete)', 'workout', '550e8400-e29b-41d4-a716-446655440000'])
      ).toBe('/(athlete)/workout/[id]')

      expect(normalizeRouteSegments(['(athlete)', 'workout', '12345'])).toBe(
        '/(athlete)/workout/[id]'
      )

      expect(normalizeRouteSegments(['(athlete)', 'program?welcome=1&next=Tomorrow'])).toBe(
        '/(athlete)/program'
      )
    })
  })

  describe('isReplayExcludedRoute', () => {
    it('excludes auth, First Run, reassessment, Profile, Settings, root, and workout detail', () => {
      const excluded = [
        '/',
        '/index',
        '/(auth)',
        '/(auth)/sign-in',
        '/(auth)/sign-up',
        '/(first-run)',
        '/(first-run)/sport',
        '/(first-run)/about',
        '/(first-run)/reveal',
        '/(reassessment)',
        '/(reassessment)/index',
        '/(athlete)/profile',
        '/(athlete)/settings',
        '/(athlete)/workout/[id]',
      ]
      expect(excluded.filter((r) => !isReplayExcludedRoute(r))).toEqual([])
    })

    it('allows eligible athlete training routes when all other gates pass', () => {
      const allowed = [
        '/(athlete)',
        '/(athlete)/index',
        '/(athlete)/program',
        '/(athlete)/history',
        '/(athlete)/workout/execute/[id]',
        '/(athlete)/training-science',
      ]
      expect(allowed.filter((r) => isReplayExcludedRoute(r))).toEqual([])
    })
  })

  describe('web URL normalization (S1)', () => {
    it('lists exactly the web route patterns under app/', () => {
      const appDir = path.join(__dirname, '..', '..', 'app')
      const fromApp = [...new Set(webRoutePatternsUnder(appDir))].sort()
      expect(fromApp).toEqual([...WEB_ROUTE_PATTERNS].sort())
      const indexBacked = [...new Set(webRoutePatternsUnder(appDir, [], true))].sort()
      expect(indexBacked).toEqual([...WEB_INDEX_ROUTE_PATTERNS].sort())
    })

    it('keeps a dynamic value of "index" as [id] and only aliases /index on index-backed routes', () => {
      expect(normalizeWebUrlToRoutePattern('/workout/index')).toBe('/workout/[id]')
      expect(normalizeWebUrlToRoutePattern('/workout/execute/index')).toBe('/workout/execute/[id]')
      expect(normalizeWebUrlToRoutePattern('/index')).toBe('/')
      expect(normalizeWebUrlToRoutePattern('/program/index')).toBe(UNMATCHED_WEB_ROUTE)
    })

    it('redacts dynamic positions whatever their value, and unmatched URLs fail closed', () => {
      expect(normalizeWebUrlToRoutePattern('/workout/execute/example?token=synthetic')).toBe(
        '/workout/execute/[id]'
      )
      expect(normalizeWebUrlToRoutePattern('/workout/execute/settings')).toBe(
        '/workout/execute/[id]'
      )
      expect(normalizeWebUrlToRoutePattern('https://app.wanderfit.app/workout/jordan#x')).toBe(
        'https://app.wanderfit.app/workout/[id]'
      )
      expect(normalizeWebUrlToRoutePattern('/program/jordan')).toBe(UNMATCHED_WEB_ROUTE)
      expect(normalizeWebPathSegments(['settings'])).toBe('/settings')
      expect(normalizeWebPathSegments(['training-science', 'index'])).toBe('/training-science')
      expect(normalizeWebPathSegments([])).toBe('/')
    })
  })
})
