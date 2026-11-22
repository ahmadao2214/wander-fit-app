# Wander Fit verification map

This directory is the maintained source for verifying Wander Fit on the web export. Read this index, then use the feature file as the recipe.

## Baseline preconditions

- Run `node scripts/verify/run.mjs doctor` and require it to pass.
- Launch with `node scripts/verify/run.mjs launch`. The server binds `127.0.0.1` only.
- Drive with Maestro through `node scripts/verify/run.mjs drive`.
- The export must not contain an app Convex deployment or a Clerk secret. The runner scans for those and stops.
- `node scripts/verify/run.mjs all` runs every flow under `.maestro/web/`, each with its own persona, and fails when `.env.e2e` or `EXPO_PUBLIC_CONVEX_URL_E2E` is missing. The signed-out screen is `node scripts/verify/run.mjs screen`.
- Never drive a dev server that was already running for manual work. This runner serves `dist-verify/` only.

## Driving conventions

- A signed-out launch opens the First Run. Flows that sign in tap `I have an account` first (`.maestro/subflows/_open-sign-in.yaml`).
- Prefer visible text (`WELCOME BACK`, `Sign In`) over coordinates.
- Treat the commands in each feature file as literal.
- Web entries are thin. The journey and the shared subflows are the steps. The findings on `id:` and subflow headers are in `.maestro/flow-layout.md`.
- Leave proof files in `e2e-artifacts/`. Cleanup removes the server, not the proof.

## Proof and skip reporting

- Capture the action and the screen that follows it.
- Record the feature id with the screenshots.
- If a path is unreachable, report the command and the missing precondition. Do not call a different path verified.

## Features

- [Native launch](./native-launch.md) covers the iOS 27 Release launch/relaunch regression on a dedicated simulator.
- [Native workout reorder](./workout-reorder.md) covers changed ordered keys in the patched draggable list; authenticated runtime proof remains pending.
- [Workout no auto-advance](./workout-no-auto-advance.md) covers finishing an exercise's last set without the screen moving on until Next; simulator run pending.
- [Workout exit and resume](./workout-exit-resume.md) covers X → Exit pausing the session so Today offers Resume with the logged sets intact, and Discard as its own confirmed choice.

- [Sign in](./sign-in.md) covers the signed-out welcome screen, signing in to Today, and signing out from Profile.
- [First Run](./first-run.md) covers a signed-out athlete answering the intake, seeing the reveal, creating the account with the program, and starting Day 1's warm-up, checked with `persona inspect`.
- [History](./history.md) covers a persona with one completed GPP session seeing it listed on the History tab.
- [App Settings](./app-settings.md) covers opening App Settings from Profile, seeing the chat connector address and the Claude steps, and Back to Profile.
- [Workout loop](./workout-loop.md) covers an onboarded athlete starting today's workout, logging every set, finishing, and seeing the session on History, checked with `persona inspect`.

## Nightly evidence

`.github/workflows/nightly-e2e.yml` runs every flow under `.maestro/web/` each night against the `wander-fit-e2e` dev deployment, in the same `e2e-backend` queue as main's web E2E. Each flow's evidence uploads as `e2e-web-<flow>` (kept 30 days) once its password scrub has passed.

After the run, `node scripts/verify/gallery.mjs collect` downloads the newest `e2e-<platform>-<flow>` artifact from main for every flow, from either workflow. `gallery.mjs build` turns them into one page, deployed to GitHub Pages. The page has one section per feature, with Web, Android and iOS columns, each showing the video, the step screenshots, pass or fail, the run date and the commit. A failing flow stays on the page, marked failing. Android and iOS read "Not run yet" until #83 and #84 add those runs. The nightly run's summary links the page. Only videos and screenshots go on the page. Logs and `commands.json` stay in the artifacts.
