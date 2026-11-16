# Flow layout

`.maestro/web/<flow>.yaml` is the web entry. It sets `url: ${VERIFY_URL}`, launches the app, and `runFlow`s `.maestro/journeys/<flow>.yaml`. Sign-in, evidence start, and evidence stop live in `.maestro/subflows/`. `.maestro/native/native-launch.yaml` is a standalone iOS launch/relaunch regression with `appId: com.offseason.asrafit`; it does not sign in or reset an account. Future native journey entries should launch and `runFlow` the shared journey.

Credentials are Maestro env vars. The runner passes `PERSONA_EMAIL` and `PERSONA_PASSWORD` with `-e`. The sign-in subflow reads `${PERSONA_EMAIL}` and `${PERSONA_PASSWORD}`.

## Maestro web and testID

Maestro web matches a React Native Web `testID` with `id:`. On the sign-in flow that is `sign-in-email`, `sign-in-password`, `sign-in-submit`, `today-workout-card`, and `sign-out`. An element with an accessibility label is reported by that label instead: the First Run's sport tiles and choice rows are `id: "Basketball"` or a text tap. Inputs and Tamagui buttons keep their testID (`save-plan-name`, `save-plan-code`, `first-run-continue`).

Maestro web's `scroll` and `scrollUntilVisible` move `window` only, and the driver omits elements outside the viewport. A screen that scrolls inside a React Native `ScrollView` does not move. A `swipe` sends a touch drag, which does scroll that inner view. The First Run's about-you screen uses one to bring the years choices into view. The driver reports the testID as `resource-id`. `nativeID` is only for typing into an input whose xpath would otherwise collapse.

## Subflow headers

Checked with Maestro 2.12.1.

`runFlow` parses the called file as a full flow. A file with no config section fails at runtime with `Config Section Required`. `maestro check-syntax` accepts that file, so it does not catch this. The called file needs `url:` or `appId:` above `---`. Journeys and subflows repeat `url: ${VERIFY_URL}` for that reason.

The entry file chooses the driver. `url:` starts Chromium. `appId:` starts a simulator.

`launchApp` does not follow the entry. Maestro copies the header of the file that contains `launchApp` onto that command. A nested file headed `appId: com.offseason.asrafit` logged `Launch app "com.offseason.asrafit"` under a web parent and left Chromium at `data:,`. The same parent running a nested file headed `url: https://example.com` opened that URL. `launchApp` stays in the platform entry, beside that entry's header. The shared journey and the subflows do not launch.

`onFlowStart` and `onFlowComplete` in a nested header run under the parent config. `env:` on the nested header, or on the `runFlow` command, overrides those names for that call only. The shared files set no `env:` of their own.

## Hold gestures and the settle wait

Checked with Maestro 2.12.1 and Chrome 157 on the old activation flow (since replaced by the First Run).

`longPressOn` does trigger a 2-second hold on web. `CdpWebDriver.longPress` moves the mouse to the element, then runs Selenium `clickAndHold`, a 3000 ms pause, and `release`. The old commitment button committed during that press, and the program was created at GPP week 1 day 1.

After every tap, long press, or swipe, Maestro waits for the page to settle. On web, `CdpWebDriver.waitForAppToSettle` passes `null` as the timeout, so `waitToSettleTimeoutMs` on the command is dropped (it shows in the log and has no effect). With no timeout, the wait fetches the hierarchy up to 10 times, 200 ms apart, until two fetches match. A spinner keeps the hierarchy changing. After the commitment tap, the wait ran 7 seconds, and after the long press it ran 8. The app had already moved from "You're Committed!" to Today before the next command ran.

Assert screens that stay up, not a state that lasts only while a request is in flight. The First Run journey asserts the Program tab's Up next card, which stays up, and runs `persona inspect`.

A screen that sits under a fixed bottom bar can still put its target below the 625px viewport. Tapping it fails with `move target out of bounds`. Swipe the inner list first, as on the First Run's about-you screen.
