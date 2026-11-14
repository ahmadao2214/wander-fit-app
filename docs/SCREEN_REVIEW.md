# Screen review with Expo Explore

Maestro checks that journeys work. The screen review shows what every screen looks like. [Expo Explore](https://github.com/expo/explore) installs the app on a local iOS simulator, taps through it, and makes a map: a screenshot of every screen it reached, joined by the taps between them.

It runs on this Mac only. It uses no Expo Simulators minutes and no EAS builds. The app it reviews talks to `wander-fit-e2e`, never to dev or prod.

## When to run it

- After a pull request adds, removes or renames a screen (a file under `app/`), or changes navigation.
- Before a TestFlight or App Store build.

Not on every pull request, and not nightly.

## How to run it

You need Xcode 27.2, CocoaPods (`brew install cocoapods`), `.env.e2e` and `.env.local`. Explore needs Node 24.12+, and the script runs it through `npx`, so your own Node stays as it is.

**SDK 58 compatibility:** [PR #103](https://github.com/ahmadao2214/wander-fit-app/pull/103) merged at `27a4aab11c8eb6b5b4a027e69860593c26e670bb` with Expo 58.0.25, React Native 0.88.1 and Router 58.0.31. The upgrade resolves the old SDK 54 scene-lifecycle launch blocker without changing Xcode 27.2. The wrapper checks the installed Expo version and ad-hoc signs simulator builds so Clerk SecureStore can access the keychain. It leaves deployment targets to the upgraded native defaults. See [the upgrade evidence and acceptance limits](EXPO_58_UPGRADE.md).

For AI exploration, a logged-in `claude` or `codex` executable must be on the shell's `PATH`; being logged into T3 alone does not put its bundled CLI there. Check `codex login status` (or Claude's login status) in that shell before running. Replays need neither CLI.

The build, CocoaPods' downloads and Explore's own caches stay under `e2e-artifacts/explore/` in the checkout. That takes about 15 GB, so run it from the checkout on the external drive. Only the simulator Explore creates goes to the home disk (it needs about 3 GB free there), and Explore deletes it afterwards. The script checks both disks before it starts.

The real build path must contain no whitespace: native scripts previously failed on paths such as `/Volumes/OWC Express 1M2/`. A symlink is not enough. Use a no-space mounted volume (such as `/Volumes/wander-fit-review/`) or directory; the script rejects whitespace before prebuild.

```sh
node scripts/verify/explore.mjs build                       # Release simulator app on wander-fit-e2e
node scripts/verify/explore.mjs review --state onboarded    # AI explores and captures
```

Those commands create a disposable simulator. The saved onboarded replay requires an already authenticated attached device and is rejected by the disposable runner before build/account/device setup. To reuse the existing T3 iPhone 18 Pro instead, use the attached-device mode below; do not start another simulator just for this review.

| State | Account | What it covers |
| --- | --- | --- |
| `signed-out` | none | sign-in and sign-up |
| `needs-intake` | a throwaway persona, deleted after | intake |
| `onboarded` | the review account, `review+clerk_test@example.com` | Today, Program, History, Profile, workout detail |
| `phase-end` | a throwaway persona, deleted after | reassessment |

- **The build.** It turns `.env` files off and removes known backend, Expo, model API and account secrets, then bakes in the E2E Convex URL and the Clerk publishable key. Afterwards it checks the built JavaScript: no prod or dev host, no Clerk secret. If the check fails, it deletes the app.
- **The review account.** `persona review` creates it once and never resets an existing password or program. Missing/mismatched saved credentials, incomplete existing onboarding or orphaned account data stop the command for manual recovery instead of reprovisioning. `persona delete` and `persona sweep` refuse it. Its password lives only in `e2e-artifacts/review-account.json` (atomically written, mode 600, gitignored), and the disposable-device runner types it from `{{secret:APP_TEST_PASSWORD}}`, so the AI never sees it. The attached runner requires an already signed-in account and passes no password at all.
- **Where reports go.** Each run writes to `e2e-artifacts/explore/<time>-<state>/`. The command prints how to open the report. `expo-explore gap:list --dir <folder>` lists what a run couldn't reach.
- **Blocked runs fail.** Explore can exit zero even when the app never launches. The wrapper also reads `screen-map.json` and exits nonzero for a blocked or zero-screen run. A nonblocked run with screens still needs human coverage review; it is not proof that every screen was reached.

## AI runs and replays

### Reuse an existing T3 simulator

The stock `explore:binary --simulator local` command creates its own temporary device. Do not use it when the intention is to reuse an already booted simulator. `explore:session` documents EAS sessions, not attaching to a T3 local device.

For the signed-in, read-only athlete sweep, `scripts/verify/explore-attached.mjs` adapts Explore 0.23.0's internal `runBlackBoxExploration` engine to the exact bound CLI returned by T3 `device_open`. This is an experimental repository adapter, not an upstream CLI feature. It records the actual T3 controller version rather than pretending it matches Explore's separately pinned controller. Updating Explore requires rechecking the internal engine contract and adapter tests.

Before using it, verify the existing installed binary is the accepted E2E build and that the durable review account is signed in. Open the chosen device through T3, release any old controller through its owning thread, and pass the newly returned bound executable. The adapter relaunches the app to reset navigation/scroll state without deleting account or workout data. It neither creates nor shuts down simulators, builds/installs apps, provisions accounts, nor uploads reports. It uses the existing local Codex login; no credentials or API keys are passed to the model. Temporary model files and screenshots stay under the external output directory.

To install the pinned tool separately from the app, initialize an external tooling directory with Bun and add `@expo/explore@0.23.0` there. Pass its `node_modules/@expo/explore` directory below; do not add it to the app's runtime dependencies.

```sh
npx -y -p node@24.12.0 node scripts/verify/explore-attached.mjs \
  --explore-package /external/path/to/node_modules/@expo/explore \
  --agent-device /absolute/bound/command/from/device_open \
  --output /external/e2e-artifacts/explore/new-onboarded-run
```

Use Node 24.12+ for this direct invocation. Add `--replay .expo-explore/replays/onboarded.json` only after that file contains actions actually observed in a sweep. The adapter permits semantic navigation and scrolling, but refuses native back gestures, text entry, coordinates, deep links, start/resume and account/workout mutation controls. Use an observed tab or labeled back button instead. It stops issuing device commands after the first controller failure. This deliberately excludes workout execution and other mutating journeys; Maestro and the simulator journey checks still own those. Reports may remain partial because these controls were intentionally not explored.

This mode reuses the already installed SDK 58 binary, so it does not require reinstalling this worktree's dependencies or rebuilding unchanged app code. The normal `build` command still requires a frozen Bun install of the upgraded dependencies; an old SDK 54 `node_modules` tree must not be mistaken for upgraded dependencies just because it was moved externally.

An AI run uses an existing local Claude Code or Codex login. Explore checks Claude first, then Codex if Claude's preflight fails, and reports the selected provider. The wrapper removes `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` from its subprocess so it cannot silently use those keys for API billing; local-login usage still counts against the relevant subscription's limits. It finds the screens by itself, but two runs can take different paths. Once a run has covered a state well, write its path as `.expo-explore/replays/<state>.json` (the format is in [Explore's README](https://github.com/expo/explore#take-the-same-steps-on-every-run-and-device)). Later refreshes use `--replay`: no AI, and the same screens in the same order, so two reports compare screen for screen.

When a screen's labels change, a replay step can stop matching. The run then stops at that step, and its report names it. Fix the step, or do a fresh AI run and save its path.

## Later

- **The before/after review.** Explore can mark what changed between two commits (`expo-explore capture`), requiring Expo/Router 57+ and its Metro override support. SDK 58 clears the version prerequisite; this integration has not yet validated automatic capture.
- **Android.** Native Android validation remains unproven; verify the local SDK/emulator before planning an Android sweep.

## Local validation — November 13, 2026

The original SDK 54 Release simulator binary built on the no-space external volume and passed the E2E-host/secret scan. Explore 0.23.0 passed model preflight with the existing Codex ChatGPT login (`gpt-6.1-sol`) after Claude preflight failed. It created a local iPhone 17 Pro, installed/launched the app twice, reported zero screens and a launch blocker, and deleted its simulator. A separate local launch reproduced the UIKit scene-lifecycle error. No cloud simulator or EAS build was used for Explore. At that point no replay was saved because there was no successful observed path.

The SDK 58 upgrade independently proves signed native athlete navigation and coach smoke coverage; it is not an Explore baseline. Its durable review account now has an in-progress workout: do not complete, delete or reset it during a sweep. Legacy warmup-containing templates also expose an unrelated detail-to-execution exercise-order mismatch; visual coverage must not be reported as acceptance of that transfer. The upgrade seeded 36 skill-level templates on E2E without resetting the account. `seed:seedAll` alone does not seed templates; broader generation is a separate E2E data change, not an implicit review step.

At resumption the internal disk had about 148 MiB free, below the wrapper's 3 GiB simulator reserve. External build space does not remove that requirement. Reclaim internal space safely before building/running a fresh Explore simulator; do not bypass the guard or delete another thread's simulator/cache.

### Attached pilot — November 14 UTC

The accepted SDK 58 Release bundle passed the E2E-host/secret scan, and its existing signed-in iPhone 18 Pro was reused through the T3-bound controller after the upgrade session released ownership. No new simulator, app build, account provisioning, credential input, upload or paid service was used. Explore 0.23.0's black-box engine ran with the actual T3 controller 0.21.36 and Codex `gpt-6.1-sol` local login.

The pilot recorded 11 observed screen states, 17 observations and 28 action attempts, including all four athlete tabs, workout/exercise detail and Training Science sections. It is a **failed/partial pilot, not an accepted baseline**: native `back --in-app` failed with `in-app back control is not available`. The adapter stopped further controller commands and its diagnostic was inspected without retrying input. Native back gestures are now rejected locally before dispatch; subsequent runs must use observed tab/back-button labels.

Failed-pilot evidence is under `/Volumes/wander-fit-review/app/e2e-artifacts/explore/20261114-attached-onboarded/` (`screen-map.json`, `artifacts/`, `attached-run.json`). After explicit approval to resume, the adapter's missing image-frame IDs were also fixed: named captures require these IDs. Fresh relaunches avoid carrying prior navigation and scroll state into a replay.

The observed-action replay then finished all 20 planned steps: 12 successful actions, seven named screens and eight variants/captures (including the expanded Understanding Your Numbers section), no failed actions and no open gaps. Explore's schema/artifact validation returned no problems. Evidence: `/Volumes/wander-fit-review/app/e2e-artifacts/explore/20261114-attached-onboarded-replay-verified/`. The model was not used for replay. The report still has `partial` coverage because other controls remain unexplored; this is a verified **scoped read-only baseline**, not proof of every app screen, coach coverage, execution correctness or the other account states.

A fresh model sweep with the fixed frame IDs and native back disabled also finished, but its Upper Body exercise-detail path could not dismiss an unlabeled control under the semantic-only policy. Its report explicitly lists the resulting coverage gaps. Prefer the verified Lower Body replay for the initial baseline; do not loosen account-safety guards or call the model sweep exhaustive.

Maestro parent #69 and journeys #76–#88 remain unchanged. This adds a local visual map/replay alongside their assertions, not a replacement or another blocking CI job. No release workflow, cloud simulator allowance, build credit policy or production backend configuration changes are included.

### Final wrapper build validation

The final wrapper completed its local SDK 58 Release simulator build with exit 0 and produced `e2e-artifacts/explore/build/Build/Products/Release-iphonesimulator/asrafit.app` in the external validation checkout. Its log is `/Volumes/wander-fit-review/explore-build-validation/build-final-wrapper.log`. This validates the final Node 24 prebuild/build path and bundle checks, not a fresh-install runtime: this new binary was not launched. The accepted attached replay above used the independently validated upgrade binary. Final unit validation passed all 60 Jest suites / 2,186 tests and typecheck; the attached-only replay guard also has failing-before/passing-after subprocess coverage. Sol's scoped recheck approved that guard.
