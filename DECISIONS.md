# Decisions

Routine calls the team made without asking, one line each, newest first. Anything that needs Azhar's approval is not logged here; see `TEAM.md`.

Format: `YYYY-MM-DD · who · decision · why`.

- 2026-11-23 · Lead · Profile rows take the bare 18pt icon App settings shipped in #164, not the 32pt tile from the approved mockup (Profile refresh) · one row style across both screens, and #164's rows are a day old.
- 2026-11-23 · Lead · Wrote the #170 and #171 PR descriptions myself · Neon's Antigravity quota was used up (resets in about 5 days), and the charter doesn't allow switching providers unasked.
- 2026-11-23 · Lead · Left Astra's last finding on #170 open (a duplicate issue if 1,000 open issues fuzzy-match one flow's title) · the repo has about ten open issues; paging the whole tracker on every failure isn't worth it. Azhar's call after 3 rounds.
- 2026-11-23 · Lead · Fixed Astra's findings on #170 and #171 in the Builders' worktrees instead of re-briefing them · each fix was small and the Builders had finished.
- 2026-11-23 · Lead · `persona sweep` needs the dev deploy key, the one E2E dev host (`E2E_DEV_HOST`) and an `sk_test_` Clerk key; `.env.e2e` mode is refused (#171) · a bulk delete gets an allowlist, and the Convex CLI can load another key from `.env.local` in local mode.
- 2026-11-23 · Lead · Android failures are filed by a separate `report-failures` job that never runs on a PR; the Android job stays read-only (#170) · PR code never runs with `issues: write`.
- 2026-11-23 · Lead · Failed flow names and their error text travel in two job outputs (#170) · GitHub drops an output that contains a masked secret, and the names must survive that.
- 2026-11-23 · Lead · The Android build step times out at 40 min and the emulator step at 25, under the job's 75 (#170) · a step timeout fails the job and still reports; a job timeout cancels it.
- 2026-11-23 · Builder 1 · Error text in a failure issue goes in a code block with backticks swapped for `'`, cut to 500 characters (#170) · an `@name` or markdown in an error can't notify anyone or break the issue.
- 2026-11-23 · Builder 1 · Duplicate failures for one flow in a run collapse into one report (#170) · one issue or comment per flow per run.
- 2026-11-23 · Builder 2 · The sweep job stays out of the `e2e-backend` concurrency group (#171) · it doesn't deploy or seed and only touches accounts older than 2h, so main's E2E needn't wait on it.
- 2026-11-23 · Builder 2 · The sweep job runs on `!cancelled()`, not `always()` (#171) · a cancelled nightly shouldn't sweep.
- 2026-11-23 · Builder 2 · No `--dry-run` for `persona sweep` (#171) · the target checks make the job safe without it.
- 2026-11-23 · Lead · Shut down the idle iPhone 17e simulator and deleted one unavailable simulator ("iPhone Duo") · no thread was driving them; iPhone 17 and iPhone 18 Pro had live sessions and were left alone.
- 2026-11-23 · Lead · Kept the required check's name "Web E2E (advisory)" when making it required (#88) · renaming needs the workflow and the protection rule changed together; follow-up on #137.
- 2026-11-23 · Lead · Builders don't build the Android APK or boot an emulator locally · a local release build took 31 min and starved the laptop; a CI run on the PR (`run-native-e2e` label) is the Android proof.
- 2026-11-23 · Lead · Builders report judgment calls in their final message and the Lead logs them here · two Builders appending to this file in parallel would conflict.
- 2026-11-23 · Lead · Android failure issues are filed on schedule, dispatch and push runs only; PR runs are dry-run · a labelled PR that breaks a flow shouldn't open a public issue.
- 2026-11-23 · Lead · The nightly persona sweep goes in `nightly-e2e.yml`, not `android-e2e.yml` · keeps the two #83 slices in different files so they can run in parallel.
