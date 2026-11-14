# Native launch

Regression for iOS 27's required UIScene lifecycle: the local Release app must stay open and render sign-in, both on a clean launch and a relaunch. A successful build alone does not prove this.

## Driving it

- Build locally with the installed Xcode 27.2, using SDK 58's generated native project; install `com.offseason.asrafit` on a dedicated iOS 27.2 simulator.
- Use only the E2E Convex endpoint `https://modest-kudu-493.convex.cloud` and Clerk test configuration.
- Run `.maestro/native/native-launch.yaml` on that simulator. This screen-only flow clears its local app state, never submits credentials, and never resets an account.
- Expect `WELCOME BACK`, the training subtitle, and the email, password, and submit controls after each launch.
- Preserve `native-launch-sign-in` and `native-relaunch-sign-in` screenshots. Authenticated athlete proof is separate and must use the dedicated device tooling.

## Failure it catches

SDK 54's generated AppDelegate creates UIWindow without a scene delegate and exits with `UIScene life cycle is required for apps built with this SDK` under Xcode 27.2. SDK 58 generates a SceneDelegate by default. Do not add a tracked generated iOS directory or downgrade Xcode to hide this failure.
