# Settings telemetry

An athlete turns anonymous usage analytics off or back on from App Settings, and the choice is saved on their account. New journey in PR #132 (PostHog telemetry). The adult-only web replay switch and its age gate are covered by unit tests; this flow covers the analytics switch.

## Sub-features

- `settings-opens-from-profile`: from Profile, App settings (`profile-app-settings`) opens "App Settings" with a `Privacy` section and a `Use with Claude` section.
- `analytics-opt-out-persists`: turning off `Share anonymous usage analytics` saves `analyticsOptOut` on `users` through `api.users.updateTelemetryPreferences` and opts the PostHog client out at once. The row's description (`analytics-opt-in-status`) changes to "Off. Wander Fit doesn't send usage data from this account." and stays that way after leaving and reopening the screen.
- `youth-replay-guard`: the web session replay switch (`session-replay-opt-in-switch`) is hidden for `14-17` athletes, on native, and whenever `EXPO_PUBLIC_POSTHOG_REPLAY_ENABLED` isn't `1`. Unit tests only.

## How to get to it (user POV)

- Sign in, tap the Profile tab, then tap App settings near Sign Out.

## Driving it with Maestro

Preconditions:

- `node scripts/verify/run.mjs doctor` passed; the e2e URL is set.
- The backend has this branch's Convex functions (`users:updateTelemetryPreferences`). CI's PR preview does; the shared dev deployment may not.
- The persona is `--state onboarded`. `run.mjs all` creates it.

- **Whole journey.** Run `node scripts/verify/run.mjs all settings-telemetry`. It exits `0` with `- settings-telemetry: passed`, and the persona is deleted.
- **Sign in.** The journey runs `.maestro/subflows/_open-sign-in.yaml` and `.maestro/subflows/_sign-in.yaml` and waits for `id: today-workout-card`.
- **Open App Settings.** It taps `Profile`, opens `/profile#sign-out`, taps `profile-app-settings`, and asserts `App Settings`, `Privacy`, `Use with Claude` and the "Never includes your name" description (`01-settings-telemetry`).
- **Turn analytics off.** It taps `id: "Share anonymous usage analytics"` and waits for "send usage data from this account" (`02-settings-opted-out`).
- **Persistence.** It taps `id: "Back"`, waits for `profile-app-settings`, reopens App Settings and waits for the opted-out line again (`03-settings-persisted-off`).
- **Restore.** It taps the switch again and waits for the "Never includes your name" description.
- **Side effect.** `analyticsOptOut` on the persona's `users` row, read back through the reopened screen.
- **Proof.** `e2e-artifacts/settings-telemetry/web/<timestamp>/settings-telemetry/` holds the screenshots under `takeScreenshot/` and `startRecording/recording.mp4`; `all` adds `result.json` with `"status": "passed"`.

## Gotchas

- Tamagui's `Switch` drops `testID` on web, so the flow taps it by its accessibility label.
- Maestro web reports no checked state for a switch, so the flow asserts the description line that changes with it.
- Back lands on Profile at its earlier scroll position, near Sign Out, so the flow waits for `profile-app-settings`, not `Training info`.
