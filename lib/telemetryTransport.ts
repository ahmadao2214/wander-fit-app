import {
  NOOP_TELEMETRY_TRANSPORT,
  type TelemetryTransport,
  type TelemetryTransportConfig,
} from './telemetryTypes'

/**
 * Default/Node fallback transport used in Node unit tests and server contexts.
 * Metro resolves `telemetryTransport.native.ts` on iOS/Android and
 * `telemetryTransport.web.ts` on Web.
 */
export function createTelemetryTransport(_config: TelemetryTransportConfig): TelemetryTransport {
  return NOOP_TELEMETRY_TRANSPORT
}
