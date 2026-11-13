# Screen review with Expo Explore

Maestro checks that journeys work. The screen review shows what every screen looks like. [Expo Explore](https://github.com/expo/explore) installs the app on a local iOS simulator, taps through it, and makes a map: a screenshot of every screen it reached, joined by the taps between them.

It runs on this Mac only. It uses no Expo Simulators minutes and no EAS builds. The app it reviews talks to `wander-fit-e2e`, never to dev or prod.

## When to run it

- After a pull request adds, removes or renames a screen (a file under `app/`), or changes navigation.
- Before a TestFlight or App Store build.

Not on every pull request, and not nightly.

## How to run it

You need Xcode, CocoaPods (`brew install cocoapods`), `.env.e2e` and `.env.local`. Explore needs Node 24.12+, and the script runs it through `npx`, so your own Node stays as it is.

The build, CocoaPods' downloads and Explore's own caches stay under `e2e-artifacts/explore/` in the checkout. That takes about 15 GB, so run it from the checkout on the external drive. Only the simulator Explore creates goes to the home disk (it needs about 3 GB free there), and Explore deletes it afterwards. The script checks both disks before it starts.

```sh
node scripts/verify/explore.mjs build                       # Release simulator app on wander-fit-e2e
node scripts/verify/explore.mjs review --state onboarded    # AI explores and captures
node scripts/verify/explore.mjs review --state onboarded --replay   # the saved path, no AI
```

| State | Account | What it covers |
| --- | --- | --- |
| `signed-out` | none | sign-in and sign-up |
| `needs-intake` | a throwaway persona, deleted after | intake |
| `onboarded` | the review account, `review+clerk_test@example.com` | Today, Program, History, Profile, workout detail |
| `phase-end` | a throwaway persona, deleted after | reassessment |

- **The build.** It turns `.env` files off and removes every secret, then bakes in only the E2E Convex URL and the Clerk publishable key. Afterwards it checks the built JavaScript: no prod or dev host, no Clerk secret. If the check fails, it deletes the app.
- **The review account.** `persona review` creates it once and never resets its program. `persona delete` and `persona sweep` refuse it. Its password lives only in `e2e-artifacts/review-account.json` (mode 600, gitignored), and Explore types it from `{{secret:APP_TEST_PASSWORD}}`, so the AI never sees it.
- **Where reports go.** Each run writes to `e2e-artifacts/explore/<time>-<state>/`. The command prints how to open the report. `expo-explore gap:list --dir <folder>` lists what a run couldn't reach.

## AI runs and replays

An AI run uses the Claude Code login on this Mac. It finds the screens by itself, but two runs can take different paths. Once a run has covered a state well, write its path as `.expo-explore/replays/<state>.json` (the format is in [Explore's README](https://github.com/expo/explore#take-the-same-steps-on-every-run-and-device)). Later refreshes use `--replay`: no AI, and the same screens in the same order, so two reports compare screen for screen.

When a screen's labels change, a replay step can stop matching. The run then stops at that step, and its report names it. Fix the step, or do a fresh AI run and save its path.

## Later

- **The before/after review.** Explore can mark what changed between two commits (`expo-explore capture`), but only on Expo SDK 57 or newer. Wander Fit is on 54.
- **Android.** The Android SDK is on the external drive, so Android can run locally too, with `ANDROID_HOME` set.
