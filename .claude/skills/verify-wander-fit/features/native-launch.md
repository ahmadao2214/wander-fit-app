# Native launch

The local iOS Release app stays open and renders the First Run, both on a clean launch and a relaunch. Regression for iOS 27's required UIScene lifecycle: a successful build alone does not prove this. Native only; the web harness cannot reach it.

## Sub-features

- `native-launch-first-run`: a clean launch shows `Let's build your plan for this season.` with `first-run-start` and `first-run-sign-in`.
- `native-launch-sign-in`: `I have an account` opens `WELCOME BACK` with the email, password and submit controls.
- `native-relaunch-first-run`: a relaunch shows the First Run again, with no crash.

## How to get to it (user POV)

- Install the app and open it from the home screen; close it and open it again.

## Driving it with Maestro

Preconditions:

- Installed Xcode 27.2, SDK 58's generated native project, `com.offseason.asrafit` installed on the iPhone 17 simulator (the only simulator; take turns with other threads, never take it over).
- Only the E2E Convex endpoint `https://modest-kudu-493.convex.cloud` and the Clerk test configuration.

- **Launch and relaunch.** Run `.maestro/native/native-launch.yaml` on that simulator. The screen-only flow clears local app state, never submits credentials and never resets an account. The First Run appears after each launch.
- **Proof.** Keep the `native-launch-first-run`, `native-launch-sign-in` and `native-relaunch-first-run` screenshots.

## Gotchas

- The web harness (`run.mjs`) cannot drive this. A maintenance pass on web reports it `verified-unreachable` with the prerequisite "iOS simulator and local Release build".
- SDK 54's generated AppDelegate created UIWindow without a scene delegate and exited with `UIScene life cycle is required for apps built with this SDK` under Xcode 27.2. SDK 58 generates a SceneDelegate. Don't add a tracked generated iOS directory or downgrade Xcode to hide this failure.
- Authenticated athlete proof is separate and uses the device tooling.
