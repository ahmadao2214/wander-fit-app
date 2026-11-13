# Expo 54 → 58 upgrade

## Scope and release hold

Upgrade from main `09fedf6ff21bafa5fbbeffb07e3dc1ddfad74720`, independently of the Explore branch. No generated native directories are tracked at this base (`git ls-files android ios` is empty). Existing local Android directories were not replaced. Build source lives separately at `/Volumes/wander-fit-review/expo58-upgrade/app`; `/Volumes/wander-fit-review/app` belongs to Explore and is not modified.

**Do not merge until Azhar resolves the production release-trigger hold.** Main pushes currently trigger `.eas/workflows/release-main.yml`. This upgrade does not change that workflow or authorize EAS, production builds, deployment, TestFlight submission, or paid inference. Distribution acceptance remains deferred.

## Incremental compatibility decisions

Follow the [official upgrade walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/): upgrade one SDK at a time, align with `expo install --fix`, then check alignment. Bun is the package manager; Jest is the only test runner. Intermediate package manifests and command logs are retained in the local evidence directory below.

| SDK | Installed Expo / React Native | Breaking changes considered |
| --- | --- | --- |
| [55](https://expo.dev/changelog/sdk-55) | 55.0.32 / 0.83.10 | New Architecture only; React 19.2. No legacy-architecture opt-out is retained. |
| [56](https://expo.dev/changelog/sdk-56) | 56.0.24 / 0.85.3 | Hermes V1, fetch/filesystem changes, TypeScript 6, iOS 16.4 minimum and Xcode 26.4 minimum. App has no direct legacy filesystem migration. Keep newer installed Xcode 27.2. |
| [57](https://expo.dev/changelog/sdk-57) | 57.0.33 / 0.86.3 | Startup/memory changes; scene lifecycle became available during this series. Continue to 58 rather than patch generated SDK 54 native code. |
| [58](https://expo.dev/changelog/sdk-58) | 58.0.25 / 0.88.1 | Default iOS scene lifecycle; RN strict instance refs and removed style alias; Router web server default; Android R8 changes. Preserve explicit static web output and validate Android bundling separately. |

Final React is 19.3.0, Expo Router 58.0.31, Reanimated 4.7.1 and Worklets 0.13.0. Clerk, Tamagui and Convex stay on their existing compatible dependency ranges. A React Native Web 0.21.4 override aligns Tamagui tooling's older exact transitive dependency with Expo's version.

Sol review identified that the latest published draggable-flatlist (4.0.3) still calls the removed RN InteractionManager when ordered keys change. A persisted Bun patch replaces that reset scheduling with `setTimeout(reset, 0)` in the native source, ESM and CommonJS entries. The focused Jest regression fails on the original changed-key branch and passes with the patch (`test-draggable-unpatched.log`, `test-draggable-patched.log`). Native exercise reordering remains an explicit acceptance gap; its Maestro regression and feature map are included, not claimed as executed.

Use supported Node (`^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0`) and Bun 1.3.5. Local validation uses Node 24.12; system Node 22.12 is too old. CI's floating Node 22 resolves a current supported patch.

TypeScript 6 removes the old `baseUrl`/Node resolution configuration; bundler resolution and an explicit root path mapping preserve absolute project imports. RN instance refs use `ViewInstance`, `TextInputInstance` and `ScrollViewInstance`; `StyleSheet.absoluteFill` replaces the removed `absoluteFillObject`. Nullable list headers normalize to `undefined` for current list types.

The legacy splash object moves into `expo-splash-screen` plugin options, preserving its image, white background and fullscreen containment. Jest's RN project maps RN's private interface and setup entry to the installed RN 0.88 files/mocks; this avoids initializing real Performance C++ modules in Jest while leaving the Node project independent.

Router 58's custom `+html` document must forward `useServerDocumentContext()` attributes, `headNodes` and `bodyNodes`. Initial advisory CI exposed missing hydration assets: all three journeys stopped at the static `Loading...` shell before credentials. Forwarding this context restores stylesheet/script injection. A component regression asserts assets, attributes and screen children, and the existing signed-out Maestro flow checks the hydrated control IDs.

## Observed local proof (2026-11-13)

Evidence root: `/Volumes/wander-fit-review/expo58-upgrade/evidence` (local, not committed).

- Xcode 27.2 (`27B52`) remains selected. Local Release simulator build succeeds: `build-release.log`. Generated SDK 58 AppDelegate includes SceneDelegate window ownership; no generated iOS tree is committed.
- Installed on a separate iPhone 18 Pro simulator, iOS 27.2, `77D29CEE-F844-4EF9-8D3A-2AF5FBF64049`. The T3-bound agent-device launch and relaunch render `WELCOME BACK`, its training subtitle and sign-in controls. `native-launch-sign-in.png` captures the rendered app. Unlike SDK 54, this binary does not immediately exit with `UIScene life cycle is required for apps built with this SDK`.
- `bun run test:ci`: 54 suites / 2,138 tests pass (`tests-final-retry.log`). An earlier run during native compilation timed out one 5-second commitment test; rerunning after compilation passed without changing that test.
- `bun run typecheck` passes (`typecheck-final.log`). Web static export passes (`export-web.log`). These are compilation/unit proofs, not authenticated runtime acceptance.
- A clean frozen Bun install removes stale same-version nested Expo modules from the incremental installation. Expo Doctor found the removed splash schema and Tamagui tooling's duplicate RN Web; the config migration and override address these findings.
- Final clean-install checks: typecheck passes (`typecheck-final-clean.log`), all 54 suites / 2,138 tests pass (`tests-final-clean.log`), Expo dependency alignment passes (`expo-check-final-clean.log`), and Expo Doctor passes 20/20 (`expo-doctor-accepted.log`). Android bundle export passes (`export-android.log`); this does not prove Android native launch.
- After the reorder fix: 55 suites / 2,140 tests and typecheck pass (`tests-patched.log`, `typecheck-patched.log`). Final native Release configuration builds successfully (`build-release-final.log`), but that binary is not yet runtime-validated.
- After the HTML hydration fix: 56 suites / 2,141 tests and typecheck pass (`tests-html.log`, `typecheck-html.log`); static export passes (`export-web-fixed.log`). A fresh incognito browser on the local E2E export renders styled `WELCOME BACK`, email/password inputs and Sign In (`web-sign-in-hydrated.png`). No account credentials are entered. Full web journey CI must rerun on the updated head.

## Incomplete acceptance / follow-up

- **Authentication and representative athlete/coach runtime journeys are not proven.** Credential entry stopped before entering credentials: `fill --record-as` requires an armed recording, but the bound remote daemon rejects `open --save-script`. Do not assume stdin protects daemon diagnostics or snapshots. Resume only after a supported redacted/nonrecording path is established or explicit user guidance is received. The durable review account must not be reset/deleted.
- All local app validation is configured for `https://modest-kudu-493.convex.cloud` (`wander-fit-e2e`) and Clerk test configuration. No production backend is used.
- `.maestro/native/native-launch.yaml` and its feature-map entry capture the launch/relaunch regression. The asset is not yet executed with Maestro; direct launch proof uses the required bound device CLI. Never clear another thread's simulator state.
- Android native/device acceptance and web browser acceptance must be reported separately from exports. No Android SDK/emulator was found in the standard local location. Do not use EAS to fill this gap without separate authorization.
- Final-head runtime proof must be refreshed after any native configuration changes, including the splash plugin migration. Sign-in launch alone does not satisfy the full merge gate.
- Regenerating iOS clears the generated workspace; run local `pod install` again before rebuilding. The first refresh attempt stopped with missing workspace (exit 66), not a compiler failure. Never infer a successful final build from the earlier binary.
- After authorized merge and complete runtime proof, send the PR/SHA and evidence to the Explore owner, who must resume Explore on upgraded main and revisit its temporary iOS SDK wrapper restriction. No successful Explore baseline/replay is claimed by this upgrade.
