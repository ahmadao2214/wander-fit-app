# Wander Fit verification map

This directory is the maintained source for verifying the user-facing behavior of Wander Fit. Read this index before driving the app, then use the matching feature file as the recipe. It is kept honest by `/maintain-verification-skill`.

## Baseline preconditions

- Run `node scripts/verify/run.mjs doctor` and require `doctor: ok`: Clerk key valid, Maestro and Java present, the e2e backend reachable and seeded, and, when a server is up, that it is ours and serves this checkout's build.
- The e2e URL comes from `.env.e2e` or `EXPO_PUBLIC_CONVEX_URL_E2E`. Without it, only `node scripts/verify/run.mjs screen` (signed-out screen) is reachable.
- When other agents may be verifying on the same machine, set `VERIFY_PORT` (not 4173), `VERIFY_STATE_FILE`, `VERIFY_READY_FILE` and `VERIFY_LOG_FILE` to paths of your own.
- The server binds `127.0.0.1` and serves `dist-verify/` only. Never drive a dev server that was already running for manual work.
- The export must not contain an app Convex deployment or a Clerk secret. The runner scans for those and stops.
- Every web flow gets a fresh persona that is deleted after the flow, pass or fail.

## Driving conventions

- Start every recipe from a cleared browser: each web entry launches with `clearState`.
- A signed-out launch opens the First Run. Flows that sign in tap `I have an account` first (`.maestro/subflows/_open-sign-in.yaml`).
- Prefer visible text (`WELCOME BACK`, `Sign In`) and ids over coordinates. On web, a pressable's accessibility label is its id.
- Treat every command in a feature file as literal.
- Web entries (`.maestro/web/<flow>.yaml`) are thin; the journey (`.maestro/journeys/<flow>.yaml`) and shared subflows hold the steps. See `.maestro/flow-layout.md`.
- Never weaken an assertion to make a flow pass. An unmet precondition is a failed run, recorded in that feature's `Gotchas`.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen: each journey numbers its screenshots and records `startRecording/recording.mp4`.
- Verify side effects alongside what is visible. The First Run checks `persona inspect`; the others read stored state back through the UI after a reload.
- Record the feature id with the evidence folder (`e2e-artifacts/<flow>/web/`).
- Report an unreachable path with the attempted command and the unmet precondition (`verified-unreachable`). Do not call a different path verified.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order:

1. `Sub-features` lists short ids with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with Maestro` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command or flow step and its observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

## Features

Web, one file per flow under `.maestro/web/` (`scripts/verify/feature-map.test.mjs` fails when one is missing):

- [Sign in](./sign-in.md): the signed-out welcome screen, signing in to Today, and signing out from Profile.
- [First Run](./first-run.md): the intake, the reveal, creating the account with the program, and landing on Day 1, checked with `persona inspect`.
- [History](./history.md): a persona with completed GPP sessions sees them and the progress line on History.
- [Repeated week](./repeated-week.md): in week 3 of a 5-week GPP block, Today offers the repeated week-2 workout to start, not as done.
- [Reassessment](./reassessment.md): the end-of-block check-in, an honest recap, and choosing Repeat GPP.
- [Workout exit and resume](./workout-exit-resume.md): X → Exit pauses the session, and Today resumes it with the logged sets.
- [App Settings](./app-settings.md): opening App Settings from Profile, the chat connector address and Claude steps, and Back.
- [Workout loop](./workout-loop.md): starting today's workout, logging every set, finishing, and seeing it on History, checked with `persona inspect`.
- [Settings telemetry](./settings-telemetry.md): turning anonymous usage analytics off in App Settings, the choice surviving a reopen, and turning it back on.
- [In-app feedback](./feedback.md): rating the app, reporting a bug and requesting a feature from Profile, each confirmed by its toast.

Native only (iPhone 17 simulator and a local build; unreachable from the web harness):

- [Native launch](./native-launch.md): the iOS 27 Release launch and relaunch regression.
- [Workout reorder](./workout-reorder.md): dragging exercises in detail and in the queue, and the order surviving a relaunch.
- [Workout no auto-advance](./workout-no-auto-advance.md): finishing an exercise's last set without the screen moving on until Next.

## Nightly evidence

Flows in `nightlyOnlyFlows` (`scripts/verify/flows.mjs`, today `workout-loop`) are left out of pull request runs to keep the per-PR web job under 10 minutes. Main pushes, the nightly run and local `run.mjs all` run every flow.

`.github/workflows/nightly-e2e.yml` runs every flow under `.maestro/web/` each night against the `wander-fit-e2e` dev deployment, in the same `e2e-backend` queue as main's web E2E. Each flow's evidence uploads as `e2e-web-<flow>` (kept 30 days) once its password scrub has passed.

After the run, `node scripts/verify/gallery.mjs collect` downloads the newest `e2e-<platform>-<flow>` artifact from main for every flow, from either workflow. `gallery.mjs build` turns them into one page, deployed to GitHub Pages. The page has one section per feature, with Web, Android and iOS columns, each showing the video, the step screenshots, pass or fail, the run date and the commit. A failing flow stays on the page, marked failing. Android and iOS read "Not run yet" until #83 and #84 add those runs. The nightly run's summary links the page. Only videos and screenshots go on the page. Logs and `commands.json` stay in the artifacts.
