# Expo 54 → 58 upgrade

## Scope and release authorization

Upgrade from main `09fedf6ff21bafa5fbbeffb07e3dc1ddfad74720`, independently of the Explore branch. No generated native directories are tracked at this base (`git ls-files android ios` is empty). Existing local Android directories were not replaced. Build source lives separately at `/Volumes/wander-fit-review/expo58-upgrade/app`; `/Volumes/wander-fit-review/app` belongs to Explore and is not modified.

Azhar explicitly authorized this upgrade's merge-triggered build. Main pushes trigger `.eas/workflows/release-main.yml`: a production-profile iOS EAS build followed by TestFlight submission/internal distribution, not public App Store release. Leave that workflow unchanged. This does not authorize separate manual cloud builds, cloud simulator sessions, paid inference, or production data mutations. Distribution acceptance remains deferred until observed. Authenticated native journey proof is still a merge gate.

## Incremental compatibility decisions

Follow the [official upgrade walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/): upgrade one SDK at a time, align with `expo install --fix`, then check alignment. Bun is the package manager; Jest is the only test runner. Intermediate package manifests and command logs are retained in the local evidence directory below.

| SDK | Installed Expo / React Native | Breaking changes considered |
| --- | --- | --- |
| [55](https://expo.dev/changelog/sdk-55) | 55.0.32 / 0.83.10 | New Architecture only; React 19.2. No legacy-architecture opt-out is retained. |
| [56](https://expo.dev/changelog/sdk-56) | 56.0.24 / 0.85.3 | Hermes V1, fetch/filesystem changes, TypeScript 6, iOS 16.4 minimum and Xcode 26.4 minimum. App has no direct legacy filesystem migration. Keep newer installed Xcode 27.2. |
| [57](https://expo.dev/changelog/sdk-57) | 57.0.33 / 0.86.3 | Startup/memory changes; scene lifecycle became available during this series. Continue to 58 rather than patch generated SDK 54 native code. |
| [58](https://expo.dev/changelog/sdk-58) | 58.0.25 / 0.88.1 | Default iOS scene lifecycle; RN strict instance refs and removed style alias; Router web server default; Android R8 changes. Preserve explicit static web output and validate Android bundling separately. |

Final React is 19.3.0, Expo Router 58.0.31, Reanimated 4.7.1 and Worklets 0.13.0. Clerk, Tamagui and Convex stay on their existing compatible dependency ranges. A React Native Web 0.21.4 override aligns Tamagui tooling's older exact transitive dependency with Expo's version.

Sol review identified that the latest published draggable-flatlist (4.0.3) still calls the removed RN InteractionManager when ordered keys change. A persisted Bun patch replaces that reset scheduling with `setTimeout(reset, 0)` in the native source, ESM and CommonJS entries. The focused Jest regression fails on the original changed-key branch and passes with the patch (`test-draggable-unpatched.log`, `test-draggable-patched.log`). Native detail and execution-queue reordering now have direct device proof below; their Maestro assets are included, not claimed as executed.

Use supported Node (`^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0`) and Bun 1.3.5. Local validation uses Node 24.12; system Node 22.12 is too old. CI's floating Node 22 resolves a current supported patch.

TypeScript 6 removes the old `baseUrl`/Node resolution configuration; bundler resolution and an explicit root path mapping preserve absolute project imports. RN instance refs use `ViewInstance`, `TextInputInstance` and `ScrollViewInstance`; `StyleSheet.absoluteFill` replaces the removed `absoluteFillObject`. Nullable list headers normalize to `undefined` for current list types.

The legacy splash object moves into `expo-splash-screen` plugin options, preserving its image, white background and fullscreen containment. Jest's RN project maps RN's private interface and setup entry to the installed RN 0.88 files/mocks; this avoids initializing real Performance C++ modules in Jest while leaving the Node project independent.

Router 58's custom `+html` document must forward `useServerDocumentContext()` attributes, `headNodes` and `bodyNodes`. Initial advisory CI exposed missing hydration assets: all three journeys stopped at the static `Loading...` shell before credentials. Forwarding this context restores stylesheet/script injection. A component regression asserts assets, attributes and screen children, and the existing signed-out Maestro flow checks the hydrated control IDs.

Router 58 also changes `Tabs.Screen options.href: null` into `hidden: true`, and its `useVisibleTabsWithRedirect` redirects away from hidden destinations. Native runtime reproduced Start Workout returning to Today. Keep workout/training-science screens registered and hide only their tab buttons/items instead. Two layout regressions fail before this fix and pass after it (`tests-tabs-before.log`, `tests-tabs-after.log`).

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
- Advisory web CI on `034b019` passes sign-in and sign-up, but activation reaches the error boundary after sport selection. Router 58 owns its focus context; importing `useIsFocused` from external React Navigation reads an unprovided context. Migrating focus and root theme exports to Router's public API fixes the reproduced context failure. The real Router focus-provider regression fails before the fix and passes afterward. All 57 suites / 2,142 tests and typecheck pass (`tests-navigation-before.log`, `tests-navigation-full.log`, `typecheck-navigation.log`). This is regression/unit proof, not completed activation or native journey acceptance; updated-head CI must rerun.

## Authenticated final-configuration runtime proof

- The unsigned local binary's null Clerk status was SecureStore failing with `A required entitlement is not present`. Local ad-hoc signing fixes it: `CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=NO`. No product auth workaround or temporary diagnostic instrumentation remains. The clean hidden-tab fix binary builds successfully in Release (`build-tabs-signed.log`) on unchanged Xcode 27.2.
- Azhar authorized resuming device validation after the rejected recording flag. Nonrecording `fill --text-stdin` redacts agent-device responses/diagnostics and avoids argv; no `--record-as` is used. XCTest logs can retain test inputs and remain private, outside evidence/commits. Credentials are read only into process memory from ignored mode-600 files. Snapshot refs are refreshed after input mutations.
- Durable athlete: sign-in reaches Today; the E2E database had zero program templates. Existing `seed:seedAllSkillLevelTemplates` adds 36 reference templates without resetting the account. Today then displays Lower Body Foundation (`native-athlete-today.png`).
- Native Start Workout now reaches detail instead of redirecting (`native-workout-navigation.png`). Goblet Squat drags below Romanian Deadlift without the removed-InteractionManager crash (`native-workout-reordered.png`). Start and Skip warmup reach execution (`native-workout-execution.png`). Queue Romanian Deadlift drags below Reverse Lunge; selecting the moved list reaches Reverse Lunge. The changed queue order survives app relaunch and Resume Workout (`native-queue-before.png`, `native-queue-reordered.png`, `native-queue-relaunch-persisted.png`). Grip handles/edge tab lack individual accessibility refs; their coordinate gestures use freshly observed screenshots. Other actions use snapshot refs/selectors.
- Profile → Training Science reaches its learning content rather than redirecting (`native-training-science.png`).
- A separate Clerk test coach and E2E trainer fixture, not the durable review account, signs in. The legacy trainer route renders authenticated roster queries (`native-coach-roster.png`), opens Create, accepts an exercise name, and adds a local exercise draft (`native-coach-exercise-draft.png`). Analytics renders its existing Coming soon placeholder. No coach assignment or workout submission is claimed; coach routes remain legacy/deprecated, not newly implemented by this upgrade. Fixture credentials remain private on the external scratch volume.
- All 58 suites / 2,144 tests and typecheck pass after the hidden-tab fix (`tests-tabs-full.log`, `typecheck-tabs.log`). Previous head `2585a1a` has all three CI checks green, including web activation. The new behavior head must pass CI/review before merge.
- Refreshed Expo alignment passes (`expo-check-tabs.log`), Expo Doctor passes 20/20 (`expo-doctor-tabs.log`), and all 21 flow guards pass (`tests-flows-tabs.log`). `native-runtime-summary.json` records the layout hash and observations without credentials; all 109 tracked application source files match the canonical worktree. The dedicated simulator is restored to the durable athlete's Today screen; its E2E test workout remains in progress, not completed/reset/deleted.

## Incomplete acceptance / follow-up

- **Existing order-index follow-up, not an upgrade regression:** detail passes main-list-relative order indices, while execution treats them as full-template indices. The legacy seed with warmup rows exposes different initial execution order. Both behaviors are present in unchanged main code; do not conflate detail drag/crash proof with correct detail-to-execution order transfer. Execution-queue reordering and persistence were separately proven. Keep this unrelated logic fix out of the compatibility PR.
- All local app validation is configured for `https://modest-kudu-493.convex.cloud` (`wander-fit-e2e`) and Clerk test configuration. No production backend is used.
- `.maestro/native/native-launch.yaml` and its feature-map entry capture the launch/relaunch regression. The asset is not yet executed with Maestro; direct launch proof uses the required bound device CLI. Never clear another thread's simulator state.
- Android native/device acceptance and web browser acceptance must be reported separately from exports. No Android SDK/emulator was found in the standard local location. Do not use EAS to fill this gap without separate authorization.
- Final runtime validation uses canonical application code plus the hidden-tab fix. Scratch-only authentication diagnostic binaries are not acceptance builds. Required latest-head CI/review, normal branch protection and authorized merge-triggered distribution are separate gates.
- Regenerating iOS clears the generated workspace; run local `pod install` again before rebuilding. The first refresh attempt stopped with missing workspace (exit 66), not a compiler failure. Never infer a successful final build from the earlier binary.
- After authorized merge and complete runtime proof, send the PR/SHA and evidence to the Explore owner, who must resume Explore on upgraded main and revisit its temporary iOS SDK wrapper restriction. No successful Explore baseline/replay is claimed by this upgrade.
