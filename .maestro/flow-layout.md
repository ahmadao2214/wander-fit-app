# Flow layout

`.maestro/web/<flow>.yaml` is the web entry. It sets `url: ${VERIFY_URL}`, launches the app, and `runFlow`s `.maestro/journeys/<flow>.yaml`. Sign-in, evidence start, and evidence stop live in `.maestro/subflows/`. `.maestro/native/native-launch.yaml` is a standalone iOS launch/relaunch regression with `appId: com.offseason.asrafit`; it does not sign in or reset an account. Future native journey entries should launch and `runFlow` the shared journey.

Credentials are Maestro env vars. The runner passes `PERSONA_EMAIL` and `PERSONA_PASSWORD` with `-e`. The sign-in subflow reads `${PERSONA_EMAIL}` and `${PERSONA_PASSWORD}`.

## Maestro web and testID

Maestro web matches a React Native Web `testID` with `id:`. On the sign-in flow that is `sign-in-email`, `sign-in-password`, `sign-in-submit`, `today-workout-card`, and `sign-out`. On the sign-up flow it is `sign-up-name`, `sign-up-email`, `sign-up-password`, `sign-up-submit`, and `sign-up-code` (the first code box).

Maestro web's `scroll` and `scrollUntilVisible` move `window` only, and the driver omits elements outside the viewport. A screen that scrolls inside a React Native `ScrollView` does not move. A `swipe` sends a touch drag, which does scroll that inner view. The sign-up form uses one to bring the password field and Continue with Email into view. The driver reports the testID as `resource-id`. `nativeID` is only for typing into an input whose xpath would otherwise collapse.

## Subflow headers

Checked with Maestro 2.12.1.

`runFlow` parses the called file as a full flow. A file with no config section fails at runtime with `Config Section Required`. `maestro check-syntax` accepts that file, so it does not catch this. The called file needs `url:` or `appId:` above `---`. Journeys and subflows repeat `url: ${VERIFY_URL}` for that reason.

The entry file chooses the driver. `url:` starts Chromium. `appId:` starts a simulator.

`launchApp` does not follow the entry. Maestro copies the header of the file that contains `launchApp` onto that command. A nested file headed `appId: com.offseason.asrafit` logged `Launch app "com.offseason.asrafit"` under a web parent and left Chromium at `data:,`. The same parent running a nested file headed `url: https://example.com` opened that URL. `launchApp` stays in the platform entry, beside that entry's header. The shared journey and the subflows do not launch.

`onFlowStart` and `onFlowComplete` in a nested header run under the parent config. `env:` on the nested header, or on the `runFlow` command, overrides those names for that call only. The shared files set no `env:` of their own.

## Hold gestures and the settle wait

Checked with Maestro 2.12.1 and Chrome 157 on the activation flow.

`longPressOn` does trigger a 2-second hold on web. `CdpWebDriver.longPress` moves the mouse to the element, then runs Selenium `clickAndHold`, a 3000 ms pause, and `release`. The old commitment button committed during that press, and the program was created at GPP week 1 day 1.

After every tap, long press, or swipe, Maestro waits for the page to settle. On web, `CdpWebDriver.waitForAppToSettle` passes `null` as the timeout, so `waitToSettleTimeoutMs` on the command is dropped (it shows in the log and has no effect). With no timeout, the wait fetches the hierarchy up to 10 times, 200 ms apart, until two fetches match. A spinner keeps the hierarchy changing. After the commitment tap, the wait ran 7 seconds, and after the long press it ran 8. The app had already moved from "You're Committed!" to Today before the next command ran.

Assert screens that stay up, not a state that lasts only while a request is in flight. The commitment hold was removed from the app for UX reasons. Commitment is now one tap on `commitment-button`. "You're Committed!" shows while the program is saved. The commitment screen test covers it, and the activation video shows it. The flow asserts Today and runs `persona inspect`.

A screen that sits under a fixed bottom bar can still put its target below the 625px viewport. Tapping it fails with `move target out of bounds`. Swipe the inner list first, as on sign-up.

## Activation selectors and dates

Sport tiles are `sport-tile-<slug>`, from `getSportSlug` in `lib/intakeUI.ts` (`Track (Sprints/Jumps)` becomes `track-sprints-jumps`). Training day cells are `training-day-<0-6>`, where 0 is Sunday. Season calendar days are `season-day-YYYY-MM-DD`, and the month arrow is `season-next-month`.

`.maestro/scripts/activation-dates.js` is a `runScript`. It runs in Maestro's JavaScript engine, not the page, on the same machine as the browser. It sets `output.today`, `output.day2`, `output.day4` (today and two more days), and `output.seasonDay` (84 days out, so the intake shows 12 weeks). An inline `evalScript` with `cond ? a : b` failed to parse, because YAML read `: ` as a mapping. The script file avoids that.
