# Maestro is the only E2E tool, and its beta web mode is the PR gate

We drive every end-to-end flow with Maestro: on the iOS Simulator and Android emulator, and with Maestro's beta web mode (headless Chromium) against the static web export. The web runs are the fast check on every PR and the harness agents use to verify their own work, because cloud agent containers have Chromium but no simulators. One set of flow files covers all three platforms, which matters more to a two-person team than Playwright's maturity on the web.

## Considered Options

- **Playwright for web plus Maestro for native**: the most mature web tooling, with Clerk testing-token helpers, but two suites to keep in sync. Rejected to keep a single suite.
- **Detox**: heavier to set up for Expo, and grey-box. Rejected.

## Consequences

- Maestro web is beta and Chromium-only. If it blocks a flow, the fallback is Playwright for that flow, not dropping the flow.
- Maestro cannot inject Clerk testing tokens, so bot sign-up protection is off on the Clerk Development instance (see ADR-0002).
