# App Settings

An athlete opens App Settings from Profile and finds how to connect a chat assistant (Claude) to their program. New journey in PR #128 (the Wander Fit chat connector). The connector itself is covered by Convex tests and live checks; this flow covers the in-app place that tells the athlete how to add it.

## Sub-features

- `app-settings-open`: from Profile, App settings (`profile-app-settings`) opens "App Settings".
- `app-settings-connector`: the screen shows "Connector address" with this build's MCP address (`mcp-address`, the deployment's `.convex.site/mcp`) and the steps to add a custom connector in Claude, ending with a change to a day waiting for the athlete to accept it.
- `app-settings-back`: Back (`Back`) returns to Profile.

## How to get to it (user POV)

- Sign in, tap the Profile tab, then tap App settings near Sign Out.

## Driving it with Maestro

Preconditions:

- `node scripts/verify/run.mjs doctor` passed; the e2e URL is set.
- The persona is `--state onboarded`. `run.mjs all` creates it.

- **Whole journey.** Run `node scripts/verify/run.mjs all app-settings`. It exits `0` with `- app-settings: passed`, and the persona is deleted.
- **Sign in.** The journey runs `.maestro/subflows/_open-sign-in.yaml` and `.maestro/subflows/_sign-in.yaml` and waits for `id: today-workout-card`.
- **Open Profile.** It taps `Profile`, waits for `Training info`, then opens `/profile#sign-out` so the rows near Sign Out are in view, and waits for `id: profile-app-settings` (`01-profile`).
- **App Settings.** It taps `profile-app-settings` and asserts `App Settings`, `Connector address`, `id: mcp-address`, and the custom-connector and accept-it steps (`02-app-settings`).
- **Back.** It taps `id: "Back"` and waits for `profile-app-settings` again (`03-back-to-profile`).
- **Side effect.** None: the screen only reads the build's Convex URL.
- **Proof.** `e2e-artifacts/app-settings/web/<timestamp>/app-settings/` holds the three screenshots under `takeScreenshot/` and `startRecording/recording.mp4`; `all` adds `e2e-artifacts/app-settings/web/result.json` with `"status": "passed"`.

## Gotchas

- Profile scrolls inside a React Native `ScrollView`, which Maestro web's `scroll` doesn't move. The flow opens `/profile#sign-out` instead of scrolling to reach the App settings row (`.maestro/flow-layout.md`).
- The MCP address differs per deployment (each PR preview has its own), so the flow asserts the element, not the address text.
