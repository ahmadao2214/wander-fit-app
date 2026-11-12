# Flow layout

`.maestro/web/<flow>.yaml` is the web entry. It sets `url: ${VERIFY_URL}`, launches the app, and `runFlow`s `.maestro/journeys/<flow>.yaml`. Sign-in, evidence start, and evidence stop live in `.maestro/subflows/`. A native entry is not in this suite. When one is added, it sets `appId: com.offseason.asrafit`, launches, and `runFlow`s the same journey.

Credentials are Maestro env vars. The runner passes `PERSONA_EMAIL` and `PERSONA_PASSWORD` with `-e`. The sign-in subflow reads `${PERSONA_EMAIL}` and `${PERSONA_PASSWORD}`.

## Maestro web and testID

Maestro web matches a React Native Web `testID` with `id:`. On the sign-in flow that is `sign-in-email`, `sign-in-password`, `sign-in-submit`, `today-workout-card`, and `sign-out`. The driver reports the testID as `resource-id`. `nativeID` is only for typing into an input whose xpath would otherwise collapse.

## Subflow headers

Checked with Maestro 2.12.1.

`runFlow` parses the called file as a full flow. A file with no config section fails at runtime with `Config Section Required`. `maestro check-syntax` accepts that file, so it does not catch this. The called file needs `url:` or `appId:` above `---`. Journeys and subflows repeat `url: ${VERIFY_URL}` for that reason.

The entry file chooses the driver. `url:` starts Chromium. `appId:` starts a simulator.

`launchApp` does not follow the entry. Maestro copies the header of the file that contains `launchApp` onto that command. A nested file headed `appId: com.offseason.asrafit` logged `Launch app "com.offseason.asrafit"` under a web parent and left Chromium at `data:,`. The same parent running a nested file headed `url: https://example.com` opened that URL. `launchApp` stays in the platform entry, beside that entry's header. The shared journey and the subflows do not launch.

`onFlowStart` and `onFlowComplete` in a nested header run under the parent config. `env:` on the nested header, or on the `runFlow` command, overrides those names for that call only. The shared files set no `env:` of their own.
