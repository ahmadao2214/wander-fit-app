export type TelemetryPrimitive = string | number | boolean

export type SanitizedProperties = Record<string, TelemetryPrimitive>

export interface TelemetryTransportConfig {
  apiKey: string
  host: string
  defaultOptOut?: boolean
}

export interface TelemetryTransport {
  readonly isActive: boolean
  readonly supportsSessionReplay: boolean
  capture(event: string, properties?: SanitizedProperties): void
  identify(distinctId: string): void
  reset(): void
  optOut(): void
  optIn(): void
  getSessionId(): string | undefined
  startSessionRecording(): void
  stopSessionRecording(): void
}

export const NOOP_TELEMETRY_TRANSPORT: TelemetryTransport = {
  isActive: false,
  supportsSessionReplay: false,
  capture: () => {},
  identify: () => {},
  reset: () => {},
  optOut: () => {},
  optIn: () => {},
  getSessionId: () => undefined,
  startSessionRecording: () => {},
  stopSessionRecording: () => {},
}
