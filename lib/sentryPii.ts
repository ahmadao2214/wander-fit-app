import type { Breadcrumb, ErrorEvent, EventHint, User } from '@sentry/core'

export const REDACTED = '[Redacted]'

export interface SentryEnvInput {
  EXPO_PUBLIC_SENTRY_DSN?: string
  EXPO_PUBLIC_SENTRY_ENVIRONMENT?: string
  EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV?: string
  EXPO_PUBLIC_SENTRY_DEBUG_TOOLS?: string
}

export interface ResolvedSentryConfig {
  dsn: string | undefined
  enabled: boolean
  environment: string
  diagnosticsEnabled: boolean
  disabledReason: 'missing_dsn' | 'dev_disabled' | null
}

/**
 * Resolves runtime Sentry configuration from EXPO_PUBLIC_* environment variables.
 *
 * Sentry stays dormant (enabled: false) until EXPO_PUBLIC_SENTRY_DSN is supplied.
 * In development (__DEV__), Sentry remains disabled unless
 * EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV=true is explicitly set.
 */
export function resolveSentryConfig(env: SentryEnvInput, isDev: boolean): ResolvedSentryConfig {
  const dsn = env.EXPO_PUBLIC_SENTRY_DSN?.trim() || undefined
  const enableInDev = env.EXPO_PUBLIC_SENTRY_ENABLE_IN_DEV?.trim().toLowerCase() === 'true'
  const diagnosticsEnabled = env.EXPO_PUBLIC_SENTRY_DEBUG_TOOLS?.trim().toLowerCase() === 'true'
  const environment =
    env.EXPO_PUBLIC_SENTRY_ENVIRONMENT?.trim() || (isDev ? 'development' : 'production')

  if (!dsn) {
    return {
      dsn: undefined,
      enabled: false,
      environment,
      diagnosticsEnabled,
      disabledReason: 'missing_dsn',
    }
  }

  if (isDev && !enableInDev) {
    return {
      dsn,
      enabled: false,
      environment,
      diagnosticsEnabled,
      disabledReason: 'dev_disabled',
    }
  }

  return {
    dsn,
    enabled: true,
    environment,
    diagnosticsEnabled,
    disabledReason: null,
  }
}

// Normalized lowercase alphanumeric keys that must never leave the device.
// Protects youth (14-17) privacy: no email, name, phone, DOB, IP, auth tokens,
// or free-text athlete inputs.
const SENSITIVE_KEYS = new Set([
  // Direct identity PII
  'email',
  'emailaddress',
  'primaryemailaddress',
  'name',
  'fullname',
  'firstname',
  'lastname',
  'givenname',
  'familyname',
  'username',
  'displayname',
  'phone',
  'phonenumber',
  'mobile',
  'tel',
  'ip',
  'ipaddress',
  'remoteaddr',
  'xforwardedfor',
  'cfconnectingip',
  'xrealip',
  'geo',
  // Youth age / DOB
  'dateofbirth',
  'dob',
  'birthday',
  'birthdate',
  'age',
  // Free-text athlete fields
  'notes',
  'note',
  'comment',
  'comments',
  'feedback',
  'selfassessment',
  'freetext',
  // Auth & secrets
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'sessiontoken',
  'authorization',
  'cookie',
  'setcookie',
  'apikey',
  'jwt',
  'verificationcode',
  'otp',
  'code',
])

// Keys whose values are URLs whose query strings/fragments should be stripped.
const URL_KEYS = new Set(['url', 'from', 'to', 'href', 'referer', 'referrer', 'uri', 'path'])

function isUrlKey(key: string): boolean {
  const normalized = normalizeKey(key)
  return URL_KEYS.has(normalized) || normalized.endsWith('url') || normalized.endsWith('uri')
}

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const BEARER_RE = /\b(Bearer|Basic)\s+[A-Za-z0-9\-._~+/]+=*/gi
const JWT_RE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g
const CLERK_SECRET_RE = /\b(?:sk|pk)_(?:test|live)_[A-Za-z0-9]{12,}\b/g
// Matches common North American / international phone formats while avoiding timestamps/versions
const PHONE_RE = /(?<!\w)(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}(?!\w)/g

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key)
  if (SENSITIVE_KEYS.has(normalized)) {
    return true
  }
  return (
    normalized.includes('email') ||
    normalized.includes('password') ||
    normalized.includes('token') ||
    normalized.includes('secret') ||
    normalized.includes('cookie') ||
    normalized.includes('phone') ||
    normalized.includes('authorization') ||
    normalized.includes('dateofbirth')
  )
}

/**
 * Strips query parameters and fragments from a URL so OAuth codes, emails, or
 * session parameters never leak into Sentry events or breadcrumbs.
 */
export function scrubUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim()
  if (!trimmed) return rawUrl

  // Handle full URLs and relative paths alike
  const queryIndex = trimmed.indexOf('?')
  const hashIndex = trimmed.indexOf('#')
  let cutIndex = -1
  if (queryIndex !== -1 && hashIndex !== -1) {
    cutIndex = Math.min(queryIndex, hashIndex)
  } else if (queryIndex !== -1) {
    cutIndex = queryIndex
  } else if (hashIndex !== -1) {
    cutIndex = hashIndex
  }

  const base = cutIndex === -1 ? trimmed : trimmed.slice(0, cutIndex)
  return scrubPiiString(base)
}

/**
 * Redacts inline PII patterns (emails, phone numbers, JWTs, Bearer/Clerk tokens)
 * from free-form strings such as error messages or console breadcrumbs.
 */
export function scrubPiiString(value: string): string {
  return value
    .replace(JWT_RE, REDACTED)
    .replace(BEARER_RE, `$1 ${REDACTED}`)
    .replace(CLERK_SECRET_RE, REDACTED)
    .replace(EMAIL_RE, REDACTED)
    .replace(PHONE_RE, REDACTED)
}

const MAX_SCRUB_DEPTH = 6

export function scrubValue(
  value: unknown,
  depth = 0,
  options?: { allowTopLevelTechnicalName?: boolean }
): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return scrubPiiString(value)
  if (typeof value !== 'object') return value
  if (depth >= MAX_SCRUB_DEPTH) return REDACTED

  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, depth + 1))
  }

  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    const normalized = normalizeKey(key)
    const keepTechnicalName =
      depth === 0 && options?.allowTopLevelTechnicalName === true && normalized === 'name'

    if (!keepTechnicalName && isSensitiveKey(key)) {
      result[key] = REDACTED
    } else if (typeof val === 'string' && isUrlKey(key)) {
      result[key] = scrubUrl(val)
    } else {
      result[key] = scrubValue(val, depth + 1)
    }
  }
  return result
}

/**
 * Sanitizes Sentry user context to pseudonymous ID only.
 * Strips email, username, name, ip_address, geo, and any extra fields.
 */
export function sanitizeSentryUser(user: User | undefined | null): User | undefined {
  if (!user || typeof user.id !== 'string') {
    return undefined
  }
  const id = user.id.trim()
  if (!id || EMAIL_RE.test(id)) {
    EMAIL_RE.lastIndex = 0
    return undefined
  }
  EMAIL_RE.lastIndex = 0
  return { id }
}

/**
 * Sentry `beforeBreadcrumb` hook.
 * Drops touch, UI interaction, and console breadcrumbs (which can carry youth
 * age selections, accessibility labels, or serialized objects) and strips URL
 * query strings, auth headers, and HTTP bodies from remaining structural breadcrumbs.
 */
export function scrubSentryBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  const category = (breadcrumb.category ?? '').toLowerCase()
  const type = (breadcrumb.type ?? '').toLowerCase()

  if (
    type === 'user' ||
    category === 'touch' ||
    category === 'console' ||
    category.startsWith('ui.')
  ) {
    return null
  }

  const next: Breadcrumb = { ...breadcrumb }

  if (typeof next.message === 'string') {
    next.message = scrubPiiString(next.message)
  }

  if (next.data && typeof next.data === 'object') {
    const cleanData: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(next.data)) {
      const normalized = normalizeKey(key)
      if (isSensitiveKey(key)) {
        cleanData[key] = REDACTED
      } else if (
        (type === 'http' || category === 'fetch' || category === 'xhr') &&
        (normalized === 'body' || normalized === 'requestbody' || normalized === 'responsebody')
      ) {
        cleanData[key] = REDACTED
      } else if (typeof val === 'string' && isUrlKey(key)) {
        cleanData[key] = scrubUrl(val)
      } else {
        cleanData[key] = scrubValue(val)
      }
    }
    next.data = cleanData
  }

  return next
}

/**
 * Sentry `beforeSend` hook.
 * Enforces youth (14-17) privacy posture across every outbound error event:
 * - Pseudonymous user ID only (never email/name/phone/IP)
 * - Scrubbed request URLs, headers, cookies, and bodies
 * - Scrubbed exception values, messages, tags, extras, contexts, and breadcrumbs
 */
export function scrubSentryEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent {
  const next: ErrorEvent = { ...event }

  // 1. User context: pseudonymous ID only
  const cleanUser = sanitizeSentryUser(next.user)
  if (cleanUser) {
    next.user = cleanUser
  } else {
    delete next.user
  }

  // 2. Request metadata
  if (next.request) {
    const req = { ...next.request }
    if (typeof req.url === 'string') {
      req.url = scrubUrl(req.url)
    }
    delete req.cookies
    delete req.data
    delete req.query_string
    if (req.headers) {
      const cleanHeaders: Record<string, string> = {}
      for (const [k, v] of Object.entries(req.headers)) {
        if (isSensitiveKey(k)) {
          cleanHeaders[k] = REDACTED
        } else if (typeof v === 'string') {
          cleanHeaders[k] = URL_KEYS.has(normalizeKey(k)) ? scrubUrl(v) : scrubPiiString(v)
        }
      }
      req.headers = cleanHeaders
    }
    if (req.env) {
      const cleanEnv: Record<string, string> = {}
      for (const [k, v] of Object.entries(req.env)) {
        if (!isSensitiveKey(k) && typeof v === 'string') {
          cleanEnv[k] = scrubPiiString(v)
        }
      }
      req.env = cleanEnv
    }
    next.request = req
  }

  // 3. Omit free-form message & logentry (can carry serialized athlete data)
  delete next.message
  delete next.logentry

  // 4. Exceptions: omit raw values, preserve allowlisted technical fields & stack frames
  if (next.exception?.values) {
    next.exception = {
      ...next.exception,
      values: next.exception.values.map((ex) => {
        const cleanEx: typeof ex = {}
        if (typeof ex.type === 'string') {
          cleanEx.type = scrubPiiString(ex.type)
        }
        if (typeof ex.module === 'string') {
          cleanEx.module = scrubPiiString(ex.module)
        }
        if (ex.thread_id !== undefined) {
          cleanEx.thread_id = ex.thread_id
        }
        if (ex.mechanism) {
          cleanEx.mechanism = {
            type: ex.mechanism.type,
            handled: ex.mechanism.handled,
            ...(ex.mechanism.synthetic !== undefined ? { synthetic: ex.mechanism.synthetic } : {}),
          }
        }
        if (ex.stacktrace?.frames) {
          cleanEx.stacktrace = {
            frames: ex.stacktrace.frames.map((frame) => {
              const {
                vars: _vars,
                pre_context: _pre,
                context_line: _ctx,
                post_context: _post,
                ...rest
              } = frame
              return {
                ...rest,
                ...(typeof rest.filename === 'string' ? { filename: scrubUrl(rest.filename) } : {}),
                ...(typeof rest.abs_path === 'string' ? { abs_path: scrubUrl(rest.abs_path) } : {}),
              }
            }),
          }
        }
        return cleanEx
      }),
    }
  }

  // 5. Tags
  if (next.tags) {
    const cleanTags: Record<
      string,
      string | number | boolean | bigint | symbol | null | undefined
    > = {}
    for (const [k, v] of Object.entries(next.tags)) {
      if (isSensitiveKey(k)) {
        cleanTags[k] = REDACTED
      } else if (typeof v === 'string') {
        cleanTags[k] = scrubPiiString(v)
      } else {
        cleanTags[k] = v
      }
    }
    next.tags = cleanTags
  }

  // 6. Extra & Contexts (drop SDK __serialized__ dumps from plain-object throws)
  if (next.extra) {
    const { __serialized__: _omittedSerialized, ...safeExtra } = next.extra
    const cleanedExtra = scrubValue(safeExtra) as Record<string, unknown>
    if (Object.keys(cleanedExtra).length > 0) {
      next.extra = cleanedExtra
    } else {
      delete next.extra
    }
  }

  if (next.contexts) {
    const technicalNameContexts = new Set([
      'os',
      'browser',
      'runtime',
      'app',
      'gpu',
      'culture',
      'trace',
      'route',
      'react_native_context',
      'expo',
    ])
    const cleanContexts: Record<string, Record<string, unknown> | undefined> = {}
    for (const [ctxName, ctxVal] of Object.entries(next.contexts)) {
      if (!ctxVal || typeof ctxVal !== 'object') {
        cleanContexts[ctxName] = ctxVal
        continue
      }
      const allowTopLevelTechnicalName = technicalNameContexts.has(ctxName)
      if (ctxName === 'route') {
        // Keep structural templated route name/segments; drop concrete params
        const routeCtx = { ...(ctxVal as Record<string, unknown>) }
        delete routeCtx.params
        if (typeof routeCtx.path === 'string') {
          routeCtx.path = scrubUrl(routeCtx.path)
        }
        cleanContexts[ctxName] = scrubValue(routeCtx, 0, {
          allowTopLevelTechnicalName: true,
        }) as Record<string, unknown>
      } else {
        cleanContexts[ctxName] = scrubValue(ctxVal, 0, {
          allowTopLevelTechnicalName,
        }) as Record<string, unknown>
      }
    }
    next.contexts = cleanContexts
  }

  // 7. Breadcrumbs
  if (Array.isArray(next.breadcrumbs)) {
    next.breadcrumbs = next.breadcrumbs
      .map((crumb) => scrubSentryBreadcrumb(crumb))
      .filter((crumb): crumb is Breadcrumb => crumb !== null)
  }

  return next
}
